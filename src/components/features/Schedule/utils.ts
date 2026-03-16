import type { ScheduleSlot, ScheduleVolunteer, SlotType } from '../../../types/schedule.types';
import { ApiError } from '../../../services/apiClient';
import {
  PX_PER_HOUR,
  PX_PER_HOUR_V,
  CARD_HEIGHT,
  CARD_GAP,
  FULL_DAY_COL_WIDTH,
  SLOT_MIN_HEIGHT,
  AVATAR_COLORS,
} from './constants';
import type { AssignmentCardH, DayGanttColumn, DayColumnData, SlotBlockV, ApiErrorState, DetailItem } from './types';

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

/** Extract date key (YYYY-MM-DD) directly from ISO string (no timezone conversion) */
function dateKeyFromISO(isoStr: string): string {
  return isoStr.slice(0, 10);
}

/** Return all date keys a slot spans. Cross-midnight slots return two keys. */
function slotDateKeys(slot: ScheduleSlot): string[] {
  const startKey = slot.start.slice(0, 10);
  const endKey = slot.end.slice(0, 10);

  if (startKey === endKey) return [startKey];

  // If end is exactly midnight (00:00), it fully belongs to the start day
  const e = parseAsLocal(slot.end);
  if (e.getHours() === 0 && e.getMinutes() === 0) return [startKey];

  return [startKey, endKey];
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

export function slotHPos(slot: ScheduleSlot, globalMinHour: number): { left: number; width: number } {
  const s = parseAsLocal(slot.start);
  const e = parseAsLocal(slot.end);
  const startHour = s.getHours() + s.getMinutes() / 60;
  let endHour = e.getHours() + e.getMinutes() / 60;
  if (endHour === 0) endHour = 24;
  if (endHour < startHour) endHour = 24;
  return {
    left: (startHour - globalMinHour) * PX_PER_HOUR,
    width: Math.max((endHour - startHour) * PX_PER_HOUR - 4, 40),
  };
}

export function computeNowPosH(now: Date, globalMinHour: number, globalMaxHour: number): number | null {
  const nowHour = now.getHours() + now.getMinutes() / 60;
  if (nowHour < globalMinHour || nowHour > globalMaxHour) return null;
  return (nowHour - globalMinHour) * PX_PER_HOUR;
}

// ---- Vertical position helpers ---------------------------------------------

/** Get vertical position (top, height) for a slot in the time grid */
export function slotVPos(slot: ScheduleSlot, globalMinHour: number): { top: number; height: number } {
  const s = parseAsLocal(slot.start);
  const e = parseAsLocal(slot.end);
  const startHour = s.getHours() + s.getMinutes() / 60;
  let endHour = e.getHours() + e.getMinutes() / 60;
  if (endHour === 0) endHour = 24;
  if (endHour < startHour) endHour = 24;
  return {
    top: (startHour - globalMinHour) * PX_PER_HOUR_V,
    height: Math.max((endHour - startHour) * PX_PER_HOUR_V, SLOT_MIN_HEIGHT),
  };
}

/**
 * Get vertical position for a slot clamped to a specific day.
 * For cross-midnight slots, start-day shows startHour→24:00,
 * end-day shows 00:00→endHour.
 */
export function slotVPosForDay(
  slot: ScheduleSlot,
  globalMinHour: number,
  dateKey: string,
): { top: number; height: number } {
  const s = parseAsLocal(slot.start);
  const e = parseAsLocal(slot.end);
  const startDateKey = slot.start.slice(0, 10);

  let startHour: number;
  let endHour: number;

  if (startDateKey === dateKey) {
    // Rendering on the start day
    startHour = s.getHours() + s.getMinutes() / 60;
    const endDateKey = slot.end.slice(0, 10);
    if (endDateKey !== startDateKey) {
      endHour = 24; // extends to midnight
    } else {
      endHour = e.getHours() + e.getMinutes() / 60;
      if (endHour === 0) endHour = 24;
    }
  } else {
    // Rendering on the end day (slot started on a previous day)
    startHour = 0;
    endHour = e.getHours() + e.getMinutes() / 60;
    if (endHour === 0) endHour = 24;
  }

  return {
    top: (startHour - globalMinHour) * PX_PER_HOUR_V,
    height: Math.max((endHour - startHour) * PX_PER_HOUR_V, SLOT_MIN_HEIGHT),
  };
}

/** Get vertical position of "now" line */
export function computeNowPosV(now: Date, globalMinHour: number, globalMaxHour: number): number | null {
  const nowHour = now.getHours() + now.getMinutes() / 60;
  if (nowHour < globalMinHour || nowHour > globalMaxHour) return null;
  return (nowHour - globalMinHour) * PX_PER_HOUR_V;
}

// ---- Build vertical day columns -------------------------------------------

export function buildDayColumns(
  slots: ScheduleSlot[],
  globalMinHour: number,
  todayStr: string,
): DayColumnData[] {
  // Group slots by ALL dates they span (cross-midnight slots appear in both days)
  const byDate = new Map<string, ScheduleSlot[]>();
  for (const slot of slots) {
    const keys = slotDateKeys(slot);
    for (const dateKey of keys) {
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(slot);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, daySlots]) => {
      // Sort by effective start time for this day
      const sorted = [...daySlots].sort((a, b) => {
        const aStart = a.start.slice(0, 10) === dateKey
          ? parseAsLocal(a.start).getTime()
          : new Date(dateKey + 'T00:00:00').getTime();
        const bStart = b.start.slice(0, 10) === dateKey
          ? parseAsLocal(b.start).getTime()
          : new Date(dateKey + 'T00:00:00').getTime();
        return aStart - bStart;
      });

      // Determine day type
      const typeCounts: Record<SlotType, number> = { montage: 0, festival: 0, demontage: 0 };
      for (const s of sorted) typeCounts[s.type]++;
      const typeEntries = Object.entries(typeCounts) as [SlotType, number][];
      const dominant = typeEntries.sort((a, b) => b[1] - a[1])[0][0];
      const uniqueTypes = typeEntries.filter(([, c]) => c > 0).length;
      const dayType: SlotType | 'mixed' = uniqueTypes > 1 ? 'mixed' : dominant;

      const isFullDay = sorted.every((s) => s.type === 'montage' || s.type === 'demontage');

      // Position slot blocks vertically (clamped to this day for cross-midnight)
      const slotBlocks: SlotBlockV[] = sorted.map((slot) => {
        const { top, height } = slotVPosForDay(slot, globalMinHour, dateKey);
        return { slot, top, height };
      });

      // Labels
      const d = new Date(dateKey + 'T12:00:00');
      const label = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
      const shortLabel = d.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' });

      return {
        dateKey,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        shortLabel,
        dayType,
        isToday: dateKey === todayStr,
        isFullDay,
        slots: sorted,
        slotBlocks,
      };
    });
}

// ---- Legacy horizontal build (kept for now) --------------------------------

export function buildDayGantts(
  slots: ScheduleSlot[],
  volunteers: ScheduleVolunteer[],
  globalMinHour: number,
  globalMaxHour: number,
  todayStr: string,
): DayGanttColumn[] {
  const columnWidth = (globalMaxHour - globalMinHour) * PX_PER_HOUR;

  const byDate = new Map<string, ScheduleSlot[]>();
  for (const slot of slots) {
    const dateKey = dateKeyFromISO(slot.start);
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(slot);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, daySlots]) => {
      const sorted = [...daySlots].sort(
        (a, b) => parseAsLocal(a.start).getTime() - parseAsLocal(b.start).getTime(),
      );

      const cards: AssignmentCardH[] = [];
      const emptySlots: ScheduleSlot[] = [];

      for (const slot of sorted) {
        if (slot.volunteers.length === 0) {
          emptySlots.push(slot);
          continue;
        }
        const { left, width } = slotHPos(slot, globalMinHour);
        for (const sv of slot.volunteers) {
          const vol = volunteers.find((v) => v.nickname === sv.nickname);
          cards.push({
            assignmentId: sv.id,
            volunteerId: vol?.id ?? 0,
            slotId: slot.id,
            nickname: sv.nickname,
            slotType: slot.type,
            slotLabel: slot.label,
            creditHours: slot.credit_hours,
            startTime: slot.start,
            endTime: slot.end,
            left,
            width,
            lane: 0,
          });
        }
      }

      cards.sort((a, b) => {
        const timeDiff = parseAsLocal(a.startTime).getTime() - parseAsLocal(b.startTime).getTime();
        return timeDiff !== 0 ? timeDiff : a.nickname.localeCompare(b.nickname);
      });

      const laneEnds: number[] = [];
      for (const card of cards) {
        let placed = false;
        for (let i = 0; i < laneEnds.length; i++) {
          if (laneEnds[i] <= card.left) {
            laneEnds[i] = card.left + card.width;
            card.lane = i;
            placed = true;
            break;
          }
        }
        if (!placed) {
          card.lane = laneEnds.length;
          laneEnds.push(card.left + card.width);
        }
      }

      const numLanes = Math.max(laneEnds.length, 1);
      const contentHeight = numLanes * (CARD_HEIGHT + CARD_GAP) + CARD_GAP;

      const typeCounts: Record<SlotType, number> = { montage: 0, festival: 0, demontage: 0 };
      for (const s of sorted) typeCounts[s.type]++;
      const typeEntries = Object.entries(typeCounts) as [SlotType, number][];
      const dominant = typeEntries.sort((a, b) => b[1] - a[1])[0][0];
      const uniqueTypes = typeEntries.filter(([, c]) => c > 0).length;
      const dayType: SlotType | 'mixed' = uniqueTypes > 1 ? 'mixed' : dominant;

      const isFullDay = sorted.every((s) => s.type === 'montage' || s.type === 'demontage');

      const d = new Date(dateKey + 'T12:00:00');
      const label = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
      const shortLabel = d.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' });

      return {
        dateKey,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        shortLabel,
        dayType,
        isToday: dateKey === todayStr,
        isFullDay,
        slots: sorted,
        cards,
        emptySlots,
        numLanes,
        columnWidth: isFullDay ? FULL_DAY_COL_WIDTH : columnWidth,
        contentHeight,
      };
    });
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
