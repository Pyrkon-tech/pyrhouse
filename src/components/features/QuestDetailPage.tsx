import React, { Suspense, useState, useCallback, useEffect, lazy } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  TextField,
} from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuestDetail } from '../../hooks/useQuestDetail';
import { useQuestStream } from '../../hooks/useQuestStream';
import { useLocations } from '../../hooks/useLocations';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { updateQuestLocationAPI } from '../../services/questService';
import type { QuestEvent } from '../../types/quest.types';
import LoadingSkeleton from '../ui/LoadingSkeleton';
import TransferFormCore from './Transfer/components/TransferFormCore';
import type { QuestStatus, CategoryMatchType } from '../../types/quest.types';

const ArrowBackIcon = lazy(() => import('@mui/icons-material/ArrowBack'));
const HourglassEmptyIcon = lazy(() => import('@mui/icons-material/HourglassEmpty'));
const LocalShippingIcon = lazy(() => import('@mui/icons-material/LocalShipping'));
const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const CancelIcon = lazy(() => import('@mui/icons-material/Cancel'));
const PlaceIcon = lazy(() => import('@mui/icons-material/Place'));
const PersonIcon = lazy(() => import('@mui/icons-material/Person'));
const CalendarTodayIcon = lazy(() => import('@mui/icons-material/CalendarToday'));
const AccountBalanceWalletIcon = lazy(() => import('@mui/icons-material/AccountBalanceWallet'));
const LinkIcon = lazy(() => import('@mui/icons-material/Link'));
const SendIcon = lazy(() => import('@mui/icons-material/Send'));

const getStatusChip = (status: QuestStatus) => {
  switch (status) {
    case 'pending':
      return <Chip icon={<Suspense fallback={null}><HourglassEmptyIcon /></Suspense>} label="Oczekujące" color="default" />;
    case 'in_progress':
      return <Chip icon={<Suspense fallback={null}><LocalShippingIcon /></Suspense>} label="W realizacji" color="warning" />;
    case 'completed':
      return <Chip icon={<Suspense fallback={null}><CheckCircleIcon /></Suspense>} label="Zrealizowane" color="success" />;
    case 'cancelled':
      return <Chip icon={<Suspense fallback={null}><CancelIcon /></Suspense>} label="Anulowane" color="error" />;
    default:
      return <Chip label={status} />;
  }
};

const getTransferStatusChip = (status: string) => {
  switch (status) {
    case 'pending':
      return <Chip label="Oczekujący" color="default" size="small" />;
    case 'in_transit':
      return <Chip label="W transporcie" color="warning" size="small" />;
    case 'completed':
      return <Chip label="Zakończony" color="success" size="small" />;
    case 'cancelled':
      return <Chip label="Anulowany" color="error" size="small" />;
    default:
      return <Chip label={status} size="small" />;
  }
};

const getCategoryMatchChip = (matchType: CategoryMatchType, confidence?: number) => {
  switch (matchType) {
    case 'exact':
      return <Chip label="Dokładne" color="success" size="small" variant="outlined" />;
    case 'fuzzy':
      return (
        <Chip
          label={`Przybliżone${confidence ? ` (${Math.round(confidence * 100)}%)` : ''}`}
          color="warning"
          size="small"
          variant="outlined"
        />
      );
    case 'manual':
      return <Chip label="Ręczne" color="info" size="small" variant="outlined" />;
    case 'none':
      return <Chip label="Brak" color="default" size="small" variant="outlined" />;
    default:
      return null;
  }
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString('pl-PL');
  } catch {
    return dateStr;
  }
};

const QuestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { quest, loading, error, updateStatus, refreshQuest } = useQuestDetail(id);
  const { userRole } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatchState = location.state as { autoOpenTransfer?: boolean; volunteerIds?: number[] } | null;

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [stocksRefreshTrigger, setStocksRefreshTrigger] = useState(0);

  // Auto-open formularza transferu po dispatchu z mapy — tylko gdy brak istniejącego transferu
  useEffect(() => {
    if (dispatchState?.autoOpenTransfer && quest && !quest.transfer_id && quest.status !== 'completed') {
      setShowTransferForm(true);
      // Wyczyść route state by nie re-triggerować po odświeżeniu
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [dispatchState?.autoOpenTransfer, quest?.id]);

  // Location resolution
  const { locations, refetch: fetchLocations } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [saveMapping, setSaveMapping] = useState(true);
  const [assigningLocation, setAssigningLocation] = useState(false);

  useEffect(() => {
    if (quest) fetchLocations();
  }, [quest?.id, fetchLocations]);

  const handleAssignLocation = async () => {
    if (!quest || selectedLocationId == null) return;
    try {
      setAssigningLocation(true);
      await updateQuestLocationAPI(quest.id, { location_id: selectedLocationId, save_mapping: saveMapping });
      showSuccess('Lokalizacja przypisana pomyślnie');
      await refreshQuest();
    } catch {
      showError('Błąd podczas przypisywania lokalizacji');
    } finally {
      setAssigningLocation(false);
    }
  };

  const onSseEvent = useCallback((event: QuestEvent) => {
    if (event.type === 'stocks_changed') {
      setStocksRefreshTrigger((t) => t + 1);
    }
  }, []);

  useQuestStream({ onEvent: onSseEvent });

  const hasAdminAccess = userRole === 'admin' || userRole === 'moderator';
  const hasTransfer = quest?.transfer_id != null;
  const canChangeStatus = hasAdminAccess && !hasTransfer;
  const canCreateTransfer = hasAdminAccess && !hasTransfer && quest?.status === 'pending';

  const handleStatusChange = async (newStatus: QuestStatus) => {
    try {
      setUpdating(true);
      await updateStatus(newStatus);
      showSuccess(`Status zmieniony na: ${getStatusLabel(newStatus)}`);
    } catch {
      showError('Błąd podczas zmiany statusu');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    setCancelDialogOpen(false);
    await handleStatusChange('cancelled');
  };

  const handleStartIssue = () => {
    setShowTransferForm(true);
  };

  const getStatusLabel = (status: QuestStatus) => {
    const labels: Record<QuestStatus, string> = {
      pending: 'Oczekujące',
      in_progress: 'W realizacji',
      completed: 'Zrealizowane',
      cancelled: 'Anulowane',
    };
    return labels[status];
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
        <LoadingSkeleton />
      </Box>
    );
  }

  if (error || !quest) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Nie znaleziono zamówienia'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<Suspense fallback={null}><ArrowBackIcon /></Suspense>}
          onClick={() => navigate('/quests')}
        >
          Powrót do listy
        </Button>
      </Box>
    );
  }

  const totalItems = quest.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Box
      sx={{
        margin: '0 auto',
        padding: { xs: 2, sm: 3 },
        maxWidth: 1200,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="text"
            startIcon={<Suspense fallback={null}><ArrowBackIcon /></Suspense>}
            onClick={() => navigate('/quests')}
            sx={{ minWidth: 'auto' }}
          >
            Powrót
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Zamówienie
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusChip(quest.status)}
          {hasTransfer && (
            <Chip
              icon={<Suspense fallback={null}><LinkIcon /></Suspense>}
              label={`Transfer #${quest.transfer_id}`}
              color="info"
              size="small"
              onClick={() => navigate(`/transfers/${quest.transfer_id}`)}
              clickable
            />
          )}
        </Box>
      </Box>

      {/* Transfer managed banner */}
      {hasTransfer && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Status tego zamówienia jest zarządzany automatycznie przez powiązany transfer #{quest.transfer_id}.
          Zmiany statusu następują automatycznie po aktualizacji transferu.
        </Alert>
      )}

      {/* Quest info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Suspense fallback={null}><PlaceIcon color="primary" /></Suspense>
              <Box>
                <Typography variant="caption" color="text.secondary">Cel dostawy</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {quest.destination.pavilion} — {quest.destination.location}
                </Typography>
                {quest.location_resolved && quest.location_name && (
                  <Chip
                    label={quest.location_name}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                )}
                {!quest.location_resolved && (
                  <Chip label="Nieprzypisana" size="small" color="warning" variant="outlined" sx={{ mt: 0.5 }} />
                )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Suspense fallback={null}><PersonIcon color="primary" /></Suspense>
              <Box>
                <Typography variant="caption" color="text.secondary">Odbiorca</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {quest.recipient}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Suspense fallback={null}><CalendarTodayIcon color="primary" /></Suspense>
              <Box>
                <Typography variant="caption" color="text.secondary">Data dostawy</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {formatDate(quest.delivery_date)}
                  {quest.pickup_time && ` (odbiór: ${quest.pickup_time})`}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Suspense fallback={null}><AccountBalanceWalletIcon color="primary" /></Suspense>
              <Box>
                <Typography variant="caption" color="text.secondary">Właściciel budżetu</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {quest.budget_owner}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Location resolution banner */}
      {!quest.location_resolved && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={null}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Lokalizacja nieprzypisana — wymagane ręczne przypisanie przed wydaniem sprzętu
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Formularz: <strong>{quest.destination.pavilion}</strong> / <strong>{quest.destination.location}</strong> — nie pasuje do żadnej lokalizacji w systemie
          </Typography>
          {hasAdminAccess && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
              <Autocomplete
                size="small"
                options={locations}
                getOptionLabel={(opt) => `${opt.pavilion ? `Paw. ${opt.pavilion} — ` : ''}${opt.name}`}
                value={locations.find(l => l.id === selectedLocationId) ?? null}
                onChange={(_, val) => setSelectedLocationId(val?.id ?? null)}
                renderInput={(params) => (
                  <TextField {...params} label="Wybierz lokalizację" sx={{ minWidth: 280 }} />
                )}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={saveMapping}
                    onChange={(e) => setSaveMapping(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="caption">Zapisz jako mapping</Typography>}
              />
              <Button
                variant="contained"
                size="small"
                disabled={selectedLocationId == null || assigningLocation}
                onClick={handleAssignLocation}
                startIcon={assigningLocation ? <CircularProgress size={14} color="inherit" /> : null}
              >
                Przypisz
              </Button>
            </Box>
          )}
        </Alert>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {/* Issue button - only for pending quests without a transfer and with resolved location */}
        {canCreateTransfer && quest.location_resolved && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleStartIssue}
            startIcon={<Suspense fallback={null}><SendIcon /></Suspense>}
            sx={{ px: 3 }}
          >
            Wydaj sprzęt
          </Button>
        )}
        {canCreateTransfer && !quest.location_resolved && (
          <Button
            variant="contained"
            color="primary"
            disabled
            startIcon={<Suspense fallback={null}><SendIcon /></Suspense>}
            sx={{ px: 3 }}
            title="Przypisz lokalizację przed wydaniem sprzętu"
          >
            Wydaj sprzęt
          </Button>
        )}

        {/* Status change buttons - only for quests without a transfer */}
        {canChangeStatus && quest.status !== 'completed' && quest.status !== 'cancelled' && (
          <>
            {quest.status === 'pending' && (
              <Button
                variant="outlined"
                color="warning"
                onClick={() => handleStatusChange('in_progress')}
                disabled={updating}
                startIcon={updating ? <CircularProgress size={16} /> : <Suspense fallback={null}><LocalShippingIcon /></Suspense>}
              >
                Rozpocznij realizację
              </Button>
            )}
            {quest.status === 'in_progress' && (
              <Button
                variant="contained"
                color="success"
                onClick={() => handleStatusChange('completed')}
                disabled={updating}
                startIcon={updating ? <CircularProgress size={16} /> : <Suspense fallback={null}><CheckCircleIcon /></Suspense>}
              >
                Oznacz jako zrealizowane
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              onClick={() => setCancelDialogOpen(true)}
              disabled={updating}
              startIcon={<Suspense fallback={null}><CancelIcon /></Suspense>}
            >
              Anuluj zamówienie
            </Button>
          </>
        )}
      </Box>

      {/* Items table */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Przedmioty ({quest.items.length} poz., {totalItems} szt.)
      </Typography>
      <TableContainer
        component={Paper}
        sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600 }}>Nazwa</TableCell>
              <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600 }} align="center">Ilość</TableCell>
              <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600 }}>Dopasowanie kategorii</TableCell>
              <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600 }}>Budget Owner</TableCell>
              <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600 }}>Notatki</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quest.items.map((item, index) => (
              <TableRow key={index}>
                <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                <TableCell align="center">
                  <Chip label={item.quantity} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  {getCategoryMatchChip(item.category_match, item.category_match_confidence)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.budget_owner || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: item.notes ? 'italic' : 'normal' }}>
                    {item.notes || '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Inline Transfer Form */}
      {canCreateTransfer && showTransferForm && (
        <Box sx={{ mb: 3 }}>
          <TransferFormCore
            questId={quest.id}
            questLocationId={quest.location_id}
            stocksRefreshTrigger={stocksRefreshTrigger}
            initialVolunteerIds={
              dispatchState?.volunteerIds ??
              (quest.assigned_volunteers?.map((v) => v.id) ?? [])
            }
            questData={{
              recipient: quest.recipient,
              deliveryDate: quest.delivery_date,
              location: quest.destination.location,
              pavilion: quest.destination.pavilion,
              items: quest.items.map((i) => ({
                item_name: i.name,
                quantity: i.quantity,
                notes: i.notes,
              })),
            }}
            onSuccess={async () => {
              setShowTransferForm(false);
              await refreshQuest();
            }}
            onCancel={() => setShowTransferForm(false)}
          />
        </Box>
      )}

      {/* Linked Transfer Card */}
      {hasTransfer && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            border: '1px solid',
            borderColor: 'info.main',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Powiązany transfer
            </Typography>
            {quest.transfer_status && getTransferStatusChip(quest.transfer_status)}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Transfer #{quest.transfer_id} — status zamówienia aktualizowany automatycznie
          </Typography>
          <Button
            variant="outlined"
            color="info"
            onClick={() => navigate(`/transfers/${quest.transfer_id}`)}
            startIcon={<Suspense fallback={null}><LocalShippingIcon /></Suspense>}
          >
            Zobacz szczegóły transferu
          </Button>
        </Paper>
      )}

      {/* Metadata */}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">
          ID: {quest.id}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Wiersze źródłowe: {quest.source_rows.join(', ')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Ostatnia synchronizacja: {formatDateTime(quest.last_synced)}
        </Typography>
      </Box>

      {/* Cancel dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Anuluj zamówienie</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz anulować to zamówienie? Tej operacji nie można cofnąć.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Nie</Button>
          <Button onClick={handleCancel} color="error" variant="contained">
            Tak, anuluj
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuestDetailPage;
