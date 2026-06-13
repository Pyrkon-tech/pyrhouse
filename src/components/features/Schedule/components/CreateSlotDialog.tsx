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
  Typography,
} from '@mui/material';
import type { SlotType } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG } from '../constants';

interface CreateSlotDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (type: SlotType, start: string, end: string, label?: string) => void;
  /** Default date (YYYY-MM-DD) for prefilling */
  defaultDate?: string;
}

const CreateSlotDialog: React.FC<CreateSlotDialogProps> = ({ open, onClose, onCreate, defaultDate }) => {
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);

  const [slotType, setSlotType] = useState<SlotType>('festival');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [label, setLabel] = useState('');

  const durationMinutes = (() => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start) end += 24 * 60;
    return end - start;
  })();
  const isTooLong = durationMinutes > 8 * 60;

  const handleCreate = () => {
    const start = `${date}T${startTime}:00`;
    const end = `${date}T${endTime}:00`;
    onCreate(slotType, start, end, label || undefined);
    onClose();
    setSlotType('festival');
    setStartTime('10:00');
    setEndTime('12:00');
    setLabel('');
  };

  const isValid = date && startTime && endTime && startTime < endTime && !isTooLong;

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
          slotProps={{
            inputLabel: { shrink: true }
          }}
        />

        {/* Time range */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            label="Od"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{
              input: { inputProps: { step: 1800 } },
              inputLabel: { shrink: true }
            }} />
          <TextField
            size="small"
            label="Do"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{
              input: { inputProps: { step: 1800 } },
              inputLabel: { shrink: true }
            }} />
        </Box>

        {isTooLong && (
          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, fontSize: '0.75rem' }}>
            ⚠ Slot nie może być dłuższy niż 8h
          </Typography>
        )}

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
