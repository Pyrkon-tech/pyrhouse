import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  CircularProgress,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import { getSettingsAPI, updateSettingAPI } from '../../services/settingsService';
import { apiClient, ApiError } from '../../services/apiClient';
import type { Setting } from '../../types/settings.types';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';

const EQUIPMENT_REQUEST_PREFIX = 'equipment_request';

const SETTING_LABELS: Record<string, string> = {
  'equipment_request.sheet_id': 'Google Sheets — Document ID',
  'equipment_request.sheet_name': 'Google Sheets — Nazwa zakładki',
};

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSettingsAPI(EQUIPMENT_REQUEST_PREFIX);
      setSettings(data);
      const values: Record<string, string> = {};
      data.forEach((s) => {
        values[s.key] = s.value ?? '';
      });
      setFormValues(values);
    } catch (err: any) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd podczas pobierania ustawień');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(formValues).map(([key, value]) => updateSettingAPI(key, value))
      );
      showSnackbar('success', 'Ustawienia zapisane');
    } catch (err: any) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd podczas zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiClient.post('/equipment-requests/sync', {});
      showSnackbar('success', 'Synchronizacja zlecona');
    } catch (err: any) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd synchronizacji');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 700 }}>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Ustawienia aplikacji
        </Typography>
        <Tooltip title="Odśwież">
          <IconButton onClick={fetchSettings} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Google Sheets — Equipment Requests
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {settings.map((setting) => (
              <TextField
                key={setting.key}
                label={SETTING_LABELS[setting.key] ?? setting.key}
                value={formValues[setting.key] ?? ''}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                }
                fullWidth
                helperText={setting.description}
              />
            ))}

            {settings.length === 0 && (
              <Typography color="text.secondary">Brak ustawień do wyświetlenia</Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={handleSync}
              disabled={syncing || saving}
            >
              Sync teraz
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? <CircularProgress size={20} /> : 'Zapisz'}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default SettingsPage;
