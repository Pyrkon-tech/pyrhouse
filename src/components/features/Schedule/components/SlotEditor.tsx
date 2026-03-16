import React, { useState, useEffect } from 'react';
import {
  Popover,
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  MenuItem,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { ScheduleSlot, SlotType } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG } from '../constants';
import { parseAsLocal } from '../utils';

interface SlotEditorProps {
  slot: ScheduleSlot;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onUpdate: (slotId: number, changes: Partial<Pick<ScheduleSlot, 'start' | 'end' | 'capacity' | 'type' | 'label'>>) => void;
  onDelete: (slotId: number) => void;
}

/** Extract "HH:MM" from ISO datetime string (treats as local time) */
function toTimeStr(iso: string): string {
  const d = parseAsLocal(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Replace time portion of ISO string with "HH:MM" */
function withTime(iso: string, time: string): string {
  const datePart = iso.slice(0, 10);
  return `${datePart}T${time}:00`;
}

const SlotEditor: React.FC<SlotEditorProps> = ({ slot, anchorEl, onClose, onUpdate, onDelete }) => {
  const [startTime, setStartTime] = useState(() => toTimeStr(slot.start));
  const [endTime, setEndTime] = useState(() => toTimeStr(slot.end));
  const [capacity, setCapacity] = useState(slot.capacity);
  const [slotType, setSlotType] = useState<SlotType>(slot.type);
  const [label, setLabel] = useState(slot.label);

  // Reset when slot changes
  useEffect(() => {
    setStartTime(toTimeStr(slot.start));
    setEndTime(toTimeStr(slot.end));
    setCapacity(slot.capacity);
    setSlotType(slot.type);
    setLabel(slot.label);
  }, [slot]);

  const handleSave = () => {
    const changes: Partial<Pick<ScheduleSlot, 'start' | 'end' | 'capacity' | 'type' | 'label'>> = {};

    const newStart = withTime(slot.start, startTime);
    const newEnd = withTime(slot.end, endTime);

    if (newStart !== slot.start) changes.start = newStart;
    if (newEnd !== slot.end) changes.end = newEnd;
    if (capacity !== slot.capacity) changes.capacity = capacity;
    if (slotType !== slot.type) changes.type = slotType;
    if (label !== slot.label) changes.label = label;

    if (Object.keys(changes).length > 0) {
      onUpdate(slot.id, changes);
    }
    onClose();
  };

  const handleDelete = () => {
    onDelete(slot.id);
    onClose();
  };

  const cfg = SLOT_TYPE_CONFIG[slotType];
  const filled = slot.volunteers.length;

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 260,
            p: 1.5,
            bgcolor: 'background.paper',
            borderTop: `3px solid ${cfg.color}`,
          },
        },
      }}
    >
      {/* Type selector */}
      <TextField
        select
        size="small"
        label="Typ"
        value={slotType}
        onChange={(e) => setSlotType(e.target.value as SlotType)}
        fullWidth
        sx={{ mb: 1.5 }}
        InputProps={{ sx: { fontSize: '0.8rem' } }}
      >
        {Object.entries(SLOT_TYPE_CONFIG).map(([key, val]) => (
          <MenuItem key={key} value={key}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: val.color }} />
              {val.label}
            </Box>
          </MenuItem>
        ))}
      </TextField>

      {/* Label */}
      <TextField
        size="small"
        label="Etykieta"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        fullWidth
        sx={{ mb: 1.5 }}
        InputProps={{ sx: { fontSize: '0.8rem' } }}
      />

      {/* Time range */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <TextField
          size="small"
          label="Od"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          InputProps={{ sx: { fontSize: '0.8rem' }, inputProps: { step: 1800 } }}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          label="Do"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          InputProps={{ sx: { fontSize: '0.8rem' }, inputProps: { step: 1800 } }}
          sx={{ flex: 1 }}
        />
      </Box>

      {/* Capacity with +/- buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
          Pojemność:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
          <IconButton
            size="small"
            onClick={() => setCapacity((c) => Math.max(1, c - 1))}
            sx={{ p: 0.25, border: '1px solid', borderColor: 'divider' }}
          >
            <RemoveIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              minWidth: 32,
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {capacity}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setCapacity((c) => c + 1)}
            sx={{ p: 0.25, border: '1px solid', borderColor: 'divider' }}
          >
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Info: assigned volunteers */}
      {filled > 0 && (
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.65rem', mb: 1 }}>
          Przypisanych: {filled} wolontariusz{filled === 1 ? '' : filled < 5 ? 'y' : 'ów'}
        </Typography>
      )}

      <Divider sx={{ mb: 1 }} />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          sx={{ flex: 1, fontSize: '0.75rem', textTransform: 'none' }}
        >
          Zapisz
        </Button>
        <Button
          size="small"
          color="error"
          onClick={handleDelete}
          startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
          sx={{ fontSize: '0.75rem', textTransform: 'none' }}
        >
          Usuń
        </Button>
      </Box>
    </Popover>
  );
};

export default SlotEditor;
