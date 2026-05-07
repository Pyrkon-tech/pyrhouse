import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Typography,
} from '@mui/material';
import { useNotification } from '../../../../context/NotificationContext';
import { importFromSheetAPI } from '../../../../services/scheduleService';
import { SHEET_FORMAT_INFO } from '../constants';
import type { ApiErrorState } from '../types';
import { buildApiErrorState, extractSheetId } from '../utils';
import ApiErrorAlert from './ApiErrorAlert';

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const ImportDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}> = ({ open, onClose, onImported }) => {
  const { showSuccess } = useNotification();
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [importError, setImportError] = useState<ApiErrorState | null>(null);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const sheetId = extractSheetId(sheetUrl);
  const canImport = !!sheetId && sheetName.trim().length > 0;

  const handleImport = async () => {
    if (!sheetId) {
      setUrlError('Nie można wyciągnąć ID arkusza z tego URL-a');
      return;
    }
    setImporting(true);
    setImportError(null);
    setLastResult(null);
    try {
      const res = await importFromSheetAPI(sheetId, sheetName.trim());
      setLastResult(res);
      const parts = [`Nowi: ${res.imported}`];
      if (res.updated > 0) parts.push(`Zaktualizowani: ${res.updated}`);
      if (res.skipped > 0) parts.push(`Pominięci: ${res.skipped}`);
      showSuccess(`Import zakończony — ${parts.join(', ')}`);
      onImported();
    } catch (e) {
      setImportError(buildApiErrorState(e, 'Import'));
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSheetUrl('');
    setSheetName('');
    setImportError(null);
    setLastResult(null);
    setUrlError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import gżdaczy z Google Sheets</DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Gżdacze <strong>nie muszą</strong> mieć konta w systemie.
            Import jest addytywny — nie kasuje istniejących, ten sam nick = aktualizacja.
          </Alert>

          {importError && (
            <ApiErrorAlert error={importError} onDismiss={() => setImportError(null)} />
          )}

          {lastResult && (
            <Alert severity={lastResult.errors.length > 0 ? 'warning' : 'success'} sx={{ py: 0.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2"><strong>Nowi:</strong> {lastResult.imported}</Typography>
                  <Typography variant="body2"><strong>Zaktualizowani:</strong> {lastResult.updated}</Typography>
                  <Typography variant="body2"><strong>Pominięci:</strong> {lastResult.skipped}</Typography>
                </Box>
                {lastResult.errors.length > 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>Błędy:</Typography>
                    {lastResult.errors.map((err, i) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block', color: 'warning.main' }}>
                        • {err}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </Alert>
          )}

          <TextField
            label="Link do arkusza Google Sheets"
            value={sheetUrl}
            onChange={(e) => { setSheetUrl(e.target.value); setUrlError(null); }}
            fullWidth
            autoFocus
            placeholder="https://docs.google.com/spreadsheets/d/..."
            error={!!urlError || (sheetUrl.length > 10 && !sheetId)}
            helperText={
              urlError ??
              (sheetUrl.length > 10 && !sheetId
                ? 'Nieprawidłowy link — brak ID arkusza'
                : sheetId ? `ID: ${sheetId}` : undefined)
            }
          />
          <TextField
            label="Nazwa zakładki"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            fullWidth
            placeholder="np. Gżdacze"
            helperText="Dokładna nazwa zakładki w Sheets (czułe na wielkość liter)"
          />
          <Box>
            <Button size="small" onClick={() => setShowFormat((v) => !v)}>
              {showFormat ? 'Ukryj format' : 'Pokaż wymagany format arkusza'}
            </Button>
            {showFormat && (
              <Box
                component="pre"
                sx={{ mt: 1, bgcolor: 'action.hover', borderRadius: 1, p: 1.5, fontSize: '0.72rem', whiteSpace: 'pre-wrap', color: 'text.secondary' }}
              >
                {SHEET_FORMAT_INFO}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {lastResult ? 'Zamknij' : 'Anuluj'}
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!canImport || importing}
          startIcon={importing ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {lastResult ? 'Importuj ponownie' : 'Importuj'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;
