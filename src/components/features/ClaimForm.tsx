import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material';
import { OriginSelect } from '../ui/OriginSelect';
import { claimReservationsAPI } from '../../services/assetService';

const reasonTranslations: Record<string, string> = {
  'reservation not found or already claimed': 'Rezerwacja nie istnieje lub już odebrana',
  'reservation already claimed': 'Rezerwacja już odebrana',
  'reservation not found': 'Rezerwacja nie istnieje',
};
import { useNotification } from '../../context/NotificationContext';
import type { ClaimItem } from '../../types/asset.types';

const DeleteIcon = lazy(() => import('@mui/icons-material/Delete'));
const CheckIcon = lazy(() => import('@mui/icons-material/Check'));

interface ClaimRow {
  id: string;
  pyr_code: string;
  serial: string;
}

const makeRow = (): ClaimRow => ({
  id: Date.now().toString() + Math.random(),
  pyr_code: '',
  serial: '',
});

export const ClaimForm: React.FC = () => {
  const { showSuccess, showError } = useNotification();

  const [origin, setOrigin] = useState('');
  const [rows, setRows] = useState<ClaimRow[]>([makeRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimErrors, setClaimErrors] = useState<{ pyr_code: string; reason: string }[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const pyrRefs = useRef<(HTMLInputElement | null)[]>([]);
  const serialRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    pyrRefs.current = pyrRefs.current.slice(0, rows.length);
    serialRefs.current = serialRefs.current.slice(0, rows.length);
  }, [rows.length]);

  const focusPyr = (index: number) => setTimeout(() => pyrRefs.current[index]?.focus(), 50);
  const focusSerial = (index: number) => setTimeout(() => serialRefs.current[index]?.focus(), 50);

  const addRow = useCallback((focusIndex?: number) => {
    setRows((prev) => [...prev, makeRow()]);
    if (focusIndex !== undefined) setTimeout(() => pyrRefs.current[focusIndex]?.focus(), 60);
  }, []);

  const updateRow = (index: number, field: 'pyr_code' | 'serial', value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    if (successCount !== null) setSuccessCount(null);
    if (claimErrors.length > 0) setClaimErrors([]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) { setRows([makeRow()]); return; }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePyrKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') { e.preventDefault(); focusSerial(index); }
  };

  const handleSerialKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === rows.length - 1) addRow(rows.length);
      else focusPyr(index + 1);
    }
  };

  const handleSubmit = async () => {
    if (!origin) { showError('Wybierz pochodzenie'); return; }

    const items: ClaimItem[] = rows
      .filter((r) => r.pyr_code.trim())
      .map((r) => ({ pyr_code: r.pyr_code.trim(), serial: r.serial.trim() || undefined }));

    if (items.length === 0) { showError('Zeskanuj co najmniej jeden kod PYR'); return; }

    setIsSubmitting(true);
    setClaimErrors([]);
    setSuccessCount(null);
    try {
      const result = await claimReservationsAPI({ origin, items });
      showSuccess(`Utworzono ${result.created.length} assetów`);
      setSuccessCount(result.created.length);
      setRows([makeRow()]);
      setTimeout(() => pyrRefs.current[0]?.focus(), 60);
    } catch (err: any) {
      if (err?.details) {
        try {
          const parsed = JSON.parse(err.details);
          if (Array.isArray(parsed)) { setClaimErrors(parsed); return; }
        } catch {}
      }
      showError(err?.message || 'Błąd podczas odbioru sprzętu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = rows.filter((r) => r.pyr_code.trim()).length;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Skanuj kod PYR ze stickera → Enter → skanuj numer seryjny → Enter → automatycznie przechodzi do następnego wiersza.
      </Typography>

      <Box sx={{ mb: 3, minWidth: 220, maxWidth: 300 }}>
        <OriginSelect value={origin} onChange={setOrigin} required />
      </Box>

      {successCount !== null && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessCount(null)}>
          Utworzono {successCount} assetów. Możesz kontynuować skanowanie.
        </Alert>
      )}
      {claimErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setClaimErrors([])}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Błędne kody — popraw i spróbuj ponownie:</Typography>
          {claimErrors.map((e) => (
            <Box key={e.pyr_code}>
              <strong>{e.pyr_code}</strong>: {reasonTranslations[e.reason] ?? e.reason}
            </Box>
          ))}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 36, color: 'text.secondary', fontSize: 12 }}>#</TableCell>
              <TableCell>Kod PYR</TableCell>
              <TableCell>Numer seryjny</TableCell>
              <TableCell sx={{ width: 40 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => {
              const errorEntry = claimErrors.find((e) => e.pyr_code === row.pyr_code && row.pyr_code);
              return (
                <TableRow key={row.id}>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{i + 1}</TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={row.pyr_code}
                      onChange={(e) => updateRow(i, 'pyr_code', e.target.value)}
                      onKeyDown={(e) => handlePyrKeyDown(e, i)}
                      inputRef={(el) => { pyrRefs.current[i] = el; }}
                      placeholder="PYR-XXX"
                      autoFocus={i === 0}
                      error={!!errorEntry}
                      helperText={errorEntry ? (reasonTranslations[errorEntry.reason] ?? errorEntry.reason) : ''}
                      inputProps={{ style: { fontFamily: 'monospace' } }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={row.serial}
                      onChange={(e) => updateRow(i, 'serial', e.target.value)}
                      onKeyDown={(e) => handleSerialKeyDown(e, i)}
                      inputRef={(el) => { serialRefs.current[i] = el; }}
                      placeholder="Numer seryjny"
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <IconButton size="small" onClick={() => removeRow(i)}>
                      <Suspense fallback={null}><DeleteIcon fontSize="small" /></Suspense>
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || validCount === 0}
          startIcon={
            isSubmitting
              ? <CircularProgress size={16} color="inherit" />
              : <Suspense fallback={null}><CheckIcon /></Suspense>
          }
        >
          {isSubmitting ? 'Tworzę assety...' : `Odbierz ${validCount} ${validCount === 1 ? 'asset' : 'assetów'}`}
        </Button>
        <Button
          variant="text"
          color="inherit"
          size="small"
          onClick={() => {
            setRows([makeRow()]);
            setClaimErrors([]);
            setSuccessCount(null);
            setTimeout(() => pyrRefs.current[0]?.focus(), 60);
          }}
        >
          Wyczyść
        </Button>
      </Box>
    </Box>
  );
};
