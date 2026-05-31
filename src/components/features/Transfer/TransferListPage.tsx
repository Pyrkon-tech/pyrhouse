import React, { Suspense, useEffect, useState, useCallback, useRef, lazy } from 'react';
import {
  Box,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import { DataTable } from '../../ui/DataTable';
import { Button } from '../../ui/Button';
import { AppSnackbar, PageHeader, EmptyState } from '../../ui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTransfers } from '../../../hooks/useTransfers';
import { useSnackbarMessage } from '../../../hooks/useSnackbarMessage';
import LoadingSkeleton from '../../ui/LoadingSkeleton';
import Autocomplete from '@mui/material/Autocomplete';
import { Location } from '../../../types/location.types';
import SearchIcon from '@mui/icons-material/Search';
import ClearAllIcon from '@mui/icons-material/ClearAll';

const LocalShippingIcon = lazy(() => import('@mui/icons-material/LocalShipping'));
const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const HourglassEmptyIcon = lazy(() => import('@mui/icons-material/HourglassEmpty'));
const CancelIcon = lazy(() => import('@mui/icons-material/Cancel'));
const AddIcon = lazy(() => import('@mui/icons-material/Add'));

const TransfersListPage: React.FC = () => {
  const { transfers, loading, error, refreshTransfers } = useTransfers();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [fromLocationFilter, setFromLocationFilter] = useState<Location | null>(null);
  const [toLocationFilter, setToLocationFilter] = useState<Location | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const [searchParams, setSearchParams] = useSearchParams();

  const allLocations = React.useMemo(() => {
    const froms = transfers.map(t => t.from_location);
    const tos = transfers.map(t => t.to_location);
    const all = [...froms, ...tos];
    return all.filter((loc, idx, arr) => arr.findIndex(l => l.id === loc.id) === idx);
  }, [transfers]);

  useEffect(() => {
    refreshTransfers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (error) {
      showSnackbar('error', error);
    }
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  // Przy starcie: ustaw filtry na podstawie query params
  useEffect(() => {
    const fromId = searchParams.get('from');
    const toId = searchParams.get('to');
    const date = searchParams.get('date') || '';
    const status = searchParams.get('status') || '';
    const q = searchParams.get('q') || '';

    if (fromId && allLocations.length) {
      const found = allLocations.find(l => String(l.id) === fromId);
      if (found) setFromLocationFilter(found as Location);
    }
    if (toId && allLocations.length) {
      const found = allLocations.find(l => String(l.id) === toId);
      if (found) setToLocationFilter(found as Location);
    }
    setDateFilter(date);
    setStatusFilter(status);
    setSearchQuery(q);
  }, [allLocations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aktualizuj query params przy każdej zmianie filtrów
  useEffect(() => {
    const params: Record<string, string> = {};
    if (fromLocationFilter) params.from = String(fromLocationFilter.id);
    if (toLocationFilter) params.to = String(toLocationFilter.id);
    if (dateFilter) params.date = dateFilter;
    if (statusFilter) params.status = statusFilter;
    if (searchQuery) params.q = searchQuery;
    setSearchParams(params, { replace: true });
  }, [fromLocationFilter, toLocationFilter, dateFilter, statusFilter, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debouncedSearch = useCallback((query: string) => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearchQuery(query), 300);
  }, []);

  const allDates = React.useMemo(() => {
    return Array.from(new Set(transfers.map(t => new Date(t.transfer_date).toLocaleDateString('pl-PL'))));
  }, [transfers]);

  const sortedTransfers = React.useMemo(() => {
    return [...transfers]
      .sort((a, b) => {
        const dateComparison = new Date(b.transfer_date).getTime() - new Date(a.transfer_date).getTime();
        if (dateComparison !== 0) return dateComparison;
        if (a.status === 'in_transit' && b.status !== 'in_transit') return -1;
        if (a.status !== 'in_transit' && b.status === 'in_transit') return 1;
        return 0;
      })
      .filter(transfer =>
        transfer.id.toString().includes(searchQuery.toLowerCase()) ||
        transfer.from_location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.to_location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.status.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(transfer => !fromLocationFilter || transfer.from_location.id === fromLocationFilter.id)
      .filter(transfer => !toLocationFilter || transfer.to_location.id === toLocationFilter.id)
      .filter(transfer => !dateFilter || new Date(transfer.transfer_date).toLocaleDateString('pl-PL') === dateFilter)
      .filter(transfer => !statusFilter || transfer.status === statusFilter);
  }, [transfers, searchQuery, fromLocationFilter, toLocationFilter, dateFilter, statusFilter]);

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'in_transit':
        return (
          <Chip
            icon={<Suspense fallback={null}><LocalShippingIcon /></Suspense>}
            label="W trasie"
            color="warning"
            sx={{ animation: 'pulse 2s infinite' }}
          />
        );
      case 'completed':
        return (
          <Chip
            icon={<Suspense fallback={null}><CheckCircleIcon /></Suspense>}
            label="Dostarczony"
            color="success"
          />
        );
      case 'created':
        return (
          <Chip
            icon={<Suspense fallback={null}><HourglassEmptyIcon /></Suspense>}
            label="Utworzony"
            color="default"
          />
        );
      case 'cancelled':
        return (
          <Chip
            icon={<Suspense fallback={null}><CancelIcon /></Suspense>}
            label="Anulowany"
            color="error"
          />
        );
      default:
        return <Chip label="Unknown" />;
    }
  };

  const clearFilters = () => {
    setFromLocationFilter(null);
    setToLocationFilter(null);
    setDateFilter('');
    setStatusFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters = !!(fromLocationFilter || toLocationFilter || dateFilter || statusFilter || searchQuery);

  const renderTable = () => (
    <DataTable>
      <TableHead>
        <TableRow>
          <TableCell>ID</TableCell>
          <TableCell>Z lokalizacji</TableCell>
          <TableCell>Do lokalizacji</TableCell>
          <TableCell>Data transferu</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sortedTransfers.map((transfer) => (
          <TableRow
            key={transfer.id}
            sx={{
              cursor: 'pointer',
              bgcolor: transfer.status === 'in_transit' ? 'rgba(237, 108, 2, 0.1)' : undefined,
            }}
            onClick={() => navigate(`/transfers/${transfer.id}`)}
          >
            <TableCell>
              <Typography component="div" sx={{ fontWeight: 500 }}>
                {transfer.id}
              </Typography>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>{transfer.from_location.name}</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>{transfer.to_location.name}</TableCell>
            <TableCell>
              {new Date(transfer.transfer_date).toLocaleString('pl-PL')}
            </TableCell>
            <TableCell>{getStatusChip(transfer.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );

  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {sortedTransfers.map((transfer) => (
        <Grid item xs={12} key={transfer.id}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              bgcolor: transfer.status === 'in_transit' ? 'rgba(237, 108, 2, 0.1)' : 'inherit',
              '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
              transition: 'background-color 0.2s ease',
            }}
            onClick={() => navigate(`/transfers/${transfer.id}`)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
                  Transfer #{transfer.id}
                </Typography>
                {getStatusChip(transfer.status)}
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Z lokalizacji:</Typography>
                  <Typography variant="body2" fontWeight="bold">{transfer.from_location.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Do lokalizacji:</Typography>
                  <Typography variant="body2" fontWeight="bold">{transfer.to_location.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Data:</Typography>
                  <Typography variant="body2">
                    {new Date(transfer.transfer_date).toLocaleString('pl-PL')}
                  </Typography>
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
      padding: { xs: 2, sm: 3, md: 3 },
      maxWidth: '1400px',
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
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
        title="Transfery"
        actions={
          <Button
            variant="primary"
            leftIcon={<Suspense fallback={null}><AddIcon /></Suspense>}
            onClick={() => navigate('/transfers/create')}
          >
            Nowy transfer
          </Button>
        }
      />

      {/* Filtry */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
          mb: 2,
          backgroundColor: 'background.default',
          borderRadius: 1,
          p: { xs: 1, sm: 1.5 },
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        }}
      >
        <TextField
          size="small"
          variant="outlined"
          placeholder="Szukaj po ID, lokalizacji lub statusie..."
          onChange={e => debouncedSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />
            ),
            sx: { borderRadius: 1 },
          }}
          sx={{ minWidth: 150, maxWidth: 220, flex: 2 }}
        />
        <Autocomplete
          size="small"
          options={allLocations}
          getOptionLabel={option => option.name}
          value={fromLocationFilter}
          onChange={(_, value) => setFromLocationFilter(value as Location | null)}
          isOptionEqualToValue={(option, value) => option.id === value?.id}
          renderInput={params => (
            <TextField {...params} label="Z lokalizacji" variant="outlined" size="small" />
          )}
          sx={{ minWidth: 150, flex: 1 }}
        />
        <Autocomplete
          size="small"
          options={allLocations}
          getOptionLabel={option => option.name}
          value={toLocationFilter}
          onChange={(_, value) => setToLocationFilter(value as Location | null)}
          isOptionEqualToValue={(option, value) => option.id === value?.id}
          renderInput={params => (
            <TextField {...params} label="Do lokalizacji" variant="outlined" size="small" />
          )}
          sx={{ minWidth: 150, flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
          <Select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            displayEmpty
            sx={{ borderRadius: 0 }}
          >
            <MenuItem value="">Data</MenuItem>
            {allDates.map(date => (
              <MenuItem key={date} value={date}>{date}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            displayEmpty
            sx={{ borderRadius: 0 }}
          >
            <MenuItem value="">Status</MenuItem>
            <MenuItem value="in_transit">W trasie</MenuItem>
            <MenuItem value="completed">Dostarczony</MenuItem>
            <MenuItem value="created">Utworzony</MenuItem>
            <MenuItem value="cancelled">Anulowany</MenuItem>
          </Select>
        </FormControl>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ClearAllIcon fontSize="small" />}
            onClick={clearFilters}
            sx={{ ml: 1 }}
          >
            Wyczyść
          </Button>
        )}
      </Box>

      {loading ? (
        <LoadingSkeleton />
      ) : sortedTransfers.length === 0 ? (
        <EmptyState
          message="Brak transferów"
          description={searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Utwórz nowy transfer, aby rozpocząć'}
          action={hasActiveFilters ? { label: 'Wyczyść filtry', onClick: clearFilters } : undefined}
        />
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}
    </Box>
  );
};

export default TransfersListPage;
