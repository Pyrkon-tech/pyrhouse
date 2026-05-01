import React from 'react';
import { Box, Typography, Avatar, LinearProgress, Tooltip } from '@mui/material';
import { useDraggable } from '@dnd-kit/core';
import type { ScheduleVolunteer, ScheduleSlot } from '../../../../types/schedule.types';
import { avatarColor } from '../utils';
import { SLOT_TYPE_CONFIG } from '../constants';

/** Status color based on hours ratio */
function statusRingColor(vol: ScheduleVolunteer): string {
  if (vol.assigned_hours === 0) return '#616161'; // grey — no assignments
  if (vol.assigned_hours > vol.target_hours) return '#ef4444'; // red — over target
  if (vol.assigned_hours >= vol.target_hours) return '#10b981'; // green — target met
  return '#ff9800'; // orange — partial
}

interface RosterVolunteerCardProps {
  volunteer: ScheduleVolunteer;
  canEdit: boolean;
  /** All schedule slots — used to build assignment tooltip */
  slots?: ScheduleSlot[];
  /** Whether this volunteer is highlighted (clicked in roster) */
  isHighlighted?: boolean;
  /** Toggle highlight callback */
  onToggleHighlight?: (volunteerId: number) => void;
}

const RosterVolunteerCard: React.FC<RosterVolunteerCardProps> = ({ volunteer, canEdit, slots, isHighlighted, onToggleHighlight }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `volunteer:${volunteer.id}`,
    data: { type: 'volunteer', volunteerId: volunteer.id, nickname: volunteer.nickname },
    disabled: !canEdit,
  });

  const ratio = volunteer.target_hours > 0
    ? Math.min(1, volunteer.assigned_hours / volunteer.target_hours)
    : 0;
  const overTarget = volunteer.assigned_hours > volunteer.target_hours;
  const ringColor = statusRingColor(volunteer);

  // Build tooltip with slot assignment details
  const assignedSlots = slots?.filter((s) => volunteer.slots.includes(s.id)) ?? [];
  const slotSummary = assignedSlots.length > 0
    ? assignedSlots
        .map((s) => {
          const cfg = SLOT_TYPE_CONFIG[s.type];
          const start = s.start.slice(11, 16);
          const end = s.end.slice(11, 16);
          return `${cfg.label} ${start}–${end}`;
        })
        .join('\n')
    : 'Brak przypisań';
  const tooltipText = `${volunteer.nickname}\n${volunteer.assigned_hours}h / ${volunteer.target_hours}h\n\n${slotSummary}`;

  return (
    <Tooltip
      title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipText}</span>}
      arrow
      placement="left"
      enterDelay={300}
      slotProps={{ tooltip: { sx: { fontSize: '0.7rem', fontWeight: 500, maxWidth: 240 } } }}
    >
      <Box
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => onToggleHighlight?.(volunteer.id)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: '6px 8px',
          mb: 0.5,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: isHighlighted ? 'primary.main' : 'divider',
          bgcolor: isHighlighted ? 'rgba(255,152,0,0.10)' : 'background.paper',
          opacity: isDragging ? 0.25 : 1,
          cursor: canEdit ? 'grab' : 'pointer',
          '&:active': { cursor: canEdit ? 'grabbing' : 'default' },
          transition: 'opacity 0.15s, border-color 0.2s, background-color 0.2s',
        }}
      >
        <Avatar
          sx={{
            width: 26,
            height: 26,
            fontSize: 10,
            fontWeight: 700,
            bgcolor: avatarColor(volunteer.id),
            flexShrink: 0,
            outline: `2px solid ${ringColor}`,
            outlineOffset: 1,
          }}
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
                height: 5,
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
    </Tooltip>
  );
};

export default RosterVolunteerCard;
