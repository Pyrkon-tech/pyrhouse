import React, { useCallback, useRef } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { GridCell as GridCellType } from '../types';
import type { ResizePreview } from '../hooks/useChipResize';
import { GRID_ROW_H, CELL_STATUS_COLORS, RESIZE_HANDLE_W, RESIZE_HANDLE_HIT_W, SLOT_TYPE_CONFIG } from '../constants';

// ---- Single chip (draggable + droppable) ------------------------------------

interface ChipProps {
  cell: GridCellType;
  dateKey: string;
  canEdit: boolean;
  overDropId: string | null;
  resizePreview?: ResizePreview | null;
  containerRef?: React.RefObject<HTMLElement | null>;
  minHour?: number;
  maxHour?: number;
  /** Volunteer ID highlighted from roster click */
  highlightedVolunteerId?: number | null;
  onQuickAssign?: (slotId: number, positionIndex: number, anchorEl: HTMLElement) => void;
  onRemoveAssignment?: (assignmentId: number) => void;
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

const Chip: React.FC<ChipProps> = ({
  cell,
  dateKey,
  canEdit,
  overDropId,
  resizePreview,
  containerRef,
  minHour = 0,
  maxHour = 24,
  highlightedVolunteerId,
  onQuickAssign,
  onRemoveAssignment,
  onResizeStart,
}) => {
  const droppableId = `gcell:${cell.slot.id}:${cell.positionIndex}:${dateKey}`;
  const { setNodeRef: setDropRef } = useDroppable({
    id: droppableId,
    data: { type: 'slot', slotId: cell.slot.id, positionIndex: cell.positionIndex },
  });

  const draggableId = cell.volunteer
    ? `assignment:${cell.volunteer.assignmentId}:${dateKey}`
    : `noop-${cell.slot.id}-${cell.positionIndex}-${dateKey}`;
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: draggableId,
    data: cell.volunteer
      ? {
          type: 'assignment',
          assignmentId: cell.volunteer.assignmentId,
          volunteerId: cell.volunteer.volunteerId,
          slotId: cell.slot.id,
          nickname: cell.volunteer.nickname,
        }
      : { type: 'noop' },
    disabled: !canEdit || !cell.volunteer,
  });

  const setRefs = useCallback(
    (el: HTMLElement | null) => {
      setDropRef(el);
      setDragRef(el);
    },
    [setDropRef, setDragRef],
  );

  const isOver = overDropId === droppableId;
  const isTimeBased = cell.startPct != null && cell.widthPct != null;

  // Empty position — Quick Assign button
  if (!cell.volunteer) {
    const handleQuickAssign = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onQuickAssign) {
        onQuickAssign(cell.slot.id, cell.positionIndex, e.currentTarget);
      }
    };

    if (isTimeBased) {
      return (
        <Box
          ref={setDropRef}
          component="button"
          onClick={canEdit ? handleQuickAssign : undefined}
          sx={{
            position: 'absolute',
            left: `${cell.startPct}%`,
            width: `${cell.widthPct}%`,
            top: 4,
            bottom: 4,
            border: '1px dashed',
            borderColor: isOver ? 'primary.main' : 'divider',
            borderRadius: 1,
            bgcolor: isOver ? 'rgba(255,152,0,0.08)' : 'transparent',
            color: 'text.disabled',
            fontSize: '0.55rem',
            fontWeight: 700,
            cursor: canEdit ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            overflow: 'hidden',
            transition: 'background-color 0.15s, border-color 0.15s',
            '&:hover': canEdit ? { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'text.disabled' } : {},
          }}
        >
          {cell.timeLabel && (
            <span style={{ opacity: 0.6, fontWeight: 400 }}>{cell.timeLabel}</span>
          )}
          {canEdit ? '+' : ''}
        </Box>
      );
    }

    // Full-day empty cell
    return (
      <Box
        ref={setDropRef}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          bgcolor: isOver ? 'rgba(255,152,0,0.08)' : 'transparent',
          transition: 'background-color 0.15s',
        }}
      >
        {canEdit ? (
          <Box
            component="button"
            onClick={handleQuickAssign}
            sx={{
              width: '100%',
              height: '100%',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'transparent',
              color: 'text.disabled',
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'text.disabled' },
              transition: 'background-color 0.15s, border-color 0.15s',
            }}
          >
            Quick Assign
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: '100%' }} />
        )}
      </Box>
    );
  }

  // Filled chip
  const isHighlighted = highlightedVolunteerId != null && cell.volunteer?.volunteerId === highlightedVolunteerId;
  const isDimmed = highlightedVolunteerId != null && !isHighlighted;
  const statusCfg = CELL_STATUS_COLORS[cell.status];
  const statusIcon = cell.status === 'error' ? '✕' : cell.status === 'warning' ? 'ⓘ' : cell.status === 'pending' ? '…' : '✓';

  // Use resize preview only for the specific volunteer being resized
  const activePreview = cell.volunteer && resizePreview?.assignmentId === cell.volunteer.assignmentId
    ? resizePreview : null;
  const displayStartPct = activePreview ? activePreview.startPct : cell.startPct;
  const displayWidthPct = activePreview ? activePreview.widthPct : cell.widthPct;
  const displayTimeLabel = activePreview ? activePreview.timeLabel : cell.timeLabel;

  const slotTypeCfg = SLOT_TYPE_CONFIG[cell.slot.type];
  const isCrossMidnight = cell.slot.end.slice(0, 10) !== cell.slot.start.slice(0, 10);
  const capacityLabel = `${cell.slot.volunteers.length}/${cell.slot.capacity}`;
  const tooltipContent = displayTimeLabel
    ? `${cell.volunteer.nickname} — ${displayTimeLabel}\n${slotTypeCfg.label} · ${cell.slot.label} · ${capacityLabel}`
    : `${cell.volunteer.nickname}\n${slotTypeCfg.label} · ${cell.slot.label} · ${capacityLabel}`;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveAssignment) {
      onRemoveAssignment(cell.volunteer!.assignmentId);
    }
  };

  // Resize handles on both edges for time-based chips
  const canResizeBase = isTimeBased && canEdit && onResizeStart;
  const canResizeLeft = canResizeBase;
  const canResizeRight = canResizeBase;

  const handleEdgePointerDown = (edge: 'left' | 'right') => (e: React.PointerEvent) => {
    if (!onResizeStart || !containerRef?.current || !cell.volunteer) return;
    onResizeStart(
      edge, cell.slot.id,
      cell.volunteer.assignmentId, cell.volunteer.volunteerId, cell.volunteer.nickname,
      cell.startPct!, cell.widthPct!,
      cell.slot.start, cell.slot.end,
      containerRef.current,
      minHour, maxHour, dateKey, e,
    );
  };

  return (
    <Tooltip
      title={tooltipContent}
      arrow
      placement="top"
      enterDelay={200}
      slotProps={{ tooltip: { sx: { fontSize: '0.75rem', fontWeight: 600 } } }}
    >
      <Box
        ref={setRefs}
        {...(canEdit ? listeners : {})}
        {...(canEdit ? attributes : {})}
        sx={{
          ...(isTimeBased
            ? {
                position: 'absolute' as const,
                left: `${displayStartPct}%`,
                width: `${displayWidthPct}%`,
                top: 4,
                bottom: 4,
              }
            : { width: '100%', height: '100%' }),
          bgcolor: statusCfg.bg,
          border: '1px solid',
          borderColor: isHighlighted ? 'primary.main' : isOver ? 'primary.main' : statusCfg.border,
          borderLeft: `3px solid ${slotTypeCfg.color}`,
          borderRadius: isCrossMidnight ? '4px 0 0 4px' : 1,
          borderRight: isCrossMidnight ? '2px dashed' : '1px solid',
          borderRightColor: isCrossMidnight ? 'warning.dark' : undefined,
          px: 0.75,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
          cursor: canEdit ? 'grab' : 'default',
          opacity: isDragging ? 0.25 : isDimmed ? 0.35 : 1,
          boxShadow: isHighlighted ? '0 0 8px 2px rgba(255,152,0,0.45)' : 'none',
          transition: activePreview ? 'none' : 'opacity 0.2s, border-color 0.2s, box-shadow 0.2s',
          overflow: 'hidden',
          zIndex: isHighlighted ? 6 : activePreview ? 5 : 1,
          '&:hover .cell-remove': { opacity: 1, color: 'error.main' },
          '&:hover .resize-handle': { opacity: 1 },
        }}
      >
        {/* Floating time label during resize */}
        {activePreview && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              top: -22,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'primary.main',
              borderRadius: 0.5,
              px: 0.75,
              py: 0.125,
              fontSize: '0.65rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              zIndex: 10,
              pointerEvents: 'none',
              color: 'primary.main',
            }}
          >
            {displayTimeLabel}
          </Typography>
        )}

        {/* Left resize handle — visual is RESIZE_HANDLE_W, hit area is RESIZE_HANDLE_HIT_W */}
        {canResizeLeft && (
          <Box
            className="resize-handle"
            onPointerDown={handleEdgePointerDown('left')}
            sx={{
              position: 'absolute',
              left: -(RESIZE_HANDLE_HIT_W - RESIZE_HANDLE_W) / 2,
              top: 0,
              bottom: 0,
              width: RESIZE_HANDLE_HIT_W,
              cursor: 'col-resize',
              zIndex: 3,
              opacity: 0,
              transition: 'opacity 0.15s',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: (RESIZE_HANDLE_HIT_W - RESIZE_HANDLE_W) / 2,
                top: 0,
                bottom: 0,
                width: RESIZE_HANDLE_W,
                bgcolor: 'rgba(255,152,0,0.4)',
                borderRadius: '2px',
              },
              '&:hover': { opacity: 1, '&::after': { bgcolor: 'rgba(255,152,0,0.6)' } },
            }}
          />
        )}

        <Typography
          variant="caption"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: statusCfg.color,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            lineHeight: 1.2,
          }}
        >
          {cell.volunteer.nickname} {statusIcon}
          {isCrossMidnight && (
            <Box component="span" sx={{ ml: 0.25, fontSize: '0.55rem', opacity: 0.7, color: 'warning.main' }}>🌙</Box>
          )}
        </Typography>
        {canEdit && onRemoveAssignment && (
          <Box
            className="cell-remove"
            component="span"
            onClick={handleRemove}
            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            sx={{
              opacity: 0.4,
              cursor: 'pointer',
              fontSize: '0.6rem',
              color: 'text.secondary',
              fontWeight: 700,
              ml: 0.25,
              transition: 'opacity 0.15s, color 0.15s',
              flexShrink: 0,
              lineHeight: 1,
              '&:hover': { opacity: 1, color: 'error.main' },
            }}
          >
            ✕
          </Box>
        )}

        {/* Right resize handle — visual is RESIZE_HANDLE_W, hit area is RESIZE_HANDLE_HIT_W */}
        {canResizeRight && (
          <Box
            className="resize-handle"
            onPointerDown={handleEdgePointerDown('right')}
            sx={{
              position: 'absolute',
              right: -(RESIZE_HANDLE_HIT_W - RESIZE_HANDLE_W) / 2,
              top: 0,
              bottom: 0,
              width: RESIZE_HANDLE_HIT_W,
              cursor: 'col-resize',
              zIndex: 3,
              opacity: 0,
              transition: 'opacity 0.15s',
              '&::after': {
                content: '""',
                position: 'absolute',
                right: (RESIZE_HANDLE_HIT_W - RESIZE_HANDLE_W) / 2,
                top: 0,
                bottom: 0,
                width: RESIZE_HANDLE_W,
                bgcolor: 'rgba(255,152,0,0.4)',
                borderRadius: '2px',
              },
              '&:hover': { opacity: 1, '&::after': { bgcolor: 'rgba(255,152,0,0.6)' } },
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
};

const MemoChip = React.memo(Chip);

// ---- Background droppable for time-based cells (catch-all target) -----------

const CellBackgroundDrop: React.FC<{
  slotId: number;
  dateKey: string;
  overDropId: string | null;
}> = ({ slotId, dateKey, overDropId }) => {
  const bgDropId = `bg:${slotId}:${dateKey}`;
  const { setNodeRef } = useDroppable({
    id: bgDropId,
    data: { type: 'slot', slotId },
  });
  const isOver = overDropId === bgDropId;
  return (
    <Box
      ref={setNodeRef}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        bgcolor: isOver ? 'rgba(255,152,0,0.06)' : 'transparent',
        transition: 'background-color 0.15s',
      }}
    />
  );
};

// ---- Row cell container (renders 0..N chips) --------------------------------

interface GridRowCellProps {
  cells: GridCellType[];
  rowIndex: number;
  dateKey: string;
  isFullDay: boolean;
  canEdit: boolean;
  overDropId: string | null;
  minHour: number;
  maxHour: number;
  /** Now-line position as percentage (0-100), or null if not on today column */
  nowPct?: number | null;
  resizePreview?: ResizePreview | null;
  /** Volunteer ID highlighted from roster click */
  highlightedVolunteerId?: number | null;
  onQuickAssign?: (slotId: number, positionIndex: number, anchorEl: HTMLElement) => void;
  onRemoveAssignment?: (assignmentId: number) => void;
  onResizeStart?: ChipProps['onResizeStart'];
}

const GridRowCell: React.FC<GridRowCellProps> = ({
  cells,
  rowIndex,
  dateKey,
  isFullDay,
  canEdit,
  overDropId,
  minHour,
  maxHour,
  nowPct,
  resizePreview,
  highlightedVolunteerId,
  onQuickAssign,
  onRemoveAssignment,
  onResizeStart,
}) => {
  // Hook must be called unconditionally (Rules of Hooks)
  const containerRefLocal = useRef<HTMLElement>(null);

  // Empty row — no slots on this day for this lane
  if (cells.length === 0) {
    return (
      <Box
        sx={{
          height: GRID_ROW_H,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'transparent',
        }}
      />
    );
  }

  // Full-day column — single chip fills the cell
  if (isFullDay) {
    return (
      <Box
        sx={{
          height: GRID_ROW_H,
          p: 0.5,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {cells.map((c) => (
          <MemoChip
            key={`${c.slot.id}-${c.positionIndex}`}
            cell={c}
            dateKey={dateKey}
            canEdit={canEdit}
            overDropId={overDropId}
            highlightedVolunteerId={highlightedVolunteerId}
            onQuickAssign={onQuickAssign}
            onRemoveAssignment={onRemoveAssignment}
          />
        ))}
      </Box>
    );
  }

  // Time-based column — relative container with guide lines + positioned chips
  const hourSpan = maxHour - minHour || 1;

  // Pick first slot for the background droppable (catch-all target)
  const bgSlotId = cells[0]?.slot.id;

  return (
    <Box
      ref={containerRefLocal}
      sx={{
        height: GRID_ROW_H,
        position: 'relative',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Full-width background droppable — catch-all for DnD from roster */}
      {bgSlotId != null && (
        <CellBackgroundDrop slotId={bgSlotId} dateKey={dateKey} overDropId={overDropId} />
      )}

      {/* Hour guide lines */}
      {Array.from({ length: hourSpan + 1 }, (_, i) => {
        const pct = (i / hourSpan) * 100;
        const hour = minHour + i;
        const isMidnight = hour === 24;
        const isMajor = hour % 6 === 0;
        return (
          <Box
            key={`g-${rowIndex}-${i}`}
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
        );
      })}

      {/* Positioned chips */}
      {cells.map((c) => (
        <MemoChip
          key={`${c.slot.id}-${c.positionIndex}`}
          cell={c}
          dateKey={dateKey}
          canEdit={canEdit}
          overDropId={overDropId}
          resizePreview={resizePreview}
          containerRef={containerRefLocal}
          minHour={minHour}
          maxHour={maxHour}
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
  );
};

export default React.memo(GridRowCell);

// Re-export for use in timeline layout
export { MemoChip, CellBackgroundDrop };
export type { ChipProps };
