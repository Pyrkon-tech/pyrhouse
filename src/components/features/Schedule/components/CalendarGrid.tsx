import React, { useRef, useCallback } from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { CalendarData, CalendarSlotItem } from '../types';
import type { ScheduleSlot, ScheduleVolunteer } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG, DAY_TYPE_COLORS } from '../constants';
import { parseAsLocal, avatarColor } from '../utils';

// ---- Constants ---------------------------------------------------------------

const TIME_AXIS_W = 56;
const MIN_COL_W = 210;
const MIN_SLOT_H = 32;
const HOUR_LABEL_H = 20;
const CHIPS_PER_ROW = 4;

// ---- Helpers -----------------------------------------------------------------

function fmtHour(h: number): string {
  const h24 = ((h % 24) + 24) % 24;
  return `${String(h24).padStart(2, '0')}:00`;
}

function slotStartH(slot: ScheduleSlot): number {
  const d = parseAsLocal(slot.start);
  return d.getHours() + d.getMinutes() / 60;
}

function slotEndH(slot: ScheduleSlot): number {
  const startDay = slot.start.slice(0, 10);
  const endDay = slot.end.slice(0, 10);
  const d = parseAsLocal(slot.end);
  const h = d.getHours() + d.getMinutes() / 60;
  if (endDay !== startDay) return 24 + (h > 0 ? h : 0);
  return h === 0 ? 24 : h;
}

/** Compute per-hour heights so each hour row is tall enough for its chips. */
function computeHourLayout(
  days: import('../types').CalendarDay[],
  minHour: number,
  maxHour: number,
  pxPerHour: number,
): { hourHeights: number[]; hourOffsets: number[]; totalH: number } {
  const chipH = pxPerHour < 35 ? 16 : pxPerHour < 70 ? 19 : 22;
  const rowGapPx = pxPerHour < 35 ? 2 : 3;
  const rowPx = chipH + rowGapPx;
  const hourCount = maxHour - minHour;

  const hourHeights: number[] = Array.from({ length: hourCount }, (_, i) => {
    const h = minHour + i;
    let maxVols = 0;
    for (const day of days) {
      for (const { slot } of day.slotItems) {
        const sH = slotStartH(slot);
        const eH = slotEndH(slot);
        if (h < eH && h + 1 > sH) {
          maxVols = Math.max(maxVols, slot.volunteers.length);
        }
      }
    }
    const rows = Math.max(1, Math.ceil(maxVols / CHIPS_PER_ROW));
    return Math.max(pxPerHour, rows * rowPx + 8);
  });

  const hourOffsets: number[] = [0];
  for (const h of hourHeights) {
    hourOffsets.push(hourOffsets[hourOffsets.length - 1] + h);
  }

  return { hourHeights, hourOffsets, totalH: hourOffsets[hourCount] };
}

/** Convert absolute Y within column to fractional hour. */
function yToHour(relY: number, minHour: number, hourOffsets: number[]): number {
  for (let i = 0; i < hourOffsets.length - 1; i++) {
    if (relY < hourOffsets[i + 1]) {
      const frac = (relY - hourOffsets[i]) / (hourOffsets[i + 1] - hourOffsets[i]);
      return minHour + i + frac;
    }
  }
  return minHour + hourOffsets.length - 1;
}

/** Top pixel position for a slot. */
function getSlotTop(startH: number, minHour: number, hourOffsets: number[], hourHeights: number[]): number {
  const idx = Math.max(0, Math.min(Math.floor(startH - minHour), hourHeights.length - 1));
  const frac = Math.max(0, startH - minHour - idx);
  return hourOffsets[idx] + frac * hourHeights[idx];
}

/** Pixel height for a slot spanning startH..endH. */
function getSlotH(startH: number, endH: number, minHour: number, hourOffsets: number[], hourHeights: number[]): number {
  const si = Math.max(0, Math.min(Math.floor(startH - minHour), hourHeights.length - 1));
  const sFrac = Math.max(0, startH - minHour - si);
  const startPx = hourOffsets[si] + sFrac * hourHeights[si];

  const ei = Math.max(0, Math.min(Math.floor(endH - minHour), hourHeights.length));
  const eFrac = Math.max(0, endH - minHour - Math.floor(endH - minHour));
  const endOffset = ei < hourOffsets.length ? hourOffsets[ei] : hourOffsets[hourOffsets.length - 1];
  const endPx = eFrac > 0 && ei < hourHeights.length
    ? hourOffsets[ei] + eFrac * hourHeights[ei]
    : endOffset;

  return Math.max(MIN_SLOT_H, endPx - startPx);
}

// ---- SlotBlock ---------------------------------------------------------------

interface DragPayload {
  volunteerId: number;
  nickname: string;
  assignmentId?: number;
  fromSlotId?: number;
}

interface SlotBlockProps {
  item: CalendarSlotItem;
  minHour: number;
  pxPerHour: number;
  hourOffsets: number[];
  hourHeights: number[];
  isSelected: boolean;
  isAssignMode: boolean;
  highlightedVolunteerId: number | null;
  nicknameToVolId: Map<string, number>;
  canEdit: boolean;
  onSelect: (slotId: number) => void;
  onContextMenu: (slotId: number, x: number, y: number) => void;
  onAssignModeClick: (slotId: number) => void;
  onRemoveAssignment: (assignmentId: number) => void;
  onMoveAssignment?: (assignmentId: number, volunteerId: number, nickname: string, fromSlotId: number, toSlotId: number) => void;
  onAssignVolunteer?: (volunteerId: number, nickname: string, toSlotId: number) => void;
}

const SlotBlock: React.FC<SlotBlockProps> = ({
  item, minHour, pxPerHour, hourOffsets, hourHeights,
  isSelected, isAssignMode, highlightedVolunteerId, nicknameToVolId,
  canEdit, onSelect, onContextMenu, onAssignModeClick, onRemoveAssignment, onMoveAssignment, onAssignVolunteer,
}) => {
  const { slot, left, width } = item;
  const typeCfg = SLOT_TYPE_CONFIG[slot.type];
  const isFestival = slot.type === 'festival';

  const startH = slotStartH(slot);
  const endH = slotEndH(slot);
  const isCrossMidnight = endH > 24;

  const top = getSlotTop(startH, minHour, hourOffsets, hourHeights);
  const slotHeight = getSlotH(startH, endH, minHour, hourOffsets, hourHeights);

  // Chip dimensions scale with zoom level
  const chipH  = pxPerHour < 35 ? 16 : pxPerHour < 70 ? 19 : 22;
  const chipFs = pxPerHour < 35 ? '0.62rem' : pxPerHour < 70 ? '0.72rem' : '0.78rem';
  const chipPx = pxPerHour < 35 ? 0.45 : 0.6;
  const rowGapPx = pxPerHour < 35 ? 2 : 3;
  const colGap   = pxPerHour < 35 ? 0.3 : 0.4;

  // isLarge: tall enough for label row + chips (non-festival only)
  const labelRowPx = !isFestival ? 20 : 0;
  const isLarge = slotHeight >= labelRowPx + (chipH + rowGapPx) * 2 + 4;

  const alreadyHere = isAssignMode && highlightedVolunteerId != null &&
    slot.volunteers.some(sv => nicknameToVolId.get(sv.nickname) === highlightedVolunteerId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAssignMode && !alreadyHere) onAssignModeClick(slot.id);
    else if (!isAssignMode) onSelect(slot.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canEdit) onContextMenu(slot.id, e.clientX, e.clientY);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data: DragPayload = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.assignmentId != null && data.fromSlotId != null) {
        if (data.fromSlotId !== slot.id)
          onMoveAssignment?.(data.assignmentId, data.volunteerId, data.nickname, data.fromSlotId, slot.id);
      } else {
        onAssignVolunteer?.(data.volunteerId, data.nickname, slot.id);
      }
    } catch { /* ignore malformed */ }
  };

  const baseChipSx = {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    px: chipPx,
    py: 0,
    borderRadius: 0.5,
    border: '1px solid',
    fontSize: chipFs,
    fontWeight: 600,
    lineHeight: `${chipH}px`,
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const,
    flexShrink: 0,
  };

  const chips = slot.volunteers.map(sv => {
    const volId = nicknameToVolId.get(sv.nickname);
    const isHl = highlightedVolunteerId != null && volId === highlightedVolunteerId;
    const color = avatarColor(volId ?? 0);
    return (
      <Box
        key={sv.id}
        draggable={canEdit}
        onDragStart={(e) => {
          e.stopPropagation();
          const payload: DragPayload = { assignmentId: sv.id, volunteerId: volId ?? 0, nickname: sv.nickname, fromSlotId: slot.id };
          e.dataTransfer.setData('application/json', JSON.stringify(payload));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={(e) => e.stopPropagation()}
        sx={{
          ...baseChipSx,
          borderColor: `${color}55`,
          bgcolor: `${color}16`,
          color: 'text.primary',
          cursor: canEdit ? 'grab' : 'default',
          outline: isHl ? '2px solid' : 'none',
          outlineColor: 'primary.main',
          outlineOffset: 1,
          opacity: highlightedVolunteerId != null && !isHl ? 0.3 : 1,
          transition: 'opacity 0.15s, border-color 0.12s',
          '&:hover': canEdit ? { borderColor: color, bgcolor: `${color}28` } : {},
          '&:active': canEdit ? { cursor: 'grabbing' } : {},
        }}
      >
        {sv.nickname}
        {canEdit && (
          <Box
            component="span"
            onClick={(e) => { e.stopPropagation(); onRemoveAssignment(sv.id); }}
            sx={{ fontSize: '0.45rem', lineHeight: 1, opacity: 0.35, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', ml: 0.25, '&:hover': { opacity: 1, color: 'error.main' } }}
          >
            ✕
          </Box>
        )}
      </Box>
    );
  });

  const assignHint = isAssignMode && !alreadyHere
    ? <Box sx={{ fontSize: chipFs, color: 'primary.main', fontWeight: 700, lineHeight: `${chipH}px`, flexShrink: 0 }}>＋</Box>
    : isAssignMode && alreadyHere
    ? <Box sx={{ fontSize: '0.52rem', color: 'rgba(255,210,0,0.9)', fontWeight: 700, lineHeight: `${chipH}px`, flexShrink: 0 }}>✓</Box>
    : null;

  const understaffedDot = isFestival && slot.volunteers.length < 2 ? (
    <Box sx={{
      flexShrink: 0,
      width: slot.volunteers.length === 0 ? 7 : 5,
      height: slot.volunteers.length === 0 ? 7 : 5,
      borderRadius: '50%',
      bgcolor: slot.volunteers.length === 0 ? 'error.main' : 'warning.main',
      opacity: slot.volunteers.length === 0 ? 0.65 : 0.85,
    }} />
  ) : null;

  const countBadge = !isFestival ? (
    <Box sx={{
      flexShrink: 0,
      fontSize: '0.5rem',
      fontWeight: 700,
      px: 0.4,
      borderRadius: 0.5,
      lineHeight: `${chipH}px`,
      bgcolor: slot.volunteers.length === 0 ? 'rgba(239,68,68,0.22)' : slot.volunteers.length < 2 ? 'rgba(255,152,0,0.22)' : 'rgba(16,185,129,0.22)',
      color: slot.volunteers.length === 0 ? 'error.main' : slot.volunteers.length < 2 ? 'warning.main' : 'success.main',
    }}>
      {slot.volunteers.length}
    </Box>
  ) : null;

  const chipArea = (
    <Box sx={{
      display: 'flex',
      flexWrap: 'wrap',
      rowGap: `${rowGapPx}px`,
      columnGap: colGap,
      alignContent: 'flex-start',
    }}>
      {chips}{assignHint}
    </Box>
  );

  return (
    <Box
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragOver={canEdit ? handleDragOver : undefined}
      onDrop={canEdit ? handleDrop : undefined}
      sx={{
        position: 'absolute',
        top,
        left: `calc(${left * 100}% + 1px)`,
        width: `calc(${width * 100}% - 2px)`,
        height: slotHeight,
        bgcolor: alreadyHere
          ? 'rgba(255,200,0,0.13)'
          : isAssignMode ? 'rgba(255,152,0,0.06)'
          : isSelected  ? 'rgba(255,152,0,0.05)'
          : !isFestival ? `${typeCfg.color}0d`
          : slot.volunteers.length === 0 ? 'rgba(239,68,68,0.04)'
          : 'transparent',
        border: alreadyHere
          ? '1px solid rgba(255,200,0,0.55)'
          : isSelected ? '1px solid rgba(255,152,0,0.35)'
          : '1px solid transparent',
        borderLeft: alreadyHere
          ? '3px solid rgba(255,200,0,0.8)'
          : !isFestival ? `3px solid ${typeCfg.color}99`
          : `2px solid ${typeCfg.color}30`,
        borderBottom: isFestival ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
        borderRadius: !isFestival ? 1 : 0,
        overflow: 'hidden',
        cursor: alreadyHere ? 'not-allowed' : 'pointer',
        zIndex: isSelected ? 4 : alreadyHere ? 3 : 2,
        transition: 'background-color 0.1s, border-color 0.1s',
        '&:hover': { bgcolor: alreadyHere ? 'rgba(255,200,0,0.18)' : isAssignMode ? 'rgba(255,152,0,0.1)' : 'rgba(255,255,255,0.025)', zIndex: 3 },
        display: 'flex',
        flexDirection: 'column',
        px: 0.5,
        pt: 0.3,
        pb: 0.3,
      }}
    >
      {isLarge && !isFestival ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mb: `${rowGapPx}px` }}>
            <Typography sx={{
              fontSize: '0.63rem', fontWeight: 700, lineHeight: 1.3,
              color: isAssignMode ? 'primary.light' : typeCfg.color,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, minWidth: 0,
            }}>
              {slot.label || typeCfg.label}
              {isCrossMidnight && <Box component="span" sx={{ ml: 0.4, fontSize: '0.5rem', color: 'warning.main' }}>🌙</Box>}
            </Typography>
            {countBadge}
          </Box>
          {chipArea}
        </>
      ) : isLarge ? (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', overflow: 'hidden', flex: 1, minHeight: 0, gap: 0.4 }}>
          {chipArea}
          {understaffedDot}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', overflow: 'hidden', flex: 1, minHeight: 0, gap: 0.4 }}>
          {chipArea}
          {isFestival ? understaffedDot : countBadge}
        </Box>
      )}
    </Box>
  );
};

const MemoSlotBlock = React.memo(SlotBlock);

// ---- Now line ----------------------------------------------------------------

const NowLine: React.FC<{ top: number; isToday: boolean }> = ({ top, isToday }) => (
  <Box sx={{
    position: 'absolute',
    top,
    left: 0,
    right: 0,
    height: 0,
    borderTop: isToday
      ? '2px dashed rgba(255,152,0,0.9)'
      : '1px dashed rgba(255,152,0,0.35)',
    zIndex: 8,
    pointerEvents: 'none',
  }}>
    {/* Dot on left edge — only on today */}
    {isToday && (
      <Box sx={{
        position: 'absolute',
        left: -5,
        top: -5,
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        boxShadow: '0 0 6px rgba(255,152,0,0.8)',
      }} />
    )}
  </Box>
);

// ---- DayColumn ---------------------------------------------------------------

interface DayColumnProps {
  day: import('../types').CalendarDay;
  minHour: number;
  maxHour: number;
  pxPerHour: number;
  hourOffsets: number[];
  hourHeights: number[];
  totalH: number;
  now: Date;
  canEdit: boolean;
  isAssignMode: boolean;
  highlightedVolunteerId: number | null;
  selectedSlotId: number | null;
  nicknameToVolId: Map<string, number>;
  onSlotSelect: (slotId: number) => void;
  onContextMenu: (slotId: number, x: number, y: number) => void;
  onAssignModeClick: (slotId: number) => void;
  onRemoveAssignment: (assignmentId: number) => void;
  onMoveAssignment?: (assignmentId: number, volunteerId: number, nickname: string, fromSlotId: number, toSlotId: number) => void;
  onAssignVolunteer?: (volunteerId: number, nickname: string, toSlotId: number) => void;
  onEmptyClick?: (dateKey: string, hour: number) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({
  day, minHour, maxHour, pxPerHour, hourOffsets, hourHeights, totalH, now,
  canEdit, isAssignMode, highlightedVolunteerId, selectedSlotId,
  nicknameToVolId, onSlotSelect, onContextMenu, onAssignModeClick,
  onRemoveAssignment, onMoveAssignment, onAssignVolunteer, onEmptyClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEmptyDblClick = useCallback((e: React.MouseEvent) => {
    if (!canEdit || !onEmptyClick || !containerRef.current || isAssignMode) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const rawH = yToHour(relY, minHour, hourOffsets);
    const snapped = Math.round(rawH * 2) / 2;
    const clamped = Math.max(minHour, Math.min(maxHour - 1, snapped));
    onEmptyClick(day.dateKey, clamped);
  }, [canEdit, onEmptyClick, isAssignMode, minHour, maxHour, hourOffsets, day.dateKey]);

  const slotAtY = useCallback((relY: number) => {
    const hour = yToHour(relY, minHour, hourOffsets);
    return day.slotItems.find(({ slot }) => {
      const d = parseAsLocal(slot.start);
      const startH = d.getHours() + d.getMinutes() / 60;
      const e2 = parseAsLocal(slot.end);
      let endH = e2.getHours() + e2.getMinutes() / 60;
      if (slot.end.slice(0, 10) !== slot.start.slice(0, 10)) endH += 24;
      if (endH === 0) endH = 24;
      return hour >= startH && hour < endH;
    }) ?? null;
  }, [day.slotItems, minHour, hourOffsets]);

  const handleColumnDragOver = useCallback((e: React.DragEvent) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [canEdit]);

  const handleColumnDrop = useCallback((e: React.DragEvent) => {
    if (!canEdit || !containerRef.current) return;
    e.preventDefault();
    try {
      const data: DragPayload = JSON.parse(e.dataTransfer.getData('application/json'));
      const rect = containerRef.current.getBoundingClientRect();
      const target = slotAtY(e.clientY - rect.top);
      if (!target) return;
      const toSlotId = target.slot.id;
      if (data.assignmentId != null && data.fromSlotId != null) {
        if (toSlotId !== data.fromSlotId) {
          onMoveAssignment?.(data.assignmentId, data.volunteerId, data.nickname, data.fromSlotId, toSlotId);
        }
      } else {
        onAssignVolunteer?.(data.volunteerId, data.nickname, toSlotId);
      }
    } catch { /* ignore malformed */ }
  }, [canEdit, slotAtY, onMoveAssignment, onAssignVolunteer]);

  const nowH = now.getHours() + now.getMinutes() / 60;
  const showNow = nowH >= minHour && nowH <= maxHour;
  const nowTop = showNow ? getSlotTop(nowH, minHour, hourOffsets, hourHeights) : null;

  const hourCount = maxHour - minHour;

  return (
    <Box
      ref={containerRef}
      onDoubleClick={handleEmptyDblClick}
      onDragOver={canEdit ? handleColumnDragOver : undefined}
      onDrop={canEdit ? handleColumnDrop : undefined}
      sx={{
        flex: 1,
        minWidth: MIN_COL_W,
        height: totalH,
        position: 'relative',
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: day.isToday ? 'rgba(255,152,0,0.03)' : 'transparent',
        cursor: canEdit && !isAssignMode ? 'crosshair' : 'default',
      }}
    >
      {/* Hour grid lines — positioned using hourOffsets */}
      {Array.from({ length: hourCount + 1 }, (_, i) => {
        const h = minHour + i;
        const top = hourOffsets[i];
        const isMidnight = h % 24 === 0 && h !== minHour;
        const isMajor = h % 6 === 0;
        return (
          <Box
            key={h}
            sx={{
              position: 'absolute',
              left: 0, right: 0,
              top,
              height: '1px',
              bgcolor: isMidnight
                ? 'rgba(255,152,0,0.3)'
                : isMajor
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.03)',
              borderTop: isMidnight ? '1px dashed rgba(255,152,0,0.4)' : 'none',
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Now line */}
      {nowTop !== null && <NowLine top={nowTop} isToday={day.isToday} />}

      {/* Slot blocks */}
      {day.slotItems.map(item => (
        <MemoSlotBlock
          key={item.slot.id}
          item={item}
          minHour={minHour}
          pxPerHour={pxPerHour}
          hourOffsets={hourOffsets}
          hourHeights={hourHeights}
          isSelected={selectedSlotId === item.slot.id}
          isAssignMode={isAssignMode}
          highlightedVolunteerId={highlightedVolunteerId}
          nicknameToVolId={nicknameToVolId}
          canEdit={canEdit}
          onSelect={onSlotSelect}
          onContextMenu={onContextMenu}
          onAssignModeClick={onAssignModeClick}
          onRemoveAssignment={onRemoveAssignment}
          onMoveAssignment={onMoveAssignment}
          onAssignVolunteer={onAssignVolunteer}
        />
      ))}
    </Box>
  );
};

// ---- Time axis ---------------------------------------------------------------

const TimeAxis: React.FC<{
  minHour: number;
  maxHour: number;
  hourOffsets: number[];
  hourHeights: number[];
  totalH: number;
  now: Date;
}> = ({ minHour, maxHour, hourOffsets, hourHeights, totalH, now }) => {
  const nowH = now.getHours() + now.getMinutes() / 60;
  const showNow = nowH >= minHour && nowH <= maxHour;
  const nowTop = showNow ? getSlotTop(nowH, minHour, hourOffsets, hourHeights) : null;
  const nowLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <Box
      sx={{
        width: TIME_AXIS_W,
        flexShrink: 0,
        height: totalH,
        position: 'relative',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {Array.from({ length: maxHour - minHour + 1 }, (_, i) => {
        const h = minHour + i;
        const top = (hourOffsets[i] ?? hourOffsets[hourOffsets.length - 1]) - HOUR_LABEL_H / 2;
        const isMidnight = h % 24 === 0 && h !== minHour;
        return (
          <Typography
            key={h}
            sx={{
              position: 'absolute',
              right: 6,
              top,
              fontSize: isMidnight || h % 6 === 0 ? '0.72rem' : '0.66rem',
              fontFamily: 'monospace',
              lineHeight: `${HOUR_LABEL_H}px`,
              color: isMidnight ? 'warning.main' : h % 6 === 0 ? 'text.primary' : 'text.secondary',
              fontWeight: isMidnight ? 700 : h % 6 === 0 ? 700 : 600,
              userSelect: 'none',
            }}
          >
            {fmtHour(h)}
          </Typography>
        );
      })}

      {/* Now indicator on time axis */}
      {nowTop !== null && (
        <Box sx={{
          position: 'absolute',
          right: 0,
          top: nowTop - 9,
          bgcolor: 'primary.main',
          color: '#000',
          fontSize: '0.6rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          px: 0.5,
          lineHeight: '18px',
          borderRadius: '3px 0 0 3px',
          zIndex: 12,
          userSelect: 'none',
          boxShadow: '0 0 6px rgba(255,152,0,0.6)',
        }}>
          {nowLabel}
        </Box>
      )}
    </Box>
  );
};

// ---- Day header row ----------------------------------------------------------

const DayHeaderRow: React.FC<{
  days: import('../types').CalendarDay[];
  canEdit: boolean;
  onAddSlot?: (dateKey: string) => void;
}> = ({ days, canEdit, onAddSlot }) => (
  <Box
    sx={{
      display: 'flex',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 20,
      bgcolor: 'background.default',
      borderBottom: '2px solid',
      borderColor: 'divider',
    }}
  >
    <Box sx={{ width: TIME_AXIS_W, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }} />

    {days.map(day => {
      const cfg = DAY_TYPE_COLORS[day.dayType] ?? DAY_TYPE_COLORS.mixed;
      return (
        <Box
          key={day.dateKey}
          sx={{
            flex: 1,
            minWidth: MIN_COL_W,
            borderLeft: '1px solid',
            borderColor: 'divider',
            borderBottom: `3px solid ${cfg.color}`,
            bgcolor: day.isToday ? 'rgba(255,152,0,0.06)' : cfg.bg,
            px: 1,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: '0.78rem',
                fontWeight: day.isToday ? 800 : 600,
                color: day.isToday ? 'primary.main' : 'text.primary',
                lineHeight: 1.2,
              }}
            >
              {day.shortLabel}
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', color: cfg.color, fontWeight: 600 }}>
              {cfg.label}
              {day.isToday && (
                <Box component="span" sx={{ ml: 0.5, color: 'primary.main' }}>· Dziś</Box>
              )}
            </Typography>
          </Box>

          {canEdit && onAddSlot && (
            <Tooltip title="Dodaj slot" placement="bottom">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onAddSlot(day.dateKey); }}
                sx={{
                  p: 0.25,
                  color: 'text.disabled',
                  '&:hover': { color: 'primary.main', bgcolor: 'rgba(255,152,0,0.1)' },
                }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      );
    })}
  </Box>
);

// ---- CalendarGrid (main) -----------------------------------------------------

export interface CalendarGridProps {
  calendarData: CalendarData;
  pxPerHour: number;
  canEdit: boolean;
  now: Date;
  highlightedVolunteerId: number | null;
  selectedSlotId: number | null;
  isAssignMode: boolean;
  volunteers: ScheduleVolunteer[];
  onSlotSelect: (slotId: number) => void;
  onContextMenu: (slotId: number, x: number, y: number) => void;
  onAssignModeClick: (slotId: number) => void;
  onRemoveAssignment: (assignmentId: number) => void;
  onMoveAssignment?: (assignmentId: number, volunteerId: number, nickname: string, fromSlotId: number, toSlotId: number) => void;
  onAssignVolunteer?: (volunteerId: number, nickname: string, toSlotId: number) => void;
  onAddSlot?: (dateKey: string) => void;
  onEmptyClick?: (dateKey: string, hour: number) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarData, pxPerHour, canEdit, now,
  highlightedVolunteerId, selectedSlotId, isAssignMode,
  volunteers, onSlotSelect, onContextMenu, onAssignModeClick,
  onRemoveAssignment, onMoveAssignment, onAssignVolunteer, onAddSlot, onEmptyClick,
}) => {
  const { days, minHour, maxHour } = calendarData;

  const nicknameToVolId = React.useMemo(
    () => new Map(volunteers.map(v => [v.nickname, v.id])),
    [volunteers],
  );

  const { hourHeights, hourOffsets, totalH } = React.useMemo(
    () => computeHourLayout(days, minHour, maxHour, pxPerHour),
    [days, minHour, maxHour, pxPerHour],
  );

  if (days.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.disabled" variant="body2">
          Brak slotów do wyświetlenia
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DayHeaderRow days={days} canEdit={canEdit} onAddSlot={onAddSlot} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          display: 'flex',
          '&::-webkit-scrollbar': { width: 8, height: 8 },
          '&::-webkit-scrollbar-track': { bgcolor: 'background.default' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'action.disabled', borderRadius: 1 },
        }}
      >
        <Box sx={{ position: 'sticky', left: 0, zIndex: 10, bgcolor: 'background.default' }}>
          <TimeAxis minHour={minHour} maxHour={maxHour} hourOffsets={hourOffsets} hourHeights={hourHeights} totalH={totalH} now={now} />
        </Box>

        {days.map(day => (
          <DayColumn
            key={day.dateKey}
            day={day}
            minHour={minHour}
            maxHour={maxHour}
            pxPerHour={pxPerHour}
            hourOffsets={hourOffsets}
            hourHeights={hourHeights}
            totalH={totalH}
            now={now}
            canEdit={canEdit}
            isAssignMode={isAssignMode}
            highlightedVolunteerId={highlightedVolunteerId}
            selectedSlotId={selectedSlotId}
            nicknameToVolId={nicknameToVolId}
            onSlotSelect={onSlotSelect}
            onContextMenu={onContextMenu}
            onAssignModeClick={onAssignModeClick}
            onRemoveAssignment={onRemoveAssignment}
            onMoveAssignment={onMoveAssignment}
            onAssignVolunteer={onAssignVolunteer}
            onEmptyClick={onEmptyClick}
          />
        ))}
      </Box>
    </Box>
  );
};

export default React.memo(CalendarGrid);
