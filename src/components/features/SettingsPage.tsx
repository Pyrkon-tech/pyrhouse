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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Divider,
  useTheme,
  useMediaQuery,
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
import { Button } from '../ui/Button';
import { AppSnackbar } from '../ui';
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
  /** Klucz ustawienia oczekujący na potwierdzenie zapisu */
  const [confirmSaveKey, setConfirmSaveKey] = useState<string | null>(null);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      // GET /settings bez prefixu — zwraca listę kluczy BEZ wartości
      const data = await getSettingsAPI();
      setSettings(data);
      // Zresetuj stany edycji przy odświeżeniu
      setRowStates({});
    } catch (err) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd podczas pobierania ustawień');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

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
    } catch (err) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd pobierania wartości');
      updateRow(key, { loadingValue: false });
    }
  };

  const handleCancel = (key: string) => {
    updateRow(key, { editing: false, editValue: '' });
  };

  /** Otwarcie dialogu potwierdzenia — wywoływane przez przycisk zapisu lub Enter */
  const handleRequestSave = (key: string) => {
    setConfirmSaveKey(key);
  };

  /** Faktyczny zapis po potwierdzeniu w dialogu */
  const handleConfirmSave = async () => {
    if (!confirmSaveKey) return;
    const key = confirmSaveKey;
    setConfirmSaveKey(null);
    const row = getRow(key);
    updateRow(key, { saving: true });
    try {
      await updateSettingAPI(key, row.editValue);
      updateRow(key, { saving: false, editing: false, revealedValue: row.editValue });
      showSnackbar('success', `Zapisano: ${key}`);
    } catch (err) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd podczas zapisywania');
      updateRow(key, { saving: false });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiClient.post('/equipment-requests/sync', {});
      showSnackbar('success', 'Synchronizacja zlecona');
    } catch (err) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd synchronizacji');
    } finally {
      setSyncing(false);
    }
  };

  const renderMobileReadOnly = () => (
    <Grid container spacing={2}>
      {settings.map((setting) => (
        <Grid size={{ xs: 12 }} key={setting.key}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  mb: 0.5
                }}>
                {setting.key}
              </Typography>
              <Divider sx={{ my: 1 }} />
              {setting.description && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    mb: 1
                  }}>
                  {setting.description}
                </Typography>
              )}
              <Typography variant="caption" sx={{
                color: "text.disabled"
              }}>
                Ostatnia zmiana: {new Date(setting.updated_at).toLocaleString('pl-PL')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const confirmingRow = confirmSaveKey ? getRow(confirmSaveKey) : null;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{
          fontWeight: "bold"
        }}>
          Ustawienia aplikacji
        </Typography>
        {!isMobile && (
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
        )}
        {isMobile && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Odśwież listę">
              <IconButton onClick={fetchSettings} disabled={loading} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
      {isMobile ? (
        loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : settings.length === 0 ? (
          <Typography
            sx={{
              color: "text.secondary",
              textAlign: "center",
              mt: 4
            }}>
            Brak ustawień
          </Typography>
        ) : (
          renderMobileReadOnly()
        )
      ) : (
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
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.8rem"
                        }}>
                        {setting.key}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        {setting.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontSize: "0.75rem"
                        }}>
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
                              if (e.key === 'Enter') handleRequestSave(setting.key);
                              if (e.key === 'Escape') handleCancel(setting.key);
                            }}
                          />
                          <Tooltip title="Zapisz">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleRequestSave(setting.key)}
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
      )}
      {/* Dialog potwierdzenia zapisu ustawienia */}
      <Dialog
        open={!!confirmSaveKey}
        onClose={() => setConfirmSaveKey(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Potwierdź zmianę ustawienia</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz zmienić wartość ustawienia{' '}
            <Typography
              component="span"
              sx={{
                fontFamily: "monospace",
                fontWeight: "bold"
              }}>
              {confirmSaveKey}
            </Typography>
            ?
          </DialogContentText>
          {confirmingRow && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: 'action.hover',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                wordBreak: 'break-all',
              }}
            >
              Nowa wartość: <strong>{confirmingRow.editValue || '(puste)'}</strong>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="ghost" onClick={() => setConfirmSaveKey(null)}>Anuluj</Button>
          <Button variant="primary" onClick={handleConfirmSave}>
            Potwierdź zapis
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;
