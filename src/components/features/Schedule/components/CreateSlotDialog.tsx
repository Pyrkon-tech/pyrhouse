import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Button,
  IconButton,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import type { SlotType } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG } from '../constants';

interface CreateSlotDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (type: SlotType, start: string, end: string, capacity: number, label?: string) => void;
  /** Default date (YYYY-MM-DD) for prefilling */
  defaultDate?: string;
}

const CreateSlotDialog: React.FC<CreateSlotDialogProps> = ({ open, onClose, onCreate, defaultDate }) => {
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);

  const [slotType, setSlotType] = useState<SlotType>('festival');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('14:00');
  const [capacity, setCapacity] = useState(4);
  const [label, setLabel] = useState('');

  const handleCreate = () => {
    const start = `${date}T${startTime}:00`;
    const end = `${date}T${endTime}:00`;
    onCreate(slotType, start, end, capacity, label || undefined);
    onClose();
    // Reset form
    setSlotType('festival');
    setStartTime('10:00');
    setEndTime('14:00');
    setCapacity(4);
    setLabel('');
  };

  const isValid = date && startTime && endTime && startTime < endTime && capacity > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, pb: 1 }}>
        Nowy slot
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {/* Type */}
        <TextField
          select
          size="small"
          label="Typ"
          value={slotType}
          onChange={(e) => setSlotType(e.target.value as SlotType)}
          fullWidth
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

        {/* Date */}
        <TextField
          size="small"
          label="Data"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        {/* Time range */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            label="Od"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputProps={{ inputProps: { step: 1800 } }}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            label="Do"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputProps={{ inputProps: { step: 1800 } }}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
        </Box>

        {/* Capacity */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Pojemność:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
            <IconButton
              size="small"
              onClick={() => setCapacity((c) => Math.max(1, c - 1))}
              sx={{ p: 0.25, border: '1px solid', borderColor: 'divider' }}
            >
              <RemoveIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, minWidth: 32, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
            >
              {capacity}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setCapacity((c) => c + 1)}
              sx={{ p: 0.25, border: '1px solid', borderColor: 'divider' }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Label (optional) */}
        <TextField
          size="small"
          label="Etykieta (opcjonalnie)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          fullWidth
          placeholder="Auto-generowana jeśli puste"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} size="small">Anuluj</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          size="small"
          disabled={!isValid}
        >
          Utwórz
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateSlotDialog;
