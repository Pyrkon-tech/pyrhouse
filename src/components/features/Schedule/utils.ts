import type { ScheduleSlot, ScheduleVolunteer, SlotType } from '../../../types/schedule.types';
import { ApiError } from '../../../services/apiClient';
import { AVATAR_COLORS } from './constants';
import type { ApiErrorState, DetailItem, GridData, GridColumn, GridCell, GridCellStatus, TimelineData, TimelineLane, DayMarker, CalendarData, CalendarDay, CalendarSlotItem, CalendarCellStatus } from './types';

// ---- Avatar ----------------------------------------------------------------

export function avatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

// ---- Time parsing ----------------------------------------------------------

/**
 * Parse ISO datetime as local time.
 * Backend sends Polish local times with a UTC `Z` suffix (e.g. "2026-06-19T10:00:00Z"
 * means 10:00 Polish time). Stripping `Z` makes `new Date()` treat it as local.
 */
export function parseAsLocal(isoStr: string): Date {
  return new Date(isoStr.replace('Z', ''));
}

/**
 * Return the date key a slot belongs to.
 * Cross-midnight slots are placed in the start day only — the time axis extends past 24h.
 */
function slotDateKey(slot: ScheduleSlot): string {
  return slot.start.slice(0, 10);
}

// ---- Time helpers ----------------------------------------------------------

export function computeHourRange(slots: ScheduleSlot[]): { minHour: number; maxHour: number } {
  if (slots.length === 0) return { minHour: 8, maxHour: 20 };
  let minMin = 24 * 60;
  let maxMin = 0;
  for (const slot of slots) {
    const s = parseAsLocal(slot.start);
    const e = parseAsLocal(slot.end);
    const startDateKey = slot.start.slice(0, 10);
    const endDateKey = slot.end.slice(0, 10);
    const startMin = s.getHours() * 60 + s.getMinutes();
    const endMin = e.getHours() * 60 + e.getMinutes();

    if (startDateKey !== endDateKey && !(endMin === 0)) {
      // Cross-midnight slot: contributes start→24:00 and 00:00→end
      minMin = Math.min(minMin, startMin, 0);
      maxMin = 24 * 60;
      if (endMin > 0) maxMin = Math.max(maxMin, endMin);
    } else {
      let effectiveEnd = endMin;
      if (effectiveEnd === 0) effectiveEnd = 24 * 60;
      minMin = Math.min(minMin, startMin);
      maxMin = Math.max(maxMin, effectiveEnd);
    }
  }
  return { minHour: Math.floor(minMin / 60), maxHour: Math.ceil(maxMin / 60) };
}


// ---- Grid layout (slot × day table) -----------------------------------------

/**
 * Build the position × day grid from a flat list of slots.
 *
 * Each slot with capacity N is expanded into N rows (positions).
 * Rows are aligned across days by index: row 0 = first position of each day's
 * first slot, row 1 = second position (or first of next slot), etc.
 *
 * For festival columns, each cell gets startPct / widthPct for horizontal time
 * positioning within the column's hour range.
 */
/**
 * Extract lane assignments from a GridData result for use as stability hints in the next rebuild.
 * Returns a Map from `${dateKey}:${slotId}:${posIndex}` → lane index.
 */
export function extractLaneMap(grid: GridData): Map<string, number> {
  const map = new Map<string, number>();
  for (const col of grid.columns) {
    for (let lane = 0; lane < col.cells.length; lane++) {
      for (const cell of col.cells[lane]) {
        map.set(`${col.dateKey}:${cell.slot.id}:${cell.positionIndex}`, lane);
      }
    }
  }
  return map;
}

/**
 * Compute global hour range across all time-based (non-full-day) slots.
 * Returns a stable axis range that can be cached and reused across rebuilds.
 */
export function computeGlobalHourRange(slots: ScheduleSlot[]): { minHour: number; maxHour: number } {
  let globalMinHour = 24;
  let globalMaxHour = 0;
  let hasTimedSlots = false;

  for (const s of slots) {
    hasTimedSlots = true;

    const sStart = parseAsLocal(s.start);
    const startH = sStart.getHours() + sStart.getMinutes() / 60;
    globalMinHour = Math.min(globalMinHour, startH);

    const startDateKey = s.start.slice(0, 10);
    const endDateKey = s.end.slice(0, 10);
    if (endDateKey !== startDateKey) {
      const sEnd = parseAsLocal(s.end);
      const endH = sEnd.getHours() + sEnd.getMinutes() / 60;
      if (endH > 0) globalMaxHour = Math.max(globalMaxHour, 24 + endH);
      else globalMaxHour = Math.max(globalMaxHour, 24);
    } else {
      const sEnd = parseAsLocal(s.end);
      let endH = sEnd.getHours() + sEnd.getMinutes() / 60;
      if (endH === 0) endH = 24;
      globalMaxHour = Math.max(globalMaxHour, endH);
    }
  }

  if (hasTimedSlots) {
    return {
      minHour: Math.max(0, Math.floor(globalMinHour) - 1),
      maxHour: Math.ceil(globalMaxHour) + 1,
    };
  }
  return { minHour: 8, maxHour: 20 };
}

export function buildGridData(
  slots: ScheduleSlot[],
  volunteers: ScheduleVolunteer[],
  validation: import('../../../types/schedule.types').ValidationResult | null,
  todayStr: string,
  pendingAssignmentIds?: Set<number>,
  /** Previous lane assignments for stability across rebuilds */
  prevLaneMap?: Map<string, number>,
  /** Pre-computed axis range — if provided, used instead of computing from slots */
  axisRange?: { minHour: number; maxHour: number },
): GridData {
  // Group slots by start date — cross-midnight slots stay in start day (time axis extends past 24h)
  const byDate = new Map<string, ScheduleSlot[]>();
  for (const slot of slots) {
    const key = slotDateKey(slot);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(slot);
  }

  // Build sets of volunteer/slot IDs with validation issues, split by severity
  const errorVolunteerIds = new Set<number>();
  const errorSlotIds = new Set<number>();
  const warningVolunteerIds = new Set<number>();
  const warningSlotIds = new Set<number>();
  if (validation) {
    for (const issue of validation.issues) {
      const isError = issue.severity === 'error';
      if (issue.volunteer_id) {
        (isError ? errorVolunteerIds : warningVolunteerIds).add(issue.volunteer_id);
      }
      const slotId = issue.slot_id ?? issue.slot;
      if (slotId) {
        (isError ? errorSlotIds : warningSlotIds).add(slotId);
      }
    }
  }

  // Nickname → volunteer ID lookup (for validation matching)
  const nicknameToVolId = new Map<string, number>();
  for (const v of volunteers) {
    nicknameToVolId.set(v.nickname, v.id);
  }

  // Use pre-computed axis range or compute from current slots
  const { minHour: globalMinHour, maxHour: globalMaxHour } = axisRange ?? computeGlobalHourRange(slots);
  const sortedDates = [...byDate.keys()].sort();

  // Build columns
  const columns: GridColumn[] = sortedDates.map((dateKey) => {
    const daySlots = byDate.get(dateKey)!;
    // Sort by start time, with slot ID as stable tiebreaker
    const sorted = [...daySlots].sort((a, b) => {
      const diff = parseAsLocal(a.start).getTime() - parseAsLocal(b.start).getTime();
      return diff !== 0 ? diff : a.id - b.id;
    });

    // Day type
    const typeCounts: Record<SlotType, number> = { montage: 0, festival: 0, demontage: 0 };
    for (const s of sorted) typeCounts[s.type]++;
    const typeEntries = Object.entries(typeCounts) as [SlotType, number][];
    const dominant = typeEntries.sort((a, b) => b[1] - a[1])[0][0];
    const uniqueTypes = typeEntries.filter(([, c]) => c > 0).length;
    const dayType: SlotType | 'mixed' = uniqueTypes > 1 ? 'mixed' : dominant;
    const isFullDay = sorted.every((s) => s.type === 'montage' || s.type === 'demontage');

    // Use global hour range for consistency across all time-based columns
    const minHour = globalMinHour;
    const maxHour = globalMaxHour;

    // Label
    const d = new Date(dateKey + 'T12:00:00');
    const shortLabel = d.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' });

    // Build individual position cells with time info
    const hourSpan = maxHour - minHour || 1;
    const fmtTime = (dt: Date) =>
      `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

    interface PositionCell {
      cell: GridCell;
      startH: number;
      endH: number;
      slotId: number;
      posIndex: number;
    }
    const allPositions: PositionCell[] = [];

    for (const slot of sorted) {
      const sStart = parseAsLocal(slot.start);
      const sEnd = parseAsLocal(slot.end);
      const endDateKey = slot.end.slice(0, 10);

      // Compute hours — cross-midnight endH extends past 24
      const startH = sStart.getHours() + sStart.getMinutes() / 60;
      let endH = sEnd.getHours() + sEnd.getMinutes() / 60;
      if (endDateKey !== dateKey) {
        endH += 24; // e.g., 02:00 next day = 26
      } else if (endH === 0) {
        endH = 24; // midnight = 24:00
      }

      const startPct = isFullDay ? undefined : ((startH - minHour) / hourSpan) * 100;
      const widthPct = isFullDay ? undefined : (((endH - startH) / hourSpan) * 100);
      const timeLabel = isFullDay ? undefined : `${fmtTime(sStart)} → ${fmtTime(sEnd)}`;

      const posCount = Math.max(slot.capacity, slot.volunteers.length + 1);
      for (let pos = 0; pos < posCount; pos++) {
        const sv = slot.volunteers[pos] ?? null;
        let status: GridCellStatus = 'approved';

        if (sv) {
          const volId = nicknameToVolId.get(sv.nickname);
          if (pendingAssignmentIds && pendingAssignmentIds.has(sv.id)) {
            status = 'pending';
          } else if ((volId && errorVolunteerIds.has(volId)) || errorSlotIds.has(slot.id)) {
            status = 'error';
          } else if ((volId && warningVolunteerIds.has(volId)) || warningSlotIds.has(slot.id)) {
            status = 'warning';
          }
        }

        allPositions.push({
          cell: {
            slot,
            positionIndex: pos,
            volunteer: sv
              ? { assignmentId: sv.id, volunteerId: nicknameToVolId.get(sv.nickname) ?? 0, nickname: sv.nickname }
              : null,
            status,
            startPct,
            widthPct,
            timeLabel,
          },
          startH,
          endH,
          slotId: slot.id,
          posIndex: pos,
        });
      }
    }

    // Pack positions into lanes (rows).
    // For full-day columns: each position gets its own row (they all overlap — full day).
    // For time-based columns: non-overlapping positions share the same lane.
    const cells: GridCell[][] = [];

    if (isFullDay) {
      for (const p of allPositions) {
        cells.push([p.cell]);
      }
    } else {
      const laneEnds: number[] = [];

      // First pass: try to restore previous lane assignments (stability across rebuilds)
      const deferred: PositionCell[] = [];
      if (prevLaneMap) {
        for (const p of allPositions) {
          const key = `${dateKey}:${p.slotId}:${p.posIndex}`;
          const prevLane = prevLaneMap.get(key);
          if (prevLane != null) {
            while (cells.length <= prevLane) {
              cells.push([]);
              laneEnds.push(0);
            }
            if (laneEnds[prevLane] <= p.startH) {
              cells[prevLane].push(p.cell);
              laneEnds[prevLane] = p.endH;
              continue;
            }
          }
          deferred.push(p);
        }
      } else {
        deferred.push(...allPositions);
      }

      // Second pass: greedy first-fit for remaining
      for (const p of deferred) {
        let placed = false;
        for (let lane = 0; lane < laneEnds.length; lane++) {
          if (laneEnds[lane] <= p.startH) {
            cells[lane].push(p.cell);
            laneEnds[lane] = p.endH;
            placed = true;
            break;
          }
        }
        if (!placed) {
          cells.push([p.cell]);
          laneEnds.push(p.endH);
        }
      }

      // Third pass: compaction — pull cells down to lowest available lane.
      // This fixes "stuck displacement" where prevLaneMap keeps cells in higher
      // lanes even after the overlap that caused displacement is resolved.
      const compacted: GridCell[][] = [];
      const compEnds: number[] = [];

      // Collect all placed cells with their time info for re-packing
      const allPlaced: { cell: GridCell; startH: number; endH: number }[] = [];
      for (const lane of cells) {
        for (const cell of lane) {
          const pc = allPositions.find(
            (p) => p.cell.slot.id === cell.slot.id && p.cell.positionIndex === cell.positionIndex,
          );
          if (pc) allPlaced.push({ cell, startH: pc.startH, endH: pc.endH });
        }
      }
      // Sort by start time for stable greedy packing
      allPlaced.sort((a, b) => a.startH - b.startH || a.cell.slot.id - b.cell.slot.id);

      for (const p of allPlaced) {
        let placed = false;
        for (let lane = 0; lane < compEnds.length; lane++) {
          if (compEnds[lane] <= p.startH) {
            if (!compacted[lane]) compacted[lane] = [];
            compacted[lane].push(p.cell);
            compEnds[lane] = p.endH;
            placed = true;
            break;
          }
        }
        if (!placed) {
          compacted.push([p.cell]);
          compEnds.push(p.endH);
        }
      }

      // Replace cells with compacted result
      cells.length = 0;
      cells.push(...compacted);
    }

    return {
      dateKey,
      shortLabel,
      dayType,
      isToday: dateKey === todayStr,
      isFullDay,
      minHour,
      maxHour,
      cells,
    };
  });

  // Row count = max rows across all columns
  const rowCount = Math.max(1, ...columns.map((c) => c.cells.length));

  return { columns, rowCount };
}

// ---- Timeline (Gantt) layout -----------------------------------------------

/**
 * Convert an ISO datetime to an absolute hour relative to the first date.
 * E.g. if firstDateKey = "2025-07-17" and iso = "2025-07-18T10:00:00",
 * result = 24 + 10 = 34.
 */
export function toAbsoluteHour(iso: string, firstDateKey: string): number {
  const d = parseAsLocal(iso);
  const dateKey = iso.replace('Z', '').slice(0, 10);
  // Compare noon-to-noon to avoid time-of-day skewing the day offset
  const firstNoon = new Date(firstDateKey + 'T12:00:00');
  const thisNoon = new Date(dateKey + 'T12:00:00');
  const dayOffset = Math.round((thisNoon.getTime() - firstNoon.getTime()) / (24 * 60 * 60 * 1000));
  return dayOffset * 24 + d.getHours() + d.getMinutes() / 60;
}

/**
 * Convert an absolute hour back to an ISO datetime string.
 */
export function absoluteHourToISO(absH: number, firstDateKey: string): string {
  const dayOffset = Math.floor(absH / 24);
  const hourInDay = absH - dayOffset * 24;
  const d = new Date(firstDateKey + 'T12:00:00');
  d.setDate(d.getDate() + dayOffset);
  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hh = Math.floor(hourInDay);
  const mm = Math.round((hourInDay - hh) * 60);
  return `${dateKey}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}

/**
 * Extract lane assignments from a TimelineData for stability across rebuilds.
 * Returns a Map from `${slotId}:${posIndex}` → lane index.
 */
export function extractTimelineLaneMap(timeline: TimelineData): Map<string, number> {
  const map = new Map<string, number>();
  for (let lane = 0; lane < timeline.lanes.length; lane++) {
    for (const cell of timeline.lanes[lane].cells) {
      map.set(`${cell.slot.id}:${cell.positionIndex}`, lane);
    }
  }
  return map;
}

/**
 * Build a continuous Gantt timeline from a flat list of slots.
 *
 * All slots are placed on a single absolute time axis spanning the entire schedule.
 * Non-overlapping position cells share the same lane. Cross-midnight slots are
 * seamless — they simply span from their absolute start to their absolute end.
 */
export function buildTimelineData(
  slots: ScheduleSlot[],
  volunteers: ScheduleVolunteer[],
  validation: import('../../../types/schedule.types').ValidationResult | null,
  todayStr: string,
  pendingAssignmentIds?: Set<number>,
  prevLaneMap?: Map<string, number>,
  /** All slots (unfiltered) — used to compute the full timeline range and day markers.
   *  When omitted, `slots` is used for both chips and range computation. */
  allSlots?: ScheduleSlot[],
): TimelineData {
  // Use allSlots for range/marker computation, slots for chip placement
  const rangeSlots = allSlots ?? slots;

  if (rangeSlots.length === 0) {
    return {
      lanes: [],
      dayMarkers: [],
      firstDateKey: todayStr,
      absoluteStartH: 8,
      absoluteEndH: 20,
      totalHours: 12,
    };
  }

  // Find the earliest date key from ALL slots (so timeline always spans full schedule)
  const allDateKeys = rangeSlots.map((s) => s.start.slice(0, 10)).sort();
  const firstDateKey = allDateKeys[0];

  // Build validation lookups
  const errorVolunteerIds = new Set<number>();
  const errorSlotIds = new Set<number>();
  const warningVolunteerIds = new Set<number>();
  const warningSlotIds = new Set<number>();
  if (validation) {
    for (const issue of validation.issues) {
      const isError = issue.severity === 'error';
      if (issue.volunteer_id) {
        (isError ? errorVolunteerIds : warningVolunteerIds).add(issue.volunteer_id);
      }
      const slotId = issue.slot_id ?? issue.slot;
      if (slotId) {
        (isError ? errorSlotIds : warningSlotIds).add(slotId);
      }
    }
  }

  // Nickname → volunteer ID lookup
  const nicknameToVolId = new Map<string, number>();
  for (const v of volunteers) {
    nicknameToVolId.set(v.nickname, v.id);
  }

  const fmtTime = (dt: Date) =>
    `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

  // Build position cells with absolute hours
  interface PositionCell {
    cell: GridCell;
    absStartH: number;
    absEndH: number;
    slotId: number;
    posIndex: number;
  }
  const allPositions: PositionCell[] = [];

  // Compute absolute hour range from ALL slots (not just filtered) so the
  // timeline always spans the full schedule regardless of phase filter.
  let absMinH = Infinity;
  let absMaxH = -Infinity;
  for (const slot of rangeSlots) {
    const sAbsStart = toAbsoluteHour(slot.start, firstDateKey);
    const sAbsEnd = toAbsoluteHour(slot.end, firstDateKey);
    const sEffEnd = sAbsEnd <= sAbsStart ? sAbsStart + 24 : sAbsEnd;
    absMinH = Math.min(absMinH, sAbsStart);
    absMaxH = Math.max(absMaxH, sEffEnd);
  }

  // Timeline range with padding
  const absoluteStartH = Math.max(0, Math.floor(absMinH) - 1);
  const absoluteEndH = Math.ceil(absMaxH) + 1;
  const totalHours = absoluteEndH - absoluteStartH;

  // Sort filtered slots by start time for stable ordering
  const sortedSlots = [...slots].sort((a, b) => {
    const diff = parseAsLocal(a.start).getTime() - parseAsLocal(b.start).getTime();
    return diff !== 0 ? diff : a.id - b.id;
  });

  // Build position cells from FILTERED slots only
  for (const slot of sortedSlots) {
    const absStartH = toAbsoluteHour(slot.start, firstDateKey);
    const absEndH = toAbsoluteHour(slot.end, firstDateKey);
    const effectiveEndH = absEndH <= absStartH ? absStartH + 24 : absEndH;

    const sStart = parseAsLocal(slot.start);
    const sEnd = parseAsLocal(slot.end);
    const timeLabel = `${fmtTime(sStart)} → ${fmtTime(sEnd)}`;

    const posCount = Math.max(slot.capacity, slot.volunteers.length + 1);
    for (let pos = 0; pos < posCount; pos++) {
      const sv = slot.volunteers[pos] ?? null;
      let status: GridCellStatus = 'approved';

      if (sv) {
        const volId = nicknameToVolId.get(sv.nickname);
        if (pendingAssignmentIds && pendingAssignmentIds.has(sv.id)) {
          status = 'pending';
        } else if ((volId && errorVolunteerIds.has(volId)) || errorSlotIds.has(slot.id)) {
          status = 'error';
        } else if ((volId && warningVolunteerIds.has(volId)) || warningSlotIds.has(slot.id)) {
          status = 'warning';
        }
      }

      allPositions.push({
        cell: {
          slot,
          positionIndex: pos,
          volunteer: sv
            ? { assignmentId: sv.id, volunteerId: nicknameToVolId.get(sv.nickname) ?? 0, nickname: sv.nickname }
            : null,
          status,
          startPct: ((absStartH - absoluteStartH) / totalHours) * 100,
          widthPct: ((effectiveEndH - absStartH) / totalHours) * 100,
          timeLabel,
        },
        absStartH,
        absEndH: effectiveEndH,
        slotId: slot.id,
        posIndex: pos,
      });
    }
  }

  // Lane packing — 3-pass: restore → greedy → compaction
  const lanes: GridCell[][] = [];
  const laneEnds: number[] = [];

  // Sort by absolute start for stable packing
  const sorted = [...allPositions].sort((a, b) => a.absStartH - b.absStartH || a.slotId - b.slotId || a.posIndex - b.posIndex);

  // Pass 1: restore from previous lane map
  const deferred: PositionCell[] = [];
  if (prevLaneMap) {
    for (const p of sorted) {
      const key = `${p.slotId}:${p.posIndex}`;
      const prevLane = prevLaneMap.get(key);
      if (prevLane != null) {
        while (lanes.length <= prevLane) {
          lanes.push([]);
          laneEnds.push(0);
        }
        if (laneEnds[prevLane] <= p.absStartH) {
          lanes[prevLane].push(p.cell);
          laneEnds[prevLane] = p.absEndH;
          continue;
        }
      }
      deferred.push(p);
    }
  } else {
    deferred.push(...sorted);
  }

  // Pass 2: greedy first-fit for remaining
  for (const p of deferred) {
    let placed = false;
    for (let lane = 0; lane < laneEnds.length; lane++) {
      if (laneEnds[lane] <= p.absStartH) {
        lanes[lane].push(p.cell);
        laneEnds[lane] = p.absEndH;
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([p.cell]);
      laneEnds.push(p.absEndH);
    }
  }

  // Pass 3: compaction
  const compacted: GridCell[][] = [];
  const compEnds: number[] = [];
  const allPlaced: { cell: GridCell; absStartH: number; absEndH: number }[] = [];
  for (const lane of lanes) {
    for (const cell of lane) {
      const pc = allPositions.find(
        (p) => p.cell.slot.id === cell.slot.id && p.cell.positionIndex === cell.positionIndex,
      );
      if (pc) allPlaced.push({ cell, absStartH: pc.absStartH, absEndH: pc.absEndH });
    }
  }
  allPlaced.sort((a, b) => a.absStartH - b.absStartH || a.cell.slot.id - b.cell.slot.id);

  for (const p of allPlaced) {
    let placed = false;
    for (let lane = 0; lane < compEnds.length; lane++) {
      if (compEnds[lane] <= p.absStartH) {
        if (!compacted[lane]) compacted[lane] = [];
        compacted[lane].push(p.cell);
        compEnds[lane] = p.absEndH;
        placed = true;
        break;
      }
    }
    if (!placed) {
      compacted.push([p.cell]);
      compEnds.push(p.absEndH);
    }
  }

  const timelineLanes: TimelineLane[] = compacted.map((cells) => ({ cells }));

  // Build day markers from ALL slots (so every day is visible regardless of filter)
  const uniqueDates = [...new Set(rangeSlots.map((s) => s.start.slice(0, 10)))].sort();
  const dayMarkers: DayMarker[] = uniqueDates.map((dateKey) => {
    const daySlots = rangeSlots.filter((s) => s.start.slice(0, 10) === dateKey);
    const typeCounts: Record<SlotType, number> = { montage: 0, festival: 0, demontage: 0 };
    for (const s of daySlots) typeCounts[s.type]++;
    const typeEntries = Object.entries(typeCounts) as [SlotType, number][];
    const dominant = typeEntries.sort((a, b) => b[1] - a[1])[0][0];
    const uniqueTypes = typeEntries.filter(([, c]) => c > 0).length;
    const dayType: SlotType | 'mixed' = uniqueTypes > 1 ? 'mixed' : dominant;

    const d = new Date(dateKey + 'T12:00:00');
    const label = d.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' });

    // Day boundaries on the timeline
    const dayAbsStart = toAbsoluteHour(dateKey + 'T00:00:00', firstDateKey);
    const dayAbsEnd = dayAbsStart + 24;
    const startPct = Math.max(0, ((dayAbsStart - absoluteStartH) / totalHours) * 100);
    const endPct = Math.min(100, ((dayAbsEnd - absoluteStartH) / totalHours) * 100);

    return {
      dateKey,
      label,
      dayType,
      isToday: dateKey === todayStr,
      startPct,
      endPct,
    };
  });

  return {
    lanes: timelineLanes,
    dayMarkers,
    firstDateKey,
    absoluteStartH,
    absoluteEndH,
    totalHours,
  };
}

// ---- API error helpers -----------------------------------------------------

export function extractDetailItems(details: unknown): DetailItem[] {
  if (!details || typeof details !== 'object') return [];
  const d = details as Record<string, unknown>;

  const arr = Array.isArray(d) ? d
    : Array.isArray(d.errors) ? d.errors
    : Array.isArray(d.validation_errors) ? d.validation_errors
    : Array.isArray(d.details) ? d.details
    : [];

  return arr.map((item: unknown) => {
    if (typeof item === 'string') return { message: item };
    if (typeof item === 'object' && item !== null) {
      const o = item as Record<string, unknown>;
      return {
        row: typeof o.row === 'number' ? o.row : undefined,
        column: typeof o.column === 'string' ? o.column : (typeof o.col === 'string' ? o.col : undefined),
        field: typeof o.field === 'string' ? o.field : undefined,
        message: (o.message ?? o.error ?? o.detail ?? JSON.stringify(o)) as string,
      };
    }
    return { message: String(item) };
  });
}

export function buildApiErrorState(e: unknown, operation: string): ApiErrorState {
  if (e instanceof ApiError) {
    return { message: e.message, status: e.status, details: e.details, operation };
  }
  return { message: e instanceof Error ? e.message : 'Nieznany błąd', status: 0, details: undefined, operation };
}

// ---- Google Sheets ---------------------------------------------------------

export function extractSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

// ---- Calendar layout helpers ------------------------------------------------

function calendarSlotStartH(slot: ScheduleSlot): number {
  const d = parseAsLocal(slot.start);
  return d.getHours() + d.getMinutes() / 60;
}

function calendarSlotEndH(slot: ScheduleSlot): number {
  const startDay = slot.start.slice(0, 10);
  const endDay = slot.end.slice(0, 10);
  const d = parseAsLocal(slot.end);
  const h = d.getHours() + d.getMinutes() / 60;
  if (endDay !== startDay) return 24 + (h > 0 ? h : 0);
  return h === 0 ? 24 : h;
}

function computeCalendarOverlapLayout(slots: ScheduleSlot[]): Map<number, { left: number; width: number }> {
  if (slots.length === 0) return new Map();
  if (slots.length === 1) return new Map([[slots[0].id, { left: 0, width: 1 }]]);

  type Interval = { id: number; startH: number; endH: number };
  const intervals: Interval[] = slots.map(s => ({
    id: s.id,
    startH: calendarSlotStartH(s),
    endH: calendarSlotEndH(s),
  }));

  const sorted = [...intervals].sort((a, b) => a.startH - b.startH || a.id - b.id);
  const columns: Interval[][] = [];
  const colAssignment = new Map<number, number>();

  for (const interval of sorted) {
    let assigned = false;
    for (let col = 0; col < columns.length; col++) {
      const conflict = columns[col].some(o => interval.startH < o.endH && interval.endH > o.startH);
      if (!conflict) {
        columns[col].push(interval);
        colAssignment.set(interval.id, col);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      columns.push([interval]);
      colAssignment.set(interval.id, columns.length - 1);
    }
  }

  const numCols = columns.length;
  const result = new Map<number, { left: number; width: number }>();
  for (const [id, col] of colAssignment) {
    result.set(id, { left: col / numCols, width: 1 / numCols });
  }
  return result;
}

const DAY_NAMES_SHORT = ['Nie', 'Pon', 'Wt', 'Śr', 'Czw', 'Pią', 'Sob'];
const DAY_NAMES_FULL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

/** Generate all date keys between two ISO date strings (inclusive). */
function dateRange(startDateKey: string, endDateKey: string): string[] {
  const result: string[] = [];
  const cur = new Date(startDateKey + 'T12:00:00');
  const end = new Date(endDateKey + 'T12:00:00');
  while (cur <= end) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export function buildCalendarData(
  slots: ScheduleSlot[],
  _volunteers: ScheduleVolunteer[],
  validation: import('../../../types/schedule.types').ValidationResult | null,
  todayStr: string,
  eventRange?: { eventStart: string; eventEnd: string; festivalStart?: string; festivalEnd?: string },
): CalendarData {
  const errorSlotIds = new Set<number>();
  const warningSlotIds = new Set<number>();
  if (validation) {
    for (const issue of validation.issues) {
      const slotId = issue.slot_id ?? issue.slot;
      if (slotId != null) {
        (issue.severity === 'error' ? errorSlotIds : warningSlotIds).add(slotId);
      }
    }
  }

  const byDate = new Map<string, ScheduleSlot[]>();
  for (const slot of slots) {
    const key = slot.start.slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(slot);
  }

  const { minHour, maxHour } = computeGlobalHourRange(slots);

  // Merge dates from slots with all event dates (so empty days appear in calendar)
  const slotDates = new Set(byDate.keys());
  if (eventRange) {
    const eventStartKey = eventRange.eventStart.slice(0, 10);
    const eventEndKey = eventRange.eventEnd.slice(0, 10);
    for (const dk of dateRange(eventStartKey, eventEndKey)) {
      if (!slotDates.has(dk)) {
        byDate.set(dk, []); // empty column
      }
    }
  }
  const sortedDates = [...byDate.keys()].sort();

  const days: CalendarDay[] = sortedDates.map(dateKey => {
    const daySlots = byDate.get(dateKey)!.slice().sort(
      (a, b) => parseAsLocal(a.start).getTime() - parseAsLocal(b.start).getTime(),
    );

    let dayType: SlotType | 'mixed';
    if (daySlots.length === 0) {
      // Empty day — infer type from position relative to festival
      const festStart = eventRange?.festivalStart?.slice(0, 10);
      const festEnd = eventRange?.festivalEnd?.slice(0, 10);
      if (festStart && festEnd) {
        dayType = dateKey < festStart ? 'montage' : dateKey > festEnd ? 'demontage' : 'festival';
      } else {
        dayType = 'montage';
      }
    } else {
      const typeCounts: Record<SlotType, number> = { montage: 0, festival: 0, demontage: 0 };
      for (const s of daySlots) typeCounts[s.type]++;
      const typeEntries = Object.entries(typeCounts) as [SlotType, number][];
      const dominant = [...typeEntries].sort((a, b) => b[1] - a[1])[0][0];
      const uniqueTypes = typeEntries.filter(([, c]) => c > 0).length;
      dayType = uniqueTypes > 1 ? 'mixed' : dominant;
    }

    const layout = computeCalendarOverlapLayout(daySlots);

    const slotItems: CalendarSlotItem[] = daySlots.map(slot => {
      const status: CalendarCellStatus = errorSlotIds.has(slot.id)
        ? 'error'
        : warningSlotIds.has(slot.id)
        ? 'warning'
        : 'approved';
      const issueCount = validation
        ? validation.issues.filter(i => (i.slot_id ?? i.slot) === slot.id).length
        : 0;
      const ll = layout.get(slot.id) ?? { left: 0, width: 1 };
      return { slot, left: ll.left, width: ll.width, status, issueCount };
    });

    const d = new Date(dateKey + 'T12:00:00');
    const dow = d.getDay();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');

    return {
      dateKey,
      label: `${DAY_NAMES_FULL[dow]}, ${dd}.${mm}`,
      shortLabel: `${DAY_NAMES_SHORT[dow]} ${dd}.${mm}`,
      dayType,
      isToday: dateKey === todayStr,
      slotItems,
    };
  });

  return { days, minHour, maxHour };
}
