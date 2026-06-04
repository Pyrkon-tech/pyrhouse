import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  TextField,
  Autocomplete,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  Tooltip,
  IconButton,
  Checkbox,
  ListItemText,
  InputLabel,
  FormControl,
} from '@mui/material';
import { DataTable } from '../ui/DataTable';
import { Button } from '../ui/Button';
import { AppSnackbar, PageHeader, PageLoader, EmptyState } from '../ui';
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../../hooks/useLocations';
import { useCategories } from '../../hooks/useCategories';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { getApiUrl } from '../../config/api';
import { getAssetDisplayStatus } from '../../utils/assetStatus';
import WarningIcon from '@mui/icons-material/Warning';
import DownloadIcon from '@mui/icons-material/Download';
import Menu from '@mui/material/Menu';
import { useAuth } from '../../hooks/useAuth';

interface Location {
  id: number;
  name: string;
}

interface LocationWithPavilion extends Location {
  pavilion: string | null;
}

interface Category {
  id: number;
  label: string;
}

interface Equipment {
  id: number;
  category: string | { label: string };
  quantity?: number;
  location: LocationWithPavilion;
  state: string;
  pyr_code?: string;
  origin: string;
  type: 'asset' | 'stock';
  serial?: string;
}

type SemanticFilter = 'in_transit' | 'no_serial';

const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const ErrorOutlineIcon = lazy(() => import('@mui/icons-material/ErrorOutline'));
const LocalShippingIcon = lazy(() => import('@mui/icons-material/LocalShipping'));
const HomeIcon = lazy(() => import('@mui/icons-material/Home'));
const Inventory2Icon = lazy(() => import('@mui/icons-material/Inventory2'));
const ClearAllIcon = lazy(() => import('@mui/icons-material/ClearAll'));
const SearchIcon = lazy(() => import('@mui/icons-material/Search'));

const EquipmentList: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]); // For local filtering
  const [filter, setFilter] = useState<string>('');
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryType, setCategoryType] = useState<'asset' | 'stock' | ''>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<SemanticFilter>>(new Set());
  const navigate = useNavigate();

  const { locations, refetch: fetchLocations } = useLocations();
  const { categories, loading: categoriesLoading } = useCategories();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { userRole } = useAuth();

  // Stan do obsługi menu pobierania raportu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleQuickFilter = (key: SemanticFilter) => {
    setActiveQuickFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategoryType = (type: 'asset' | 'stock') => {
    setCategoryType(prev => prev === type ? '' : type);
  };

  const clearAllFilters = () => {
    setFilter('');
    setSelectedLocations([]);
    setSelectedCategory(null);
    setCategoryType('');
    setActiveQuickFilters(new Set());
  };

  const hasActiveFilters = !!(
    filter ||
    selectedLocations.length > 0 ||
    selectedCategory ||
    categoryType ||
    activeQuickFilters.size > 0
  );

  // Funkcja do pobierania raportu
  const handleDownloadReport = async (type: 'assets' | 'stock') => {
    handleMenuClose();
    const token = localStorage.getItem('token');
    const url = type === 'assets'
      ? getApiUrl('/assets/report')
      : getApiUrl('/stocks/report');
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (!response.ok) {
        showSnackbar('error', 'Nie udało się pobrać raportu');
        return;
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = type === 'assets' ? 'assets_report.csv' : 'stock_report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showSnackbar('success', 'Raport został pobrany');
    } catch (err: any) {
      showSnackbar('error', err.message || 'Błąd podczas pobierania raportu');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setEquipment([]); // Clear the state before fetching new data

      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/items'), {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 400 || response.status === 404) {
        setEquipment([]);
        setFilteredEquipment([]);
        const data = await response.json();
        showSnackbar('error', data.error || 'Wystąpił błąd podczas pobierania sprzętu');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch equipment data');
      }

      const data = await response.json();

      const transformedData = data.map((item: any) => ({
        id: item.id,
        category: item.category?.label || 'Unknown',
        quantity: item.quantity,
        location: item.location,
        state: item.status,
        pyr_code: item.pyrcode || undefined,
        origin: item.origin,
        type: item.category?.type || 'asset',
        serial: item.serial,
      }));

      setEquipment(transformedData);
      setFilteredEquipment(transformedData); // Initially show all data
    } catch (err: any) {
      showSnackbar('error', err.message || 'Wystąpił błąd podczas pobierania sprzętu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!equipment.length) return;

    let filtered = [...equipment];

    // Filtrowanie po lokalizacjach
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(item => 
        selectedLocations.some(loc => loc.id === item.location.id)
      );
    }

    // Filtrowanie po kategorii
    if (selectedCategory) {
      filtered = filtered.filter(item => 
        (typeof item.category === 'string' ? item.category : item.category.label) === selectedCategory.label
      );
    }

    // Filtrowanie po typie kategorii
    if (categoryType) {
      filtered = filtered.filter(item => item.type === categoryType);
    }

    // Filtrowanie po PYR_CODE, origin i serial
    if (filter.trim()) {
      const q = filter.toLowerCase();
      filtered = filtered.filter(item =>
        item.pyr_code?.toLowerCase().includes(q) ||
        item.origin?.toLowerCase().includes(q) ||
        item.serial?.toLowerCase().includes(q)
      );
    }

    // Semantyczne szybkie filtry
    if (activeQuickFilters.has('in_transit')) {
      filtered = filtered.filter(item => item.state === 'in_transit');
    }
    if (activeQuickFilters.has('no_serial')) {
      filtered = filtered.filter(item => item.serial === null);
    }

    setFilteredEquipment(filtered);
  }, [equipment, selectedLocations, selectedCategory, categoryType, filter, activeQuickFilters]);

  useEffect(() => {
    fetchEquipment();
  }, []); // Pobieramy dane tylko raz przy montowaniu komponentu

  // Domyślne sortowanie po ID
  useEffect(() => {
    if (filteredEquipment.length > 0) {
      const sortedEquipment = [...filteredEquipment].sort((a, b) => b.id - a.id);
      setFilteredEquipment(sortedEquipment);
    }
  }, [equipment]);

  // const handleSort = (field: string) =>
      // setSortField(field
      // setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc')
    // };

  const getStatusIcon = (status: string, location: { id: number; name: string }) => {
    if (status === 'in_transit') return <Suspense fallback={null}><LocalShippingIcon color="warning" /></Suspense>;
    if (status === 'unavailable') return <Suspense fallback={null}><ErrorOutlineIcon color="error" /></Suspense>;
    if (location.id === 1) return <Suspense fallback={null}><HomeIcon color="success" /></Suspense>;
    return <Suspense fallback={null}><CheckCircleIcon color="info" /></Suspense>;
  };

  const getStockIconColor = (item: Equipment): string => {
    if (item.state === 'in_transit') return 'warning.main';
    if (item.location.id === 1) return 'success.main';
    return 'info.main';
  };

  const renderStatusOrQuantity = (item: Equipment) => {
    if (item.type === 'stock') {
      const iconColor = getStockIconColor(item);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Suspense fallback={null}><Inventory2Icon sx={{ color: iconColor }} /></Suspense>
          <Typography component="div" fontWeight="bold" sx={{ color: iconColor }}>
            {item.quantity ?? '-'}
          </Typography>
        </Box>
      );
    }

    const { label, color } = getAssetDisplayStatus(item.state, item.location);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getStatusIcon(item.state, item.location)}
        <Chip label={label} color={color} size="small" />
      </Box>
    );
  };

  // Renderowanie tabeli dla desktop
  const renderTable = () => (
    <DataTable>
      <TableHead>
        <TableRow>
          {['PYR CODE', 'KATEGORIA', 'LOKALIZACJA', 'STATUS / ILOŚĆ', 'POCHODZENIE'].map((field) => (
            <TableCell key={field}>{field}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredEquipment.map((item) => (
          <TableRow
            key={`${item.id}-${item.type}`}
            sx={{
              cursor: 'pointer',
              bgcolor: item.state === 'in_transit' ? 'rgba(222, 198, 49, 0.1)' : undefined,
            }}
            onClick={() => navigate(`/equipment/${item.id}?type=${item.type}`)}
            aria-label={`Szczegóły dla elementu ${item.pyr_code || item.id}`}
          >
            <TableCell>
              <Typography component="div" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {item.type === 'asset' ? (item.pyr_code || '—') : '—'}
                {item.serial === null && (
                  <Tooltip title="Sprzęt wymaga aktualizacji numeru seryjnego">
                    <WarningIcon sx={{ color: 'warning.main', fontSize: '1rem', verticalAlign: 'middle' }} />
                  </Tooltip>
                )}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography component="div">
                {typeof item.category === 'string' ? item.category : (item.category as any).label}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography component="div">
                {item.location.pavilion ? `Paw ${item.location.pavilion} | ` : ''}{item.location.name}
              </Typography>
            </TableCell>
            <TableCell>
              {renderStatusOrQuantity(item)}
            </TableCell>
            <TableCell>
              <Typography component="div">{item.origin}</Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );

  // Renderowanie kart dla urządzeń mobilnych
  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {filteredEquipment.map((item) => (
        <Grid item xs={12} key={`${item.id}-${item.type}`}>
          <Card 
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              bgcolor: item.state === 'in_transit'
                ? 'rgba(222, 198, 49, 0.1)'
                : item.serial === null
                  ? 'rgba(255, 152, 0, 0.05)'
                  : 'inherit',
              '&:hover': {
                bgcolor: 'action.hover',
                cursor: 'pointer',
              },
              transition: 'background-color 0.2s ease'
            }}
            onClick={() => navigate(`/equipment/${item.id}?type=${item.type}`)}
            aria-label={`Szczegóły dla elementu ${item.id}`}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {item.serial === null && (
                    <Tooltip title="Sprzęt wymaga aktualizacji numeru seryjnego">
                      <WarningIcon sx={{ color: 'warning.main', fontSize: '1.1rem' }} />
                    </Tooltip>
                  )}
                  {item.type === 'asset' && item.pyr_code ? item.pyr_code : `#${item.id}`}
                </Typography>
                <Chip
                  label={item.type === 'asset' ? 'Sprzęt' : 'Materiały'}
                  size="small"
                  color={item.type === 'asset' ? 'primary' : 'secondary'}
                />
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Kategoria:</Typography>
                  <Typography variant="body2">
                    {typeof item.category === 'string' ? item.category : (item.category as any).label}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Lokalizacja:</Typography>
                  <Typography variant="body2">{item.location.name} {item.location.pavilion ? `(${item.location.pavilion})` : ''}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {item.type === 'stock' ? 'Ilość:' : 'Status:'}
                  </Typography>
                  {renderStatusOrQuantity(item)}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Pochodzenie:</Typography>
                  <Typography variant="body2">{item.origin}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box sx={{ 
      margin: '0 auto', 
      padding: { xs: 2, sm: 3, md: 4 },
      maxWidth: '1400px',
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
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
        title="Stan magazynowy"
        subtitle={equipment.length > 0 ? `${filteredEquipment.length} z ${equipment.length} elementów` : undefined}
        actions={
          <>
            {(userRole === 'admin' || userRole === 'moderator') && (
              <>
                <Tooltip title="Pobierz raport">
                  <IconButton onClick={handleMenuClick} aria-label="Pobierz raport">
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                  <MenuItem onClick={() => handleDownloadReport('assets')}>Raport sprzętu</MenuItem>
                  <MenuItem onClick={() => handleDownloadReport('stock')}>Raport zapasów</MenuItem>
                </Menu>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Suspense fallback={null}><ClearAllIcon /></Suspense>}
              onClick={clearAllFilters}
            >
              Wyczyść filtry
            </Button>
          </>
        }
      />

      {/* Filtry — wiersz 1: szukajka + lokalizacja + kategoria + wyczyść */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
          mb: 1.5,
          backgroundColor: 'background.default',
          borderRadius: 1,
          p: { xs: 1, sm: 1.5 },
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        }}
      >
        <TextField
          size="small"
          placeholder="Szukaj po PYR code, kodzie lub pochodzeniu..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <Suspense fallback={null}><SearchIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} /></Suspense>
            ),
            sx: { borderRadius: 1 },
          }}
          sx={{ flex: 2, minWidth: 200, maxWidth: 320 }}
          aria-label="Wyszukaj sprzęt"
        />
        <FormControl size="small" sx={{ flex: 1, minWidth: 150, maxWidth: 260 }}>
          <InputLabel id="location-select-label">Lokalizacja</InputLabel>
          <Select
            labelId="location-select-label"
            multiple
            value={selectedLocations.map(l => l.id)}
            onChange={e => {
              const ids = e.target.value as number[];
              setSelectedLocations(locations.filter(loc => ids.includes(loc.id)));
            }}
            label="Lokalizacja"
            renderValue={(selected) => {
              const ids = selected as number[];
              const names = locations.filter(loc => ids.includes(loc.id)).map(loc => loc.name);
              return names.length === 1 ? names[0] : `${names.length} lokalizacje`;
            }}
          >
            {locations.map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                <Checkbox checked={selectedLocations.some(l => l.id === loc.id)} />
                <ListItemText primary={loc.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Autocomplete<Category, false, false, false>
          options={categories}
          getOptionLabel={(option: Category) => option.label}
          value={selectedCategory}
          loading={categoriesLoading}
          onChange={(_, value) => setSelectedCategory(value)}
          size="small"
          isOptionEqualToValue={(option: Category | null, value: Category | null) => option?.id === value?.id}
          sx={{ flex: 1, minWidth: 150, maxWidth: 260 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Kategoria"
              variant="outlined"
              InputProps={{
                ...params.InputProps,
                sx: { borderRadius: 1 },
                endAdornment: (
                  <>
                    {categoriesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option: Category) => (
            <li {...props}>
              <Typography component="span">{option.label}</Typography>
            </li>
          )}
          aria-label="Wybierz kategorię"
        />
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Suspense fallback={null}><ClearAllIcon fontSize="small" /></Suspense>}
            onClick={clearAllFilters}
          >
            Wyczyść
          </Button>
        )}
      </Box>

      {/* Filtry — wiersz 2: szybkie filtry */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Chip
          label="Sprzęt"
          icon={<Suspense fallback={null}><CheckCircleIcon /></Suspense>}
          size="small"
          color={categoryType === 'asset' ? 'primary' : 'default'}
          variant={categoryType === 'asset' ? 'filled' : 'outlined'}
          onClick={() => toggleCategoryType('asset')}
          sx={{ cursor: 'pointer', fontWeight: categoryType === 'asset' ? 600 : 400 }}
          aria-label="Filtr: Tylko sprzęt"
        />
        <Chip
          label="Zasoby"
          icon={<Suspense fallback={null}><Inventory2Icon /></Suspense>}
          size="small"
          color={categoryType === 'stock' ? 'secondary' : 'default'}
          variant={categoryType === 'stock' ? 'filled' : 'outlined'}
          onClick={() => toggleCategoryType('stock')}
          sx={{ cursor: 'pointer', fontWeight: categoryType === 'stock' ? 600 : 400 }}
          aria-label="Filtr: Tylko zasoby"
        />
        <Chip
          label="W trasie"
          icon={<Suspense fallback={null}><LocalShippingIcon /></Suspense>}
          size="small"
          color={activeQuickFilters.has('in_transit') ? 'warning' : 'default'}
          variant={activeQuickFilters.has('in_transit') ? 'filled' : 'outlined'}
          onClick={() => toggleQuickFilter('in_transit')}
          sx={{ cursor: 'pointer', fontWeight: activeQuickFilters.has('in_transit') ? 600 : 400 }}
          aria-label="Filtr: W trasie"
        />
        <Chip
          label="Brak seryjnego"
          icon={<WarningIcon />}
          size="small"
          color={activeQuickFilters.has('no_serial') ? 'warning' : 'default'}
          variant={activeQuickFilters.has('no_serial') ? 'filled' : 'outlined'}
          onClick={() => toggleQuickFilter('no_serial')}
          sx={{ cursor: 'pointer', fontWeight: activeQuickFilters.has('no_serial') ? 600 : 400 }}
          aria-label="Filtr: Brak numeru seryjnego"
        />
      </Box>

      {loading ? (
        <PageLoader message="Ładowanie danych..." />
      ) : filteredEquipment.length === 0 ? (
        <EmptyState
          message="Brak sprzętu dla wybranych filtrów"
          description="Spróbuj zmienić kryteria wyszukiwania lub wyczyść filtry"
          action={{ label: 'Wyczyść filtry', onClick: clearAllFilters }}
        />
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}
    </Box>
  );
};

export default EquipmentList;

