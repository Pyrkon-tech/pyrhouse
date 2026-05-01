import React, { useRef, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import type { TimelineData, DayMarker, GridCell as GridCellType } from '../types';
import type { ScheduleSlot } from '../../../../types/schedule.types';
import type { ResizePreview } from '../hooks/useChipResize';
import { TIMELINE_LANE_H, TIMELINE_LANE_LABEL_W, TIMELINE_PX_PER_HOUR, DAY_TYPE_COLORS } from '../constants';
import { MemoChip, CellBackgroundDrop } from './GridCell';
import { toAbsoluteHour } from '../utils';

// ---- Props ------------------------------------------------------------------

interface ScheduleGridProps {
  timeline: TimelineData;
  canEdit: boolean;
  overDropId: string | null;
  now: Date;
  resizePreview?: ResizePreview | null;
  highlightedVolunteerId?: number | null;
  onQuickAssign?: (slotId: number, positionIndex: number, anchorEl: HTMLElement) => void;
  onRemoveAssignment?: (assignmentId: number) => void;
  onSlotEditClick?: (slot: ScheduleSlot, anchorEl: HTMLElement) => void;
  onResizeStart?: (
    edge: 'left' | 'right',
    slotId: number,
    assignmentId: number,
    volunteerId: number,
    nickname: string,
    origStartPct: number,
    origWidthPct: number,
    origStartISO: string,
    origEndISO: string,
    containerEl: HTMLElement,
    minHour: number,
    maxHour: number,
    dateKey: string,
    e: React.PointerEvent,
  ) => void;
}

// ---- Day navigation tabs ----------------------------------------------------

const DayTabs: React.FC<{
  markers: DayMarker[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  totalWidth: number;
}> = ({ markers, scrollRef, totalWidth }) => {
  const scrollToDay = useCallback(
    (marker: DayMarker) => {
      if (!scrollRef.current) return;
      // Account for lane label spacer width
      const targetX = TIMELINE_LANE_LABEL_W + (marker.startPct / 100) * totalWidth;
      scrollRef.current.scrollTo({ left: targetX, behavior: 'smooth' });
    },
    [scrollRef, totalWidth],
  );

  return (
    <Box sx={{ display: 'flex', gap: 0.5, px: 1, py: 0.5, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}>
      {markers.map((m) => {
        const cfg = DAY_TYPE_COLORS[m.dayType] ?? DAY_TYPE_COLORS.mixed;
        return (
          <Button
            key={m.dateKey}
            size="small"
            variant={m.isToday ? 'contained' : 'outlined'}
            color={m.isToday ? 'primary' : 'inherit'}
            onClick={() => scrollToDay(m)}
            sx={{
              fontSize: '0.7rem',
              textTransform: 'none',
              minWidth: 0,
              px: 1,
              py: 0.25,
              borderColor: cfg.color,
              color: m.isToday ? undefined : cfg.color,
            }}
          >
            {m.label}
          </Button>
        );
      })}
    </Box>
  );
};

// ---- Timeline header (day labels + hour axis) -------------------------------

const TimelineHeader: React.FC<{
  dayMarkers: DayMarker[];
  absoluteStartH: number;
  totalHours: number;
  totalWidth: number;
  nowPct: number | null;
}> = ({ dayMarkers, absoluteStartH, totalHours, totalWidth, nowPct }) => {
  // Hour step: 1h if total < 48h, 2h otherwise
  const step = totalHours <= 48 ? 1 : 2;
  const hourCount = Math.floor(totalHours / step) + 1;

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'background.default',
        borderBottom: '2px solid',
        borderColor: 'divider',
        display: 'flex',
      }}
    >
      {/* Lane label spacer */}
      <Box sx={{ width: TIMELINE_LANE_LABEL_W, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }} />

      {/* Timeline header area */}
      <Box sx={{ position: 'relative', width: totalWidth, flexShrink: 0 }}>
        {/* Row 1: Day labels */}
        <Box sx={{ position: 'relative', height: 28 }}>
          {dayMarkers.map((m) => {
            const cfg = DAY_TYPE_COLORS[m.dayType] ?? DAY_TYPE_COLORS.mixed;
            return (
              <Box
                key={m.dateKey}
                sx={{
                  position: 'absolute',
                  left: `${m.startPct}%`,
                  width: `${m.endPct - m.startPct}%`,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  bgcolor: m.isToday ? 'rgba(255,152,0,0.06)' : cfg.bg,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  borderBottom: `2px solid ${cfg.color}`,
                  px: 1,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  {m.label}
                </Typography>
                {m.isToday && (
                  <Chip
                    size="small"
                    label="Dziś"
                    color="primary"
                    sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }}
                  />
                )}
                <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled' }}>
                  {cfg.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Row 2: Hour axis */}
        <Box sx={{ position: 'relative', height: 20 }}>
          {Array.from({ length: hourCount }, (_, i) => {
            const h = absoluteStartH + i * step;
            if (h > absoluteStartH + totalHours) return null;
            const pct = ((h - absoluteStartH) / totalHours) * 100;
            const displayH = ((h % 24) + 24) % 24;
            const isMidnight = h % 24 === 0 && h !== absoluteStartH;
            const isMajor = h % 6 === 0;
            return (
              <Typography
                key={h}
                variant="caption"
                sx={{
                  position: 'absolute',
                  left: `${pct}%`,
                  transform: 'translateX(-50%)',
                  top: 2,
                  fontSize: '0.5rem',
                  color: isMidnight ? 'warning.main' : isMajor ? 'text.secondary' : 'text.disabled',
                  fontFamily: 'monospace',
                  fontWeight: isMidnight || isMajor ? 700 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {String(displayH).padStart(2, '0')}
              </Typography>
            );
          })}

          {/* Now indicator triangle */}
          {nowPct != null && (
            <Box
              sx={{
                position: 'absolute',
                left: `${nowPct}%`,
                bottom: 0,
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '7px solid',
                borderBottomColor: 'error.main',
                opacity: 0.9,
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

// ---- Timeline lane row ------------------------------------------------------

const TimelineLaneRow: React.FC<{
  laneIndex: number;
  cells: GridCellType[];
  canEdit: boolean;
  overDropId: string | null;
  absoluteStartH: number;
  totalHours: number;
  totalWidth: number;
  nowPct: number | null;
  dayMarkers: DayMarker[];
  firstDateKey: string;
  resizePreview?: ResizePreview | null;
  highlightedVolunteerId?: number | null;
  onQuickAssign?: (slotId: number, positionIndex: number, anchorEl: HTMLElement) => void;
  onRemoveAssignment?: (assignmentId: number) => void;
  onResizeStart?: ScheduleGridProps['onResizeStart'];
}> = ({
  laneIndex,
  cells,
  canEdit,
  overDropId,
  absoluteStartH,
  totalHours,
  totalWidth,
  nowPct,
  dayMarkers,
  firstDateKey,
  resizePreview,
  highlightedVolunteerId,
  onQuickAssign,
  onRemoveAssignment,
  onResizeStart,
}) => {
  const containerRef = useRef<HTMLElement>(null);

  // Guide lines: every hour
  const step = totalHours <= 48 ? 1 : 2;
  const guideLines = Array.from({ length: Math.floor(totalHours / step) + 1 }, (_, i) => {
    const h = absoluteStartH + i * step;
    const pct = ((h - absoluteStartH) / totalHours) * 100;
    const isMidnight = h % 24 === 0 && h !== absoluteStartH;
    const isMajor = h % 6 === 0;
    return { h, pct, isMidnight, isMajor };
  });

  // Collect unique slot IDs for background droppables
  const slotIds = [...new Set(cells.map((c) => c.slot.id))];

  return (
    <Box
      sx={{
        display: 'flex',
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.015)' },
      }}
    >
      {/* Lane label */}
      <Box
        sx={{
          width: TIMELINE_LANE_LABEL_W,
          flexShrink: 0,
          height: TIMELINE_LANE_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(0,0,0,0.15)',
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, fontSize: '0.65rem', color: 'text.disabled', fontFamily: 'monospace' }}
        >
          #{laneIndex + 1}
        </Typography>
      </Box>

      {/* Timeline area */}
      <Box
        ref={containerRef}
        sx={{
          width: totalWidth,
          flexShrink: 0,
          height: TIMELINE_LANE_H,
          position: 'relative',
        }}
      >
        {/* Background droppables per slot */}
        {slotIds.map((slotId) => (
          <CellBackgroundDrop key={`bg-${slotId}`} slotId={slotId} dateKey={firstDateKey} overDropId={overDropId} />
        ))}

        {/* Hour guide lines */}
        {guideLines.map(({ h, pct, isMidnight, isMajor }) => (
          <Box
            key={`guide-${h}`}
            sx={{
              position: 'absolute',
              left: `${pct}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              bgcolor: isMidnight
                ? 'rgba(255,152,0,0.25)'
                : isMajor ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              borderLeft: isMidnight ? '1px dashed rgba(255,152,0,0.35)' : 'none',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        ))}

        {/* Day separator lines (thicker at day boundaries) */}
        {dayMarkers.map((m) => (
          <Box
            key={`sep-${m.dateKey}`}
            sx={{
              position: 'absolute',
              left: `${m.startPct}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              bgcolor: 'rgba(255,255,255,0.12)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        ))}

        {/* Positioned chips */}
        {cells.map((c) => (
          <MemoChip
            key={`${c.slot.id}-${c.positionIndex}`}
            cell={c}
            dateKey={firstDateKey}
            canEdit={canEdit}
            overDropId={overDropId}
            resizePreview={resizePreview}
            containerRef={containerRef}
            minHour={absoluteStartH}
            maxHour={absoluteStartH + totalHours}
            highlightedVolunteerId={highlightedVolunteerId}
            onQuickAssign={onQuickAssign}
            onRemoveAssignment={onRemoveAssignment}
            onResizeStart={onResizeStart}
          />
        ))}

        {/* Now line */}
        {nowPct != null && nowPct >= 0 && nowPct <= 100 && (
          <Box
            sx={{
              position: 'absolute',
              left: `${nowPct}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              bgcolor: 'error.main',
              opacity: 0.7,
              zIndex: 4,
              pointerEvents: 'none',
            }}
          />
        )}
      </Box>
    </Box>
  );
};

// ---- Main component ---------------------------------------------------------

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  timeline,
  canEdit,
  overDropId,
  now,
  resizePreview,
  highlightedVolunteerId,
  onQuickAssign,
  onRemoveAssignment,
  onResizeStart,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Native wheel handler — prevent page navigation on horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      const hasHOverflow = el.scrollWidth > el.clientWidth;
      if (!hasHOverflow) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        el.scrollLeft += e.deltaX;
      }
    };

    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const { lanes, dayMarkers, absoluteStartH, totalHours, firstDateKey } = timeline;

  if (lanes.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.disabled" variant="body2">
          Brak slotów do wyświetlenia
        </Typography>
      </Box>
    );
  }

  const totalWidth = totalHours * TIMELINE_PX_PER_HOUR;

  // Now position
  const nowISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  const nowAbsH = toAbsoluteHour(nowISO, firstDateKey);
  const nowPct = ((nowAbsH - absoluteStartH) / totalHours) * 100;
  const showNow = nowPct >= 0 && nowPct <= 100;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      {/* Day navigation tabs */}
      <DayTabs markers={dayMarkers} scrollRef={scrollRef} totalWidth={totalWidth} />

      {/* Scrollable timeline area */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowX: 'scroll',
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 8, height: 10 },
          '&::-webkit-scrollbar-track': { bgcolor: 'background.default' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'action.disabled', borderRadius: 1 },
        }}
      >
        <Box sx={{ minWidth: TIMELINE_LANE_LABEL_W + totalWidth }}>
          {/* Sticky header */}
          <TimelineHeader
            dayMarkers={dayMarkers}
            absoluteStartH={absoluteStartH}
            totalHours={totalHours}
            totalWidth={totalWidth}
            nowPct={showNow ? nowPct : null}
          />

          {/* Lane rows */}
          {lanes.map((lane, idx) => (
            <TimelineLaneRow
              key={idx}
              laneIndex={idx}
              cells={lane.cells}
              canEdit={canEdit}
              overDropId={overDropId}
              absoluteStartH={absoluteStartH}
              totalHours={totalHours}
              totalWidth={totalWidth}
              nowPct={showNow ? nowPct : null}
              dayMarkers={dayMarkers}
              firstDateKey={firstDateKey}
              resizePreview={resizePreview}
              highlightedVolunteerId={highlightedVolunteerId}
              onQuickAssign={onQuickAssign}
              onRemoveAssignment={onRemoveAssignment}
              onResizeStart={onResizeStart}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(ScheduleGrid);
