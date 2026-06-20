import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
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
  Dialog,
} from '@mui/material';
import { DataTable } from '../ui/DataTable';
import { Button } from '../ui/Button';
import { AppSnackbar, PageHeader, PageLoader, EmptyState } from '../ui';
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../../hooks/useLocations';
import { useCategories } from '../../hooks/useCategories';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { apiClient, ApiError } from '../../services/apiClient';
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
  serial?: string | null;
}

type SemanticFilter = 'in_transit' | 'no_serial';

type SortField = 'pyr_code' | 'category' | 'location' | 'state' | 'origin';
type SortOrder = 'asc' | 'desc';

const SORT_COLUMNS: { field: SortField; label: string }[] = [
  { field: 'pyr_code', label: 'PYR CODE' },
  { field: 'category', label: 'KATEGORIA' },
  { field: 'location', label: 'LOKALIZACJA' },
  { field: 'state', label: 'STATUS / ILOŚĆ' },
  { field: 'origin', label: 'POCHODZENIE' },
];

const categoryLabel = (item: Equipment) =>
  typeof item.category === 'string' ? item.category : item.category.label;

// Sort key per column; location combines pavilion + name so rows group by hall.
const sortValue = (item: Equipment, field: SortField): string | number => {
  switch (field) {
    case 'pyr_code':
      return item.pyr_code?.toLowerCase() ?? '';
    case 'category':
      return categoryLabel(item).toLowerCase();
    case 'location':
      return `${item.location.pavilion ?? ''} ${item.location.name}`.toLowerCase();
    case 'state':
      return item.type === 'stock' ? (item.quantity ?? 0) : item.state.toLowerCase();
    case 'origin':
      return item.origin?.toLowerCase() ?? '';
  }
};

const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const ErrorOutlineIcon = lazy(() => import('@mui/icons-material/ErrorOutlined'));
const LocalShippingIcon = lazy(() => import('@mui/icons-material/LocalShipping'));
const HomeIcon = lazy(() => import('@mui/icons-material/Home'));
const Inventory2Icon = lazy(() => import('@mui/icons-material/Inventory2'));
const ClearAllIcon = lazy(() => import('@mui/icons-material/ClearAll'));
const SearchIcon = lazy(() => import('@mui/icons-material/Search'));
const PrintIcon = lazy(() => import('@mui/icons-material/Print'));
// jsbarcode + jspdf (~650KB) load only when labels are actually printed
const BarcodeGenerator = lazy(() =>
  import('../common/BarcodeGenerator').then((m) => ({ default: m.BarcodeGenerator }))
);

// Labels can only be printed for assets that carry a PYR code.
const isPrintable = (item: Equipment) => item.type === 'asset' && !!item.pyr_code;

const EquipmentList: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]); // For local filtering
  const [filter, setFilter] = useState<string>('');
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryType, setCategoryType] = useState<'asset' | 'stock' | ''>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<SemanticFilter>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const navigate = useNavigate();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

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

  // Zaznaczanie do druku etykiet (tylko assety z kodem PYR)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showLabels, setShowLabels] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Printable rows currently visible (respects active filters).
  const printableVisible = useMemo(
    () => filteredEquipment.filter(isPrintable),
    [filteredEquipment]
  );

  const allVisibleSelected =
    printableVisible.length > 0 && printableVisible.every(i => selectedIds.has(i.id));
  const someVisibleSelected =
    printableVisible.some(i => selectedIds.has(i.id)) && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) printableVisible.forEach(i => next.delete(i.id));
      else printableVisible.forEach(i => next.add(i.id));
      return next;
    });
  };

  // Map selected assets into the shape BarcodeGenerator expects (pyrcode drives the label).
  const selectedAssets = useMemo(
    () =>
      equipment
        .filter(e => isPrintable(e) && selectedIds.has(e.id))
        .map(e => ({
          id: e.id,
          serial: e.serial ?? '',
          location: { id: e.location.id, name: e.location.name, details: null },
          category: { id: 0, label: typeof e.category === 'string' ? e.category : e.category.label },
          status: e.state,
          pyrcode: e.pyr_code as string,
          origin: e.origin,
        })),
    [equipment, selectedIds]
  );

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
    try {
      const blob = await apiClient.getBlob(type === 'assets' ? '/assets/report' : '/stocks/report');
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = type === 'assets' ? 'assets_report.csv' : 'stock_report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showSnackbar('success', 'Raport został pobrany');
    } catch (err) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd podczas pobierania raportu');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setEquipment([]); // Clear the state before fetching new data

      const data = await apiClient.get<Array<{
        id: number;
        category?: { label?: string; type?: 'asset' | 'stock' };
        quantity?: number;
        location: LocationWithPavilion;
        status: string;
        pyrcode?: string | null;
        origin: string;
        serial?: string | null;
      }>>('/items');

      const transformedData: Equipment[] = data.map((item) => ({
        id: item.id,
        category: item.category?.label || 'Unknown',
        quantity: item.quantity,
        location: item.location,
        state: item.status,
        pyr_code: item.pyrcode || undefined,
        origin: item.origin,
        type: item.category?.type || 'asset',
        // Preserve null (asset flagged as missing serial) vs undefined (stock — no serial concept).
        // `?? undefined` here collapsed null→undefined and broke every `serial === null` check.
        serial: item.serial,
      }));

      setEquipment(transformedData);
      setFilteredEquipment(transformedData); // Initially show all data
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
        setEquipment([]);
        setFilteredEquipment([]);
      }
      showSnackbar('error', err instanceof ApiError ? err.message : 'Wystąpił błąd podczas pobierania sprzętu');
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

    if (sortField) {
      const dir = sortOrder === 'asc' ? 1 : -1;
      filtered.sort((a, b) => {
        const va = sortValue(a, sortField);
        const vb = sortValue(b, sortField);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return b.id - a.id; // stable tie-break by newest
      });
    } else {
      // Default sort by ID descending (previously a separate effect that raced
      // with this one and sorted a stale snapshot of filteredEquipment)
      filtered.sort((a, b) => b.id - a.id);
    }

    setFilteredEquipment(filtered);
  }, [equipment, selectedLocations, selectedCategory, categoryType, filter, activeQuickFilters, sortField, sortOrder]);

  useEffect(() => {
    fetchEquipment();
    // Intentionally mount-only: data is fetched once, filtering is client-side
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Typography
            component="div"
            sx={{
              fontWeight: "bold",
              color: iconColor
            }}>
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
          <TableCell padding="checkbox">
            <Tooltip title="Zaznacz wszystkie do druku etykiet">
              <span>
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  disabled={printableVisible.length === 0}
                  onChange={toggleSelectAllVisible}
                  slotProps={{ input: { 'aria-label': 'Zaznacz wszystkie do druku etykiet' } }}
                />
              </span>
            </Tooltip>
          </TableCell>
          {SORT_COLUMNS.map(({ field, label }) => (
            <TableCell key={field} sortDirection={sortField === field ? sortOrder : false}>
              <TableSortLabel
                active={sortField === field}
                direction={sortField === field ? sortOrder : 'asc'}
                onClick={() => handleSort(field)}
              >
                {label}
              </TableSortLabel>
            </TableCell>
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
            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
              <Tooltip title={isPrintable(item) ? '' : 'Brak kodu PYR — etykieta niedostępna'} disableHoverListener={isPrintable(item)}>
                <span>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    disabled={!isPrintable(item)}
                    onChange={() => toggleSelect(item.id)}
                    slotProps={{ input: { 'aria-label': `Zaznacz ${item.pyr_code || item.id} do druku etykiety` } }}
                  />
                </span>
              </Tooltip>
            </TableCell>
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
                {typeof item.category === 'string' ? item.category : item.category.label}
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
        <Grid size={{ xs: 12 }} key={`${item.id}-${item.type}`}>
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
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>Kategoria:</Typography>
                  <Typography variant="body2">
                    {typeof item.category === 'string' ? item.category : item.category.label}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>Lokalizacja:</Typography>
                  <Typography variant="body2">{item.location.name} {item.location.pavilion ? `(${item.location.pavilion})` : ''}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    {item.type === 'stock' ? 'Ilość:' : 'Status:'}
                  </Typography>
                  {renderStatusOrQuantity(item)}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>Pochodzenie:</Typography>
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
            {!isMobile && selectedIds.size > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Suspense fallback={null}><PrintIcon /></Suspense>}
                onClick={() => setShowLabels(true)}
              >
                Drukuj etykiety ({selectedIds.size})
              </Button>
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
          sx={{ flex: 2, minWidth: 200, maxWidth: 320 }}
          aria-label="Wyszukaj sprzęt"
          slotProps={{
            input: {
              startAdornment: (
                <Suspense fallback={null}><SearchIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} /></Suspense>
              ),
              sx: { borderRadius: 1 },
            }
          }}
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
              slotProps={{
                ...params.slotProps,

                input: {
                  ...params.slotProps.input,
                  sx: { borderRadius: 1 },
                  endAdornment: (
                    <>
                      {categoriesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.slotProps.input.endAdornment}
                    </>
                  ),
                }
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

      {/* Druk etykiet (kodów kreskowych) dla zaznaczonych assetów */}
      <Dialog open={showLabels} onClose={() => setShowLabels(false)} maxWidth="md" fullWidth>
        {selectedAssets.length > 0 && (
          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            <BarcodeGenerator assets={selectedAssets} onClose={() => setShowLabels(false)} />
          </Suspense>
        )}
      </Dialog>
    </Box>
  );
};

export default EquipmentList;

