import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import Avatar from '@mui/material/Avatar';

// Services and hooks
import { getTransferDetailsAPI, confirmTransferAPI, restoreAssetToLocationAPI, restoreStockToLocationAPI, cancelTransferAPI, updateTransferUsersAPI } from '../../services/transferService';
import { useLocations } from '../../hooks/useLocations';
import { useServiceDeskUsers } from '../../hooks/useServiceDeskUsers';
import { MapPosition, locationService } from '../../services/locationService';
import { useAuth } from '../../hooks/useAuth';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { useMediaQuery, useTheme } from '@mui/material';
// Lazy loaded components
const MapComponent = lazy(() => import('../common/MapComponent'));
const LocationPicker = lazy(() => import('../common/LocationPicker'));
const RestoreDialog = lazy(() => import('../common/RestoreDialog'));

const statusTranslations: { [key: string]: string } = {
  'created': 'Utworzony',
  'in_transit': 'W drodze',
  'delivered': 'Dostarczony',
  'cancelled': 'Anulowany',
  'completed': 'Dostarczony'
};

const PersonIcon = lazy(() => import('@mui/icons-material/Person'));
const LocalShippingIcon = lazy(() => import('@mui/icons-material/LocalShipping'));
const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const UTurnLeftIcon = lazy(() => import('@mui/icons-material/UTurnLeft'));
const ErrorIcon = lazy(() => import('@mui/icons-material/Error'));
const RestoreIcon = lazy(() => import('@mui/icons-material/Restore'));
const CancelIcon = lazy(() => import('@mui/icons-material/Cancel'));
const MyLocationIcon = lazy(() => import('@mui/icons-material/MyLocation'));
const LocationOnIcon = lazy(() => import('@mui/icons-material/LocationOn'));
const NavigationIcon = lazy(() => import('@mui/icons-material/Navigation'));
const ArrowBackIcon = lazy(() => import('@mui/icons-material/ArrowBack'));
const EditIcon = lazy(() => import('@mui/icons-material/Edit'));

const TransferDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { userRole } = useAuth();
  const [transfer, setTransfer] = useState<any>(null);
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

  const hasAdminAccess = () => {
    return userRole === 'admin' || userRole === 'moderator';
  };

  const fetchTransferDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTransferDetailsAPI(numericId);
      setTransfer(data);

      switch (data.status) {
        case 'in_transit':
          setCurrentStep(1);
          break;
        case 'completed':
          setCurrentStep(2);
          break;
        case 'cancelled':
          setCurrentStep(2);
          break;
        default:
          setCurrentStep(0);
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas pobierania danych transferu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isNaN(numericId)) {
      setError('Nieprawidłowe ID transferu');
      setLoading(false);
      return;
    }

    fetchTransferDetails();
  }, [numericId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (error) {
      showSnackbar('error', error);
    }
  }, [error]);

  useEffect(() => {
    if (transfer?.users) {
      setSelectedUserIds(transfer.users.map((user: any) => user.id));
    }
  }, [transfer?.users]);

  const handleConfirmTransfer = async () => {
    setLoading(true);
    setError('');
    try {
      await confirmTransferAPI(numericId, { status: 'completed' });
      
      // Pobierz zaktualizowane dane transferu
      const updatedTransfer = await getTransferDetailsAPI(numericId);
      
      // Zaktualizuj stan komponentu
      setTransfer(updatedTransfer);
      
      // Zaktualizuj krok na podstawie nowego statusu
      if (updatedTransfer.status === 'completed') {
        setCurrentStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to confirm transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (id: number, type: 'asset' | 'stock', categoryId?: number) => {
    setSelectedItem({ 
      id: type === 'stock' ? categoryId! : id, 
      type,
      originalId: type === 'stock' ? id : undefined
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
    } catch (err: any) {
      setError(err.message || 'Nie udało się przywrócić przedmiotu.');
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
      setTransfer((prev: any) => ({ ...prev, status: 'cancelled' }));
      setCancelDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Nie udało się anulować transferu');
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
    } catch (err: any) {
      setLocationError(err.message || 'Nie udało się zaktualizować lokalizacji');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_transit':
        return <LocalShippingIcon />;
      case 'delivered':
      case 'available':
      case 'completed':
      case 'located':
        return <CheckCircleIcon />;
      case 'returned':
        return <UTurnLeftIcon />;
      default:
        return <ErrorIcon />;
    }
  };

  const getSteps = () => {
    if (transfer?.status === 'cancelled') {
      return ['Utworzony', 'W drodze', 'Anulowany'];
    }
    return ['Utworzony', 'W drodze', 'Dostarczony'];
  };

  const getCurrentStep = () => {
    if (!transfer) return 0;
    switch (transfer.status) {
      case 'created':
        return 0;
      case 'in_transit':
        return 1;
      case 'delivered':
      case 'completed':
        return 2;
      case 'cancelled':
        return 2;
      default:
        return 0;
    }
  };

  useEffect(() => {
    if (transfer) {
      setCurrentStep(getCurrentStep());
    }
  }, [transfer]);

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
        console.log('Nowa lokalizacja użytkownika:', newLocation);
        setUserLocation(newLocation);
        setShowLocationAlert(true);
        
        // Ukryj alert po 5 sekundach
        setTimeout(() => {
          setShowLocationAlert(false);
        }, 4000);
      },
      (error) => {
        console.error('Błąd podczas pobierania lokalizacji:', error);
        let errorMessage = 'Nie udało się pobrać Twojej lokalizacji';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Brak dostępu do lokalizacji. Sprawdź ustawienia przeglądarki.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informacje o lokalizacji są niedostępne.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Przekroczono czas oczekiwania na odpowiedź.';
            break;
          default:
            errorMessage = 'Nieznany błąd: ' + error.message;
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

  // Dodajmy automatyczne pobieranie lokalizacji przy pierwszym renderowaniu mapy
  useEffect(() => {
    if (transfer?.delivery_location?.lat && transfer?.delivery_location?.lng) {
      getUserLocation();
    }
  }, [transfer?.delivery_location]);

  function renderMap() {
    return (
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
    );
  }

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
    } catch (err: any) {
      setError(err.message || 'Nie udało się zaktualizować listy Gżdaczy');
      showSnackbar('error', err.message || 'Nie udało się zaktualizować listy Gżdaczy');
    } finally {
      setLoading(false);
    }
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
          <Typography variant="body1" color="text.secondary">
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
          Status Quest'a #{id}
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: 3 }}>
        <Box sx={{ overflowX: 'auto', display: 'flex', flexDirection: { xs: 'column' }, justifyContent: 'center' }}>
        { !isMobile ? ( 
          <Stepper 
            activeStep={currentStep}
            orientation={isMobile ? 'vertical' : 'horizontal'}
            sx={{width: '100%' }}
          >
            {getSteps().map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        ): 
        <Chip 
        label={statusTranslations[transfer.status] || transfer.status} 
        icon={getStatusIcon(transfer.status)}
        color={
          transfer.status === 'completed' ? 'success' : 
          transfer.status === 'in_transit' ? 'warning' : 
          transfer.status === 'cancelled' ? 'error' : 'default'
        }
        size="small"
        sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, px: 1.5 }}
        />
        }
        </Box>
        {transfer.status === 'in_transit' && hasAdminAccess() && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
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

      <Paper sx={{ mt: 4, p: { xs: 1.5, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Suspense fallback={null}><LocalShippingIcon color="primary" /></Suspense>
            Informacje
          </Typography>
          {(transfer.status === 'in_transit' || transfer.status === 'completed') && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              {transfer.status === 'in_transit' && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setLocationDialogOpen(true)}
                  disabled={loading}
                  startIcon={<Suspense fallback={null}><MyLocationIcon /></Suspense>}
                  sx={{ 
                    py: 0.75,
                    px: 1.5,
                    borderRadius: 1.5,
                    fontSize: '0.875rem',
                    borderWidth: 1.5,
                    width: { xs: '100%', sm: 'auto' },
                    mb: { xs: 1, sm: 0 },
                    '&:hover': {
                      borderWidth: 1.5,
                      backgroundColor: 'primary.lighter',
                    }
                  }}
                >
                  Aktualizuj lokalizację
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={handleNavigateToLocation}
                disabled={!transfer?.delivery_location?.lat || !transfer?.delivery_location?.lng}
                startIcon={<Suspense fallback={null}><NavigationIcon /></Suspense>}
                sx={{ 
                  py: 0.75,
                  px: 1.5,
                  borderRadius: 1.5,
                  fontSize: '0.875rem',
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                Nawiguj
              </Button>
            </Stack>
          )}
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Lokalizacja źródłowa
            </Typography>
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
              <Suspense fallback={null}><LocationOnIcon fontSize="small" color="action" /></Suspense>
              {transfer.from_location?.name} {transfer.from_location?.pavilion ? `(${transfer.from_location?.pavilion})` : ''}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Lokalizacja docelowa
            </Typography>
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
              <Suspense fallback={null}><LocationOnIcon fontSize="small" color="action" /></Suspense>
              {transfer.to_location?.name} {transfer.to_location?.pavilion ? `(${transfer.to_location?.pavilion})` : ''}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Status
            </Typography>
            <Chip 
              label={statusTranslations[transfer.status] || transfer.status} 
              color={
                transfer.status === 'completed' ? 'success' : 
                transfer.status === 'in_transit' ? 'warning' : 
                transfer.status === 'cancelled' ? 'error' : 'default'
              }
              size="small"
              sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, px: 1.5 }}
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Data transferu
            </Typography>
            <Typography variant="body1" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
              {new Date(transfer.transfer_date).toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between'
            }}>
              <span>Gżdacze</span>
              {hasAdminAccess() && (
                <Tooltip title="Edytuj listę Gżdaczy">
                  <IconButton
                    size="small"
                    onClick={() => setEditUsersDialogOpen(true)}
                    aria-label="edit users"
                    sx={{ ml: 1 }}
                  >
                    <Suspense fallback={null}><EditIcon fontSize="small" /></Suspense>
                  </IconButton>
                </Tooltip>
              )}
            </Typography>
            <Box sx={{
              display: 'flex', 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: 1, 
              width: '100%',
              justifyContent: { xs: 'center', sm: 'flex-start' }
            }}>
              {transfer.users && transfer.users.length > 0 ? (
                transfer.users.map((user: any) => (
                  <Chip
                    key={user.id}
                    label={user.username}
                    icon={<Suspense fallback={null}><PersonIcon /></Suspense>}
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, px: 1.5, my: 0.5 }}
                  />
                ))
              ) : (
                <Typography color="text.secondary">Brak przypisanych Gżdaczy</Typography>
              )}
            </Box>
          </Box>
        </Box>

        {(transfer.status === 'in_transit' || transfer.status === 'completed') && transfer.delivery_location && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {transfer.status === 'in_transit' ? 'Aktualna lokalizacja dostawy' : 'Lokalizacja dostawy'}
            </Typography>
            <Box sx={{
              position: 'relative',
              mb: 1,
              width: '100%',
              height: { xs: 200, sm: 260, md: 340 },
              maxWidth: {xs: 340, sm: 400, md: 800},
              mx: 'auto',
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: 1,
              background: '#eee',
            }}>
              {renderMap()}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Ostatnia aktualizacja: {new Date(transfer.delivery_location.timestamp).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ mt: 4, p: { xs: 1.5, sm: 3 } }}>
        <Typography variant="h6">Sprzęt</Typography>
        {transfer.assets && transfer.assets.length > 0 ? (
          <List sx={{ width: '100%' }}>
            {transfer.assets.map((asset: any) => (
              <ListItem
                key={asset.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 2,
                  px: 0,
                }}
                secondaryAction={
                  transfer.status === 'in_transit' && (
                    <Tooltip title="Przywróć do magazynu">
                      <IconButton
                        edge="end"
                        aria-label="restore"
                        onClick={() => handleRestoreClick(asset.id, 'asset')}
                        sx={{ ml: 2 }}
                      >
                        <Suspense fallback={null}><RestoreIcon /></Suspense>
                      </IconButton>
                    </Tooltip>
                  )
                }
              >
                <ListItemAvatar sx={{ minWidth: 0 }}>
                  <Chip
                    icon={getStatusIcon(asset.status)}
                    color="success"
                    sx={{ mr: 2, pl: 1, fontSize: { xs: '0.85rem', sm: '1rem' }, minWidth: 44, height: 36 }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>{`${asset.category?.label || 'N/A'} ${asset.pyrcode}`}</Typography>}
                  secondary={<Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{`Pochodzenie: ${asset.origin || 'N/A'}`}</Typography>}
                  sx={{ ml: 1 }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>Brak sprzętu w tej dostawie.</Typography>
        )}
      </Paper>

      <Paper sx={{ mt: 4, p: { xs: 1.5, sm: 3 } }}>
        <Typography variant="h6">Zasoby</Typography>
        {transfer.stock_items && transfer.stock_items.length > 0 ? (
          <List sx={{ width: '100%' }}>
            {transfer.stock_items.map((stock: any) => (
              <ListItem
                key={stock.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 2,
                  px: 0,
                }}
                secondaryAction={
                  transfer.status === 'in_transit' && (
                    <Tooltip title="Przywróć do magazynu">
                      <IconButton
                        edge="end"
                        aria-label="restore"
                        onClick={() => handleRestoreClick(stock.id, 'stock', stock.category.id)}
                        sx={{ ml: 2 }}
                      >
                        <Suspense fallback={null}><RestoreIcon /></Suspense>
                      </IconButton>
                    </Tooltip>
                  )
                }
              >
                <ListItemAvatar sx={{ minWidth: 0 }}>
                  <Chip
                    label={`${stock.quantity}`}
                    color="primary"
                    sx={{ mr: 2, fontSize: { xs: '0.85rem', sm: '1rem' }, minWidth: 44, height: 36 }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>{`${stock.category?.label || 'N/A'}`}</Typography>}
                  secondary={<Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{`Pochodzenie: ${stock.origin || 'N/A'}`}</Typography>}
                  sx={{ ml: 1 }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>Brak zasobów w tej dostawie.</Typography>
        )}
      </Paper>

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
                ? transfer?.stock_items.find((item: any) => item.id === selectedItem.originalId)?.quantity 
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
        PaperProps={{
          sx: {
            borderRadius: 2,
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

      <Dialog
        open={editUsersDialogOpen}
        onClose={() => setEditUsersDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Suspense fallback={null}><PersonIcon color="primary" /></Suspense>
            <Typography variant="h6">Edytuj listę Gżdaczy</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {usersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Wybierz Gżdaczy, którzy brali udział w transferze:
              </Typography>
              <List sx={{ width: '100%', maxHeight: '300px', minHeight: '600px', overflow: 'auto' }}>
                {users.map((user: any) => (
                  <ListItem
                    key={user.id}
                    dense
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => {
                          if (selectedUserIds.includes(user.id)) {
                            setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                          } else {
                            setSelectedUserIds([...selectedUserIds, user.id]);
                          }
                        }}
                      />
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                        <Suspense fallback={null}><PersonIcon /></Suspense>
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.username}
                      secondary={user.fullname}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setEditUsersDialogOpen(false)}
            sx={{ 
              fontSize: '0.875rem',
              py: 0.75,
              px: 1.5,
            }}
          >
            Anuluj
          </Button>
          <Button 
            onClick={handleUpdateUsers} 
            color="primary" 
            variant="contained"
            disabled={loading}
            sx={{ 
              fontSize: '0.875rem',
              py: 0.75,
              px: 1.5,
              borderRadius: 1.5,
            }}
          >
            {loading ? <CircularProgress size={20} /> : 'Zapisz zmiany'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TransferDetailsPage;
