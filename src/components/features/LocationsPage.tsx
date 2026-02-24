import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
} from '@mui/material';
import { DataTable } from '../ui/DataTable';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../../hooks/useLocations';
import { deleteLocation, updateLocation, createLocation } from '../../services/locationService';
import { Location } from '../../types/location.types';
import * as Icons from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';

const LocationsPage: React.FC = () => {
  const { locations, error, refetch, loading } = useLocations();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ name: '', details: '', pavilion: '' });
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pavilionError, setPavilionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<number | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const hasAdminAccess = () => {
    return userRole === 'admin' || userRole === 'moderator';
  };

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (error) {
      showSnackbar('error', error);
    }
  }, [error]);

  const handleOpenDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({ 
        name: location.name,
        details: location.details || '',
        pavilion: location.pavilion || ''
      });
    } else {
      setEditingLocation(null);
      setFormData({ name: '', details: '', pavilion: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLocation(null);
    setFormData({ name: '', details: '', pavilion: '' });
    setDialogError(null);
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
      if (editingLocation) {
        const updateData: Partial<Location> = {};
        
        // Dodaj do updateData tylko te pola, które się zmieniły
        if (formData.name !== editingLocation.name) {
          updateData.name = formData.name;
        }
        
        // Porównaj details z uwzględnieniem null i pustego stringa
        const currentDetails = formData.details.trim() || null;
        const originalDetails = editingLocation.details || null;
        if (currentDetails !== originalDetails) {
          updateData.details = currentDetails;
        }

        const currentPavilion = formData.pavilion || null;
        const originalPavilion = editingLocation.pavilion || null;
        if (currentPavilion !== originalPavilion) {
          updateData.pavilion = currentPavilion;
        }

        // Wykonaj aktualizację tylko jeśli są jakieś zmiany
        if (Object.keys(updateData).length > 0) {
          await updateLocation(editingLocation.id, updateData);
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
    } catch (err: any) {
      setDialogError(err.message);
    }
  };

  const handleOpenDeleteModal = (id: number) => {
    setLocationToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setLocationToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (locationToDelete) {
      try {
        await deleteLocation(locationToDelete);
        showSnackbar('success', 'Lokalizacja została usunięta pomyślnie!', undefined, 3000);
        refetch();
      } catch (err: any) {
        if (err && typeof err === 'object' && 'message' in err) {
          showSnackbar('error', err.message, err.details, null);
        } else {
          showSnackbar('error', err.message || 'Wystąpił nieoczekiwany błąd podczas usuwania lokalizacji.', undefined, null);
        }
      } finally {
        handleCloseDeleteModal();
      }
    }
  };

  const filteredLocations = locations
    .filter(location => location.name.toLowerCase().includes(searchQuery.toLowerCase()))
    // .sort((a, b) => a.id - b.id);

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
              <Typography component="div">
                {location.name}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography component="div">
                {location.pavilion ? location.pavilion : '-'}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography component="div" color="text.secondary">
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
                    onClick={() => handleOpenDeleteModal(location.id)}
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
        <Grid item xs={12} key={location.id}>
          <Card 
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              '&:hover': {
                bgcolor: 'action.hover',
                cursor: 'pointer',
              },
              transition: 'background-color 0.2s ease'
            }}
            onClick={() => navigate(`/locations/${location.id}`)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
                  ID: {location.id}
                </Typography>
                <Chip 
                  label="Lokalizacja" 
                  size="small" 
                  color="primary"
                />
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Nazwa:</Typography>
                  <Typography variant="body2">{location.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Szczegóły:</Typography>
                  <Typography variant="body2" color="text.secondary">
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
                  sx={{ 
                    display: 'flex', 
                    gap: 1,
                    justifyContent: 'flex-end',
                    mt: 2
                  }}
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
                    onClick={() => handleOpenDeleteModal(location.id)}
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

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <AppSnackbar
          open={snackbar.open}
          type={snackbar.type}
          message={snackbar.message}
          details={snackbar.details}
          onClose={closeSnackbar}
          autoHideDuration={snackbar.autoHideDuration}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      margin: '0 auto', 
      padding: { xs: 2, sm: 3, md: 3 },
      maxWidth: '1400px',
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        marginBottom: 3,
        gap: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 2
      }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            color: 'primary.main',
            mb: { xs: 1, sm: 0 }
          }}
        >
          Lokalizacje
        </Typography>
        {hasAdminAccess() && (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: 1,
              px: 3
            }}
          >
            Dodaj lokalizację
          </Button>
        )}
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        gap: 2, 
        marginBottom: 3,
        backgroundColor: 'background.default',
        p: 2,
        borderRadius: 1
      }}>
        <TextField
          label="Szukaj lokalizacji"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          InputProps={{
            sx: { 
              borderRadius: 1,
              height: '36px',
              '& input': {
                height: '36px',
                padding: '0 12px',
              }
            },
            startAdornment: (
              <Icons.Search sx={{ color: 'text.secondary', mr: 1 }} />
            )
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 5,
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">
            Ładowanie lokalizacji...
          </Typography>
        </Box>
      ) : filteredLocations.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          p: 5,
          backgroundColor: 'background.default',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider'
        }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Brak lokalizacji
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Dodaj nową lokalizację'}
          </Typography>
          {searchQuery && (
            <Button 
              variant="outlined" 
              onClick={() => setSearchQuery('')}
              sx={{ 
                borderRadius: 1,
                px: 3
              }}
            >
              Wyczyść wyszukiwanie
            </Button>
          )}
        </Box>
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxWidth: '500px',
            width: '100%'
          }
        }}
      >
        <DialogTitle>
          {editingLocation ? 'Edytuj lokalizację' : 'Dodaj nową lokalizację'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt:2 }}>
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
              inputProps={{ maxLength: 3 }}
              error={!!pavilionError}
              helperText={pavilionError || 'Maksymalnie 3 znaki'}
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
          <Button onClick={handleCloseDialog} variant="outlined" size="small">
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name.trim() || !!pavilionError}
            size="small"
          >
            {editingLocation ? 'Zapisz' : 'Dodaj'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxWidth: '500px',
            width: '100%'
          }
        }}
      >
        <DialogTitle>Potwierdź usunięcie</DialogTitle>
        <DialogContent>
          <Typography>Czy na pewno chcesz usunąć tę lokalizację?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModal} variant="outlined">
            Anuluj
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
          >
            Usuń
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />
    </Box>
  );
};

export default LocationsPage; 