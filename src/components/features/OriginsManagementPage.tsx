import React, { useState } from 'react';
import {
  Box,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Grid,
  Divider,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import { DataTable, DataTableLoadingRow, DataTableEmptyRow } from '../ui/DataTable';
import { Button } from '../ui/Button';
import { PageHeader, ConfirmDialog } from '../ui';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useOrigins, notifyOriginsChanged } from '../../hooks/useOrigins';
import { useDialogState } from '../../hooks/useDialogState';
import { useAuth } from '../../hooks/useAuth';
import { createOriginAPI, updateOriginAPI, deleteOriginAPI } from '../../services/originService';
import { ApiError } from '../../services/apiClient';
import type { Origin, CreateOriginPayload, UpdateOriginPayload } from '../../types/origin.types';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';

const emptyCreateForm = (): CreateOriginPayload => ({
  slug: '',
  label: '',
  allow_suffix: false,
  sort_order: 0,
});

const OriginsManagementPage: React.FC = () => {
  const { origins, loading, error, refresh } = useOrigins(true);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const { userRole } = useAuth();
  const canEdit = userRole !== 'dispatcher';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const dialogs = useDialogState<Origin>();
  const [addForm, setAddForm] = useState<CreateOriginPayload>(emptyCreateForm());
  const [addSaving, setAddSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState<UpdateOriginPayload>({});
  const [editSaving, setEditSaving] = useState(false);

  const handleOpenAdd = () => {
    setAddForm(emptyCreateForm());
    dialogs.openAdd();
  };

  const handleCreate = async () => {
    if (!addForm.slug.trim() || !addForm.label.trim()) {
      showSnackbar('error', 'Slug i label są wymagane');
      return;
    }
    setAddSaving(true);
    try {
      await createOriginAPI(addForm);
      notifyOriginsChanged();
      refresh();
      dialogs.closeAdd();
      showSnackbar('success', 'Origin dodany');
    } catch (err) {
      showSnackbar('error', (err instanceof Error ? err.message : '') || 'Błąd podczas dodawania originu');
    } finally {
      setAddSaving(false);
    }
  };

  const handleOpenEdit = (origin: Origin) => {
    dialogs.openEdit(origin);
    setEditForm({
      label: origin.label,
      allow_suffix: origin.allow_suffix,
      active: origin.active,
      sort_order: origin.sort_order,
    });
  };

  const handleUpdate = async () => {
    if (!dialogs.editItem) return;
    if (!editForm.label?.trim()) {
      showSnackbar('error', 'Label jest wymagany');
      return;
    }
    setEditSaving(true);
    try {
      await updateOriginAPI(dialogs.editItem.id, editForm);
      notifyOriginsChanged();
      refresh();
      dialogs.closeEdit();
      showSnackbar('success', 'Origin zaktualizowany');
    } catch (err) {
      showSnackbar('error', (err instanceof Error ? err.message : '') || 'Błąd podczas aktualizacji originu');
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleActive = async (origin: Origin) => {
    try {
      await updateOriginAPI(origin.id, { active: !origin.active });
      notifyOriginsChanged();
      refresh();
      showSnackbar('success', origin.active ? 'Origin dezaktywowany' : 'Origin aktywowany');
    } catch (err) {
      showSnackbar('error', (err instanceof Error ? err.message : '') || 'Błąd podczas zmiany statusu');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!dialogs.deleteItem) return;
    const target = dialogs.deleteItem;
    setDeleting(true);
    try {
      await deleteOriginAPI(target.id);
      notifyOriginsChanged();
      refresh();
      dialogs.closeDelete();
      showSnackbar('success', `Origin "${target.label}" usunięty`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showSnackbar(
          'error',
          `Nie można usunąć "${target.label}" — ma przypisany sprzęt`,
          'Dezaktywuj origin zamiast go usuwać. Istniejący sprzęt zachowa swoje dane.'
        );
      } else {
        showSnackbar('error', (err instanceof Error ? err.message : '') || 'Błąd podczas usuwania originu');
      }
      dialogs.closeDelete();
    } finally {
      setDeleting(false);
    }
  };

  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {origins.map((origin) => (
        <Grid item xs={12} key={origin.id}>
          <Card sx={{ opacity: origin.active ? 1 : 0.6, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body1" fontFamily="monospace" fontWeight="bold">
                  {origin.slug}
                </Typography>
                <Chip
                  label={origin.active ? 'Aktywny' : 'Nieaktywny'}
                  size="small"
                  color={origin.active ? 'success' : 'default'}
                  onClick={canEdit ? () => handleToggleActive(origin) : undefined}
                  clickable={canEdit}
                />
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Label:</Typography>
                  <Typography variant="body2">{origin.label}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Sort Order:</Typography>
                  <Typography variant="body2">{origin.sort_order}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Allow Suffix:</Typography>
                  <Chip
                    label={origin.allow_suffix ? 'Tak' : 'Nie'}
                    size="small"
                    color={origin.allow_suffix ? 'info' : 'default'}
                  />
                </Box>
              </Box>

              {canEdit && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                  <Tooltip title="Edytuj">
                    <IconButton size="small" onClick={() => handleOpenEdit(origin)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Usuń (hard delete — niemożliwe jeśli ma sprzęt)">
                    <IconButton size="small" color="error" onClick={() => dialogs.openDelete(origin)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderTable = () => (
    <DataTable>
      <TableHead>
        <TableRow>
          <TableCell>Slug</TableCell>
          <TableCell>Label</TableCell>
          <TableCell align="center">Allow Suffix</TableCell>
          <TableCell align="center">Status</TableCell>
          <TableCell align="center">Sort Order</TableCell>
          <TableCell align="right">Akcje</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <DataTableLoadingRow colSpan={6} />
        ) : origins.length === 0 ? (
          <DataTableEmptyRow colSpan={6} message="Brak originów" />
        ) : (
          origins.map((origin) => (
            <TableRow key={origin.id} sx={{ opacity: origin.active ? 1 : 0.5 }}>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {origin.slug}
                </Typography>
              </TableCell>
              <TableCell>{origin.label}</TableCell>
              <TableCell align="center">
                {origin.allow_suffix ? (
                  <Chip label="Tak" size="small" color="info" />
                ) : (
                  <Chip label="Nie" size="small" />
                )}
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={origin.active ? 'Aktywny' : 'Nieaktywny'}
                  size="small"
                  color={origin.active ? 'success' : 'default'}
                  onClick={canEdit ? () => handleToggleActive(origin) : undefined}
                  clickable={canEdit}
                />
              </TableCell>
              <TableCell align="center">{origin.sort_order}</TableCell>
              <TableCell align="right">
                {canEdit && (
                  <>
                    <Tooltip title="Edytuj">
                      <IconButton size="small" onClick={() => handleOpenEdit(origin)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Usuń (hard delete — niemożliwe jeśli ma sprzęt)">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => dialogs.openDelete(origin)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </DataTable>
  );

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
      <PageHeader
        title="Zarządzanie Originami"
        actions={
          <>
            <Tooltip title="Odśwież">
              <IconButton onClick={refresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            {canEdit && (
              <Button variant="primary" leftIcon={<AddIcon />} onClick={handleOpenAdd}>
                Dodaj origin
              </Button>
            )}
          </>
        }
      />
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {isMobile ? (
        loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : origins.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
            Brak originów
          </Typography>
        ) : (
          renderMobileCards()
        )
      ) : (
        renderTable()
      )}
      {/* Add Dialog */}
      <Dialog open={dialogs.addOpen} onClose={dialogs.closeAdd} maxWidth="sm" fullWidth>
        <DialogTitle>Dodaj origin</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Slug"
            value={addForm.slug}
            onChange={(e) => setAddForm({ ...addForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            required
            fullWidth
            helperText="Unikalny identyfikator, np. 'moja-firma' (tylko małe litery i myślniki)"
          />
          <TextField
            label="Label"
            value={addForm.label}
            onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
            required
            fullWidth
            helperText="Nazwa wyświetlana użytkownikowi"
          />
          <TextField
            label="Sort Order"
            type="number"
            value={addForm.sort_order ?? 0}
            onChange={(e) => setAddForm({ ...addForm, sort_order: Number(e.target.value) })}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={addForm.allow_suffix ?? false}
                onChange={(e) => setAddForm({ ...addForm, allow_suffix: e.target.checked })}
              />
            }
            label="Allow Suffix (np. personal-jan)"
          />
        </DialogContent>
        <DialogActions>
          <Button variant="ghost" onClick={dialogs.closeAdd}>Anuluj</Button>
          <Button variant="primary" onClick={handleCreate} loading={addSaving}>Dodaj</Button>
        </DialogActions>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={dialogs.isDeleteOpen}
        title="Usuń origin"
        message={
          <>
            <Typography>
              Czy na pewno chcesz usunąć origin{' '}
              <Typography component="span" fontFamily="monospace" fontWeight="bold">
                {dialogs.deleteItem?.slug}
              </Typography>
              ?
            </Typography>
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              Operacja jest nieodwracalna. Jeśli origin ma przypisany sprzęt, usunięcie zostanie zablokowane (409).
            </Typography>
          </>
        }
        confirmLabel="Usuń"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={dialogs.closeDelete}
      />
      {/* Edit Dialog */}
      <Dialog open={dialogs.isEditOpen} onClose={dialogs.closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edytuj origin:{' '}
          <Typography component="span" fontFamily="monospace" color="text.secondary">
            {dialogs.editItem?.slug}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Label"
            value={editForm.label ?? ''}
            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Sort Order"
            type="number"
            value={editForm.sort_order ?? 0}
            onChange={(e) => setEditForm({ ...editForm, sort_order: Number(e.target.value) })}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={editForm.allow_suffix ?? false}
                onChange={(e) => setEditForm({ ...editForm, allow_suffix: e.target.checked })}
              />
            }
            label="Allow Suffix"
          />
          <FormControlLabel
            control={
              <Switch
                checked={editForm.active ?? true}
                onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
              />
            }
            label="Aktywny"
          />
        </DialogContent>
        <DialogActions>
          <Button variant="ghost" onClick={dialogs.closeEdit}>Anuluj</Button>
          <Button variant="primary" onClick={handleUpdate} loading={editSaving}>Zapisz</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OriginsManagementPage;
