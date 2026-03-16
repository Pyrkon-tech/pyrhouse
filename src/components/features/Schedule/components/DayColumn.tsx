import React, { useCallback } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import {
  PX_PER_HOUR_V,
  DAY_HEADER_HEIGHT,
  DAY_TYPE_COLORS,
  CHIP_GAP,
} from '../constants';
import type { DayColumnData } from '../types';
import type { ScheduleSlot } from '../../../../types/schedule.types';
import { computeNowPosV } from '../utils';
import SlotBlock from './SlotBlock';

interface DayColumnProps {
  col: DayColumnData;
  globalMinHour: number;
  globalMaxHour: number;
  canEdit: boolean;
  overDropId: string | null;
  now: Date;
  onSlotEditClick?: (slot: ScheduleSlot, anchorEl: HTMLElement) => void;
  /** Called when user clicks empty space in the time grid */
  onGridClick?: (dateKey: string, hour: number, anchorEl: HTMLElement) => void;
  /** Called to remove an assignment */
  onRemoveAssignment?: (assignmentId: number) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({
  col,
  globalMinHour,
  globalMaxHour,
  canEdit,
  overDropId,
  now,
  onSlotEditClick,
  onGridClick,
  onRemoveAssignment,
}) => {
  const cfg = DAY_TYPE_COLORS[col.dayType];
  const totalAssignments = col.slots.reduce((s, sl) => s + sl.volunteers.length, 0);
  const totalCapacity = col.slots.reduce((s, sl) => s + sl.capacity, 0);
  const gridHeight = (globalMaxHour - globalMinHour) * PX_PER_HOUR_V;
  const hourCount = globalMaxHour - globalMinHour;
  const nowPosV = col.isToday ? computeNowPosV(now, globalMinHour, globalMaxHour) : null;
  const nowTimeLabel = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canEdit || !onGridClick) return;
    // Only trigger on clicks directly on the grid background, not on slot blocks
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawHour = y / PX_PER_HOUR_V + globalMinHour;
    // Snap to nearest 30 min
    const snappedHour = Math.round(rawHour * 2) / 2;
    onGridClick(col.dateKey, snappedHour, e.currentTarget);
  }, [canEdit, onGridClick, globalMinHour, col.dateKey]);

  return (
    <Box
      sx={{
        minWidth: col.isFullDay ? 160 : 180,
        width: col.isFullDay ? 180 : 220,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Day header */}
      <Box
        sx={{
          height: DAY_HEADER_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0.25,
          px: 1,
          bgcolor: cfg.bg,
          borderBottom: '2px solid',
          borderColor: col.isToday ? cfg.color : 'divider',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: cfg.color,
              fontSize: '0.7rem',
              lineHeight: 1.2,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {col.shortLabel}
          </Typography>
          {col.isToday && (
            <Chip
              size="small"
              label="Dziś"
              color="primary"
              sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }}
            />
          )}
        </Box>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled', pl: 1.75 }}>
          {cfg.label} · {totalAssignments}/{totalCapacity} os.
        </Typography>
      </Box>

      {/* Content area */}
      {col.isFullDay ? (
        /* Full-day layout (montage/demontage) — stacked slot blocks */
        <Box sx={{ flex: 1, p: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5, overflowY: 'auto' }}>
          {col.slots.map((slot) => (
            <SlotBlock
              key={`slot-${slot.id}-${col.dateKey}`}
              slot={slot}
              canEdit={canEdit}
              isOver={overDropId === `slot:${slot.id}:${col.dateKey}`}
              dateKey={col.dateKey}
              onEditClick={onSlotEditClick}
              onRemoveAssignment={onRemoveAssignment}
            />
          ))}
          {col.slots.length === 0 && (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
                Brak slotów
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        /* Time-based layout — positioned slot blocks on vertical axis */
        <Box
          onClick={handleGridClick}
          sx={{
            position: 'relative',
            height: gridHeight,
            bgcolor: 'background.paper',
            cursor: canEdit ? 'crosshair' : 'default',
          }}
        >
          {/* Horizontal grid lines (one per hour) */}
          {Array.from({ length: hourCount + 1 }, (_, i) => (
            <Box
              key={`hline-${i}`}
              sx={{
                position: 'absolute',
                top: i * PX_PER_HOUR_V,
                left: 0,
                right: 0,
                height: 1,
                bgcolor: 'divider',
                opacity: 0.4,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Half-hour dashed lines */}
          {Array.from({ length: hourCount }, (_, i) => (
            <Box
              key={`hhline-${i}`}
              sx={{
                position: 'absolute',
                top: i * PX_PER_HOUR_V + PX_PER_HOUR_V / 2,
                left: 0,
                right: 0,
                height: 1,
                borderTop: '1px dashed',
                borderColor: 'divider',
                opacity: 0.2,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Positioned slot blocks */}
          {col.slotBlocks.map(({ slot, top, height }) => (
            <Box
              key={`slotpos-${slot.id}`}
              sx={{
                position: 'absolute',
                top,
                left: CHIP_GAP,
                right: CHIP_GAP,
                height,
                zIndex: 1,
              }}
            >
              <SlotBlock
                slot={slot}
                height={height}
                canEdit={canEdit}
                isOver={overDropId === `slot:${slot.id}:${col.dateKey}`}
                dateKey={col.dateKey}
                onEditClick={onSlotEditClick}
                onRemoveAssignment={onRemoveAssignment}
              />
            </Box>
          ))}

          {/* "Now" horizontal line (today only) */}
          {nowPosV !== null && (
            <Box
              sx={{
                position: 'absolute',
                top: nowPosV,
                left: 0,
                right: 0,
                height: 2,
                bgcolor: '#ef5350',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -3,
                  left: -4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#ef5350',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: -16,
                  left: 4,
                  bgcolor: '#ef5350',
                  color: '#fff',
                  fontSize: 8,
                  fontWeight: 700,
                  px: 0.5,
                  borderRadius: 0.5,
                  whiteSpace: 'nowrap',
                  lineHeight: '12px',
                }}
              >
                {nowTimeLabel}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DayColumn;
