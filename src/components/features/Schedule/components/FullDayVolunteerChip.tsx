import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { useDraggable } from '@dnd-kit/core';
import { SLOT_TYPE_CONFIG } from '../constants';
import { avatarColor } from '../utils';
import type { AssignmentCardH } from '../types';

const FullDayVolunteerChip: React.FC<{ card: AssignmentCardH; canEdit: boolean }> = ({ card, canEdit }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `assignment:${card.assignmentId}`,
    data: { type: 'assignment', assignmentId: card.assignmentId, volunteerId: card.volunteerId, slotId: card.slotId, nickname: card.nickname },
    disabled: !canEdit,
  });
  const cfg = SLOT_TYPE_CONFIG[card.slotType];

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: '3px',
        borderRadius: 1,
        bgcolor: cfg.bg,
        border: '1px solid',
        borderColor: `${cfg.color}55`,
        opacity: isDragging ? 0.25 : 1,
        cursor: canEdit ? 'grab' : 'default',
        '&:active': { cursor: canEdit ? 'grabbing' : 'default' },
        transition: 'opacity 0.15s',
        userSelect: 'none',
      }}
    >
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
      <Avatar sx={{ width: 18, height: 18, fontSize: 7, fontWeight: 700, bgcolor: avatarColor(card.assignmentId), flexShrink: 0 }}>
        {card.nickname.slice(0, 1)}
      </Avatar>
      <Typography
        variant="caption"
        sx={{ fontSize: '0.68rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1 }}
      >
        {card.nickname}
      </Typography>
    </Box>
  );
};

export default FullDayVolunteerChip;
