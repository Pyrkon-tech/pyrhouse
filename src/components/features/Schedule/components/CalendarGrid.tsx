import React from 'react';
import { Box, Typography } from '@mui/material';
import { DAY_HEADER_HEIGHT, HOUR_AXIS_WIDTH } from '../constants';
import type { DayColumnData } from '../types';
import type { ScheduleSlot } from '../../../../types/schedule.types';
import VerticalHourAxis from './VerticalHourAxis';
import DayColumn from './DayColumn';

interface CalendarGridProps {
  columns: DayColumnData[];
  globalMinHour: number;
  globalMaxHour: number;
  canEdit: boolean;
  overDropId: string | null;
  now: Date;
  onSlotEditClick?: (slot: ScheduleSlot, anchorEl: HTMLElement) => void;
  onGridClick?: (dateKey: string, hour: number, anchorEl: HTMLElement) => void;
  onRemoveAssignment?: (assignmentId: number) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  columns,
  globalMinHour,
  globalMaxHour,
  canEdit,
  overDropId,
  now,
  onSlotEditClick,
  onGridClick,
  onRemoveAssignment,
}) => {
  if (columns.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6, textAlign: 'center', color: 'text.disabled' }}>
        <Box>
          <Typography variant="body2">Brak slotów w tym harmonogramie.</Typography>
          <Typography variant="caption">
            Zaimportuj wolontariuszy, a następnie użyj "Auto-generuj" aby solver przypisał ich do slotów.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Check if ALL columns are full-day (no hour axis needed)
  const allFullDay = columns.every((c) => c.isFullDay);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Scrollable area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Left hour axis (sticky) — only for time-based columns */}
        {!allFullDay && (
          <Box
            sx={{
              position: 'sticky',
              left: 0,
              zIndex: 10,
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Spacer for day header alignment */}
            <Box
              sx={{
                height: DAY_HEADER_HEIGHT,
                width: HOUR_AXIS_WIDTH,
                borderBottom: '2px solid',
                borderColor: 'divider',
                borderRight: '1px solid',
                flexShrink: 0,
              }}
            />
            <VerticalHourAxis minHour={globalMinHour} maxHour={globalMaxHour} />
          </Box>
        )}

        {/* Day columns */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            minWidth: 'min-content',
          }}
        >
          {columns.map((col) => (
            <DayColumn
              key={col.dateKey}
              col={col}
              globalMinHour={globalMinHour}
              globalMaxHour={globalMaxHour}
              canEdit={canEdit}
              overDropId={overDropId}
              now={now}
              onSlotEditClick={onSlotEditClick}
              onGridClick={onGridClick}
              onRemoveAssignment={onRemoveAssignment}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default CalendarGrid;
