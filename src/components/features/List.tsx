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
  Button,
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
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../../hooks/useLocations';
import { useCategories } from '../../hooks/useCategories';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { AppSnackbar } from '../ui/AppSnackbar';
import { getApiUrl } from '../../config/api';
import { getAssetDisplayStatus } from '../../utils/assetStatus';
import { Category } from '@mui/icons-material';
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

interface QuickFilter {
  id: number;
  name: string;
}

const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const ErrorOutlineIcon = lazy(() => import('@mui/icons-material/ErrorOutline'));
const LocalShippingIcon = lazy(() => import('@mui/icons-material/LocalShipping'));
const HomeIcon = lazy(() => import('@mui/icons-material/Home'));
const Inventory2Icon = lazy(() => import('@mui/icons-material/Inventory2'));
const ClearAllIcon = lazy(() => import('@mui/icons-material/ClearAll'));
const SearchIcon = lazy(() => import('@mui/icons-material/Search'));
const CategoryIcon = lazy(() => import('@mui/icons-material/Category'));

const EquipmentList: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]); // For local filtering
  const [filter, setFilter] = useState<string>('');
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryType, setCategoryType] = useState<'asset' | 'stock' | ''>('');
  const [loading, setLoading] = useState<boolean>(false);
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

    // Filtrowanie po PYR_CODE
    if (filter.trim()) {
      const lowercasedFilter = filter.toLowerCase();
      filtered = filtered.filter(item =>
        item.pyr_code?.toLowerCase().includes(lowercasedFilter)
      );
    }

    setFilteredEquipment(filtered);
  }, [equipment, selectedLocations, selectedCategory, categoryType, filter]);

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

  const renderStatusOrQuantity = (item: Equipment) => {
    if (item.type === 'stock') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            component="div"
            fontWeight="bold"
            sx={{
              color: item.state === 'in_transit' ? 'primary.main' : (item.quantity && item.quantity > 0 ? 'success.main' : 'text.secondary'),
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Suspense fallback={null}><Inventory2Icon sx={{ color: item.state === 'in_transit' ? 'primary.main' : undefined }} /></Suspense>
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

  const quickFilters: QuickFilter[] = [
    { id: 1, name: 'Magazyn Techniczny'},
    { id: 3, name: 'Brak lokalizacji'}
  ];

  const applyQuickFilter = (filter: QuickFilter) => {
    switch (filter.id) {
      case 1: { // Magazyn Techniczny
        const techLocation = locations.find((loc) => loc.id === filter.id);
        if (techLocation && !selectedLocations.some((selectedLoc) => selectedLoc.id === techLocation.id)) {
          setSelectedLocations((prev) => [...prev, techLocation]);
        }
        break;
      }
      case 3: // Brak lokalizacji
        setSelectedLocations([]);
        break;
    }
  };

  const removeQuickFilter = (filter: QuickFilter) => {
    switch (filter.id) {
      case 1: { // Magazyn Techniczny
        setSelectedLocations((prev) => prev.filter((loc) => loc.id !== filter.id));
        break;
      }
      case 3: // Brak lokalizacji
        setSelectedLocations(locations);
        break;
    }
  };

  // Renderowanie tabeli dla desktop
  const renderTable = () => (
    <DataTable>
      <TableHead>
        <TableRow>
          {['ID', 'Typ', 'Lokalizacja', 'Status', 'Ilość/PYR_CODE', 'Pochodzenie'].map((field) => (
            <TableCell key={field}>{field.toUpperCase()}</TableCell>
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
            aria-label={`Szczegóły dla elementu ${item.id}`}
          >
            <TableCell>
              <Typography component="div" sx={{ fontWeight: 500 }}>
                {String(item.id)}
                {item.serial === null && (
                  <Tooltip title="Sprzęt wymaga aktualizacji numeru seryjnego">
                    <WarningIcon
                      sx={{
                        ml: 1,
                        color: 'warning.main',
                        fontSize: '1rem',
                        verticalAlign: 'middle'
                      }}
                    />
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
                {item.location.name} {item.location.pavilion ? `(${item.location.pavilion})` : ''}
              </Typography>
            </TableCell>
            <TableCell>
              {item.type === 'asset' ? renderStatusOrQuantity(item) : '-'}
            </TableCell>
            <TableCell>
              {item.type === 'stock' ? renderStatusOrQuantity(item) : (
                <Typography component="div">
                  {item.pyr_code || '-'}
                </Typography>
              )}
            </TableCell>
            <TableCell>
              <Typography component="div">
                {item.origin}
              </Typography>
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
                <Typography variant="h6" component="div" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                  {item.serial === null && (
                    <Tooltip title="Sprzęt wymaga aktualizacji numeru seryjnego">
                      <WarningIcon 
                        sx={{ 
                          ml: 1, 
                          color: 'warning.main',
                          fontSize: '1.1rem',
                          verticalAlign: 'middle'
                        }} 
                      />
                    </Tooltip>
                  )}
                  ID: {String(item.id)}
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
                  <Typography variant="body2" color="text.secondary">Typ:</Typography>
                  <Typography variant="body2">
                    {typeof item.category === 'string' ? item.category : (item.category as any).label}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Lokalizacja:</Typography>
                  <Typography variant="body2">{item.location.name} {item.location.pavilion ? `(${item.location.pavilion})` : ''}</Typography>
                </Box>
                
                {item.type === 'asset' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                    {renderStatusOrQuantity(item)}
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {item.type === 'stock' ? 'Ilość:' : 'PYR_CODE:'}
                  </Typography>
                  {item.type === 'stock' ? renderStatusOrQuantity(item) : (
                    <Typography variant="body2">{item.pyr_code || '-'}</Typography>
                  )}
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
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 0,
        gap: 2,
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
            Stan magazynowy
          </Typography>
          {userRole === 'admin' || userRole === 'moderator' ? (
            <>
              <IconButton onClick={handleMenuClick} aria-label="Pobierz raport" size="large">
                <DownloadIcon />
              </IconButton>
              <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                <MenuItem onClick={() => handleDownloadReport('assets')}>Raport sprzętu</MenuItem>
                <MenuItem onClick={() => handleDownloadReport('stock')}>Raport zapasów</MenuItem>
              </Menu>
            </>
          ) : null}
        </Box>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<Suspense fallback={null}><ClearAllIcon /></Suspense>}
          onClick={() => {
            setFilter('');
            setSelectedLocations([]);
            setSelectedCategory(null);
            setCategoryType('');
          }}
          sx={{ 
            borderRadius: 1,
            px: 2
          }}
        >
          Wyczyść filtry
        </Button>
      </Box>

      {/* Sekcja filtrów */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 2,
        marginBottom: 3,
        backgroundColor: 'background.default',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden'
      }}>
        {/* Nagłówek sekcji filtrów */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Filtry
          </Typography>
        </Box>
        
        {/* Szybkie filtry */}
        <Box sx={{ pt: 1, pb: 1, pl: 1.5, pr: 1.5 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Szybkie filtry
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1,
            '& > *': { 
              flex: { xs: '1 1 100%', sm: '1 1 auto' },
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }
            }
          }}>
            {quickFilters.map((filter) => (
              <Chip
                key={filter.id}
                label={filter.name}
                color={selectedLocations.some((loc) => loc.id === filter.id) ? 'primary' : 'default'}
                onClick={() =>
                  selectedLocations.some((loc) => loc.id === filter.id)
                    ? removeQuickFilter(filter)
                    : applyQuickFilter(filter)
                }
                size="small"
                sx={{ 
                  cursor: 'pointer',
                  fontWeight: selectedLocations.some((loc) => loc.id === filter.id) ? 600 : 400,
                  '& .MuiChip-icon': {
                    color: selectedLocations.some((loc) => loc.id === filter.id) ? 'inherit' : 'action.active'
                  }
                }}
                aria-label={`Filtr: ${filter.name}`}
              />
            ))}
          </Box>
        </Box>
        
        {/* Zaawansowane filtry */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          gap: 2, 
          p: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          alignItems: { xs: 'stretch', md: 'flex-end' },
        }}>
          <TextField
            label="Filtruj po PYR_CODE"
            variant="outlined"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            size="small"
            sx={{ 
              minWidth: { xs: '100%', md: 220 },
              maxWidth: 300,
              flexBasis: 0,
              flexGrow: 1,
            }}
            aria-label="Filtruj po kodzie PYR"
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
                <Suspense fallback={null}><SearchIcon /></Suspense>
              )
            }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 220 }, maxWidth: 300, flexBasis: 0, flexGrow: 1 }}>
            <InputLabel id="location-select-label">Filtruj po lokalizacjach</InputLabel>
            <Select
              labelId="location-select-label"
              multiple
              value={selectedLocations.map(l => l.id)}
              onChange={e => {
                const ids = e.target.value as number[];
                setSelectedLocations(locations.filter(loc => ids.includes(loc.id)));
              }}
              label="Filtruj po lokalizacjach"
              renderValue={(selected) => {
                const ids = selected as number[];
                const names = locations.filter(loc => ids.includes(loc.id)).map(loc => loc.name);
                return names.join(', ');
              }}
              sx={{ minWidth: { xs: '100%', md: 220 }, maxWidth: 300, flexBasis: 0, flexGrow: 1, borderRadius: 0 }}
              aria-label="Wybierz lokalizacje"
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
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Filtruj po kategorii" 
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  sx: { borderRadius: 1 },
                  startAdornment: (
                    <Suspense fallback={null}><CategoryIcon /></Suspense>
                  ),
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
            isOptionEqualToValue={(option: Category | null, value: Category | null) => option?.id === value?.id}
            sx={{ flex: 1, minWidth: { xs: '100%', md: 220 }, maxWidth: 300, flexBasis: 0, flexGrow: 1 }}
            
            aria-label="Wybierz kategorię"
          />
          <Select
            value={categoryType}
            onChange={(e) => setCategoryType(e.target.value as 'asset' | 'stock')}
            displayEmpty
            size="small"
            sx={{ 
              flex: { xs: 1, md: 0.5 },
              borderRadius: 0
            }}
            aria-label="Wybierz typ kategorii"
          >
            <MenuItem value="">Wszystkie typy</MenuItem>
            <MenuItem value="asset">Sprzęt (z pyr_code)</MenuItem>
            <MenuItem value="stock">Zasoby (ilościowe)</MenuItem>
          </Select>
        </Box>
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
            Ładowanie danych...
          </Typography>
        </Box>
      ) : filteredEquipment.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          p: 5,
          backgroundColor: 'background.default',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider'
        }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Brak sprzętu dla wybranych filtrów
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Spróbuj zmienić kryteria wyszukiwania lub wyczyść filtry
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => {
              setFilter('');
              setSelectedLocations([]);
              setSelectedCategory(null);
              setCategoryType('');
            }}
            sx={{ 
              borderRadius: 1,
              px: 3
            }}
          >
            Wyczyść filtry
          </Button>
        </Box>
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}
    </Box>
  );
};

export default EquipmentList;

