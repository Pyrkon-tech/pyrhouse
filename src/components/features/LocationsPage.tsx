import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
} from '@mui/material';
import { DataTable } from '../ui/DataTable';
import { Button } from '../ui/Button';
import { PageHeader, SearchBar, PageLoader, EmptyState, ConfirmDialog } from '../ui';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../../hooks/useLocations';
import { useDialogState } from '../../hooks/useDialogState';
import { deleteLocation, updateLocation, createLocation } from '../../services/locationService';
import { Location } from '../../types/location.types';
import { useAuth } from '../../hooks/useAuth';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';

const LocationsPage: React.FC = () => {
  const { locations, error, refetch, loading } = useLocations();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const dialogs = useDialogState<Location>();
  const [formData, setFormData] = useState({ name: '', details: '', pavilion: '' });
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pavilionError, setPavilionError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const hasAdminAccess = () => userRole === 'admin' || userRole === 'moderator';

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (error) {
      showSnackbar('error', error);
    }
  }, [error, showSnackbar]);

  const handleOpenDialog = (location?: Location) => {
    if (location) {
      dialogs.openEdit(location);
      setFormData({
        name: location.name,
        details: location.details || '',
        pavilion: location.pavilion || '',
      });
    } else {
      dialogs.openAdd();
      setFormData({ name: '', details: '', pavilion: '' });
    }
    setDialogError(null);
    setPavilionError(null);
  };

  const handleCloseDialog = () => {
    if (dialogs.isEditOpen) {
      dialogs.closeEdit();
    } else {
      dialogs.closeAdd();
    }
    setFormData({ name: '', details: '', pavilion: '' });
    setDialogError(null);
    setPavilionError(null);
  };

  const handlePavilionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, pavilion: value }));
    if (value.length > 3) {
      setPavilionError('Pawilon może mieć maksymalnie 3 znaki');
    } else {
      setPavilionError(null);
    }
  };

  const handleSubmit = async () => {
    try {
      setDialogError(null);
      if (dialogs.editItem) {
        const updateData: Partial<Location> = {};

        if (formData.name !== dialogs.editItem.name) {
          updateData.name = formData.name;
        }

        const currentDetails = formData.details.trim() || null;
        const originalDetails = dialogs.editItem.details || null;
        if (currentDetails !== originalDetails) {
          updateData.details = currentDetails;
        }

        const currentPavilion = formData.pavilion || null;
        const originalPavilion = dialogs.editItem.pavilion || null;
        if (currentPavilion !== originalPavilion) {
          updateData.pavilion = currentPavilion;
        }

        if (Object.keys(updateData).length > 0) {
          await updateLocation(dialogs.editItem.id, updateData);
        }
      } else {
        await createLocation({
          name: formData.name,
          details: formData.details.trim() || null,
          lat: 0,
          lng: 0,
          pavilion: formData.pavilion || null,
        });
      }
      handleCloseDialog();
      refetch();
    } catch (err) {
      setDialogError((err instanceof Error ? err.message : '') || 'Wystąpił nieoczekiwany błąd');
    }
  };

  const handleConfirmDelete = async () => {
    if (!dialogs.deleteItem) return;
    setDeleteLoading(true);
    try {
      await deleteLocation(dialogs.deleteItem.id);
      showSnackbar('success', 'Lokalizacja została usunięta pomyślnie!', undefined, 3000);
      dialogs.closeDelete();
      refetch();
    } catch (err) {
      const e = (err ?? {}) as { message?: string; details?: string };
      showSnackbar('error', e.message || 'Wystąpił nieoczekiwany błąd podczas usuwania lokalizacji.', e.details, null);
      dialogs.closeDelete();
    } finally {
      setDeleteLoading(false);
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(q) ||
    (location.pavilion ?? '').toLowerCase().includes(q) ||
    (location.details ?? '').toLowerCase().includes(q)
  );

  const renderTable = () => (
    <DataTable>
      <TableHead>
        <TableRow>
          {['ID', 'Nazwa', 'Pawilon', 'Szczegóły', hasAdminAccess() ? 'Akcje' : ''].map((field) => (
            <TableCell key={field}>{field}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredLocations.map((location) => (
          <TableRow
            key={location.id}
            onClick={() => navigate(`/locations/${location.id}`)}
            sx={{ cursor: 'pointer' }}
          >
            <TableCell>
              <Typography component="div" sx={{ fontWeight: 500 }}>
                {location.id}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography component="div">{location.name}</Typography>
            </TableCell>
            <TableCell>
              <Typography component="div">
                {location.pavilion ? location.pavilion : '-'}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography component="div" sx={{
                color: "text.secondary"
              }}>
                {location.details ? (
                  location.details.length > 48
                    ? `${location.details.substring(0, 48)}...`
                    : location.details
                ) : '-'}
              </Typography>
            </TableCell>
            {hasAdminAccess() && (
              <TableCell>
                <Box
                  sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(location)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => dialogs.openDelete(location)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );

  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {filteredLocations.map((location) => (
        <Grid size={{ xs: 12 }} key={location.id}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
              transition: 'background-color 0.2s ease',
            }}
            onClick={() => navigate(`/locations/${location.id}`)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
                  ID: {location.id}
                </Typography>
                <Chip label="Lokalizacja" size="small" color="primary" />
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>Nazwa:</Typography>
                  <Typography variant="body2">{location.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>Szczegóły:</Typography>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    {location.details ? (
                      location.details.length > 48
                        ? `${location.details.substring(0, 48)}...`
                        : location.details
                    ) : '-'}
                  </Typography>
                </Box>
              </Box>

              {hasAdminAccess() && (
                <Box
                  sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(location)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => dialogs.openDelete(location)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box sx={{
      margin: '0 auto',
      padding: { xs: 2, sm: 3, md: 3 },
      maxWidth: '1400px',
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    }}>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />
      <PageHeader
        title="Lokalizacje"
        actions={
          hasAdminAccess() ? (
            <Button variant="primary" leftIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
              Dodaj lokalizację
            </Button>
          ) : undefined
        }
      />
      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          label="Szukaj lokalizacji"
          width="100%"
        />
      </Box>
      {loading ? (
        <PageLoader message="Ładowanie lokalizacji..." />
      ) : filteredLocations.length === 0 ? (
        <EmptyState
          message="Brak lokalizacji"
          description={searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Dodaj nową lokalizację'}
          action={searchQuery ? { label: 'Wyczyść wyszukiwanie', onClick: () => setSearchQuery('') } : undefined}
        />
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}
      {/* Add / Edit Dialog */}
      <Dialog
        open={dialogs.addOpen || dialogs.isEditOpen}
        onClose={handleCloseDialog}
        slotProps={{
          paper: { sx: { borderRadius: 2, maxWidth: '500px', width: '100%' } }
        }}
      >
        <DialogTitle>
          {dialogs.editItem ? 'Edytuj lokalizację' : 'Dodaj nową lokalizację'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              autoFocus
              label="Nazwa lokalizacji"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              size="small"
            />
            <TextField
              label="Pawilon (opcjonalne)"
              value={formData.pavilion}
              onChange={handlePavilionChange}
              fullWidth
              size="small"
              error={!!pavilionError}
              helperText={pavilionError || 'Maksymalnie 3 znaki'}
              slotProps={{
                htmlInput: { maxLength: 3 }
              }}
            />
            <TextField
              label="Szczegóły (opcjonalne)"
              value={formData.details}
              onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="Dodaj dodatkowe informacje o lokalizacji..."
            />
          </Box>
          {dialogError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {dialogError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="ghost" onClick={handleCloseDialog}>
            Anuluj
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!formData.name.trim() || !!pavilionError}
          >
            {dialogs.editItem ? 'Zapisz' : 'Dodaj'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Delete Confirmation */}
      <ConfirmDialog
        open={dialogs.isDeleteOpen}
        title="Potwierdź usunięcie"
        message="Czy na pewno chcesz usunąć tę lokalizację?"
        confirmLabel="Usuń"
        confirmColor="error"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={dialogs.closeDelete}
      />
    </Box>
  );
};

export default LocationsPage;
