import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import type { GridCell as GridCellType } from '../types';
import type { ResizePreview } from '../hooks/useChipResize';
import { GRID_ROW_H, CELL_STATUS_COLORS, RESIZE_HANDLE_W, RESIZE_HANDLE_HIT_W, SLOT_TYPE_CONFIG } from '../constants';

// ---- Chip (filled position) -------------------------------------------------

interface ChipProps {
  cell: GridCellType;
  dateKey: string;
  canEdit: boolean;
  resizePreview?: ResizePreview | null;
  containerRef?: React.RefObject<HTMLElement | null>;
  minHour?: number;
  maxHour?: number;
  highlightedVolunteerId?: number | null;
  selectedSlotId?: number | null;
  /** This chip is the currently moving source — pulse animation */
  isMovingSource?: boolean;
  /** This slot is a valid drop target for assign/move mode */
  isAssignTarget?: boolean;
  onQuickAssign?: (slotId: number, positionIndex: number, anchorEl: HTMLElement) => void;
  /** Called when an empty position is clicked in assign/move mode */
  onAssignModeClick?: (slotId: number) => void;
  onRemoveAssignment?: (assignmentId: number) => void;
  onSlotSelect?: (slotId: number) => void;
  onContextMenu?: (slotId: number, assignmentId: number | undefined, x: number, y: number) => void;
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
  resizePreview,
  containerRef,
  minHour = 0,
  maxHour = 24,
  highlightedVolunteerId,
  selectedSlotId,
  isMovingSource = false,
  isAssignTarget = false,
  onQuickAssign,
  onAssignModeClick,
  onRemoveAssignment,
  onSlotSelect,
  onContextMenu,
  onResizeStart,
}) => {
  const isTimeBased = cell.startPct != null && cell.widthPct != null;

  // ---- Empty position -------------------------------------------------
  if (!cell.volunteer) {
    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      if (isAssignTarget && onAssignModeClick) {
        onAssignModeClick(cell.slot.id);
      } else if (canEdit && onQuickAssign) {
        onQuickAssign(cell.slot.id, cell.positionIndex, e.currentTarget);
      }
    };

    if (isTimeBased) {
      return (
        <Box
          component="button"
          data-empty-position="true"
          onClick={handleClick}
          sx={{
            position: 'absolute',
            left: `${cell.startPct}%`,
            width: `${cell.widthPct}%`,
            top: 4,
            bottom: 4,
            border: '1.5px dashed',
            borderColor: isAssignTarget ? 'primary.main' : 'divider',
            borderRadius: 1,
            bgcolor: isAssignTarget ? 'rgba(255,152,0,0.10)' : 'transparent',
            color: isAssignTarget ? 'primary.main' : 'text.disabled',
            fontSize: '0.55rem',
            fontWeight: 700,
            cursor: (isAssignTarget || canEdit) ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            overflow: 'hidden',
            transition: 'background-color 0.15s, border-color 0.15s, transform 0.1s',
            '&:hover': (isAssignTarget || canEdit) ? {
              bgcolor: isAssignTarget ? 'rgba(255,152,0,0.20)' : 'rgba(255,255,255,0.04)',
              borderColor: isAssignTarget ? 'primary.light' : 'text.disabled',
              transform: isAssignTarget ? 'scaleY(1.04)' : 'none',
            } : {},
          }}
        >
          {isAssignTarget ? (
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'primary.main', pointerEvents: 'none' }}>
              ＋ Przypisz
            </Typography>
          ) : (
            <>
              {cell.timeLabel && <span style={{ opacity: 0.5, fontWeight: 400 }}>{cell.timeLabel}</span>}
              {canEdit && <span>+</span>}
            </>
          )}
        </Box>
      );
    }

    // Full-day empty cell
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          bgcolor: isAssignTarget ? 'rgba(255,152,0,0.10)' : 'transparent',
          transition: 'background-color 0.15s',
        }}
      >
        {(isAssignTarget || canEdit) ? (
          <Box
            component="button"
            data-empty-position="true"
            onClick={handleClick}
            sx={{
              width: '100%',
              height: '100%',
              border: '1.5px dashed',
              borderColor: isAssignTarget ? 'primary.main' : 'divider',
              borderRadius: 1,
              bgcolor: 'transparent',
              color: isAssignTarget ? 'primary.main' : 'text.disabled',
              fontSize: '0.6rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: isAssignTarget ? 'primary.light' : 'text.disabled' },
              transition: 'background-color 0.15s, border-color 0.15s',
            }}
          >
            {isAssignTarget ? '＋ Przypisz' : 'Quick Assign'}
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: '100%' }} />
        )}
      </Box>
    );
  }

  // ---- Filled chip --------------------------------------------------------
  const isHighlighted = highlightedVolunteerId != null && cell.volunteer.volunteerId === highlightedVolunteerId;
  const isDimmed = highlightedVolunteerId != null && !isHighlighted;
  const isSelected = selectedSlotId != null && cell.slot.id === selectedSlotId;

  const statusCfg = CELL_STATUS_COLORS[cell.status];
  const statusIcon = cell.status === 'error' ? '✕' : cell.status === 'warning' ? 'ⓘ' : cell.status === 'pending' ? '…' : '✓';

  const activePreview = cell.volunteer && resizePreview?.assignmentId === cell.volunteer.assignmentId
    ? resizePreview : null;
  const displayStartPct = activePreview ? activePreview.startPct : cell.startPct;
  const displayWidthPct = activePreview ? activePreview.widthPct : cell.widthPct;
  const displayTimeLabel = activePreview ? activePreview.timeLabel : cell.timeLabel;

  const slotTypeCfg = SLOT_TYPE_CONFIG[cell.slot.type];
  const isCrossMidnight = cell.slot.end.slice(0, 10) !== cell.slot.start.slice(0, 10);
  const tooltipContent = displayTimeLabel
    ? `${cell.volunteer.nickname} — ${displayTimeLabel}\n${slotTypeCfg.label} · ${cell.slot.label}`
    : `${cell.volunteer.nickname}\n${slotTypeCfg.label} · ${cell.slot.label}`;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveAssignment) onRemoveAssignment(cell.volunteer!.assignmentId);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSlotSelect) onSlotSelect(cell.slot.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) onContextMenu(cell.slot.id, cell.volunteer?.assignmentId, e.clientX, e.clientY);
  };

  const canResizeBase = isTimeBased && canEdit && onResizeStart;

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
        data-chip="true"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
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
          borderColor: isMovingSource ? 'primary.light' : isSelected ? 'primary.main' : isHighlighted ? 'primary.main' : statusCfg.border,
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
          cursor: canEdit ? 'pointer' : 'default',
          opacity: isDimmed ? 0.3 : 1,
          boxShadow: isMovingSource
            ? '0 0 0 2px rgba(255,152,0,0.5), 0 4px 12px rgba(255,152,0,0.25)'
            : isHighlighted
            ? '0 0 8px 2px rgba(255,152,0,0.45)'
            : isSelected
            ? '0 0 0 1px rgba(255,152,0,0.3)'
            : 'none',
          transition: activePreview ? 'none' : 'opacity 0.2s, border-color 0.2s, box-shadow 0.2s',
          overflow: 'hidden',
          zIndex: isMovingSource ? 8 : isHighlighted ? 6 : activePreview ? 5 : 1,
          '@keyframes movePulse': {
            '0%, 100%': { boxShadow: '0 0 0 2px rgba(255,152,0,0.5)' },
            '50%': { boxShadow: '0 0 0 4px rgba(255,152,0,0.3), 0 4px 16px rgba(255,152,0,0.3)' },
          },
          animation: isMovingSource ? 'movePulse 1.2s ease-in-out infinite' : 'none',
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

        {/* Left resize handle */}
        {canResizeBase && (
          <Box
            className="resize-handle"
            data-resize-handle="true"
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
            pointerEvents: 'none',
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

        {/* Right resize handle */}
        {canResizeBase && (
          <Box
            className="resize-handle"
            data-resize-handle="true"
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

export const MemoChip = React.memo(Chip);

// ---- Row cell container (grid layout — kept for compatibility) ---------------

interface GridRowCellProps {
  cells: GridCellType[];
  rowIndex: number;
  dateKey: string;
  isFullDay: boolean;
  canEdit: boolean;
  minHour: number;
  maxHour: number;
  nowPct?: number | null;
  resizePreview?: ResizePreview | null;
  highlightedVolunteerId?: number | null;
  selectedSlotId?: number | null;
  isAssignTarget?: boolean;
  movingAssignmentId?: number | null;
  onQuickAssign?: (slotId: number, positionIndex: number, anchorEl: HTMLElement) => void;
  onAssignModeClick?: (slotId: number) => void;
  onRemoveAssignment?: (assignmentId: number) => void;
  onSlotSelect?: (slotId: number) => void;
  onContextMenu?: (slotId: number, assignmentId: number | undefined, x: number, y: number) => void;
  onResizeStart?: ChipProps['onResizeStart'];
}

const GridRowCell: React.FC<GridRowCellProps> = ({
  cells,
  rowIndex,
  dateKey,
  isFullDay,
  canEdit,
  minHour,
  maxHour,
  nowPct,
  resizePreview,
  highlightedVolunteerId,
  selectedSlotId,
  isAssignTarget,
  movingAssignmentId,
  onQuickAssign,
  onAssignModeClick,
  onRemoveAssignment,
  onSlotSelect,
  onContextMenu,
  onResizeStart,
}) => {
  const containerRefLocal = React.useRef<HTMLElement>(null);

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
            highlightedVolunteerId={highlightedVolunteerId}
            selectedSlotId={selectedSlotId}
            isAssignTarget={isAssignTarget}
            isMovingSource={c.volunteer?.assignmentId === movingAssignmentId}
            onQuickAssign={onQuickAssign}
            onAssignModeClick={onAssignModeClick}
            onRemoveAssignment={onRemoveAssignment}
            onSlotSelect={onSlotSelect}
            onContextMenu={onContextMenu}
          />
        ))}
      </Box>
    );
  }

  const hourSpan = maxHour - minHour || 1;

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

      {cells.map((c) => (
        <MemoChip
          key={`${c.slot.id}-${c.positionIndex}`}
          cell={c}
          dateKey={dateKey}
          canEdit={canEdit}
          resizePreview={resizePreview}
          containerRef={containerRefLocal}
          minHour={minHour}
          maxHour={maxHour}
          highlightedVolunteerId={highlightedVolunteerId}
          selectedSlotId={selectedSlotId}
          isAssignTarget={isAssignTarget}
          isMovingSource={c.volunteer?.assignmentId === movingAssignmentId}
          onQuickAssign={onQuickAssign}
          onAssignModeClick={onAssignModeClick}
          onRemoveAssignment={onRemoveAssignment}
          onSlotSelect={onSlotSelect}
          onContextMenu={onContextMenu}
          onResizeStart={onResizeStart}
        />
      ))}

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
export type { ChipProps };
