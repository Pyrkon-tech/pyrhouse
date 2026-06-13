import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import SystemInitAnimation from '../animations/SystemInitAnimation';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Autocomplete,
  TextField,
  IconButton,
  InputAdornment,
  Tooltip,
  Grid,
  Skeleton,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCodeScanner,
  LocalShipping,
  HourglassEmpty,
  MedicalServices,
  ChevronRight,
  CheckCircle,
} from '@mui/icons-material';
import { apiClient, ApiError } from '../../services/apiClient';
import { jwtDecode } from 'jwt-decode';
import { searchGlobalAPI } from '../../services/assetService';
import type { GlobalSearchAsset, GlobalSearchStock } from '../../services/assetService';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
const BarcodeScanner = lazy(() => import('../common/BarcodeScanner'));
import { designTokens } from '../../theme/designTokens';
import { useQuestCounts } from '../../hooks/useQuestCounts';
import { useQuests } from '../../hooks/useQuests';
import { useServiceDeskRequests } from '../../hooks/useServiceDeskRequests';

type SearchItem =
  | (GlobalSearchAsset & { _type: 'asset' })
  | (GlobalSearchStock & { _type: 'stock' });

interface UserTransfer {
  ID?: number;
  id?: number;
  FromLocationName?: string;
  from_location_name?: string;
  ToLocationName?: string;
  to_location_name?: string;
  TransferDate?: string;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
};

const formatQuestItems = (items: Array<{ name: string; quantity: number }>) => {
  if (!items?.length) return '—';
  const first = items[0];
  const rest = items.length - 1;
  return rest > 0
    ? `${first.name} (${first.quantity}) +${rest} więcej`
    : `${first.name} (${first.quantity})`;
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showAnimation, setShowAnimation] = useState(
    () => !!(location.state as { showInitAnimation?: boolean })?.showInitAnimation,
  );
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const [showScanner, setShowScanner] = useState(false);
  const [pyrcode, setPyrcode] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userTransfers, setUserTransfers] = useState<UserTransfer[]>([]);
  const [userTransfersLoading, setUserTransfersLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { counts } = useQuestCounts();
  const { quests: pendingQuests, loading: pendingLoading, fetchQuests } = useQuests();
  const { requests: sdRequests, loading: sdLoading } = useServiceDeskRequests('pending', '');

  useEffect(() => {
    if (!isMobile) {
      fetchQuests({ status: 'pending', limit: 6 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const decoded = jwtDecode(token) as { userID: number };
        setUserTransfersLoading(true);
        setUserTransfers(await apiClient.get(`/transfers/users/${decoded.userID}?status=in_transit`));
      } catch {
        // ignore
      } finally {
        setUserTransfersLoading(false);
      }
    };
    load();
  }, []);

  const handlePyrCodeSearch = async (value: string) => {
    if (value.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const result = await searchGlobalAPI(value);
      setSearchResults([
        ...result.assets.map(a => ({ ...a, _type: 'asset' as const })),
        ...result.stocks.map(s => ({ ...s, _type: 'stock' as const })),
      ]);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!pyrcode.trim()) return;
    try {
      const data = await apiClient.get<{ id: number; category: { type?: string } }>(
        `/assets/pyrcode/${pyrcode.trim()}`
      );
      navigate(`/equipment/${data.id}?type=${data.category.type || 'asset'}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        showSnackbar('error', 'Nie znaleziono sprzętu o podanym kodzie Pyrcode.');
        return;
      }
      showSnackbar('error', 'Nie udało się pobrać szczegółów sprzętu.');
    }
  };

  const handleBarcodeScan = async (scannedCode: string) => {
    try {
      const data = await apiClient.get<{ id: number; category: { type?: string } }>(
        `/assets/pyrcode/${scannedCode.trim()}`
      );
      setShowScanner(false);
      navigate(`/equipment/${data.id}?type=${data.category.type || 'asset'}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        showSnackbar('error', 'Nie znaleziono sprzętu o podanym kodzie.');
        return;
      }
      showSnackbar('error', 'Nie udało się pobrać szczegółów sprzętu.');
    }
  };

  const handleCloseScanner = useCallback(() => setShowScanner(false), []);

  const scannerComponent = useMemo(
    () => showScanner ? (
      <Suspense fallback={null}>
        <BarcodeScanner onClose={handleCloseScanner} onScan={handleBarcodeScan} />
      </Suspense>
    ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showScanner, handleCloseScanner],
  );

  const handleOptionSelected = (_event: React.SyntheticEvent, value: SearchItem | string | null) => {
    if (!value || typeof value === 'string') return;
    navigate(`/equipment/${value.id}?type=${value._type}`);
  };

  const stats = [
    {
      label: 'Oczekujące zamówienia',
      value: counts.pending,
      icon: <HourglassEmpty fontSize="small" />,
      color: designTokens.colors.primary[500],
      bg: 'rgba(255,152,0,0.08)',
      href: '/quests?status=pending',
    },
    {
      label: 'W realizacji',
      value: counts.in_progress,
      icon: <LocalShipping fontSize="small" />,
      color: '#42a5f5',
      bg: 'rgba(66,165,245,0.08)',
      href: '/quests?status=in_progress',
    },
    {
      label: 'Service Desk',
      value: sdLoading ? null : sdRequests.length,
      icon: <MedicalServices fontSize="small" />,
      color: designTokens.colors.accent[500],
      bg: 'rgba(0,172,193,0.08)',
      href: '/servicedesk',
    },
    {
      label: 'Zrealizowane',
      value: counts.completed,
      icon: <CheckCircle fontSize="small" />,
      color: '#66bb6a',
      bg: 'rgba(102,187,106,0.08)',
      href: '/quests?status=completed',
    },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {showAnimation && <SystemInitAnimation onComplete={() => setShowAnimation(false)} />}
      <AppSnackbar open={snackbar.open} type={snackbar.type} message={snackbar.message} onClose={closeSnackbar} />
      {scannerComponent}
      {/* Search */}
      <Paper
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          border: `1px solid ${designTokens.colors.primary[500]}30`,
          borderTop: `3px solid ${designTokens.colors.primary[500]}`,
          background: (theme) => theme.palette.mode === 'dark'
            ? designTokens.glass.dark.background
            : designTokens.glass.light.backgroundStrong,
          backdropFilter: designTokens.glass.dark.backdropBlur,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <SearchIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Wyszukaj sprzęt
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Autocomplete
            freeSolo
            fullWidth
            options={searchResults}
            loading={searchLoading}
            onInputChange={(_e, val) => { setPyrcode(val); handlePyrCodeSearch(val); }}
            onChange={handleOptionSelected}
            getOptionLabel={(opt) => {
              if (typeof opt === 'string') return opt;
              if (opt._type === 'asset') return `${opt.pyrcode} — ${opt.category?.label ?? ''}`;
              return `${opt.category?.label ?? ''} (${opt.location?.name ?? ''})`;
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Wprowadź PYR code (np. PYR-001)..."
                size="small"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                slotProps={{
                  ...params.slotProps,

                  input: {
                    ...params.slotProps.input,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                      </InputAdornment>
                    ),
                  }
                }}
              />
            )}
          />
          <Tooltip title="Skanuj kod QR / barcode">
            <IconButton
              onClick={() => setShowScanner(true)}
              sx={{
                border: '1.5px solid',
                borderColor: 'primary.main',
                borderRadius: 2,
                color: 'primary.main',
                px: 1.5,
                '&:hover': { background: 'rgba(255,152,0,0.1)' },
              }}
            >
              <QrCodeScanner />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      {/* Stats strip */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat) => (
          <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
            <Paper
              onClick={() => navigate(stat.href)}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                background: stat.bg,
                border: `1px solid ${stat.color}25`,
                borderLeft: `4px solid ${stat.color}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 16px ${stat.color}20`,
                  borderColor: stat.color,
                },
              }}
            >
              <Box sx={{ color: stat.color, display: 'flex', flexShrink: 0 }}>{stat.icon}</Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                  {stat.value === null
                    ? <CircularProgress size={18} sx={{ color: stat.color }} />
                    : stat.value}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    color: "text.secondary",
                    display: 'block'
                  }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
      {/* Main grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Pending quests */}
        {!isMobile && <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{
              px: 2.5, py: 1.75,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid', borderColor: 'divider',
              background: 'rgba(255,152,0,0.04)',
              flexShrink: 0,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HourglassEmpty sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Zamówienia do obsługi
                </Typography>
                {counts.pending > 0 && (
                  <Chip label={counts.pending} size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem' }} />
                )}
              </Box>
              <Button
                component={RouterLink}
                to="/quests"
                size="small"
                endIcon={<ChevronRight />}
                sx={{ fontSize: '0.75rem', minWidth: 'auto' }}
              >
                Wszystkie
              </Button>
            </Box>

            <Box sx={{ flex: 1 }}>
              {pendingLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Box key={i} sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Skeleton width="55%" height={18} sx={{ mb: 0.5 }} />
                    <Skeleton width="38%" height={14} />
                  </Box>
                ))
              ) : pendingQuests.length === 0 ? (
                <Box sx={{ px: 2.5, py: 5, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: '2rem', color: 'success.main', mb: 1, opacity: 0.6 }} />
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    Brak oczekujących zamówień
                  </Typography>
                </Box>
              ) : (
                pendingQuests.map((quest) => (
                  <Box
                    key={quest.id}
                    component={RouterLink}
                    to={`/quests/${quest.id}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 2.5,
                      py: 1.4,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      textDecoration: 'none',
                      color: 'inherit',
                      gap: 2,
                      transition: 'background 0.15s',
                      '&:hover': { background: 'rgba(255,152,0,0.06)' },
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.2 }} noWrap>
                        {quest.destination?.pavilion} — {quest.destination?.location}
                      </Typography>
                      <Typography variant="caption" noWrap sx={{
                        color: "text.secondary"
                      }}>
                        {formatQuestItems(quest.items)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                      <Typography variant="caption" sx={{
                        color: "text.secondary"
                      }}>
                        {formatDate(quest.delivery_date)}
                      </Typography>
                      <ChevronRight sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>}

        {/* My active transfers */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{
              px: 2.5, py: 1.75,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid', borderColor: 'divider',
              flexShrink: 0,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalShipping sx={{ color: 'info.main', fontSize: '1.1rem' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Moje aktywne wydania
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/transfers"
                size="small"
                endIcon={<ChevronRight />}
                sx={{ fontSize: '0.75rem', minWidth: 'auto' }}
              >
                Wszystkie
              </Button>
            </Box>

            <Box sx={{ flex: 1 }}>
              {userTransfersLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Box key={i} sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Skeleton width="45%" height={18} sx={{ mb: 0.5 }} />
                    <Skeleton width="65%" height={14} />
                  </Box>
                ))
              ) : userTransfers.length === 0 ? (
                <Box sx={{ px: 2.5, py: 5, textAlign: 'center' }}>
                  <LocalShipping sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    Brak aktywnych wydań
                  </Typography>
                </Box>
              ) : (
                userTransfers.map((transfer) => {
                  const id = transfer.ID ?? transfer.id;
                  const from = transfer.FromLocationName ?? transfer.from_location_name ?? '—';
                  const to = transfer.ToLocationName ?? transfer.to_location_name ?? '—';
                  return (
                    <Box
                      key={id}
                      component={RouterLink}
                      to={`/transfers/${id}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 2.5,
                        py: 1.4,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        textDecoration: 'none',
                        color: 'inherit',
                        gap: 2,
                        transition: 'background 0.15s',
                        '&:hover': { background: 'rgba(66,165,245,0.06)' },
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.2 }}>
                          Transfer #{id}
                        </Typography>
                        <Typography variant="caption" noWrap sx={{
                          color: "text.secondary"
                        }}>
                          {from} → {to}
                        </Typography>
                      </Box>
                      <ChevronRight sx={{ fontSize: '1rem', color: 'text.disabled', flexShrink: 0 }} />
                    </Box>
                  );
                })
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
