import React, { useState } from 'react';
import { Box, Typography, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { ScheduleVolunteer, ScheduleSlot } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG } from '../constants';

function hoursColor(vol: ScheduleVolunteer): string {
  if (vol.assigned_hours === 0) return '#616161';
  if (vol.assigned_hours > vol.target_hours) return '#ef4444';
  if (vol.assigned_hours >= vol.target_hours) return '#10b981';
  return '#ff9800';
}

interface RosterVolunteerCardProps {
  volunteer: ScheduleVolunteer;
  canEdit: boolean;
  isAdmin?: boolean;
  slots?: ScheduleSlot[];
  isHighlighted?: boolean;
  onToggleHighlight?: (volunteerId: number) => void;
  onDelete?: (volunteerId: number) => void;
}

const RosterVolunteerCard: React.FC<RosterVolunteerCardProps> = ({
  volunteer, canEdit, isAdmin, slots, isHighlighted, onToggleHighlight, onDelete,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');

  const remaining = volunteer.target_hours - volunteer.assigned_hours;
  const color = hoursColor(volunteer);

  const handleDragStart = (e: React.DragEvent) => {
    const payload = { volunteerId: volunteer.id, nickname: volunteer.nickname };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const assignedSlots = slots?.filter((s) => volunteer.slots.includes(s.id)) ?? [];
  const slotSummary = assignedSlots.length > 0
    ? assignedSlots.map((s) => {
        const cfg = SLOT_TYPE_CONFIG[s.type];
        return `${cfg.label} ${s.start.slice(11, 16)}–${s.end.slice(11, 16)}`;
      }).join('\n')
    : 'Brak przypisań';
  const tooltipText = `${volunteer.nickname}\n${volunteer.assigned_hours}h / ${volunteer.target_hours}h\n\n${slotSummary}`;

  const handleConfirmDelete = () => {
    onDelete?.(volunteer.id);
    setConfirmOpen(false);
    setTyped('');
  };

  const handleDialogClose = () => {
    setConfirmOpen(false);
    setTyped('');
  };

  return (
    <>
      <Tooltip
        title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipText}</span>}
        arrow
        placement="left"
        enterDelay={300}
        slotProps={{ tooltip: { sx: { fontSize: '0.7rem', maxWidth: 240 } } }}
      >
        <Box
          draggable={canEdit}
          onDragStart={canEdit ? handleDragStart : undefined}
          onClick={() => onToggleHighlight?.(volunteer.id)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.75,
            px: 0.75,
            py: '3px',
            mb: '2px',
            borderRadius: 1,
            border: '1px solid',
            borderColor: isHighlighted ? 'primary.main' : 'transparent',
            bgcolor: isHighlighted ? 'rgba(255,152,0,0.10)' : 'transparent',
            cursor: canEdit ? 'grab' : 'pointer',
            transition: 'border-color 0.15s, background-color 0.15s',
            '&:hover': {
              bgcolor: isHighlighted ? 'rgba(255,152,0,0.12)' : 'action.hover',
              '& .vol-delete-btn': { opacity: 1 },
            },
            '&:active': canEdit ? { cursor: 'grabbing' } : {},
          }}
        >
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: isHighlighted ? 700 : 500,
              color: isHighlighted ? 'primary.light' : 'text.primary',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0,
            }}
          >
            {volunteer.nickname}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {volunteer.assigned_hours}
            <Box component="span" sx={{ opacity: 0.5, fontWeight: 400 }}>/{volunteer.target_hours}h</Box>
            {remaining > 0 && (
              <Box component="span" sx={{ ml: 0.4, opacity: 0.55, fontWeight: 400 }}>
                −{remaining}
              </Box>
            )}
          </Typography>
          {isAdmin && onDelete && (
            <IconButton
              className="vol-delete-btn"
              size="small"
              onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
              sx={{
                p: 0.25,
                ml: 0.25,
                opacity: 0,
                transition: 'opacity 0.15s',
                color: 'error.main',
                flexShrink: 0,
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      </Tooltip>

      <Dialog open={confirmOpen} onClose={handleDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>
          Usuń wolontariusza
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Usunięcie <strong>{volunteer.nickname}</strong> skasuje wszystkie jego przypisania do slotów. Nie da się cofnąć.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            Wpisz ksywkę wolontariusza, żeby potwierdzić:
          </Typography>
          <TextField
            autoFocus
            size="small"
            fullWidth
            placeholder={volunteer.nickname}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && typed === volunteer.nickname) handleConfirmDelete();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={handleDialogClose}>Anuluj</Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            disabled={typed !== volunteer.nickname}
            onClick={handleConfirmDelete}
          >
            Usuń
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RosterVolunteerCard;
