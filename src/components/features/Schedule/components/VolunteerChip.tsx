import React, { useCallback } from 'react';
import { Box, Typography, Avatar, Tooltip, IconButton } from '@mui/material';
import { useDraggable } from '@dnd-kit/core';
import CloseIcon from '@mui/icons-material/Close';
import type { SlotVolunteer } from '../../../../types/schedule.types';
import { VOLUNTEER_CHIP_H } from '../constants';
import { avatarColor } from '../utils';

interface VolunteerChipProps {
  sv: SlotVolunteer;
  slotId: number;
  canEdit: boolean;
  /** Date key suffix for unique draggable ID (cross-midnight slots appear in 2 columns) */
  dateKey?: string;
  /** Volunteer's total hours info for tooltip */
  hoursInfo?: string;
  /** Called to remove this assignment from the slot */
  onRemove?: (assignmentId: number) => void;
}

const VolunteerChip: React.FC<VolunteerChipProps> = ({ sv, slotId, canEdit, dateKey, hoursInfo, onRemove }) => {
  // Include dateKey in draggable ID to avoid duplicates for cross-midnight slots
  const draggableId = dateKey ? `assignment:${sv.id}:${dateKey}` : `assignment:${sv.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: { type: 'assignment', assignmentId: sv.id, volunteerId: sv.id, slotId, nickname: sv.nickname },
    disabled: !canEdit,
  });

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(sv.id);
  }, [onRemove, sv.id]);

  return (
    <Tooltip
      title={hoursInfo ? `${sv.nickname} — ${hoursInfo}` : sv.nickname}
      placement="top"
      arrow
      disableInteractive
    >
      <Box
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          height: VOLUNTEER_CHIP_H,
          px: 0.5,
          borderRadius: 0.75,
          bgcolor: 'rgba(255,255,255,0.06)',
          opacity: isDragging ? 0.2 : 1,
          cursor: canEdit ? 'grab' : 'default',
          '&:active': { cursor: canEdit ? 'grabbing' : 'default' },
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.12)',
            '& .chip-remove': { opacity: 1 },
          },
          transition: 'opacity 0.15s, background-color 0.15s',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        <Avatar
          sx={{
            width: 18,
            height: 18,
            fontSize: 8,
            fontWeight: 700,
            bgcolor: avatarColor(sv.id),
            flexShrink: 0,
          }}
        >
          {sv.nickname.slice(0, 1)}
        </Avatar>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            fontWeight: 600,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
        >
          {sv.nickname}
        </Typography>
        {canEdit && onRemove && (
          <IconButton
            className="chip-remove"
            size="small"
            onClick={handleRemove}
            onPointerDown={(e) => e.stopPropagation()}
            sx={{
              p: 0,
              opacity: 0,
              transition: 'opacity 0.15s',
              flexShrink: 0,
              color: 'error.main',
              '&:hover': { bgcolor: 'rgba(239,83,80,0.15)' },
            }}
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        )}
      </Box>
    </Tooltip>
  );
};

export default VolunteerChip;
