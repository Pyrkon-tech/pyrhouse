import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { PX_PER_HOUR, DAY_HEADER_H, DAY_TYPE_COLORS } from '../constants';
import { slotHPos } from '../utils';
import type { DayGanttColumn } from '../types';
import HourAxis from './HourAxis';
import AssignmentCard from './AssignmentCard';
import SlotDropZone from './SlotDropZone';
import EmptySlotBar from './EmptySlotBar';
import FullDaySlotBlock from './FullDaySlotBlock';

const DayGanttView: React.FC<{
  col: DayGanttColumn;
  globalMinHour: number;
  globalMaxHour: number;
  canEdit: boolean;
  overDropId: string | null;
  nowPosH: number | null;
  now: Date;
}> = ({ col, globalMinHour, globalMaxHour, canEdit, overDropId, nowPosH, now }) => {
  const cfg = DAY_TYPE_COLORS[col.dayType];
  const hourCount = globalMaxHour - globalMinHour;
  const totalAssignments = col.cards.length;
  const totalCapacity = col.slots.reduce((s, sl) => s + sl.capacity, 0);
  const nowTimeLabel = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  return (
    <Box
      sx={{
        width: col.columnWidth,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Day header */}
      <Box
        sx={{
          height: DAY_HEADER_H,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          bgcolor: cfg.bg,
          borderBottom: '2px solid',
          borderColor: col.isToday ? cfg.color : 'divider',
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
        <Typography variant="caption" fontWeight={700} sx={{ color: cfg.color, fontSize: '0.75rem' }}>
          {col.label}
        </Typography>
        {col.isToday && (
          <Chip size="small" label="Dziś" color="primary" sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }} />
        )}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', whiteSpace: 'nowrap' }}>
          {col.slots.length} sl. · {totalAssignments}/{totalCapacity} m.
          {col.emptySlots.length > 0 && ` · ${col.emptySlots.length} pust.`}
        </Typography>
      </Box>

      {/* Full-day layout (montage/demontage — no time axis) */}
      {col.isFullDay ? (
        <Box sx={{ p: 0.5, bgcolor: 'background.paper' }}>
          {col.slots.map((slot) => {
            const slotCards = col.cards.filter((c) => c.slotId === slot.id);
            return (
              <FullDaySlotBlock
                key={`slot-${slot.id}`}
                slot={slot}
                cards={slotCards}
                canEdit={canEdit}
                isOver={overDropId === `slot:${slot.id}`}
              />
            );
          })}
        </Box>
      ) : (
        <>
          {/* Hour axis (sub-columns) */}
          <HourAxis minHour={globalMinHour} maxHour={globalMaxHour} width={col.columnWidth} />

          {/* Content area: assignment cards in lanes */}
          <Box
            sx={{
              position: 'relative',
              width: col.columnWidth,
              height: col.contentHeight,
              bgcolor: 'background.paper',
            }}
          >
            {/* Vertical hour grid lines */}
            {Array.from({ length: hourCount + 1 }, (_, i) => (
              <Box
                key={`gridline-${i}`}
                sx={{
                  position: 'absolute',
                  left: i * PX_PER_HOUR,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  bgcolor: 'divider',
                  opacity: 0.4,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Empty slot backgrounds */}
            {col.emptySlots.map((slot) => (
              <EmptySlotBar key={`empty-${slot.id}`} slot={slot} minHour={globalMinHour} />
            ))}

            {/* Droppable slot zones (behind cards) */}
            {canEdit && col.slots.map((slot) => {
              const { left, width } = slotHPos(slot, globalMinHour);
              return (
                <SlotDropZone
                  key={`drop-${slot.id}`}
                  slotId={slot.id}
                  left={left}
                  width={width}
                  contentHeight={col.contentHeight}
                  isOver={overDropId === `slot:${slot.id}`}
                />
              );
            })}

            {/* Assignment cards */}
            {col.cards.map((card) => (
              <AssignmentCard
                key={`card-${card.assignmentId}`}
                card={card}
                canEdit={canEdit}
              />
            ))}

            {/* "Now" vertical line (today only) */}
            {nowPosH !== null && (
              <Box
                sx={{
                  position: 'absolute',
                  left: nowPosH,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  bgcolor: '#ef5350',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    left: -3,
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
                    top: -18,
                    left: -14,
                    bgcolor: '#ef5350',
                    color: '#fff',
                    fontSize: 8,
                    fontWeight: 700,
                    px: 0.5,
                    borderRadius: 0.5,
                    whiteSpace: 'nowrap',
                    lineHeight: '14px',
                  }}
                >
                  {nowTimeLabel}
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default DayGanttView;
