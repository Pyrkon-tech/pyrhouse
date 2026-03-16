import React from 'react';
import { Box, Typography, Avatar, LinearProgress } from '@mui/material';
import { useDraggable } from '@dnd-kit/core';
import type { ScheduleVolunteer } from '../../../../types/schedule.types';
import { avatarColor } from '../utils';

const RosterVolunteerCard: React.FC<{ volunteer: ScheduleVolunteer; canEdit: boolean }> = ({ volunteer, canEdit }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `volunteer:${volunteer.id}`,
    data: { type: 'volunteer', volunteerId: volunteer.id, nickname: volunteer.nickname },
    disabled: !canEdit,
  });

  const ratio = volunteer.target_hours > 0
    ? Math.min(1, volunteer.assigned_hours / volunteer.target_hours)
    : 0;
  const overTarget = volunteer.assigned_hours > volunteer.target_hours;

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: '6px 8px',
        mb: 0.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        opacity: isDragging ? 0.25 : 1,
        cursor: canEdit ? 'grab' : 'default',
        '&:active': { cursor: canEdit ? 'grabbing' : 'default' },
        transition: 'opacity 0.15s',
      }}
    >
      <Avatar
        sx={{ width: 26, height: 26, fontSize: 10, fontWeight: 700, bgcolor: avatarColor(volunteer.id), flexShrink: 0 }}
      >
        {volunteer.nickname.slice(0, 2).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          sx={{ display: 'block', fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.72rem' }}
        >
          {volunteer.nickname}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          <LinearProgress
            variant="determinate"
            value={ratio * 100}
            sx={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: overTarget ? 'error.main' : 'primary.main' },
            }}
          />
          <Typography variant="caption" sx={{ fontSize: 9, color: overTarget ? 'error.main' : 'text.disabled', whiteSpace: 'nowrap' }}>
            {volunteer.assigned_hours}/{volunteer.target_hours}h
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default RosterVolunteerCard;
