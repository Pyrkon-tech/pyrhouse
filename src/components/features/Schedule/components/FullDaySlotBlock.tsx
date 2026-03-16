import React from 'react';
import { Box, Typography } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';
import type { ScheduleSlot } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG } from '../constants';
import { parseAsLocal } from '../utils';
import type { AssignmentCardH } from '../types';
import FullDayVolunteerChip from './FullDayVolunteerChip';

const FullDaySlotBlock: React.FC<{
  slot: ScheduleSlot;
  cards: AssignmentCardH[];
  canEdit: boolean;
  isOver: boolean;
}> = ({ slot, cards, canEdit, isOver }) => {
  const { setNodeRef } = useDroppable({
    id: `slot:${slot.id}`,
    data: { type: 'slot', slotId: slot.id },
  });
  const cfg = SLOT_TYPE_CONFIG[slot.type];
  const startTime = parseAsLocal(slot.start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const endTime = parseAsLocal(slot.end).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        border: '1px solid',
        borderColor: isOver ? 'primary.main' : `${cfg.color}44`,
        bgcolor: isOver ? 'rgba(255,152,0,0.08)' : cfg.bg,
        borderRadius: 1,
        p: 1,
        mb: 0.75,
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: cfg.color, fontSize: '0.7rem', mb: 0.25 }}>
        {slot.label}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontSize: '0.62rem', color: 'text.disabled', mb: 0.5 }}>
        {startTime}–{endTime} · {slot.credit_hours}h · {slot.volunteers.length}/{slot.capacity} os.
      </Typography>

      {cards.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: `${cfg.color}33`,
            borderRadius: 1,
            p: 0.75,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', fontStyle: 'italic' }}>
            Pusty slot — przeciągnij wolontariusza
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {cards.map((card) => (
            <FullDayVolunteerChip key={`fd-${card.assignmentId}`} card={card} canEdit={canEdit} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FullDaySlotBlock;
