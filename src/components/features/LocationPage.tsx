import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Button,
  Chip,
  TextField,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { getApiUrl } from '../../config/api';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';

interface Location {
  id: number;
  name: string;
  details: string | null;
}

interface Asset {
  id: number;
  type: string;
  quantity: number;
  location: {
    id: number;
    name: string;
  } | null;
  status: string;
  pyr_code: string;
  origin: string;
}

const LocationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [location, setLocation] = useState<Location | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchLocationData();
  }, [id, refreshKey]);

  const fetchLocationData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Brak tokenu autoryzacji');
      }
      
      // Pobieranie szczegółów lokalizacji
      const locationResponse = await fetch(getApiUrl(`/locations/${id}`), {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!locationResponse.ok) {
        if (locationResponse.status === 404) {
          throw new Error('Lokalizacja nie została znaleziona');
        } else if (locationResponse.status === 401) {
          throw new Error('Brak autoryzacji - zaloguj się ponownie');
        } else if (locationResponse.status === 403) {
          throw new Error('Brak uprawnień do wyświetlenia tej lokalizacji');
        } else if (locationResponse.status === 500) {
          throw new Error('Wystąpił błąd serwera - spróbuj ponownie później');
        } else {
          throw new Error(`Nieoczekiwany błąd: ${locationResponse.status}`);
        }
      }

      const locationData = await locationResponse.json();
      setLocation(locationData);
      showSnackbar('success', `Pobrano dane lokalizacji: ${locationData.name}`);

      // Pobieranie assetów lokalizacji
      const assetsResponse = await fetch(getApiUrl(`/locations/${id}/assets`), {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!assetsResponse.ok) {
        if (assetsResponse.status === 404) {
          throw new Error('Nie znaleziono assetów dla tej lokalizacji');
        } else if (assetsResponse.status === 401) {
          throw new Error('Brak autoryzacji - zaloguj się ponownie');
        } else if (assetsResponse.status === 403) {
          throw new Error('Brak uprawnień do wyświetlenia assetów');
        } else if (assetsResponse.status === 500) {
          throw new Error('Wystąpił błąd serwera podczas pobierania assetów');
        } else {
          throw new Error(`Nieoczekiwany błąd podczas pobierania assetów: ${assetsResponse.status}`);
        }
      }

      const assetsData = await assetsResponse.json();
      setAssets(assetsData);
    } catch (err: any) {
      setError(err.message || 'Wystąpił nieoczekiwany błąd');
      showSnackbar('error', err.message || 'Wystąpił nieoczekiwany błąd');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    showSnackbar('success', 'Odświeżanie danych...');
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'in_transit':
        return <Chip icon={<LocalShippingIcon />} label="W trasie" color="warning" />;
      case 'completed':
        return <Chip icon={<CheckCircleIcon />} label="Zakończony" color="success" />;
      case 'created':
        return <Chip icon={<HourglassEmptyIcon />} label="Utworzony" color="default" />;
      case 'cancelled':
        return <Chip icon={<CancelIcon />} label="Anulowany" color="error" />;
      default:
        return <Chip label={status} />;
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.id.toString().includes(searchQuery) ||
    asset.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.location?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.pyr_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.origin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTable = () => (
    <TableContainer 
      component={Paper} 
      sx={{ 
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        maxHeight: 'calc(100vh - 300px)',
        overflowY: 'auto'
      }}
    >
      <Table stickyHeader>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'primary.light' }}>
            {['ID', 'Typ', 'Ilość', 'Lokalizacja', 'Status', 'PYR_CODE', 'Origin'].map((field) => (
              <TableCell 
                key={field} 
                sx={{ 
                  fontWeight: 600,
                  color: 'primary.contrastText',
                  py: 2
                }}
              >
                {field}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAssets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Brak assetów spełniających kryteria wyszukiwania
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            filteredAssets.map((asset) => (
              <TableRow 
                key={asset.id}
                onClick={() => navigate(`/assets/${asset.id}`)}
                sx={{ 
                  cursor: 'pointer', 
                  '&:hover': { 
                    bgcolor: 'action.hover',
                  },
                  transition: 'background-color 0.2s ease'
                }}
              >
                <TableCell>
                  <Typography component="div" sx={{ fontWeight: 500 }}>
                    {asset.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography component="div">
                    {asset.type}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography component="div">
                    {asset.quantity}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography component="div">
                    {asset.location?.name || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {getStatusChip(asset.status)}
                </TableCell>
                <TableCell>
                  <Typography component="div">
                    {asset.pyr_code || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography component="div">
                    {asset.origin || '-'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {filteredAssets.length === 0 ? (
        <Grid item xs={12}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Brak assetów spełniających kryteria wyszukiwania
            </Typography>
          </Card>
        </Grid>
      ) : (
        filteredAssets.map((asset) => (
          <Grid item xs={12} key={asset.id}>
            <Card 
              onClick={() => navigate(`/assets/${asset.id}`)}
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                transition: 'background-color 0.2s ease'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
                    ID: {asset.id}
                  </Typography>
                  {getStatusChip(asset.status)}
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Typ:</Typography>
                    <Typography variant="body1">{asset.type}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Ilość:</Typography>
                    <Typography variant="body1">{asset.quantity}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Lokalizacja:</Typography>
                    <Typography variant="body1">{asset.location?.name || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">PYR_CODE:</Typography>
                    <Typography variant="body1">{asset.pyr_code || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Origin:</Typography>
                    <Typography variant="body1">{asset.origin || '-'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );

  if (loading) {
    return (
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
          Ładowanie danych lokalizacji...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/locations')}
            sx={{ mb: 2 }}
          >
            Powrót do listy lokalizacji
          </Button>
        </Box>
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

  if (!location) {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/locations')}
            sx={{ mb: 2 }}
          >
            Powrót do listy lokalizacji
          </Button>
        </Box>
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
      {/* Breadcrumbs */}
      <Breadcrumbs 
        aria-label="breadcrumb" 
        sx={{ mb: 3 }}
      >
        <Link 
          component={RouterLink} 
          to="/home" 
          color="inherit" 
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Strona główna
        </Link>
        <Link 
          component={RouterLink} 
          to="/locations" 
          color="inherit" 
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <WarehouseIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Lokalizacje
        </Link>
        <Typography 
          sx={{ display: 'flex', alignItems: 'center' }} 
          color="text.primary"
        >
          <InventoryIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {location.name}
        </Typography>
      </Breadcrumbs>

      {/* Header with location name */}
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
        <Box>
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
            {location.name}
          </Typography>
          {location.details && (
            <Typography variant="body1" color="text.secondary">
              {location.details}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Odśwież dane">
            <IconButton 
              color="primary" 
              onClick={handleRefresh}
              sx={{ 
                backgroundColor: 'primary.light',
                '&:hover': { backgroundColor: 'primary.main', color: 'white' }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<EditIcon />}
            onClick={() => navigate(`/locations/${id}/edit`)}
            sx={{
              borderRadius: 1,
              px: 3
            }}
          >
            Edytuj Lokalizację
          </Button>
        </Box>
      </Box>

      {/* Location details card */}
      <Card sx={{ 
        mb: 4, 
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          p: 2, 
          backgroundColor: 'primary.light',
          color: 'primary.contrastText'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Informacje o lokalizacji
          </Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'background.default',
                borderRadius: 1,
                height: '100%'
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>ID:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>{location.id}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'background.default',
                borderRadius: 1,
                height: '100%'
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Nazwa:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>{location.name}</Typography>
              </Box>
            </Grid>
            {location.details && (
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: 'background.default',
                  borderRadius: 1
                }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Szczegóły:</Typography>
                  <Typography variant="body1">{location.details}</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Assets section header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        marginBottom: 2,
        gap: 2
      }}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>
          Assetów: {assets.length}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          gap: 2, 
          width: { xs: '100%', sm: 'auto' }
        }}>
          <TextField
            label="Szukaj assetów"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ 
              flex: 1,
              minWidth: { xs: '100%', sm: '250px' }
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              sx: { borderRadius: 1 }
            }}
          />
          {searchQuery && (
            <Button 
              variant="outlined" 
              onClick={() => setSearchQuery('')}
              sx={{ 
                borderRadius: 1,
                px: 3
              }}
            >
              Wyczyść
            </Button>
          )}
        </Box>
      </Box>

      {/* Assets count */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" color="text.secondary">
          Znaleziono {filteredAssets.length} z {assets.length} assetów
        </Typography>
      </Box>

      {/* Assets list */}
      {isMobile ? renderMobileCards() : renderTable()}

      {/* Snackbar for notifications */}
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

export default LocationPage; 