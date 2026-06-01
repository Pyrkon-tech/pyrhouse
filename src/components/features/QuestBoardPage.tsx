import React, { Suspense, useEffect, useState, useCallback, useMemo, lazy, useRef } from 'react';
import {
  Box,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
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
  CircularProgress,
  Alert,
  Tooltip,
  Paper,
} from '@mui/material';
import { DataTable } from '../ui/DataTable';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuests } from '../../hooks/useQuests';
import { useSync } from '../../hooks/useSync';
import { useQuestStream } from '../../hooks/useQuestStream';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useQuestCounts } from '../../hooks/useQuestCounts';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import LoadingSkeleton from '../ui/LoadingSkeleton';
import type { QuestStatus, Quest, QuestEvent } from '../../types/quest.types';

const HourglassEmptyIcon = lazy(() => import('@mui/icons-material/HourglassEmpty'));
const LocalShippingIcon = lazy(() => import('@mui/icons-material/LocalShipping'));
const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const CancelIcon = lazy(() => import('@mui/icons-material/Cancel'));
const SyncIcon = lazy(() => import('@mui/icons-material/Sync'));
const SearchIcon = lazy(() => import('@mui/icons-material/Search'));
const ClearAllIcon = lazy(() => import('@mui/icons-material/ClearAll'));
const LinkIcon = lazy(() => import('@mui/icons-material/Link'));
const SendIcon = lazy(() => import('@mui/icons-material/Send'));
import MapIcon from '@mui/icons-material/Map';

const LIMIT = 100;

const getStatusChip = (status: QuestStatus) => {
  switch (status) {
    case 'pending':
      return <Chip icon={<Suspense fallback={null}><HourglassEmptyIcon /></Suspense>} label="Oczekujące" color="default" size="small" />;
    case 'in_progress':
      return <Chip icon={<Suspense fallback={null}><LocalShippingIcon /></Suspense>} label="W realizacji" color="warning" size="small" />;
    case 'completed':
      return <Chip icon={<Suspense fallback={null}><CheckCircleIcon /></Suspense>} label="Zrealizowane" color="success" size="small" />;
    case 'cancelled':
      return <Chip icon={<Suspense fallback={null}><CancelIcon /></Suspense>} label="Anulowane" color="error" size="small" />;
    default:
      return <Chip label={status} size="small" />;
  }
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('pl-PL');
  } catch {
    return dateStr;
  }
};

const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'przed chwilą';
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  return `${days} dni temu`;
};

const QuestBoardPage: React.FC = () => {
  const { quests, count, loading, error, fetchQuests } = useQuests();
  const { syncLog, syncing, triggerSync } = useSync();
  const { userRole } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams, setSearchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<QuestStatus | ''>(
    (searchParams.get('status') as QuestStatus) || ''
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [page, setPage] = useState(0);

  // Sync status (scheduler info)
  const { status: syncStatus, formatInterval } = useSyncStatus();

  // Liczniki per status — niezależne od aktywnego filtra tabeli
  const { counts: stats, refreshCounts } = useQuestCounts();

  // SSE — auto-refresh po każdym syncu backendu
  // pageRef + statusFilterRef żeby uniknąć stale closure w useCallback
  const pageRef = useRef(page);
  const statusFilterRef = useRef(statusFilter);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { statusFilterRef.current = statusFilter; }, [statusFilter]);

  const onSseEvent = useCallback((event: QuestEvent) => {
    if (event.type === 'sync_completed') {
      fetchQuests({
        limit: LIMIT,
        offset: pageRef.current * LIMIT,
        status: statusFilterRef.current || undefined,
      });
      refreshCounts();
    }
  }, [fetchQuests, refreshCounts]);

  const { connected: sseConnected } = useQuestStream({ onEvent: onSseEvent });

  const hasAdminAccess = userRole === 'admin' || userRole === 'moderator';

  // Fetch quests on mount and filter/page change
  useEffect(() => {
    const params: { status?: QuestStatus; limit: number; offset: number } = {
      limit: LIMIT,
      offset: page * LIMIT,
    };
    if (statusFilter) params.status = statusFilter;
    fetchQuests(params);
  }, [statusFilter, page, fetchQuests]);

  // Sync search params with URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (searchQuery) params.q = searchQuery;
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line
  }, [statusFilter, searchQuery]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debouncedSearch = useCallback((query: string) => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearchQuery(query), 300);
  }, []);

  // Client-side filtering: text search + unresolved location
  const STATUS_ORDER: Record<string, number> = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };

  const filteredQuests = useMemo(() => {
    let result = quests;
    if (showUnresolvedOnly) {
      result = result.filter((quest) => !quest.location_resolved);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (quest) =>
          quest.recipient.toLowerCase().includes(q) ||
          quest.destination.location.toLowerCase().includes(q) ||
          quest.destination.pavilion.toLowerCase().includes(q) ||
          quest.id.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  }, [quests, searchQuery, showUnresolvedOnly]);

  const unresolvedLocationCount = useMemo(
    () => quests.filter(q => !q.location_resolved).length,
    [quests],
  );
  const handleSync = async () => {
    try {
      const result = await triggerSync();
      showSuccess(
        `Synchronizacja zakończona: ${result.stats.quests_created} nowych zamówień, ${result.stats.quests_updated} zaktualizowanych`
      );
      setPage(0);
      fetchQuests({ limit: LIMIT, offset: 0, status: statusFilter || undefined });
      refreshCounts();
    } catch {
      showError('Błąd podczas synchronizacji');
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearchQuery('');
    setShowUnresolvedOnly(false);
    setPage(0);
  };

  const hasActiveFilters = statusFilter || searchQuery || showUnresolvedOnly;

  const renderStatsBar = () => (
    <Grid container spacing={1.5} sx={{ mb: 2 }}>
      {([
        { key: 'pending', label: 'Oczekujące', color: theme.palette.grey[500] },
        { key: 'in_progress', label: 'W realizacji', color: theme.palette.warning.main },
        { key: 'completed', label: 'Zrealizowane', color: theme.palette.success.main },
        { key: 'cancelled', label: 'Anulowane', color: theme.palette.error.main },
      ] as const).map(({ key, label, color }) => (
        <Grid item xs={6} sm={3} key={key}>
          <Paper
            sx={{
              p: 1.5,
              textAlign: 'center',
              borderTop: `3px solid ${color}`,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-2px)' },
              bgcolor: statusFilter === key ? 'action.selected' : 'background.paper',
            }}
            onClick={() => {
              setStatusFilter(statusFilter === key ? '' : key);
              setPage(0);
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color }}>
              {stats[key]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  const renderSyncInfo = () => {
    if (!syncLog) return null;
    return (
      <Alert
        severity={syncLog.success ? 'info' : 'warning'}
        sx={{ mb: 2 }}
        action={
          hasAdminAccess ? (
            <Button
              size="small"
              color="inherit"
              startIcon={
                syncing ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Suspense fallback={null}><SyncIcon /></Suspense>
                )
              }
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? 'Synchronizuję...' : 'Synchronizuj'}
            </Button>
          ) : undefined
        }
      >
        Ostatnia synchronizacja: {formatRelativeTime(syncLog.synced_at)}
        {syncLog.success && ` (${syncLog.quests_created} nowych zamówień, ${syncLog.quests_updated} zaktualizowanych)`}
        {syncLog.errors && ` — Błędy: ${syncLog.errors}`}
        {syncStatus?.enabled && (
          <Typography component="span" variant="body2" sx={{ ml: 1, opacity: 0.75 }}>
            {syncStatus.next_sync
              ? `· Następny: ${new Date(syncStatus.next_sync).toLocaleTimeString('pl-PL')} (co ${formatInterval(syncStatus.interval)})`
              : `(co ${formatInterval(syncStatus.interval)})`}
          </Typography>
        )}
      </Alert>
    );
  };

  const renderFilters = () => (
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
        placeholder="Szukaj po odbiorcy, lokalizacji..."
        defaultValue={searchQuery}
        onChange={(e) => debouncedSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <Suspense fallback={null}>
              <SearchIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />
            </Suspense>
          ),
          sx: { borderRadius: 1 },
        }}
        sx={{ minWidth: 200, flex: 2 }}
      />
      <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as QuestStatus | '');
            setPage(0);
          }}
          displayEmpty
        >
          <MenuItem value="">Wszystkie statusy</MenuItem>
          <MenuItem value="pending">Oczekujące</MenuItem>
          <MenuItem value="in_progress">W realizacji</MenuItem>
          <MenuItem value="completed">Zrealizowane</MenuItem>
          <MenuItem value="cancelled">Anulowane</MenuItem>
        </Select>
      </FormControl>
      {hasActiveFilters && (
        <Button
          size="small"
          variant="outlined"
          color="secondary"
          onClick={clearFilters}
          sx={{ minWidth: 36, px: 1 }}
        >
          <Suspense fallback={null}><ClearAllIcon fontSize="small" /></Suspense>
        </Button>
      )}
    </Box>
  );

  const getItemsSummary = (quest: Quest) => {
    const items = quest.items.map((i) => `${i.name} (${i.quantity})`);
    if (items.length <= 3) return items.join(', ');
    return `${items.slice(0, 2).join(', ')} +${items.length - 2}`;
  };

  const renderTable = () => (
    <DataTable>
      <TableHead>
        <TableRow>
          <TableCell>Cel</TableCell>
          <TableCell>Odbiorca</TableCell>
          <TableCell>Data dostawy</TableCell>
          <TableCell>Przedmioty</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="center">Akcje</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredQuests.map((quest) => (
          <TableRow
            key={quest.id}
            sx={{
              cursor: 'pointer',
              bgcolor: quest.status === 'in_progress' ? 'rgba(237, 108, 2, 0.1)' : undefined,
            }}
            onClick={() => navigate(`/quests/${quest.id}`)}
          >
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {quest.destination.pavilion}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {quest.destination.location}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{quest.recipient}</TableCell>
              <TableCell>
                {formatDate(quest.delivery_date)}
                {quest.pickup_time && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    {quest.pickup_time}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                  {getItemsSummary(quest)}
                </Typography>
              </TableCell>
              <TableCell>{getStatusChip(quest.status)}</TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  {quest.transfer_id ? (
                    <Chip
                      icon={<Suspense fallback={null}><LinkIcon /></Suspense>}
                      label={`Transfer #${quest.transfer_id}`}
                      size="small"
                      color="info"
                      clickable
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/transfers/${quest.transfer_id}`);
                      }}
                    />
                  ) : quest.status === 'pending' ? (
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<Suspense fallback={null}><SendIcon /></Suspense>}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/quests/${quest.id}`);
                      }}
                    >
                      Wydaj
                    </Button>
                  ) : (
                    <Button
                      variant="text"
                      color="primary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/quests/${quest.id}`);
                      }}
                    >
                      Szczegóły
                    </Button>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTable>
  );

  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {filteredQuests.map((quest) => (
        <Grid item xs={12} key={quest.id}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              bgcolor: quest.status === 'in_progress' ? 'rgba(237, 108, 2, 0.1)' : 'inherit',
              '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
              transition: 'background-color 0.2s ease',
            }}
            onClick={() => navigate(`/quests/${quest.id}`)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {quest.destination.pavilion} — {quest.destination.location}
                </Typography>
                {getStatusChip(quest.status)}
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Odbiorca:</Typography>
                  <Typography variant="body2" fontWeight="bold">{quest.recipient}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Data dostawy:</Typography>
                  <Typography variant="body2">{formatDate(quest.delivery_date)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Przedmioty:</Typography>
                  <Typography variant="body2">{quest.items.length} poz.</Typography>
                </Box>
                {quest.transfer_id && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Transfer:</Typography>
                    <Chip
                      icon={<Suspense fallback={null}><LinkIcon /></Suspense>}
                      label={`#${quest.transfer_id}`}
                      size="small"
                      color="info"
                      clickable
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/transfers/${quest.transfer_id}`);
                      }}
                    />
                  </Box>
                )}
              </Box>
              {!quest.transfer_id && quest.status === 'pending' && (
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  fullWidth
                  sx={{ mt: 1.5 }}
                  startIcon={<Suspense fallback={null}><SendIcon /></Suspense>}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/quests/${quest.id}`);
                  }}
                >
                  Utwórz transfer
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderPagination = () => {
    if (count <= LIMIT) return null;
    const totalPages = Math.ceil(count / LIMIT);
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          size="small"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Poprzednia
        </Button>
        <Typography variant="body2" color="text.secondary">
          Strona {page + 1} z {totalPages}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          Następna
        </Button>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        margin: '0 auto',
        padding: { xs: 2, sm: 3 },
        maxWidth: '1400px',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 600, color: 'primary.main' }}
            >
              Zapotrzebowanie
            </Typography>
            <Box
              title={sseConnected ? 'Aktualizacje real-time aktywne' : 'Łączenie z real-time...'}
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: sseConnected ? 'success.main' : 'warning.main',
                flexShrink: 0,
                transition: 'background-color 0.3s ease',
              }}
            />
          </Box>
          {unresolvedLocationCount > 0 && (
            <Tooltip title={showUnresolvedOnly ? 'Kliknij aby anulować filtr' : 'Pokaż tylko questy bez przypisanej lokalizacji'}>
              <Chip
                label={`⚠ ${unresolvedLocationCount} bez lokalizacji`}
                size="small"
                color="warning"
                variant={showUnresolvedOnly ? 'filled' : 'outlined'}
                onClick={() => setShowUnresolvedOnly((prev) => !prev)}
                sx={{ cursor: 'pointer' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Mapa Dispatch — zarządzanie strefami MTP">
            <Button
              variant="outlined"
              size="small"
              startIcon={<MapIcon fontSize="small" />}
              onClick={() => navigate('/dispatch')}
              sx={{ fontSize: 12, px: 1.5, py: 0.5 }}
            >
              Dispatch
            </Button>
          </Tooltip>
        </Box>
        {hasAdminAccess && !syncLog && (
          <Button
            variant="contained"
            color="primary"
            startIcon={
              syncing ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Suspense fallback={null}><SyncIcon /></Suspense>
              )
            }
            onClick={handleSync}
            disabled={syncing}
            sx={{ borderRadius: 1, px: 3 }}
          >
            {syncing ? 'Synchronizuję...' : 'Synchronizuj z Sheets'}
          </Button>
        )}
      </Box>

      {/* Sync info */}
      {renderSyncInfo()}

      {/* Stats */}
      {!loading && renderStatsBar()}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── List View ── */}
      {renderFilters()}

      {loading ? (
        <LoadingSkeleton />
      ) : filteredQuests.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            p: 5,
            backgroundColor: 'background.default',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Brak zamówień
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {hasActiveFilters
              ? 'Spróbuj zmienić kryteria wyszukiwania'
              : 'Brak zamówień do wyświetlenia. Uruchom synchronizację z Google Sheets.'}
          </Typography>
          {hasActiveFilters && (
            <Button variant="outlined" onClick={clearFilters} sx={{ borderRadius: 1, px: 3 }}>
              Wyczyść filtry
            </Button>
          )}
        </Box>
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}

      {!loading && renderPagination()}
    </Box>
  );
};

export default QuestBoardPage;
