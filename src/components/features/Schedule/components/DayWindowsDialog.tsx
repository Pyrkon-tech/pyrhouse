import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, CircularProgress, Alert,
  Tooltip, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import type { ScheduleDetail, DayWindow } from '../../../../types/schedule.types';
import { setDayWindowAPI, deleteDayWindowAPI, regenerateSlotsAPI } from '../../../../services/scheduleService';
import { ApiError } from '../../../../services/apiClient';

const DAY_NAMES_SHORT = ['Nie', 'Pon', 'Wt', 'Śr', 'Czw', 'Pią', 'Sob'];
const DEFAULT_START = '08:00';
const DEFAULT_END = '20:00';

/** Generate all date keys between two ISO date strings (inclusive). */
function dateRange(startKey: string, endKey: string): string[] {
  const result: string[] = [];
  const cur = new Date(startKey + 'T12:00:00');
  const end = new Date(endKey + 'T12:00:00');
  while (cur <= end) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function dayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${DAY_NAMES_SHORT[d.getDay()]} ${dd}.${mm}`;
}

function isValidTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t) && parseInt(t.split(':')[0]) < 24 && parseInt(t.split(':')[1]) < 60;
}

interface RowState {
  dateKey: string;
  start: string;
  end: string;
  dirty: boolean;
  saving: boolean;
  error: string | null;
}

interface DayWindowsDialogProps {
  open: boolean;
  schedule: ScheduleDetail;
  isAdmin: boolean;
  onClose: () => void;
  onRegenerated: (updated: ScheduleDetail) => void;
}

const DayWindowsDialog: React.FC<DayWindowsDialogProps> = ({
  open, schedule, isAdmin, onClose, onRegenerated,
}) => {
  const [rows, setRows] = useState<RowState[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);

  // Compute montage/demontage date ranges
  const montageDates = dateRange(
    schedule.event_start.slice(0, 10),
    new Date(new Date(schedule.festival_start.slice(0, 10) + 'T12:00:00').getTime() - 86_400_000)
      .toISOString().slice(0, 10),
  );
  const demontageDates = dateRange(
    new Date(new Date(schedule.festival_end.slice(0, 10) + 'T12:00:00').getTime() + 86_400_000)
      .toISOString().slice(0, 10),
    schedule.event_end.slice(0, 10),
  );
  const allDates = [...montageDates, ...demontageDates];

  useEffect(() => {
    if (!open) return;
    const windowMap = new Map<string, DayWindow>();
    for (const w of schedule.day_windows ?? []) windowMap.set(w.date, w);

    setRows(
      allDates.map((dateKey) => {
        const w = windowMap.get(dateKey);
        return {
          dateKey,
          start: w?.window_start ?? DEFAULT_START,
          end: w?.window_end ?? DEFAULT_END,
          dirty: false,
          saving: false,
          error: null,
        };
      }),
    );
    setRegenerateError(null);
    setRegenerateConfirm(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updateRow = useCallback((dateKey: string, field: 'start' | 'end', value: string) => {
    setRows((prev) => prev.map((r) =>
      r.dateKey === dateKey ? { ...r, [field]: value, dirty: true, error: null } : r,
    ));
  }, []);

  const saveRow = useCallback(async (dateKey: string) => {
    const row = rows.find((r) => r.dateKey === dateKey);
    if (!row) return;
    if (!isValidTime(row.start) || !isValidTime(row.end)) {
      setRows((prev) => prev.map((r) =>
        r.dateKey === dateKey ? { ...r, error: 'Nieprawidłowy format czasu (HH:MM)' } : r,
      ));
      return;
    }
    setRows((prev) => prev.map((r) => r.dateKey === dateKey ? { ...r, saving: true, error: null } : r));
    try {
      await setDayWindowAPI({ date: dateKey, window_start: row.start, window_end: row.end });
      setRows((prev) => prev.map((r) => r.dateKey === dateKey ? { ...r, saving: false, dirty: false } : r));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Błąd zapisu';
      setRows((prev) => prev.map((r) => r.dateKey === dateKey ? { ...r, saving: false, error: msg } : r));
    }
  }, [rows]);

  const resetRow = useCallback(async (dateKey: string) => {
    setRows((prev) => prev.map((r) =>
      r.dateKey === dateKey ? { ...r, saving: true, error: null } : r,
    ));
    try {
      await deleteDayWindowAPI(dateKey);
      setRows((prev) => prev.map((r) =>
        r.dateKey === dateKey ? { ...r, start: DEFAULT_START, end: DEFAULT_END, saving: false, dirty: false } : r,
      ));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Błąd resetowania';
      setRows((prev) => prev.map((r) => r.dateKey === dateKey ? { ...r, saving: false, error: msg } : r));
    }
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenerateError(null);
    setRegenerateConfirm(false);
    try {
      const updated = await regenerateSlotsAPI();
      onRegenerated(updated);
      onClose();
    } catch (e) {
      setRegenerateError(e instanceof ApiError ? e.message : 'Błąd regeneracji');
    } finally {
      setRegenerating(false);
    }
  };

  const hasUnsaved = rows.some((r) => r.dirty);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Okna montażowe</Typography>
          <Typography variant="caption" color="text.secondary">
            Czas pracy na dzień montażu/demontażu
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {allDates.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary" variant="body2">
              Brak dni montażu/demontażu w tym harmonogramie.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Section headers */}
            {montageDates.length > 0 && (
              <Box sx={{ px: 2, py: 0.75, bgcolor: 'rgba(66,165,245,0.07)', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#42a5f5', letterSpacing: 1 }}>MONTAŻ</Typography>
              </Box>
            )}
            {montageDates.map((dateKey) => (
              <DayRow
                key={dateKey}
                row={rows.find((r) => r.dateKey === dateKey)!}
                onChangeStart={(v) => updateRow(dateKey, 'start', v)}
                onChangeEnd={(v) => updateRow(dateKey, 'end', v)}
                onSave={() => saveRow(dateKey)}
                onReset={() => resetRow(dateKey)}
              />
            ))}

            {demontageDates.length > 0 && (
              <>
                <Divider />
                <Box sx={{ px: 2, py: 0.75, bgcolor: 'rgba(171,71,188,0.07)', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#ab47bc', letterSpacing: 1 }}>DEMONTAŻ</Typography>
                </Box>
              </>
            )}
            {demontageDates.map((dateKey) => (
              <DayRow
                key={dateKey}
                row={rows.find((r) => r.dateKey === dateKey)!}
                onChangeStart={(v) => updateRow(dateKey, 'start', v)}
                onChangeEnd={(v) => updateRow(dateKey, 'end', v)}
                onSave={() => saveRow(dateKey)}
                onReset={() => resetRow(dateKey)}
              />
            ))}
          </>
        )}

        {/* Regenerate section */}
        {isAdmin && (
          <>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Regeneracja slotów</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Usuwa wszystkie sloty montaż/demontaż (i ich przypisania), tworzy nowe 1h sloty według aktualnych okien. Sloty festiwalowe pozostają nienaruszone.
              </Typography>
              {regenerateError && <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>{regenerateError}</Alert>}
              {!regenerateConfirm ? (
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<AutorenewIcon />}
                  onClick={() => setRegenerateConfirm(true)}
                  disabled={regenerating || hasUnsaved}
                >
                  {hasUnsaved ? 'Najpierw zapisz okna' : 'Regeneruj sloty montażowe'}
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
                    Na pewno? Przypisania montażowe zostaną wyczyszczone.
                  </Typography>
                  <Button size="small" color="warning" variant="contained" onClick={handleRegenerate} disabled={regenerating}>
                    {regenerating ? <CircularProgress size={14} sx={{ mr: 0.5 }} /> : null}
                    Tak, regeneruj
                  </Button>
                  <Button size="small" onClick={() => setRegenerateConfirm(false)} disabled={regenerating}>
                    Anuluj
                  </Button>
                </Box>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} size="small">Zamknij</Button>
      </DialogActions>
    </Dialog>
  );
};

// ---- DayRow ------------------------------------------------------------------

interface DayRowProps {
  row: RowState | undefined;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  onSave: () => void;
  onReset: () => void;
}

const DayRow: React.FC<DayRowProps> = ({ row, onChangeStart, onChangeEnd, onSave, onReset }) => {
  if (!row) return null;

  const isDefault = row.start === DEFAULT_START && row.end === DEFAULT_END;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 0.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        bgcolor: row.dirty ? 'rgba(255,152,0,0.04)' : 'transparent',
      }}
    >
      <Typography sx={{ width: 70, flexShrink: 0, fontSize: '0.78rem', fontWeight: 600, color: 'text.primary' }}>
        {dayLabel(row.dateKey)}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
        <TimeInput
          value={row.start}
          onChange={onChangeStart}
          disabled={row.saving}
          label="od"
        />
        <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>–</Typography>
        <TimeInput
          value={row.end}
          onChange={onChangeEnd}
          disabled={row.saving}
          label="do"
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        {row.saving ? (
          <CircularProgress size={16} />
        ) : (
          <>
            <Button
              size="small"
              variant={row.dirty ? 'contained' : 'outlined'}
              color="primary"
              onClick={onSave}
              disabled={!row.dirty}
              sx={{ minWidth: 0, px: 1, py: 0.3, fontSize: '0.68rem' }}
            >
              Zapisz
            </Button>
            {!isDefault && (
              <Tooltip title="Przywróć domyślne (08:00–20:00)">
                <IconButton size="small" onClick={onReset} sx={{ p: 0.3 }}>
                  <RestoreIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Box>

      {row.error && (
        <Typography sx={{ fontSize: '0.65rem', color: 'error.main', ml: 0.5 }}>{row.error}</Typography>
      )}
    </Box>
  );
};

// ---- TimeInput ---------------------------------------------------------------

const TimeInput: React.FC<{ value: string; onChange: (v: string) => void; disabled: boolean; label: string }> = ({
  value, onChange, disabled, label,
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
    <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>{label}</Typography>
    <Box
      component="input"
      type="text"
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="HH:MM"
      sx={{
        width: 52,
        bgcolor: 'rgba(255,255,255,0.06)',
        border: '1px solid',
        borderColor: isValidTime(value) ? 'divider' : 'error.main',
        borderRadius: 0.5,
        color: 'text.primary',
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        px: 0.5,
        py: 0.3,
        textAlign: 'center',
        outline: 'none',
        '&:focus': { borderColor: 'primary.main' },
        '&:disabled': { opacity: 0.5 },
      }}
    />
  </Box>
);

export default DayWindowsDialog;
