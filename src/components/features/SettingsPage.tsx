import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { DataTable, DataTableLoadingRow, DataTableEmptyRow } from '../ui/DataTable';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import { getSettingsAPI, getSettingAPI, updateSettingAPI } from '../../services/settingsService';
import { apiClient, ApiError } from '../../services/apiClient';
import type { Setting } from '../../types/settings.types';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';

interface SettingRowState {
  editing: boolean;
  loadingValue: boolean;
  editValue: string;
  saving: boolean;
  /** Wartość pobrana z API — null = nieznana (nie pobrano jeszcze) */
  revealedValue: string | null;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  /** Stan edycji per klucz */
  const [rowStates, setRowStates] = useState<Record<string, SettingRowState>>({});
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      // GET /settings bez prefixu — zwraca listę kluczy BEZ wartości
      const data = await getSettingsAPI();
      setSettings(data);
      // Zresetuj stany edycji przy odświeżeniu
      setRowStates({});
    } catch (err: any) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd podczas pobierania ustawień');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateRow = (key: string, patch: Partial<SettingRowState>) => {
    setRowStates((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? defaultRowState()), ...patch },
    }));
  };

  const defaultRowState = (): SettingRowState => ({
    editing: false,
    loadingValue: false,
    editValue: '',
    saving: false,
    revealedValue: null,
  });

  const getRow = (key: string): SettingRowState => rowStates[key] ?? defaultRowState();

  /** Kliknięcie "Edytuj" — pobierz aktualną wartość, pokaż pole edycji */
  const handleEdit = async (key: string) => {
    const row = getRow(key);
    if (row.revealedValue !== null) {
      // Wartość już pobrana — otwórz edycję od razu
      updateRow(key, { editing: true, editValue: row.revealedValue });
      return;
    }
    updateRow(key, { loadingValue: true });
    try {
      const data = await getSettingAPI(key);
      updateRow(key, {
        loadingValue: false,
        editing: true,
        editValue: data.value ?? '',
        revealedValue: data.value ?? '',
      });
    } catch (err: any) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd pobierania wartości');
      updateRow(key, { loadingValue: false });
    }
  };

  const handleCancel = (key: string) => {
    updateRow(key, { editing: false, editValue: '' });
  };

  const handleSave = async (key: string) => {
    const row = getRow(key);
    updateRow(key, { saving: true });
    try {
      await updateSettingAPI(key, row.editValue);
      updateRow(key, { saving: false, editing: false, revealedValue: row.editValue });
      showSnackbar('success', `Zapisano: ${key}`);
    } catch (err: any) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd podczas zapisywania');
      updateRow(key, { saving: false });
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
    <Box sx={{ p: 3 }}>
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Sync teraz">
            <span>
              <IconButton onClick={handleSync} disabled={syncing}>
                {syncing ? <CircularProgress size={20} /> : <SyncIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Odśwież listę">
            <IconButton onClick={fetchSettings} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <DataTable>
        <TableHead>
          <TableRow>
            <TableCell>Klucz</TableCell>
            <TableCell>Opis</TableCell>
            <TableCell>Ostatnia zmiana</TableCell>
            <TableCell>Wartość / Akcja</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <DataTableLoadingRow colSpan={4} />
          ) : settings.length === 0 ? (
            <DataTableEmptyRow colSpan={4} message="Brak ustawień" />
          ) : (
            settings.map((setting) => {
              const row = getRow(setting.key);
              return (
                <TableRow key={setting.key}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                      {setting.key}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {setting.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                      {new Date(setting.updated_at).toLocaleString('pl-PL')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 280 }}>
                    {row.editing ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          value={row.editValue}
                          onChange={(e) => updateRow(setting.key, { editValue: e.target.value })}
                          size="small"
                          fullWidth
                          disabled={row.saving}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(setting.key);
                            if (e.key === 'Escape') handleCancel(setting.key);
                          }}
                        />
                        <Tooltip title="Zapisz (Enter)">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleSave(setting.key)}
                              disabled={row.saving}
                            >
                              {row.saving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Anuluj (Esc)">
                          <IconButton
                            size="small"
                            onClick={() => handleCancel(setting.key)}
                            disabled={row.saving}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {row.revealedValue !== null && (
                          <Chip
                            label={row.revealedValue || '(puste)'}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 200 }}
                          />
                        )}
                        <Tooltip title={row.revealedValue !== null ? 'Edytuj wartość' : 'Pokaż i edytuj wartość'}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(setting.key)}
                              disabled={row.loadingValue}
                            >
                              {row.loadingValue ? (
                                <CircularProgress size={16} />
                              ) : (
                                <EditIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </DataTable>
    </Box>
  );
};

export default SettingsPage;
