import React, { useState, useEffect, useCallback } from 'react';
import {
  Popover,
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Divider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { ScheduleSlot, SlotType } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG } from '../constants';
import { parseAsLocal } from '../utils';

interface SlotEditorProps {
  slot: ScheduleSlot;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onUpdate: (slotId: number, changes: Partial<Pick<ScheduleSlot, 'start' | 'end' | 'type' | 'label'>>) => Promise<void> | void;
  onDelete: (slotId: number) => Promise<void> | void;
}

/** Extract "HH:MM" from ISO datetime string (treats as local time) */
function toTimeStr(iso: string): string {
  const d = parseAsLocal(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Replace time portion of ISO string with "HH:MM", optionally advancing to next day */
function withTime(iso: string, time: string, nextDay = false): string {
  const datePart = iso.slice(0, 10);
  if (nextDay) {
    const d = new Date(datePart + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const nextDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${nextDate}T${time}:00Z`;
  }
  return `${datePart}T${time}:00Z`;
}

/** Compute duration string from two HH:MM times (handles cross-midnight) */
function durationLabel(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60; // cross-midnight
  const diff = endMin - startMin;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const SlotEditor: React.FC<SlotEditorProps> = ({ slot, anchorEl, onClose, onUpdate, onDelete }) => {
  const [startTime, setStartTime] = useState(() => toTimeStr(slot.start));
  const [endTime, setEndTime] = useState(() => toTimeStr(slot.end));
  const [slotType, setSlotType] = useState<SlotType>(slot.type);
  const [label, setLabel] = useState(slot.label);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset when slot changes
  useEffect(() => {
    setStartTime(toTimeStr(slot.start));
    setEndTime(toTimeStr(slot.end));
    setSlotType(slot.type);
    setLabel(slot.label);
  }, [slot]);

  // Cross-midnight: end time is before start time (e.g., start=22:00, end=02:00)
  const isCrossMidnight = endTime < startTime;
  const durationMinutes = (() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let end = eh * 60 + em;
    const start = sh * 60 + sm;
    if (end <= start) end += 24 * 60;
    return end - start;
  })();
  const isTooLong = durationMinutes > 8 * 60;

  const handleSave = useCallback(async () => {
    const changes: Partial<Pick<ScheduleSlot, 'start' | 'end' | 'type' | 'label'>> = {};

    const newStart = withTime(slot.start, startTime);
    const newEnd = withTime(slot.start, endTime, isCrossMidnight);

    if (newStart !== slot.start) changes.start = newStart;
    if (newEnd !== slot.end) changes.end = newEnd;
    if (slotType !== slot.type) changes.type = slotType;
    if (label !== slot.label) changes.label = label;

    setSaving(true);
    try {
      await onUpdate(slot.id, changes);
      onClose();
    } catch {
      // error handled by parent — keep editor open
    } finally {
      setSaving(false);
    }
  }, [slot, startTime, endTime, slotType, label, isCrossMidnight, onUpdate, onClose]);

  const handleDelete = useCallback(async () => {
    setSaving(true);
    try {
      await onDelete(slot.id);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  }, [slot.id, onDelete, onClose]);

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
      <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
        <TextField
          size="small"
          label="Od"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          InputProps={{ sx: { fontSize: '0.8rem' } }}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          label={isCrossMidnight ? 'Do (nast. dzień)' : 'Do'}
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          InputProps={{ sx: { fontSize: '0.8rem' } }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': isCrossMidnight ? { borderColor: 'warning.main' } : {},
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          display: 'block', fontSize: '0.6rem', mb: 1.5, fontWeight: (isCrossMidnight || isTooLong) ? 600 : 400,
          color: isTooLong ? 'error.main' : isCrossMidnight ? 'warning.main' : 'text.disabled',
        }}
      >
        {isTooLong
          ? `⚠ ${durationLabel(startTime, endTime)} — max 8h!`
          : isCrossMidnight
          ? `⏱ ${durationLabel(startTime, endTime)} · przekracza północ`
          : `⏱ ${durationLabel(startTime, endTime)}`}
      </Typography>

      {/* Info: assigned volunteers */}
      {filled > 0 && (
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.65rem', mb: 1 }}>
          Przypisanych: {filled} wolontariusz{filled === 1 ? '' : filled < 5 ? 'y' : 'ów'}
        </Typography>
      )}

      <Divider sx={{ mb: 1 }} />

      {/* Actions */}
      {confirmDelete ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, fontSize: '0.72rem' }}>
            Usunąć slot{filled > 0 ? ` z ${filled} wolontariusz${filled === 1 ? 'em' : filled < 5 ? 'ami' : 'ami'}` : ''}?
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={saving}
              sx={{ flex: 1, fontSize: '0.75rem', textTransform: 'none' }}
            >
              {saving ? '…' : 'Potwierdź usunięcie'}
            </Button>
            <Button
              size="small"
              onClick={() => setConfirmDelete(false)}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              Anuluj
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ flex: 1, fontSize: '0.75rem', textTransform: 'none' }}
          >
            {saving ? '…' : 'Zapisz'}
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
            startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
            sx={{ fontSize: '0.75rem', textTransform: 'none' }}
          >
            Usuń
          </Button>
        </Box>
      )}
    </Popover>
  );
};

export default SlotEditor;
