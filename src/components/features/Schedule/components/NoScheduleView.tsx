import React, { useState } from 'react';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import { useNotification } from '../../../../context/NotificationContext';
import { createScheduleAPI } from '../../../../services/scheduleService';
import type { CreateSchedulePayload } from '../../../../types/schedule.types';
import type { ApiErrorState } from '../types';
import { buildApiErrorState } from '../utils';
import ApiErrorAlert from './ApiErrorAlert';

const EMPTY_CREATE: CreateSchedulePayload = {
  name: '', event_start: '', event_end: '', festival_start: '', festival_end: '',
};

const NoScheduleView: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const { showSuccess } = useNotification();
  const [form, setForm] = useState<CreateSchedulePayload>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiErrorState | null>(null);

  const set = (f: keyof CreateSchedulePayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const valid = form.name.trim() && form.event_start && form.event_end && form.festival_start && form.festival_end;

  const handle = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      await createScheduleAPI({ ...form, name: form.name.trim() });
      showSuccess('Harmonogram utworzony');
      onCreated();
    } catch (e) {
      setCreateError(buildApiErrorState(e, 'Tworzenie harmonogramu'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 8, p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 0.5
        }}>Brak aktywnego harmonogramu</Typography>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 3
        }}>
        Utwórz nowy — poprzedni zostanie automatycznie zarchiwizowany.
      </Typography>
      {createError && (
        <ApiErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="Nazwa harmonogramu" value={form.name} onChange={set('name')} fullWidth autoFocus placeholder="np. Pyrkon 2026" />

        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            mb: -1
          }}>Zakres eventu (montaż + festiwal + demontaż)</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField label="Początek eventu" type="date" value={form.event_start} onChange={set('event_start')} slotProps={{
            inputLabel: { shrink: true }
          }} />
          <TextField label="Koniec eventu" type="date" value={form.event_end} onChange={set('event_end')} slotProps={{
            inputLabel: { shrink: true }
          }} />
        </Box>

        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            mb: -1
          }}>
          Faza festiwalowa — podaj z godzinami (wpływa na sloty solver-a)
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField
            label="Początek festiwalu"
            type="datetime-local"
            value={form.festival_start}
            onChange={set('festival_start')}
            helperText='np. "2026-06-19T10:00"'
            slotProps={{
              inputLabel: { shrink: true }
            }}
          />
          <TextField
            label="Koniec festiwalu"
            type="datetime-local"
            value={form.festival_end}
            onChange={set('festival_end')}
            helperText='np. "2026-06-21T20:00"'
            slotProps={{
              inputLabel: { shrink: true }
            }}
          />
        </Box>

        <Button
          variant="contained"
          onClick={handle}
          disabled={!valid || creating}
          startIcon={creating ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ mt: 1 }}
        >
          Utwórz harmonogram
        </Button>
      </Box>
    </Box>
  );
};

export default NoScheduleView;
