import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useOrigins, notifyOriginsChanged } from '../../hooks/useOrigins';
import { createOriginAPI, updateOriginAPI } from '../../services/originService';
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

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<CreateOriginPayload>(emptyCreateForm());
  const [addSaving, setAddSaving] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState<Origin | null>(null);
  const [editForm, setEditForm] = useState<UpdateOriginPayload>({});
  const [editSaving, setEditSaving] = useState(false);

  const handleOpenAdd = () => {
    setAddForm(emptyCreateForm());
    setAddOpen(true);
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
      setAddOpen(false);
      showSnackbar('success', 'Origin dodany');
    } catch (err: any) {
      showSnackbar('error', err.message || 'Błąd podczas dodawania originu');
    } finally {
      setAddSaving(false);
    }
  };

  const handleOpenEdit = (origin: Origin) => {
    setEditingOrigin(origin);
    setEditForm({
      label: origin.label,
      allow_suffix: origin.allow_suffix,
      active: origin.active,
      sort_order: origin.sort_order,
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingOrigin) return;
    if (!editForm.label?.trim()) {
      showSnackbar('error', 'Label jest wymagany');
      return;
    }
    setEditSaving(true);
    try {
      await updateOriginAPI(editingOrigin.id, editForm);
      notifyOriginsChanged();
      refresh();
      setEditOpen(false);
      showSnackbar('success', 'Origin zaktualizowany');
    } catch (err: any) {
      showSnackbar('error', err.message || 'Błąd podczas aktualizacji originu');
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
    } catch (err: any) {
      showSnackbar('error', err.message || 'Błąd podczas zmiany statusu');
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
          Zarządzanie Originami
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Odśwież">
            <IconButton onClick={refresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Dodaj origin
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
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
              {origins.map((origin) => (
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
                      onClick={() => handleToggleActive(origin)}
                      clickable
                    />
                  </TableCell>
                  <TableCell align="center">{origin.sort_order}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edytuj">
                      <IconButton size="small" onClick={() => handleOpenEdit(origin)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {origins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Brak originów
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
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
          <Button onClick={() => setAddOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={handleCreate} disabled={addSaving}>
            {addSaving ? <CircularProgress size={20} /> : 'Dodaj'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edytuj origin:{' '}
          <Typography component="span" fontFamily="monospace" color="text.secondary">
            {editingOrigin?.slug}
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
          <Button onClick={() => setEditOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={editSaving}>
            {editSaving ? <CircularProgress size={20} /> : 'Zapisz'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OriginsManagementPage;
