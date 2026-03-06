import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
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
import { apiClient, ApiError } from '../../services/apiClient';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AppSnackbar, DataTable, DataTableLoadingRow, DataTableEmptyRow, SearchBar, PageLoader } from '../ui';
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
  const [searchQuery, setSearchQuery] = useState('');
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchLocationData = useCallback(async () => {
    setLoading(true);
    try {
      const locationData = await apiClient.get<Location>(`/locations/${id}`);
      setLocation(locationData);

      const assetsData = await apiClient.get<Asset[]>(`/locations/${id}/assets`);
      setAssets(assetsData);
    } catch (err: any) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Wystąpił nieoczekiwany błąd');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLocationData();
  }, [fetchLocationData]);

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'in_transit':
        return <Chip icon={<LocalShippingIcon />} label="W trasie" color="warning" size="small" />;
      case 'completed':
        return <Chip icon={<CheckCircleIcon />} label="Zakończony" color="success" size="small" />;
      case 'created':
        return <Chip icon={<HourglassEmptyIcon />} label="Utworzony" color="default" size="small" />;
      case 'cancelled':
        return <Chip icon={<CancelIcon />} label="Anulowany" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
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
    <DataTable>
      <TableHead>
        <TableRow>
          {['ID', 'Typ', 'Ilość', 'Lokalizacja', 'Status', 'PYR_CODE', 'Origin'].map((field) => (
            <TableCell key={field}>{field}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <DataTableLoadingRow colSpan={7} />
        ) : filteredAssets.length === 0 ? (
          <DataTableEmptyRow colSpan={7} message="Brak assetów spełniających kryteria wyszukiwania" />
        ) : (
          filteredAssets.map((asset) => (
            <TableRow
              key={asset.id}
              onClick={() => navigate(`/assets/${asset.id}`)}
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <TableCell>
                <Typography component="div" sx={{ fontWeight: 500 }}>{asset.id}</Typography>
              </TableCell>
              <TableCell>{asset.type}</TableCell>
              <TableCell>{asset.quantity}</TableCell>
              <TableCell>{asset.location?.name || '-'}</TableCell>
              <TableCell>{getStatusChip(asset.status)}</TableCell>
              <TableCell>{asset.pyr_code || '-'}</TableCell>
              <TableCell>{asset.origin || '-'}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </DataTable>
  );

  const renderMobileCards = () => {
    if (loading) return <PageLoader message="Ładowanie assetów..." />;
    if (filteredAssets.length === 0) return (
      <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'background.default', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
        <Typography color="text.secondary">Brak assetów spełniających kryteria wyszukiwania</Typography>
      </Box>
    );
    return (
      <Grid container spacing={2}>
        {filteredAssets.map((asset) => (
          <Grid item xs={12} key={asset.id}>
            <Card
              onClick={() => navigate(`/assets/${asset.id}`)}
              sx={{ borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
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
        ))}
      </Grid>
    );
  };

  if (loading && !location) {
    return <PageLoader message="Ładowanie danych lokalizacji..." />;
  }

  if (!location) {
    return (
      <Box sx={{ p: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/locations')} sx={{ mb: 2 }}>
          Powrót do listy lokalizacji
        </Button>
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
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link component={RouterLink} to="/home" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Strona główna
        </Link>
        <Link component={RouterLink} to="/locations" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
          <WarehouseIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Lokalizacje
        </Link>
        <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
          <InventoryIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {location.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        pb: 2,
        gap: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            {location.name}
          </Typography>
          {location.details && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {location.details}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Tooltip title="Odśwież dane">
            <IconButton color="primary" onClick={fetchLocationData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/locations/${id}/edit`)}
          >
            Edytuj
          </Button>
        </Box>
      </Box>

      {/* Location details card */}
      <Card sx={{ mb: 4, borderRadius: 2 }}>
        <Box sx={{ p: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>Informacje o lokalizacji</Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>ID:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>{location.id}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Nazwa:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>{location.name}</Typography>
              </Box>
            </Grid>
            {location.details && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Szczegóły:</Typography>
                  <Typography variant="body1">{location.details}</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Assets section */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 2,
        gap: 2,
      }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Assety ({assets.length})
          </Typography>
          {searchQuery && (
            <Typography variant="body2" color="text.secondary">
              Pokazano {filteredAssets.length} z {assets.length}
            </Typography>
          )}
        </Box>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Szukaj assetów..."
          width={280}
        />
      </Box>

      {isMobile ? renderMobileCards() : renderTable()}

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
