import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

// Services and hooks
import { getTransferDetailsAPI, confirmTransferAPI, restoreAssetToLocationAPI, restoreStockToLocationAPI, cancelTransferAPI, updateTransferUsersAPI } from '../../../services/transferService';
import { useLocations } from '../../../hooks/useLocations';
import { useServiceDeskUsers } from '../../../hooks/useServiceDeskUsers';
import { MapPosition, locationService } from '../../../services/locationService';
import { useAuth } from '../../../hooks/useAuth';
import { AppSnackbar } from '../../ui/AppSnackbar';
import { useSnackbarMessage } from '../../../hooks/useSnackbarMessage';
import { useMediaQuery, useTheme } from '@mui/material';
import type { TransferDetails } from '../../../types/transfer.types';
import { statusTranslations, getStatusIcon, statusChipColor } from './components/details/transferStatus';
import TransferInfoSection from './components/details/TransferInfoSection';
import TransferItemsSection from './components/details/TransferItemsSection';
import EditUsersDialog from './components/details/EditUsersDialog';

// Lazy loaded components
const MapComponent = lazy(() => import('../../common/MapComponent'));
const LocationPicker = lazy(() => import('../../common/LocationPicker'));
const RestoreDialog = lazy(() => import('../../common/RestoreDialog'));

const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const CancelIcon = lazy(() => import('@mui/icons-material/Cancel'));
const MyLocationIcon = lazy(() => import('@mui/icons-material/MyLocation'));
const ArrowBackIcon = lazy(() => import('@mui/icons-material/ArrowBack'));

const TransferDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { userRole } = useAuth();
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: 'asset' | 'stock'; originalId?: number } | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationAlert, setShowLocationAlert] = useState<boolean>(false);
  const { locations, refetch: fetchLocations } = useLocations();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const [editUsersDialogOpen, setEditUsersDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const { users, loading: usersLoading } = useServiceDeskUsers();

  const numericId = Number(id);

  const hasAdminAccess = userRole === 'admin' || userRole === 'moderator' || userRole === 'dispatcher';

  const fetchTransferDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTransferDetailsAPI(numericId);
      setTransfer(data);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Wystąpił błąd podczas pobierania danych transferu');
    } finally {
      setLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    if (isNaN(numericId)) {
      setError('Nieprawidłowe ID transferu');
      setLoading(false);
      return;
    }

    fetchTransferDetails();
  }, [numericId, fetchTransferDetails]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (error) {
      showSnackbar('error', error);
    }
  }, [error, showSnackbar]);

  useEffect(() => {
    if (transfer?.users) {
      setSelectedUserIds(transfer.users.map((user) => user.id));
    }
  }, [transfer?.users]);

  // Keep the stepper in sync with the transfer status
  useEffect(() => {
    if (!transfer) return;
    switch (transfer.status) {
      case 'created':
        setCurrentStep(0);
        break;
      case 'in_transit':
        setCurrentStep(1);
        break;
      case 'delivered':
      case 'completed':
      case 'cancelled':
        setCurrentStep(2);
        break;
      default:
        setCurrentStep(0);
    }
  }, [transfer]);

  const handleConfirmTransfer = async () => {
    setLoading(true);
    setError('');
    try {
      await confirmTransferAPI(numericId, { status: 'completed' });
      const updatedTransfer = await getTransferDetailsAPI(numericId);
      setTransfer(updatedTransfer);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to confirm transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (itemId: number, type: 'asset' | 'stock', categoryId?: number) => {
    setSelectedItem({
      id: type === 'stock' ? categoryId! : itemId,
      type,
      originalId: type === 'stock' ? itemId : undefined
    });
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async (locationId: number, quantity?: number) => {
    if (!selectedItem) return;

    setLoading(true);
    setError('');
    try {
      if (selectedItem.type === 'asset') {
        await restoreAssetToLocationAPI(numericId, selectedItem.id, locationId);
      } else {
        await restoreStockToLocationAPI(numericId, selectedItem.id, locationId, quantity);
      }
      await fetchTransferDetails();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Nie udało się przywrócić przedmiotu.');
    } finally {
      setLoading(false);
      setRestoreDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleCancelTransfer = async () => {
    setLoading(true);
    setError('');
    try {
      await cancelTransferAPI(String(numericId));
      setTransfer((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      setCancelDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Nie udało się anulować transferu');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = async (location: MapPosition) => {
    setLoading(true);
    setLocationError(null);
    try {
      await locationService.updateTransferLocation(numericId, location);
      await fetchTransferDetails();
      setLocationDialogOpen(false);
    } catch (err) {
      setLocationError(err instanceof Error && err.message ? err.message : 'Nie udało się zaktualizować lokalizacji');
    } finally {
      setLoading(false);
    }
  };

  const getSteps = () => {
    if (transfer?.status === 'cancelled') {
      return ['Utworzony', 'W drodze', 'Anulowany'];
    }
    return ['Utworzony', 'W drodze', 'Dostarczony'];
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolokalizacja nie jest wspierana przez przeglądarkę');
      setLocationError('Geolokalizacja nie jest wspierana przez Twoją przeglądarkę');
      return;
    }

    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newLocation);
        setShowLocationAlert(true);

        // Ukryj alert po kilku sekundach
        setTimeout(() => {
          setShowLocationAlert(false);
        }, 4000);
      },
      (geoError) => {
        console.error('Błąd podczas pobierania lokalizacji:', geoError);
        let errorMessage: string;

        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            errorMessage = 'Brak dostępu do lokalizacji. Sprawdź ustawienia przeglądarki.';
            break;
          case geoError.POSITION_UNAVAILABLE:
            errorMessage = 'Informacje o lokalizacji są niedostępne.';
            break;
          case geoError.TIMEOUT:
            errorMessage = 'Przekroczono czas oczekiwania na odpowiedź.';
            break;
          default:
            errorMessage = 'Nieznany błąd: ' + geoError.message;
        }

        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Automatyczne pobieranie lokalizacji przy pierwszym renderowaniu mapy
  useEffect(() => {
    if (transfer?.delivery_location?.lat && transfer?.delivery_location?.lng) {
      getUserLocation();
    }
  }, [transfer?.delivery_location]);

  const handleNavigateToLocation = () => {
    if (transfer?.delivery_location?.lat && transfer?.delivery_location?.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${transfer.delivery_location.lat},${transfer.delivery_location.lng}`;
      window.open(url, '_blank');
    }
  };

  const handleUpdateUsers = async () => {
    setLoading(true);
    setError('');
    try {
      await updateTransferUsersAPI(numericId, selectedUserIds);
      await fetchTransferDetails();
      setEditUsersDialogOpen(false);
      showSnackbar('success', 'Lista Gżdaczy została zaktualizowana');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Nie udało się zaktualizować listy Gżdaczy';
      setError(message);
      showSnackbar('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((uid) => uid !== userId) : [...prev, userId]
    );
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{
            color: "text.secondary"
          }}>
            Ładowanie szczegółów quest'a...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!loading && error) {
    return (
      <Container>
        <AppSnackbar
          open={snackbar.open}
          type={snackbar.type}
          message={snackbar.message}
          details={snackbar.details}
          onClose={closeSnackbar}
          autoHideDuration={snackbar.autoHideDuration}
        />
      </Container>
    );
  }

  if (!transfer) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 0.5, sm: 1 } }}>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        textAlign: { xs: 'center', sm: 'left' },
      }}>
        <Button
          startIcon={<Suspense fallback={null}><ArrowBackIcon /></Suspense>}
          onClick={() => navigate('/transfers')}
          size="small"
          sx={{
            minWidth: 'auto',
            px: 1.5,
            py: 0.75,
            color: 'text.secondary',
            width: { xs: '100%', sm: 'auto' },
            mb: { xs: 1, sm: 0 },
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'transparent'
            }
          }}
        >
          Powrót
        </Button>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 'medium', fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
          Status Transferu #{id}
        </Typography>
      </Box>
      <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: 3 }}>
        <Box sx={{ overflowX: 'auto', display: 'flex', flexDirection: { xs: 'column' }, justifyContent: 'center' }}>
          {!isMobile ? (
            <Stepper
              activeStep={currentStep}
              orientation={isMobile ? 'vertical' : 'horizontal'}
              sx={{ width: '100%' }}
            >
              {getSteps().map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          ) : (
            <Chip
              label={statusTranslations[transfer.status] || transfer.status}
              icon={getStatusIcon(transfer.status)}
              color={statusChipColor(transfer.status)}
              size="small"
              sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, px: 1.5 }}
            />
          )}
        </Box>
        {transfer.status === 'in_transit' && hasAdminAccess && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{
              color: "text.secondary"
            }}>
              Akcje transferu
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="success"
                onClick={handleConfirmTransfer}
                disabled={loading}
                startIcon={<Suspense fallback={null}><CheckCircleIcon /></Suspense>}
                sx={{
                  py: 1,
                  px: 2,
                  borderRadius: 1.5,
                  fontSize: '0.875rem',
                  boxShadow: 1,
                  width: { xs: '100%', sm: 'auto' },
                  mb: { xs: 1, sm: 0 },
                  '&:hover': {
                    boxShadow: 2,
                    backgroundColor: 'success.dark',
                  }
                }}
              >
                Potwierdź dostawę
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setCancelDialogOpen(true)}
                disabled={loading}
                startIcon={<Suspense fallback={null}><CancelIcon /></Suspense>}
                sx={{
                  py: 1,
                  px: 2,
                  borderRadius: 1.5,
                  fontSize: '0.875rem',
                  borderWidth: 1.5,
                  width: { xs: '100%', sm: 'auto' },
                  '&:hover': {
                    borderWidth: 1.5,
                    backgroundColor: 'error.lighter',
                  }
                }}
              >
                Anuluj quest
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
      <TransferInfoSection
        transfer={transfer}
        loading={loading}
        hasAdminAccess={hasAdminAccess}
        onOpenLocationDialog={() => setLocationDialogOpen(true)}
        onNavigateToLocation={handleNavigateToLocation}
        onEditUsers={() => setEditUsersDialogOpen(true)}
        mapContent={
          <Suspense fallback={<CircularProgress />}>
            <MapComponent
              transfer={transfer}
              userLocation={userLocation}
              onLocationUpdate={handleLocationUpdate}
              locationError={locationError}
              showLocationAlert={showLocationAlert}
              onGetUserLocation={getUserLocation}
            />
          </Suspense>
        }
      />
      <TransferItemsSection transfer={transfer} onRestoreClick={handleRestoreClick} />
      {restoreDialogOpen && selectedItem && (
        <Suspense fallback={<CircularProgress />}>
          <RestoreDialog
            open={restoreDialogOpen}
            onClose={() => setRestoreDialogOpen(false)}
            onConfirm={handleRestoreConfirm}
            locations={locations || []}
            itemType={selectedItem.type}
            currentQuantity={
              selectedItem.type === 'stock'
                ? transfer?.stock_items?.find((item) => item.id === selectedItem.originalId)?.quantity
                : undefined
            }
          />
        </Suspense>
      )}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Potwierdź anulowanie transferu</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz anulować ten transfer?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            onClick={() => setCancelDialogOpen(false)}
            sx={{
              fontSize: '0.875rem',
              py: 0.75,
              px: 1.5,
            }}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleCancelTransfer}
            color="error"
            variant="contained"
            sx={{
              fontSize: '0.875rem',
              py: 0.75,
              px: 1.5,
              borderRadius: 1.5,
            }}
          >
            Potwierdź anulowanie
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={locationDialogOpen}
        onClose={() => setLocationDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Suspense fallback={null}><MyLocationIcon color="primary" /></Suspense>
            <Typography variant="h6">Aktualizuj lokalizację transferu</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {locationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {locationError}
            </Alert>
          )}
          <Suspense fallback={<CircularProgress />}>
            <LocationPicker
              onLocationSelect={handleLocationUpdate}
              onSave={() => setLocationDialogOpen(false)}
            />
          </Suspense>
        </DialogContent>
      </Dialog>
      <EditUsersDialog
        open={editUsersDialogOpen}
        saving={loading}
        users={users}
        usersLoading={usersLoading}
        selectedUserIds={selectedUserIds}
        onToggleUser={handleToggleUser}
        onClose={() => setEditUsersDialogOpen(false)}
        onSave={handleUpdateUsers}
      />
    </Container>
  );
};

export default TransferDetailsPage;
