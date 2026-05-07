import React, { useRef, useCallback } from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { CalendarData, CalendarSlotItem } from '../types';
import type { ScheduleSlot, ScheduleVolunteer } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG, DAY_TYPE_COLORS } from '../constants';
import { parseAsLocal, avatarColor } from '../utils';

// ---- Constants ---------------------------------------------------------------

const TIME_AXIS_W = 56;
const MIN_COL_W = 160;
const MIN_SLOT_H = 32;
const HOUR_LABEL_H = 20; // height of each hour row label zone

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

// ---- SlotBlock ---------------------------------------------------------------

interface DragPayload {
  volunteerId: number;
  nickname: string;
  /** Present when dragging an existing chip (move). Absent when dragging from roster (assign). */
  assignmentId?: number;
  fromSlotId?: number;
}

interface SlotBlockProps {
  item: CalendarSlotItem;
  minHour: number;
  pxPerHour: number;
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
  item, minHour, pxPerHour,
  isSelected, isAssignMode, highlightedVolunteerId, nicknameToVolId,
  canEdit, onSelect, onContextMenu, onAssignModeClick, onRemoveAssignment, onMoveAssignment, onAssignVolunteer,
}) => {
  const { slot, left, width } = item;
  const typeCfg = SLOT_TYPE_CONFIG[slot.type];

  const startH = slotStartH(slot);
  const endH = slotEndH(slot);
  const durationH = endH - startH;

  const top = (startH - minHour) * pxPerHour;
  const naturalH = durationH * pxPerHour;
  const height = Math.max(MIN_SLOT_H, naturalH);

  const isCrossMidnight = endH > 24;
  const isAssignable = isAssignMode;

  // Is the highlighted volunteer already assigned to this slot?
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

  const isLarge = height >= 52;

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
        // chip move between slots
        if (data.fromSlotId !== slot.id) {
          onMoveAssignment?.(data.assignmentId, data.volunteerId, data.nickname, data.fromSlotId, slot.id);
        }
      } else {
        // roster drag → assign
        onAssignVolunteer?.(data.volunteerId, data.nickname, slot.id);
      }
    } catch { /* ignore malformed drag data */ }
  };

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
        height,
        bgcolor: alreadyHere
          ? 'rgba(255,200,0,0.13)'
          : isAssignMode
          ? 'rgba(255,152,0,0.06)'
          : isSelected
          ? 'rgba(255,152,0,0.05)'
          : slot.type !== 'festival'
          ? `${typeCfg.color}0d`
          : slot.volunteers.length === 0
          ? 'rgba(239,68,68,0.04)'
          : 'transparent',
        border: alreadyHere
          ? '1px solid rgba(255,200,0,0.55)'
          : isSelected
          ? '1px solid rgba(255,152,0,0.35)'
          : '1px solid transparent',
        borderLeft: alreadyHere
          ? '3px solid rgba(255,200,0,0.8)'
          : slot.type !== 'festival'
          ? `3px solid ${typeCfg.color}99`
          : `2px solid ${typeCfg.color}30`,
        borderBottom: slot.type === 'festival' ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
        borderRadius: slot.type !== 'festival' ? 1 : 0,
        overflow: 'hidden',
        cursor: alreadyHere ? 'not-allowed' : 'pointer',
        zIndex: isSelected ? 4 : alreadyHere ? 3 : 2,
        transition: 'background-color 0.1s, border-color 0.1s',
        '&:hover': { bgcolor: alreadyHere ? 'rgba(255,200,0,0.18)' : isAssignMode ? 'rgba(255,152,0,0.1)' : 'rgba(255,255,255,0.025)', zIndex: 3 },
        display: 'flex',
        flexDirection: 'column',
        px: 0.5,
        pt: 0.2,
        pb: 0.2,
        gap: 0,
      }}
    >
      {(() => {
        const isFestival = slot.type === 'festival';

        /* Understaffed dot — only shown for festival slots with < 2 people */
        const understaffedDot = isFestival && slot.volunteers.length < 2 ? (
          <Box sx={{
            flexShrink: 0,
            width: slot.volunteers.length === 0 ? 8 : 6,
            height: slot.volunteers.length === 0 ? 8 : 6,
            borderRadius: '50%',
            bgcolor: slot.volunteers.length === 0 ? 'error.main' : 'warning.main',
            opacity: slot.volunteers.length === 0 ? 0.6 : 0.8,
            alignSelf: 'center',
          }} />
        ) : null;

        /* Full badge — only for montage/demontage */
        const badge = !isFestival ? (
          <Box
            sx={{
              flexShrink: 0,
              fontSize: '0.52rem',
              fontWeight: 700,
              px: 0.45,
              py: 0,
              borderRadius: 0.5,
              lineHeight: '15px',
              bgcolor: slot.volunteers.length === 0 ? 'rgba(239,68,68,0.22)' : slot.volunteers.length < 2 ? 'rgba(255,152,0,0.22)' : 'rgba(16,185,129,0.22)',
              color: slot.volunteers.length === 0 ? 'error.main' : slot.volunteers.length < 2 ? 'warning.main' : 'success.main',
            }}
          >
            {slot.volunteers.length}
          </Box>
        ) : null;

        const chipRow = (wrap: boolean) => slot.volunteers.map(sv => {
          const volId = nicknameToVolId.get(sv.nickname);
          const isHl = highlightedVolunteerId != null && volId === highlightedVolunteerId;
          const color = avatarColor(volId ?? 0);
          return (
            <Box
              key={sv.id}
              draggable={canEdit}
              onDragStart={(e) => {
                e.stopPropagation();
                const payload: DragPayload = {
                  assignmentId: sv.id,
                  volunteerId: volId ?? 0,
                  nickname: sv.nickname,
                  fromSlotId: slot.id,
                };
                e.dataTransfer.setData('application/json', JSON.stringify(payload));
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={(e) => e.stopPropagation()}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.2,
                px: 0.45,
                py: 0,
                borderRadius: 0.5,
                border: '1px solid',
                borderColor: `${color}55`,
                bgcolor: `${color}16`,
                fontSize: '0.6rem',
                fontWeight: 600,
                lineHeight: '15px',
                color: 'text.primary',
                cursor: canEdit ? 'grab' : 'default',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                outline: isHl ? '2px solid' : 'none',
                outlineColor: 'primary.main',
                outlineOffset: 1,
                opacity: highlightedVolunteerId != null && !isHl ? 0.3 : 1,
                transition: 'opacity 0.15s, border-color 0.12s',
                flexShrink: wrap ? undefined : 0,
                '&:hover': canEdit ? { borderColor: color, bgcolor: `${color}28` } : {},
                '&:active': canEdit ? { cursor: 'grabbing' } : {},
              }}
            >
              {sv.nickname}
              {canEdit && (
                <Box
                  component="span"
                  onClick={(e) => { e.stopPropagation(); onRemoveAssignment(sv.id); }}
                  sx={{
                    fontSize: '0.48rem',
                    lineHeight: 1,
                    opacity: 0.35,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    '&:hover': { opacity: 1, color: 'error.main' },
                  }}
                >
                  ✕
                </Box>
              )}
            </Box>
          );
        });

        if (isLarge && !isFestival) {
          /* Large non-festival slot (montage/demontage): label + badge + chips */
          return (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 0 }}>
                <Typography sx={{
                  fontSize: '0.65rem', fontWeight: 700, lineHeight: 1.25,
                  color: isAssignable ? 'primary.light' : typeCfg.color,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, minWidth: 0,
                }}>
                  {slot.label || typeCfg.label}
                  {isCrossMidnight && <Box component="span" sx={{ ml: 0.4, fontSize: '0.5rem', color: 'warning.main' }}>🌙</Box>}
                </Typography>
                {badge}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, mt: 0.3, overflow: 'hidden' }}>
                {chipRow(true)}
                {isAssignable && !alreadyHere && (
                  <Box sx={{ fontSize: '0.6rem', color: 'primary.main', fontWeight: 700, lineHeight: '15px', px: 0.5, alignSelf: 'center' }}>＋</Box>
                )}
                {alreadyHere && (
                  <Box sx={{ fontSize: '0.55rem', color: 'rgba(255,210,0,0.9)', fontWeight: 700, lineHeight: '15px', px: 0.5, alignSelf: 'center' }}>✓ tu jest</Box>
                )}
              </Box>
            </>
          );
        }

        /* Festival slot (any size) or compact non-festival: chips only + understaffed dot */
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, overflow: 'hidden', flex: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.3, overflow: 'hidden', flex: 1, alignItems: 'center', flexWrap: isLarge ? 'wrap' : 'nowrap' }}>
              {chipRow(!isLarge ? false : true)}
              {isAssignable && !alreadyHere && (
                <Box sx={{ fontSize: '0.6rem', color: 'primary.main', fontWeight: 700, lineHeight: '15px', flexShrink: 0 }}>＋</Box>
              )}
              {alreadyHere && (
                <Box sx={{ fontSize: '0.55rem', color: 'rgba(255,210,0,0.9)', fontWeight: 700, lineHeight: '15px', flexShrink: 0 }}>✓</Box>
              )}
            </Box>
            {isFestival ? understaffedDot : badge}
          </Box>
        );
      })()}
    </Box>
  );
};

const MemoSlotBlock = React.memo(SlotBlock);

// ---- Now line ----------------------------------------------------------------

const NowLine: React.FC<{ top: number }> = ({ top }) => (
  <Box sx={{
    position: 'absolute',
    top,
    left: 0,
    right: 0,
    height: 2,
    bgcolor: 'error.main',
    opacity: 0.8,
    zIndex: 8,
    pointerEvents: 'none',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: -4,
      top: -4,
      width: 10,
      height: 10,
      borderRadius: '50%',
      bgcolor: 'error.main',
    },
  }} />
);

// ---- DayColumn ---------------------------------------------------------------

interface DayColumnProps {
  day: import('../types').CalendarDay;
  minHour: number;
  maxHour: number;
  pxPerHour: number;
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
  day, minHour, maxHour, pxPerHour, totalH, now,
  canEdit, isAssignMode, highlightedVolunteerId, selectedSlotId,
  nicknameToVolId, onSlotSelect, onContextMenu, onAssignModeClick,
  onRemoveAssignment, onMoveAssignment, onAssignVolunteer, onEmptyClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEmptyClick = useCallback((e: React.MouseEvent) => {
    if (!canEdit || !onEmptyClick || !containerRef.current || isAssignMode) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const rawH = minHour + relY / pxPerHour;
    const snapped = Math.round(rawH * 2) / 2;
    const clamped = Math.max(minHour, Math.min(maxHour - 1, snapped));
    onEmptyClick(day.dateKey, clamped);
  }, [canEdit, onEmptyClick, isAssignMode, minHour, maxHour, pxPerHour, day.dateKey]);

  /** Find which slot covers a given Y position within this column */
  const slotAtY = useCallback((relY: number) => {
    const hour = minHour + relY / pxPerHour;
    return day.slotItems.find(({ slot }) => {
      const d = parseAsLocal(slot.start);
      const startH = d.getHours() + d.getMinutes() / 60;
      const e2 = parseAsLocal(slot.end);
      let endH = e2.getHours() + e2.getMinutes() / 60;
      if (slot.end.slice(0, 10) !== slot.start.slice(0, 10)) endH += 24;
      if (endH === 0) endH = 24;
      return hour >= startH && hour < endH;
    }) ?? null;
  }, [day.slotItems, minHour, pxPerHour]);

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
        // chip-to-chip move — only if SlotBlock didn't already handle it (stopPropagation)
        if (toSlotId !== data.fromSlotId) {
          onMoveAssignment?.(data.assignmentId, data.volunteerId, data.nickname, data.fromSlotId, toSlotId);
        }
      } else {
        // drag from roster — assign
        onAssignVolunteer?.(data.volunteerId, data.nickname, toSlotId);
      }
    } catch { /* ignore malformed */ }
  }, [canEdit, slotAtY, onMoveAssignment, onAssignVolunteer]);

  const nowH = now.getHours() + now.getMinutes() / 60;
  const showNow = day.isToday && nowH >= minHour && nowH <= maxHour;
  const nowTop = showNow ? (nowH - minHour) * pxPerHour : null;

  const hourCount = maxHour - minHour;

  return (
    <Box
      ref={containerRef}
      onClick={handleEmptyClick}
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
      {/* Hour grid lines */}
      {Array.from({ length: hourCount + 1 }, (_, i) => {
        const h = minHour + i;
        const top = i * pxPerHour;
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

      {/* Half-hour lines */}
      {pxPerHour >= 60 && Array.from({ length: hourCount }, (_, i) => {
        const top = (i + 0.5) * pxPerHour;
        return (
          <Box
            key={`h${i}`}
            sx={{
              position: 'absolute',
              left: 0, right: 0,
              top,
              height: '1px',
              bgcolor: 'rgba(255,255,255,0.025)',
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Now line */}
      {nowTop !== null && <NowLine top={nowTop} />}

      {/* Slot blocks */}
      {day.slotItems.map(item => (
        <MemoSlotBlock
          key={item.slot.id}
          item={item}
          minHour={minHour}
          pxPerHour={pxPerHour}
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

const TimeAxis: React.FC<{ minHour: number; maxHour: number; pxPerHour: number; totalH: number }> = ({
  minHour, maxHour, pxPerHour, totalH,
}) => (
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
      const top = i * pxPerHour - HOUR_LABEL_H / 2;
      const isMidnight = h % 24 === 0 && h !== minHour;
      return (
        <Typography
          key={h}
          sx={{
            position: 'absolute',
            right: 6,
            top,
            fontSize: '0.55rem',
            fontFamily: 'monospace',
            lineHeight: `${HOUR_LABEL_H}px`,
            color: isMidnight ? 'warning.main' : h % 6 === 0 ? 'text.secondary' : 'text.disabled',
            fontWeight: isMidnight || h % 6 === 0 ? 700 : 400,
            userSelect: 'none',
          }}
        >
          {fmtHour(h)}
        </Typography>
      );
    })}
  </Box>
);

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
    {/* Time axis spacer */}
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

  if (days.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.disabled" variant="body2">
          Brak slotów do wyświetlenia
        </Typography>
      </Box>
    );
  }

  const totalH = (maxHour - minHour) * pxPerHour;

  return (
    <Box sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sticky header */}
      <DayHeaderRow days={days} canEdit={canEdit} onAddSlot={onAddSlot} />

      {/* Scrollable body */}
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
        {/* Time axis — sticky horizontally */}
        <Box
          sx={{
            position: 'sticky',
            left: 0,
            zIndex: 10,
            bgcolor: 'background.default',
          }}
        >
          <TimeAxis minHour={minHour} maxHour={maxHour} pxPerHour={pxPerHour} totalH={totalH} />
        </Box>

        {/* Day columns */}
        {days.map(day => (
          <DayColumn
            key={day.dateKey}
            day={day}
            minHour={minHour}
            maxHour={maxHour}
            pxPerHour={pxPerHour}
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
