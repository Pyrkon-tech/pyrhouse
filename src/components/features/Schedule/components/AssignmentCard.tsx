import React from 'react';
import { Box, Typography, Tooltip, Avatar, Chip } from '@mui/material';
import { useDraggable } from '@dnd-kit/core';
import { CARD_HEIGHT, CARD_GAP, SLOT_TYPE_CONFIG } from '../constants';
import { avatarColor, parseAsLocal } from '../utils';
import type { AssignmentCardH } from '../types';

const AssignmentCard: React.FC<{
  card: AssignmentCardH;
  canEdit: boolean;
}> = ({ card, canEdit }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `assignment:${card.assignmentId}`,
    data: { type: 'assignment', assignmentId: card.assignmentId, volunteerId: card.volunteerId, slotId: card.slotId, nickname: card.nickname },
    disabled: !canEdit,
  });

  const cfg = SLOT_TYPE_CONFIG[card.slotType];
  const startTime = parseAsLocal(card.startTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const endTime = parseAsLocal(card.endTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const top = CARD_GAP + card.lane * (CARD_HEIGHT + CARD_GAP);

  return (
    <Tooltip
      title={`${card.nickname} • ${card.slotLabel} • ${startTime}–${endTime} • ${card.creditHours}h kredytu`}
      placement="top"
      arrow
      disableInteractive
    >
      <Box
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        sx={{
          position: 'absolute',
          left: card.left + 2,
          top,
          width: card.width - 4,
          height: CARD_HEIGHT,
          bgcolor: cfg.bg,
          border: '1.5px solid',
          borderColor: `${cfg.color}88`,
          borderRadius: 1,
          px: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          opacity: isDragging ? 0.25 : 1,
          cursor: canEdit ? 'grab' : 'default',
          transition: 'background-color 0.15s, border-color 0.15s, opacity 0.15s',
          overflow: 'hidden',
          userSelect: 'none',
          zIndex: isDragging ? 0 : 1,
          '&:active': { cursor: canEdit ? 'grabbing' : 'default' },
          '&:hover': {
            borderColor: cfg.color,
            boxShadow: `0 1px 6px ${cfg.color}30`,
          },
        }}
      >
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
        <Avatar
          sx={{ width: 20, height: 20, fontSize: 8, fontWeight: 700, bgcolor: avatarColor(card.assignmentId), flexShrink: 0 }}
        >
          {card.nickname.slice(0, 1)}
        </Avatar>
        <Typography
          variant="caption"
          sx={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, lineHeight: 1 }}
        >
          {card.nickname}
        </Typography>
        {card.width > 180 && (
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {startTime}–{endTime}
          </Typography>
        )}
        {card.width > 260 && (
          <Chip size="small" label={`${card.creditHours}h`} sx={{ height: 14, fontSize: 8, flexShrink: 0, '& .MuiChip-label': { px: 0.4 } }} />
        )}
      </Box>
    </Tooltip>
  );
};

export default AssignmentCard;
