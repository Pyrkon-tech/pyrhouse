import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  Chip,
  Card,
  CardContent,
  List,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  CheckCircle,
  LocationOn,
  Inventory2,
  History,
  Info,
  Delete as DeleteIcon,
  LocalShipping,
  RemoveCircle,
  CheckCircleOutline,
  Warehouse,
  GpsFixed,
  Navigation,
  MonitorHeart,
} from '@mui/icons-material';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { deleteAsset } from '../../services/assetService';
import { BarcodeGenerator } from '../common/BarcodeGenerator';
import { getApiUrl } from '../../config/api';
import { useTheme } from '@mui/material/styles';
import { locationService } from '../../services/locationService';
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useAuth } from '../../hooks/useAuth';
import BarcodeScanner from '../common/BarcodeScanner';
import QrCodeScanner from '@mui/icons-material/QrCodeScanner';
import LocationPicker from '../common/LocationPicker';
import { MapPosition } from '../../services/locationService';

interface AssetLog {
  id: number;
  resource_id: number;
  resource_type: string;
  action: string;
  data: {
    location_id?: number;
    pyrcode?: string;
    msg: string;
    quantity?: number;
    from_location_id?: number;
    from_location_name?: string | null;
    to_location_id?: number;
    to_location_name?: string | null;
    location?: {
      latitude: number;
      longitude: number;
      location_id: number;
      timestamp: string;
    };
    asset_id?: number;
  };
  created_at: string;
}

const EquipmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'asset';
  const navigate = useNavigate();
  const theme = useTheme();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const { userRole } = useAuth();

  const [details, setDetails] = useState<any | null>(null);
  const [logs, setLogs] = useState<AssetLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [editQuantity, setEditQuantity] = useState<number | null>(null);
  const [savingQuantity, setSavingQuantity] = useState(false);
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [isEditingSerial, setIsEditingSerial] = useState(false);
  const [serialInput, setSerialInput] = useState('');
  const [savingSerial, setSavingSerial] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        getApiUrl(`/items/${type}/${id}`),
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch equipment details');
      }

      const data = await response.json();
      console.log('EquipmentDetails API response:', data);
      // API może zwracać dane pod kluczem type (asset/stock) lub bezpośrednio
      const itemData = data[type] || data;
      setDetails(itemData);
      setLogs(data.assetLogs || data.logs || []);
    } catch (err: any) {
      showSnackbar('error', err.message || 'Wystąpił błąd podczas pobierania szczegółów sprzętu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, type]);

  useEffect(() => {
    if (details && type === 'stock') setEditQuantity(details.quantity);
  }, [details, type]);

  // Sortowanie logów według daty utworzenia (od najnowszych do najstarszych)
  const sortedLogs = [...logs].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await deleteAsset(Number(id));
      // Jeśli nie rzucono błędu, usunięcie się powiodło
      navigate('/list');
    } catch (err: any) {
      if (err.message && typeof err.message === 'object') {
        if (err.message.details) {
          showSnackbar('error', err.message.details);
        } else if (err.message.message) {
          showSnackbar('error', err.message.message);
        } else {
          showSnackbar('error', JSON.stringify(err.message));
        }
      } else {
        showSnackbar('error', err.message || 'Wystąpił błąd podczas usuwania zasobu');
      }
      setTimeout(() => {
        closeSnackbar();
      }, 5000);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const formatLogMessage = (log: AssetLog) => {
    return log.data?.msg || 'Brak wiadomości';
  };

  const getLocationInfo = (log: AssetLog) => {
    if (log.action === 'in_transfer' || log.action === 'delivered') {
      const fromLocation = '#' + (log.data.from_location_id ? log.data.from_location_id : 'Nieznana');
      const fromLocationName = log.data.from_location_name ? log.data.from_location_name : 'Brak logu nazwy';
      const toLocation = '#' + (log.data.to_location_id ? log.data.to_location_id : 'Nieznana');
      const toLocationName = log.data.to_location_name ? log.data.to_location_name : 'Brak logu nazwy';
      
      // Sprawdź, czy to_location_id to 1 (magazyn)
      const isReturnedToWarehouse = log.data.to_location_id === 1;
      
      return { 
        fromLocation, 
        fromLocationName,
        toLocation,
        toLocationName,
        isReturnedToWarehouse
      };
    }
    return null;
  };

  const getActionLabel = (action: string, log: AssetLog) => {
    // Sprawdź, czy to zwrot do magazynu (to_location_id = 1)
    const isReturnedToWarehouse = log.action.toUpperCase() === 'DELIVERED' && log.data.to_location_id === 1;
    
    if (isReturnedToWarehouse) {
      return 'Zwrócono do magazynu';
    }
    
    switch (action.toUpperCase()) {
      case 'DELIVERED':
        return 'Dostarczone';
      case 'IN_TRANSFER':
        return 'W dostawie';
      case 'REMOVE':
        return 'Usunięte';
      case 'LAST_KNOWN_LOCATION':
        return 'Ostatnia znana lokalizacja';
      default:
        return action.toUpperCase();
    }
  };

  const getActionIcon = (action: string, log: AssetLog) => {
    // Sprawdź, czy to zwrot do magazynu (to_location_id = 1)
    const isReturnedToWarehouse = log.action.toUpperCase() === 'DELIVERED' && log.data.to_location_id === 1;
    
    if (isReturnedToWarehouse) {
      return <Warehouse sx={{ mr: 1, color: 'success.main' }} />;
    }
    
    switch (action.toUpperCase()) {
      case 'DELIVERED':
        return <CheckCircleOutline sx={{ mr: 1, color: 'success.main' }} />;
      case 'IN_TRANSFER':
        return <LocalShipping sx={{ mr: 1, color: 'info.main' }} />;
      case 'REMOVE':
        return <RemoveCircle sx={{ mr: 1, color: 'error.main' }} />;
      case 'LAST_KNOWN_LOCATION':
        return <GpsFixed sx={{ mr: 1, color: 'primary.main' }} />;
      default:
        return <Info sx={{ mr: 1 }} />;
    }
  };

  const renderLocationMap = (log: AssetLog) => {
    if (log.action !== 'last_known_location' || !log.data.location) {
      return null;
    }

    const mapLocation = {
      lat: log.data.location.latitude,
      lng: log.data.location.longitude
    };

    const handleNavigateToLocation = () => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${mapLocation.lat},${mapLocation.lng}`;
      window.open(url, '_blank');
    };

    return (
      <>
        <Box 
          sx={{ 
            height: '200px', 
            width: '100%', 
            borderRadius: '8px 8px 0 0',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            position: 'relative',
            mt: 2
          }}
        >
          <APIProvider apiKey={locationService.getGoogleMapsApiKey()}>
            <Map
              defaultCenter={mapLocation}
              defaultZoom={17}
              mapId="pyrhouse-map"
              gestureHandling={'greedy'}
              disableDefaultUI={false}
            >
              <AdvancedMarker position={mapLocation}>
                <Pin
                  background={'#1976d2'}
                  borderColor={'#1565c0'}
                  glyphColor={'#ffffff'}
                />
              </AdvancedMarker>
            </Map>
          </APIProvider>
        </Box>
        <Button
          variant="contained"
          startIcon={<Navigation />}
          onClick={handleNavigateToLocation}
          fullWidth
          sx={{
            mt: -1,
            borderRadius: '0 0 8px 8px',
            py: 1.5,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            boxShadow: 'none',
            borderTop: 'none',
            border: '1px solid',
            borderColor: 'primary.main'
          }}
        >
          Nawiguj do lokalizacji
        </Button>
      </>
    );
  };

  const handleSaveQuantity = async () => {
    if (editQuantity == null || editQuantity === details.quantity) return;
    setSavingQuantity(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/stocks/${details.id}`), {
        method: 'PATCH',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: editQuantity }),
      });
      if (!response.ok) throw new Error('Nie udało się zaktualizować ilości');
      showSnackbar('success', 'Ilość zaktualizowana');
      fetchDetails();
    } catch (err: any) {
      showSnackbar('error', err.message || 'Błąd podczas aktualizacji ilości');
    } finally {
      setSavingQuantity(false);
    }
  };

  // Dodaj funkcję sprawdzającą uprawnienia
  const canEditQuantity = userRole === 'admin' || userRole === 'moderator';

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'in_stock':
      case 'available':
        return <Chip label="Na Stanie" color="success" sx={{ fontWeight: 600, fontSize: '1rem' }} />;
      case 'in_transit':
        return <Chip label="W trasie" color="warning" sx={{ fontWeight: 600, fontSize: '1rem', animation: 'pulse 2s infinite' }} />;
      case 'delivered':
      case 'located':
        return <Chip label="W lokacji" color="success" sx={{ fontWeight: 600, fontSize: '1rem' }} />;
      default:
        return <Chip label="Nieznany" color="default" sx={{ fontWeight: 600, fontSize: '1rem' }} />;
    }
  };

  // Funkcja do zapisu numeru seryjnego
  const handleSaveSerial = async () => {
    if (!serialInput.trim()) {
      showSnackbar('error', 'Numer seryjny nie może być pusty');
      return;
    }
    setSavingSerial(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/assets/${details.id}/serial`), {
        method: 'PATCH',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serial: serialInput.trim() }),
      });
      if (response.status === 400) {
        const err = await response.json();
        showSnackbar('error', err.error || 'Nieprawidłowy numer seryjny');
        return;
      }
      if (response.status === 409) {
        showSnackbar('error', 'Ten numer seryjny jest już zajęty!');
        return;
      }
      if (response.status === 500) {
        showSnackbar('error', 'Błąd serwera podczas zapisu numeru seryjnego');
        return;
      }
      if (!response.ok) {
        showSnackbar('error', 'Nie udało się zapisać numeru seryjnego');
        return;
      }
      showSnackbar('success', 'Numer seryjny został zapisany');
      setIsEditingSerial(false);
      setSerialInput('');
      fetchDetails();
    } catch (err: any) {
      showSnackbar('error', err.message || 'Błąd podczas zapisu numeru seryjnego');
    } finally {
      setSavingSerial(false);
    }
  };

  // Dodaj funkcję do obsługi aktualizacji lokalizacji
  const handleLocationUpdate = async (location: MapPosition) => {
    if (!id) return;
    try {
      await locationService.updateAssetLocation(Number(id), location);
      showSnackbar('success', 'Lokalizacja została zaktualizowana');
      setLocationDialogOpen(false);
      fetchDetails(); // Odśwież dane
    } catch (err: any) {
      setLocationError(err.message || 'Wystąpił błąd podczas aktualizacji lokalizacji');
      showSnackbar('error', err.message || 'Wystąpił błąd podczas aktualizacji lokalizacji');
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography>Loading details...</Typography>
        <AppSnackbar
          open={snackbar.open}
          type={snackbar.type}
          message={snackbar.message}
          details={snackbar.details}
          onClose={closeSnackbar}
          autoHideDuration={snackbar.autoHideDuration}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </Box>
    );
  }

  if (!details) {
    return (
      <>
        <Typography variant="h6" sx={{ textAlign: 'center', mt: 4 }}>
          Nie znaleziono szczegółów sprzętu.
        </Typography>
        <AppSnackbar
          open={snackbar.open}
          type={snackbar.type}
          message={snackbar.message}
          details={snackbar.details}
          onClose={closeSnackbar}
          autoHideDuration={snackbar.autoHideDuration}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </>
    );
  }

  return (
    <Box sx={{ margin: '0 auto', padding: 4, maxWidth: '960px' }}>
      {/* Snackbar for notifications */}
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
      
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
          {/* Nagłówek sekcji */}
          <Box sx={{ 
            display: 'flex', 
            // alignItems: 'center', 
            gap: 2,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' }
          }}>
            <Box sx={{ 
              p: 1, 
              borderRadius: 1, 
              border: '1px solid',
              borderColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Info color="primary" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Podstawowe informacje
            </Typography>
          </Box>

          {/* Główne informacje */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: { xs: 2, sm: 3 } 
          }}>
            {/* Lewa kolumna */}
            <Box sx={{ 
              p: { xs: 1.5, sm: 2 },
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Identyfikator
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    #{details.id}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Kategoria
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {details.category?.label || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Lokalizacja
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {details.location?.name || 'N/A'} {details.location?.pavilion ? `(${details.location?.pavilion})` : ''}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Prawa kolumna */}
            <Box sx={{ 
              p: { xs: 1.5, sm: 2 },
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Pochodzenie
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {details.origin || 'N/A'}
                  </Typography>
                </Box>
                {type === 'asset' && (
                  <Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        PYR Code
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {details.pyrcode || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Numer seryjny
                      </Typography>
                      {details.serial === null ? (
                        isEditingSerial ? (
                          <>
                            {/* MOBILE: modal */}
                            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1, alignItems: 'center', width: '100%' }}>
                              <TextField
                                size="small"
                                value={serialInput}
                                onChange={e => setSerialInput(e.target.value)}
                                label="Nowy numer seryjny"
                                placeholder="Wprowadź lub zeskanuj numer seryjny"
                                disabled={savingSerial}
                                autoFocus
                                sx={{ flex: 1 }}
                              />
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setShowScanner(true)}
                                sx={{ minWidth: 0, px: 1.5, display: { xs: 'inline-flex', sm: 'none' } }}
                                aria-label="Skanuj numer seryjny"
                              >
                                <QrCodeScanner sx={{ mr: 0.5 }} />
                                Skanuj
                              </Button>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={handleSaveSerial}
                                disabled={savingSerial || !serialInput.trim()}
                              >
                                Zapisz
                              </Button>
                              <Button
                                variant="text"
                                color="inherit"
                                onClick={() => { setIsEditingSerial(false); setSerialInput(''); setShowSerialModal(false); }}
                                disabled={savingSerial}
                              >
                                Anuluj
                              </Button>
                            </Box>
                            {/* MOBILE: modal */}
                            <Dialog open={showSerialModal} onClose={() => { setShowSerialModal(false); setShowScanner(false); }} fullWidth maxWidth="xs" sx={{ display: { xs: 'block', sm: 'none' } }}>
                              <DialogTitle>Uzupełnij numer seryjny</DialogTitle>
                              <DialogContent>
                                <TextField
                                  fullWidth
                                  value={serialInput}
                                  onChange={e => setSerialInput(e.target.value)}
                                  label="Nowy numer seryjny"
                                  placeholder="Wprowadź lub zeskanuj numer seryjny"
                                  disabled={savingSerial}
                                  autoFocus
                                  sx={{ mb: 2 }}
                                />
                                <Button
                                  variant="contained"
                                  color="primary"
                                  fullWidth
                                  size="large"
                                  onClick={() => setShowScanner(true)}
                                  startIcon={<QrCodeScanner />}
                                  sx={{ mb: 2 }}
                                  aria-label="Skanuj numer seryjny"
                                >
                                  Skanuj
                                </Button>
                              </DialogContent>
                              <DialogActions>
                                <Button
                                  variant="contained"
                                  color="success"
                                  onClick={handleSaveSerial}
                                  disabled={savingSerial || !serialInput.trim()}
                                >
                                  Zapisz
                                </Button>
                                <Button
                                  variant="text"
                                  color="inherit"
                                  onClick={() => { setIsEditingSerial(false); setSerialInput(''); setShowSerialModal(false); }}
                                  disabled={savingSerial}
                                >
                                  Anuluj
                                </Button>
                              </DialogActions>
                            </Dialog>
                          </>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'warning.main' }}>
                              Brak numeru seryjnego
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => {
                                if (window.innerWidth < 600) {
                                  setIsEditingSerial(true);
                                  setShowSerialModal(true);
                                } else {
                                  setIsEditingSerial(true);
                                }
                              }}
                            >
                              Uzupełnij
                            </Button>
                          </Box>
                        )
                      ) : (
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {details.serial}
                      </Typography>
                      )}
                    </Box>
                  </Box>
                )}
                {type === 'stock' && details && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'stretch', sm: 'center' },
                      gap: 2,
                      mt: 2,
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ minWidth: 80 }}>
                      Ilość:
                    </Typography>
                    {canEditQuantity ? (
                      isEditingQuantity ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setEditQuantity((prev) => (prev !== null ? prev - 1 : 0))}
                            disabled={savingQuantity || (editQuantity !== null && editQuantity <= 0)}
                          >
                            -
                          </Button>
                          <TextField
                            type="number"
                            size="small"
                            value={editQuantity ?? ''}
                            onChange={e => setEditQuantity(Number(e.target.value))}
                            inputProps={{ min: 0, style: { textAlign: 'center', width: 60 } }}
                            disabled={savingQuantity}
                          />
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setEditQuantity((prev) => (prev !== null ? prev + 1 : 1))}
                            disabled={savingQuantity}
                          >
                            +
                          </Button>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={handleSaveQuantity}
                            disabled={savingQuantity}
                            sx={{ ml: 1 }}
                          >
                            Zapisz
                          </Button>
                          <Button
                            variant="text"
                            size="small"
                            color="inherit"
                            onClick={() => {
                              setIsEditingQuantity(false);
                              setEditQuantity(details.quantity);
                            }}
                            disabled={savingQuantity}
                          >
                            Anuluj
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight="bold">
                            {details.quantity}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setIsEditingQuantity(true)}
                            sx={{ ml: 1 }}
                          >
                            Edytuj
                          </Button>
                        </Box>
                      )
                    ) : (
                      <Typography variant="body1" fontWeight="bold">
                        {details.quantity}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Sekcja akcji pod podstawowymi informacjami */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',      // <700px: 1 kolumna
                sm: '1fr 1fr', // 700px-1099px: 2 kolumny
                md: '1fr 1fr', // 1100px-: 2 kolumny (przygotowanie do 4 kolumn powyżej)
                lg: 'repeat(4, 1fr)' // >1400px: 4 kolumny
              },
              gap: 2,
              mt: 2,
              mb: 2,
            }}
          >
            {/* Status */}
            <Box
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                borderRadius: 3,
                p: 2,
                minHeight: 170,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 2,
                transition: 'box-shadow 0.2s, background 0.2s',
                '&:hover': {
                  boxShadow: 6,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                },
              }}
            >
              <MonitorHeart sx={{ fontSize: 38, color: 'primary.main', mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Status
              </Typography>
              {getStatusChip(details.status)}
            </Box>

            {/* Kod kreskowy */}
            <Box
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                borderRadius: 3,
                p: 2,
                minHeight: 170,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 2,
                transition: 'box-shadow 0.2s, background 0.2s',
                '&:hover': {
                  boxShadow: 6,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                },
              }}
            >
              <QrCodeScanner sx={{ fontSize: 38, color: 'warning.main', mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Kod kreskowy
              </Typography>
              <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={() => setShowBarcode(true)}
                sx={{ borderRadius: 2, px: 3, fontWeight: 600, mt: 1 }}
              >
                Pokaż kod
              </Button>
            </Box>

            {/* Dodaj pinezkę (tylko dla asset) */}
            {type === 'asset' ? (
              <Box
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                  borderRadius: 3,
                  p: 2,
                  minHeight: 170,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 2,
                  transition: 'box-shadow 0.2s, background 0.2s',
                  '&:hover': {
                    boxShadow: 6,
                    bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                  },
                }}
              >
                <LocationOn sx={{ fontSize: 38, color: 'primary.main', mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Oznacz lokalizację
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<LocationOn />}
                  onClick={() => setLocationDialogOpen(true)}
                  sx={{ borderRadius: 2, px: 3, fontWeight: 600, mt: 1 }}
                >
                  Taguj
                </Button>
              </Box>
            ) : (
              <Box />
            )}

            {/* Usuń zasób (tylko dla asset) */}
            {type === 'asset' ? (
              <Box
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                  borderRadius: 3,
                  p: 2,
                  minHeight: 170,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 2,
                  transition: 'box-shadow 0.2s, background 0.2s',
                  '&:hover': {
                    boxShadow: 6,
                    bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                  },
                }}
              >
                <DeleteIcon sx={{ fontSize: 38, color: 'error.main', mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Usuń zasób
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => setShowDeleteConfirmation(true)}
                  disabled={isDeleting}
                  sx={{ borderRadius: 2, px: 3, fontWeight: 600, mt: 1 }}
                >
                  {isDeleting ? 'Usuwanie...' : 'Usuń'}
                </Button>
              </Box>
            ) : (
              <Box />
            )}
          </Box>
        </Box>
      </Box>

      {/* History Logs Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1
        }}>
          <History sx={{ verticalAlign: 'bottom' }} />
          Historia
        </Typography>
        <Divider sx={{ my: 2 }} />
        {logs.length > 0 ? (
          <List sx={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            {sortedLogs.map((log) => {
              const locationInfo = getLocationInfo(log);
              return (
                <Card 
                  key={log.id} 
                  elevation={2} 
                  sx={{ 
                    marginBottom: 2,
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      p: 1, 
                      display: 'flex', 
                      alignItems: 'center',
                      bgcolor: log.action === 'DELIVERED' ? 'success.dark' : 
                               log.action === 'IN_TRANSFER' ? 'info.dark' : 
                               log.action === 'REMOVE' ? 'error.dark' : 'grey.800',
                      color: log.action === 'DELIVERED' ? 'success.light' : 
                             log.action === 'IN_TRANSFER' ? 'info.light' : 
                             log.action === 'REMOVE' ? 'error.light' : 'common.white'
                    }}
                  >
                    {getActionIcon(log.action, log)}
                    <Typography variant="subtitle1" fontWeight="bold">
                      {getActionLabel(log.action, log)}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ ml: 'auto', color: 'inherit', opacity: 0.9 }}
                    >
                      {new Date(log.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 2 }}>
                    {locationInfo && (
                      <Box 
                        sx={{ 
                          mb: 2, 
                          p: 1.5, 
                          borderRadius: 1, 
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn sx={{ color: 'primary.main', mr: 1 }} />
                          <Typography variant="subtitle2" color="primary">
                            Informacje o lokalizacji
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', pl: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ minWidth: '40px', fontWeight: 'bold' }}>
                              Z:
                            </Typography>
                            <Typography variant="body2">
                              {locationInfo.fromLocation} {locationInfo.fromLocationName}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ minWidth: '40px', fontWeight: 'bold' }}>
                              Do:
                            </Typography>
                            <Typography variant="body2">
                              {locationInfo.toLocation} {locationInfo.toLocationName}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        {formatLogMessage(log)}
                      </Typography>
                    </Box>
                    
                    {log.data?.quantity && (
                      <Box 
                        sx={{ 
                          display: 'inline-flex', 
                          alignItems: 'center',
                          mt: 1,
                          p: 0.5,
                          borderRadius: 1,
                          bgcolor: 'primary.dark',
                          color: 'primary.light'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Ilość: {log.data.quantity}
                        </Typography>
                      </Box>
                    )}

                    {renderLocationMap(log)}
                  </CardContent>
                </Card>
              );
            })}
          </List>
        ) : (
          <Typography>Brak historii dla tego elementu.</Typography>
        )}
      </Box>

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
            }]}
            onClose={() => setShowBarcode(false)}
          />
        </DialogContent>
      </Dialog>

      {showScanner && (
        <BarcodeScanner
          onClose={() => {
            setShowScanner(false);
            setIsEditingSerial(true);
          }}
          onScan={code => {
            setSerialInput(code);
            setShowScanner(false);
            setIsEditingSerial(true);
            setShowSerialModal(true);
            showSnackbar('success', 'Kod zeskanowany i wprowadzony do pola');
          }}
          title="Skanuj numer seryjny"
          subtitle="Zeskanuj kod z urządzenia"
        />
      )}

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
