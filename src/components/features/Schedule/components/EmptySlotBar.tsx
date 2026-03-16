import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import type { ScheduleSlot } from '../../../../types/schedule.types';
import { CARD_HEIGHT, CARD_GAP, SLOT_TYPE_CONFIG } from '../constants';
import { slotHPos, parseAsLocal } from '../utils';

const EmptySlotBar: React.FC<{ slot: ScheduleSlot; minHour: number }> = ({ slot, minHour }) => {
  const { left, width } = slotHPos(slot, minHour);
  const cfg = SLOT_TYPE_CONFIG[slot.type];
  const startTime = parseAsLocal(slot.start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const endTime = parseAsLocal(slot.end).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  return (
    <Tooltip
      title={`${slot.label} • ${startTime}–${endTime} • 0/${slot.capacity} osób (pusty)`}
      placement="top"
      arrow
      disableInteractive
    >
      <Box
        sx={{
          position: 'absolute',
          left: left + 2,
          top: CARD_GAP,
          width: width - 4,
          height: CARD_HEIGHT,
          border: '1px dashed',
          borderColor: `${cfg.color}33`,
          borderRadius: 1,
          opacity: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {width > 100 && (
          <Typography variant="caption" sx={{ fontSize: 8, color: 'text.disabled' }}>
            {slot.label} (pusty)
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default EmptySlotBar;
