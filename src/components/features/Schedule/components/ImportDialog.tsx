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
} from '@mui/material';
import { useNotification } from '../../../../context/NotificationContext';
import { importFromSheetAPI } from '../../../../services/scheduleService';
import { SHEET_FORMAT_INFO } from '../constants';
import type { ApiErrorState } from '../types';
import { buildApiErrorState, extractSheetId } from '../utils';
import ApiErrorAlert from './ApiErrorAlert';

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

  const sheetId = extractSheetId(sheetUrl);
  const canImport = !!sheetId && sheetName.trim().length > 0;

  const handleImport = async () => {
    if (!sheetId) {
      setUrlError('Nie można wyciągnąć ID arkusza z tego URL-a');
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      const res = await importFromSheetAPI(sheetId, sheetName.trim());
      showSuccess(`Zaimportowano ${res.imported} wolontariuszy`);
      setSheetUrl('');
      setSheetName('');
      setImportError(null);
      onImported();
      onClose();
    } catch (e) {
      setImportError(buildApiErrorState(e, 'Import'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import wolontariuszy z Google Sheets</DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Wolontariusze <strong>nie muszą</strong> mieć konta w systemie.
            Import jest addytywny — nie kasuje istniejących.
          </Alert>

          {importError && (
            <ApiErrorAlert error={importError} onDismiss={() => setImportError(null)} />
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
            label="Nazwa zakładki (sheet name)"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            fullWidth
            placeholder="np. wolontariusze"
            helperText="Dokładna nazwa zakładki (czułe na wielkość liter)"
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
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!canImport || importing}
          startIcon={importing ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Importuj
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;
