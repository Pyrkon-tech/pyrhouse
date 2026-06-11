import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { CheckCircle, LocationOn, Inventory2 } from '@mui/icons-material';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { deleteAsset } from '../../../services/assetService';
import { BarcodeGenerator } from '../../common/BarcodeGenerator';
import { apiClient, ApiError } from '../../../services/apiClient';
import { locationService, MapPosition } from '../../../services/locationService';
import { useSnackbarMessage } from '../../../hooks/useSnackbarMessage';
import { AppSnackbar } from '../../ui/AppSnackbar';
import { useAuth } from '../../../hooks/useAuth';
import LocationPicker from '../../common/LocationPicker';
import AssetLogTimeline from './AssetLogTimeline';
import BasicInfoSection from './BasicInfoSection';
import ActionCards from './ActionCards';
import type { AssetLog, EquipmentDetailsData } from './types';

const EquipmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'asset';
  const navigate = useNavigate();
  const theme = useTheme();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const { userRole } = useAuth();

  const [details, setDetails] = useState<EquipmentDetailsData | null>(null);
  const [logs, setLogs] = useState<AssetLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Record<string, unknown>>(`/items/${type}/${id}`);
      // API może zwracać dane pod kluczem type (asset/stock) lub bezpośrednio
      const itemData = ((type && data[type]) || data) as EquipmentDetailsData;
      setDetails(itemData);
      setLogs((data.assetLogs || data.logs || []) as AssetLog[]);
    } catch (err) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Wystąpił błąd podczas pobierania szczegółów sprzętu');
    } finally {
      setLoading(false);
    }
  }, [id, type, showSnackbar]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await deleteAsset(Number(id));
      // Jeśli nie rzucono błędu, usunięcie się powiodło
      navigate('/list');
    } catch (err) {
      // deleteAsset may throw an Error whose message carries an object payload
      const message: unknown = err instanceof Error ? err.message : err;
      if (message && typeof message === 'object') {
        const m = message as { details?: string; message?: string };
        showSnackbar('error', m.details || m.message || JSON.stringify(message));
      } else {
        showSnackbar('error', typeof message === 'string' && message ? message : 'Wystąpił błąd podczas usuwania zasobu');
      }
      setTimeout(() => {
        closeSnackbar();
      }, 5000);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const handleSaveQuantity = async (quantity: number): Promise<boolean> => {
    if (!details) return false;
    try {
      await apiClient.patch(`/stocks/${details.id}`, { quantity });
      showSnackbar('success', 'Ilość zaktualizowana');
      fetchDetails();
      return true;
    } catch (err) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd podczas aktualizacji ilości');
      return false;
    }
  };

  const handleSaveSerial = async (serial: string): Promise<boolean> => {
    if (!details) return false;
    if (!serial) {
      showSnackbar('error', 'Numer seryjny nie może być pusty');
      return false;
    }
    try {
      await apiClient.patch(`/assets/${details.id}/serial`, { serial });
      showSnackbar('success', 'Numer seryjny został zapisany');
      fetchDetails();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.status === 400
          ? err.message || 'Nieprawidłowy numer seryjny'
          : err.status === 409
            ? 'Ten numer seryjny jest już zajęty!'
            : err.status === 500
              ? 'Błąd serwera podczas zapisu numeru seryjnego'
              : 'Nie udało się zapisać numeru seryjnego';
        showSnackbar('error', message);
      } else {
        showSnackbar('error', 'Błąd podczas zapisu numeru seryjnego');
      }
      return false;
    }
  };

  const handleLocationUpdate = async (location: MapPosition) => {
    if (!id) return;
    try {
      await locationService.updateAssetLocation(Number(id), location);
      showSnackbar('success', 'Lokalizacja została zaktualizowana');
      setLocationDialogOpen(false);
      fetchDetails(); // Odśwież dane
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Wystąpił błąd podczas aktualizacji lokalizacji';
      setLocationError(message);
      showSnackbar('error', message);
    }
  };

  const canEditQuantity = userRole === 'admin' || userRole === 'moderator';

  const snackbarElement = (
    <AppSnackbar
      open={snackbar.open}
      type={snackbar.type}
      message={snackbar.message}
      details={snackbar.details}
      onClose={closeSnackbar}
      autoHideDuration={snackbar.autoHideDuration}
    />
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography>Loading details...</Typography>
        {snackbarElement}
      </Box>
    );
  }

  if (!details) {
    return (
      <>
        <Typography variant="h6" sx={{ textAlign: 'center', mt: 4 }}>
          Nie znaleziono szczegółów sprzętu.
        </Typography>
        {snackbarElement}
      </>
    );
  }

  return (
    <Box sx={{ margin: '0 auto', padding: 4, maxWidth: '960px' }}>
      {snackbarElement}

      <Typography variant="h4" gutterBottom>
        Szczegóły sprzętu
      </Typography>

      {/* Quick Stats Section */}
      <Box sx={{
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        mb: 4,
        '& .MuiChip-root': {
          mb: { xs: 1, sm: 0 }
        }
      }}>
        <Chip
          icon={<CheckCircle />}
          label={`${type.charAt(0).toUpperCase() + type.slice(1)}`}
          color="success"
          sx={{ fontSize: '0.875rem' }}
        />
        <Chip
          icon={<LocationOn />}
          label={`${details.location?.name || 'Unknown'}`}
          color="primary"
          sx={{ fontSize: '0.875rem' }}
        />
        {type === 'stock' && (
          <Chip
            icon={<Inventory2 />}
            label={`${details.quantity || 'N/A'} szt.`}
            color="secondary"
            sx={{ fontSize: '0.875rem' }}
          />
        )}
      </Box>

      {/* Basic Information Section */}
      <Box
        sx={{
          mb: 4,
          p: { xs: 1.5, sm: 3 },
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'white',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
          <BasicInfoSection
            details={details}
            type={type}
            canEditQuantity={canEditQuantity}
            onSaveSerial={handleSaveSerial}
            onSaveQuantity={handleSaveQuantity}
            onSerialScanned={() => showSnackbar('success', 'Kod zeskanowany i wprowadzony do pola')}
          />

          {/* Sekcja akcji pod podstawowymi informacjami */}
          <ActionCards
            type={type}
            status={details.status}
            isDeleting={isDeleting}
            onShowBarcode={() => setShowBarcode(true)}
            onTagLocation={() => setLocationDialogOpen(true)}
            onDelete={() => setShowDeleteConfirmation(true)}
          />
        </Box>
      </Box>

      {/* History Logs Section — Timeline */}
      <AssetLogTimeline logs={logs} />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
      >
        <DialogTitle>Potwierdź usunięcie</DialogTitle>
        <DialogContent>
          <Typography>
            Czy na pewno chcesz usunąć ten zasób? Tej operacji nie można cofnąć.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowDeleteConfirmation(false)}
            disabled={isDeleting}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Dialog */}
      <Dialog
        open={showBarcode}
        onClose={() => setShowBarcode(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <BarcodeGenerator
            assets={[{
              id: details.id,
              serial: details.serial || '',
              location: details.location,
              category: details.category,
              status: details.status,
              pyrcode: details.pyrcode,
              origin: details.origin
            } as unknown as React.ComponentProps<typeof BarcodeGenerator>['assets'][number]]}
            onClose={() => setShowBarcode(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onClose={() => setLocationDialogOpen(false)}>
        <DialogTitle>Oznacz lokalizację</DialogTitle>
        <DialogContent>
          <LocationPicker onLocationSelect={handleLocationUpdate} />
          {locationError && <Typography color="error">{locationError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDialogOpen(false)}>Anuluj</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EquipmentDetails;
