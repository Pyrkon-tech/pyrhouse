import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Tab,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { DataTable, DataTableEmptyRow, DataTableLoadingRow } from '../../ui';
import { useNotification } from '../../../context/NotificationContext';
import { useLocations } from '../../../hooks/useLocations';
import { notifyShopOrdersChanged } from '../../../hooks/useShopPendingCount';
import {
  confirmShopOrderAPI,
  getShopOrderAPI,
  getShopOrdersAPI,
  patchShopOrderAPI,
  rejectShopOrderAPI,
} from '../../../services/shopAdminService';
import type { ShopOrder, ShopOrderDetail, ShopOrderStatus } from '../../../types/shop.types';
import ShopAdminTabs from './ShopAdminTabs';
import {
  fmtDateTime,
  fmtLocation,
  fmtMoney,
  fmtOrderDates,
  fmtWindow,
  orderStatusView,
  organizerName,
  shopErrorMessage,
} from './shopFormat';

type StatusTab = ShopOrderStatus | 'all';

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'submitted', label: 'Do potwierdzenia' },
  { key: 'confirmed', label: 'Potwierdzone' },
  { key: 'rejected', label: 'Odrzucone' },
  { key: 'cancelled', label: 'Anulowane' },
  { key: 'all', label: 'Wszystkie' },
];

const EVENT_LABEL: Record<string, string> = {
  submitted: 'złożone',
  updated: 'edytowane przez organizatora',
  cancelled: 'anulowane przez organizatora',
  confirmed: 'potwierdzone',
  rejected: 'odrzucone',
  items_changed: 'pozycje poprawione przez magazyn',
  location_changed: 'miejsce zmienione przez magazyn',
};

const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

const ShopOrdersPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = Number(searchParams.get('order')) || null;

  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusTab>('submitted');

  const [detail, setDetail] = useState<ShopOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      setOrders(await getShopOrdersAPI());
    } catch (err) {
      setError(shopErrorMessage(err, 'Nie udało się pobrać zamówień'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      setDetail(await getShopOrderAPI(id));
    } catch (err) {
      setDetail(null);
      showError(shopErrorMessage(err, 'Nie udało się pobrać zamówienia'));
    } finally {
      setDetailLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    else setDetail(null);
  }, [selectedId, fetchDetail]);

  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = { submitted: 0, confirmed: 0, rejected: 0, cancelled: 0, all: orders.length };
    orders.forEach((o) => { c[o.status] += 1; });
    return c;
  }, [orders]);

  const visible = useMemo(
    () => (tab === 'all' ? orders : orders.filter((o) => o.status === tab)),
    [orders, tab],
  );

  const select = (id: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('order', String(id));
    else next.delete('order');
    setSearchParams(next, { replace: true });
  };

  // Runs an action on the open order; on a version conflict reloads it so the moderator sees the change.
  const act = async (fn: (o: ShopOrderDetail) => Promise<ShopOrder>, success: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      await fn(detail);
      notifyShopOrdersChanged();
      showSuccess(success);
      await Promise.all([fetchOrders(), fetchDetail(detail.id)]);
      return true;
    } catch (err) {
      showError(shopErrorMessage(err, 'Operacja nie powiodła się'));
      await Promise.all([fetchOrders(), fetchDetail(detail.id)]);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    act((o) => confirmShopOrderAPI(o.id, o.version), 'Zamówienie potwierdzone — zapotrzebowanie utworzone');

  const reject = async () => {
    const ok = await act((o) => rejectShopOrderAPI(o.id, o.version, reason.trim()), 'Zamówienie odrzucone');
    if (ok) {
      setRejectOpen(false);
      setReason('');
    }
  };

  return (
    <Box>
      <ShopAdminTabs active="orders" pending={counts.submitted} />

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Tabs value={tab} onChange={(_, v: StatusTab) => setTab(v)} variant="scrollable" scrollButtons="auto">
              {STATUS_TABS.map((t) => (
                <Tab
                  key={t.key}
                  value={t.key}
                  label={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {t.label}
                      <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                        {counts[t.key]}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </Tabs>
            <Tooltip title="Odśwież">
              <IconButton onClick={fetchOrders} aria-label="Odśwież zamówienia">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell>Nr</TableCell>
                <TableCell>Organizator</TableCell>
                <TableCell>Miejsce</TableCell>
                <TableCell>Dostawa → zwrot</TableCell>
                <TableCell align="right">Poz.</TableCell>
                <TableCell align="right">Wartość</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <DataTableLoadingRow colSpan={7} />
              ) : visible.length === 0 ? (
                <DataTableEmptyRow colSpan={7} message="Brak zamówień w tym widoku" />
              ) : (
                visible.map((o) => {
                  const st = orderStatusView(o);
                  return (
                    <TableRow
                      key={o.id}
                      hover
                      selected={o.id === selectedId}
                      onClick={() => select(o.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{o.number}</TableCell>
                      <TableCell>{organizerName(o)}</TableCell>
                      <TableCell>{fmtLocation(o.location)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtOrderDates(o)}</TableCell>
                      <TableCell align="right">{o.items.length}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{fmtMoney(o.total)}</TableCell>
                      <TableCell><Chip size="small" label={st.label} color={st.color} variant="outlined" /></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </DataTable>
        </Box>

        {selectedId && (
          <Paper
            component="aside"
            aria-label="Szczegóły zamówienia"
            sx={{ width: { xs: '100%', lg: 420 }, flex: 'none', p: 3, position: { lg: 'sticky' }, top: { lg: 88 } }}
          >
            {detailLoading && !detail ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : detail ? (
              <OrderDetail
                order={detail}
                busy={busy}
                onClose={() => select(null)}
                onConfirm={confirm}
                onReject={() => setRejectOpen(true)}
                onChangeLocation={() => setLocationOpen(true)}
              />
            ) : (
              <Typography color="text.secondary">Nie znaleziono zamówienia.</Typography>
            )}
          </Paper>
        )}
      </Box>

      <Dialog open={rejectOpen} onClose={() => !busy && setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Odrzuć {detail?.number}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Powód zobaczy organizator w sklepie.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Powód odrzucenia"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)} disabled={busy}>Anuluj</Button>
          <Button color="error" variant="contained" onClick={reject} disabled={busy || !reason.trim()}>
            Odrzuć zamówienie
          </Button>
        </DialogActions>
      </Dialog>

      {detail && (
        <LocationDialog
          open={locationOpen}
          order={detail}
          busy={busy}
          onClose={() => setLocationOpen(false)}
          onSave={async (locationId, note) => {
            const ok = await act(
              (o) => patchShopOrderAPI(o.id, { version: o.version, location_id: locationId, location_note: note }),
              detail.status === 'confirmed' ? 'Miejsce zmienione — zapotrzebowanie też' : 'Miejsce zmienione',
            );
            if (ok) setLocationOpen(false);
          }}
        />
      )}
    </Box>
  );
};

interface OrderDetailProps {
  order: ShopOrderDetail;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onChangeLocation: () => void;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{children}</Typography>
);

const OrderDetail: React.FC<OrderDetailProps> = ({ order, busy, onClose, onConfirm, onReject, onChangeLocation }) => {
  const st = orderStatusView(order);
  const name = organizerName(order);
  const canDecide = order.status === 'submitted';
  const canMove = order.status === 'submitted' || order.status === 'confirmed';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{order.number}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip size="small" label={st.label} color={st.color} />
          <IconButton size="small" onClick={onClose} aria-label="Zamknij szczegóły"><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Avatar sx={{ bgcolor: 'secondary.main', width: 40, height: 40, fontSize: 15 }}>{initials(name)}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap>{name}</Typography>
          <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
            {order.account_email}{order.budget_owner ? ` · ${order.budget_owner}` : ''}
          </Typography>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
          <Box>
            <Label>Miejsce</Label>
            <Typography>{fmtLocation(order.location)}</Typography>
            {order.location_note && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{order.location_note}</Typography>}
          </Box>
          {canMove && (
            <Button size="small" variant="outlined" onClick={onChangeLocation} disabled={busy}>Zmień</Button>
          )}
        </Box>
        <Box>
          <Label>Termin</Label>
          <Typography>{fmtWindow(order.delivery_window)} → {fmtWindow(order.return_window)}</Typography>
          {order.return_date && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Zwrot dokładnie: {order.return_date}</Typography>}
        </Box>
        <Box>
          <Label>Odbiorca</Label>
          <Typography>{order.contact_name}</Typography>
        </Box>
        {order.notes && (
          <Box>
            <Label>Uwagi</Label>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{order.notes}</Typography>
          </Box>
        )}
        {order.status_reason && (
          <Box>
            <Label>Powód odrzucenia</Label>
            <Typography variant="body2">{order.status_reason}</Typography>
          </Box>
        )}
      </Paper>

      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {order.items.map((it) => (
          <Box component="li" key={it.product_id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{it.product_name} × {it.quantity}</span>
              {it.category_name && <Chip size="small" label={it.category_name} variant="outlined" />}
            </Box>
            <Typography sx={{ whiteSpace: 'nowrap' }}>
              {it.unit_price != null ? fmtMoney(it.unit_price * it.quantity) : '—'}
            </Typography>
          </Box>
        ))}
        <Divider />
        <Box component="li" sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>Razem</span>
          <span>{fmtMoney(order.total)}</span>
        </Box>
      </Box>

      {order.quest_id && (
        <Button component={RouterLink} to={`/quests/${order.quest_id}`} variant="text" sx={{ alignSelf: 'flex-start' }}>
          Otwórz zapotrzebowanie
        </Button>
      )}

      {canDecide && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Potwierdzenie tworzy zapotrzebowanie w Dispatch (kategorie i sala już dopasowane) i blokuje edycję organizatorowi.
          </Typography>
          <Button variant="contained" startIcon={<CheckIcon />} onClick={onConfirm} disabled={busy} fullWidth>
            Potwierdź — zamówione
          </Button>
          <Button variant="outlined" color="error" onClick={onReject} disabled={busy} fullWidth>
            Odrzuć z powodem…
          </Button>
        </Box>
      )}

      {order.events.length > 0 && (
        <Box>
          <Label>Historia</Label>
          {order.events.map((e, i) => (
            <Typography key={i} variant="body2" sx={{ color: 'text.secondary' }}>
              {fmtDateTime(e.at)} — {EVENT_LABEL[e.type] ?? e.type}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

interface LocationDialogProps {
  open: boolean;
  order: ShopOrderDetail;
  busy: boolean;
  onClose: () => void;
  onSave: (locationId: number, note: string | null) => void;
}

const LocationDialog: React.FC<LocationDialogProps> = ({ open, order, busy, onClose, onSave }) => {
  const { locations, loading } = useLocations();
  const [locationId, setLocationId] = useState<number>(order.location.id);
  const [note, setNote] = useState(order.location_note ?? '');

  useEffect(() => {
    if (open) {
      setLocationId(order.location.id);
      setNote(order.location_note ?? '');
    }
  }, [open, order]);

  const sorted = useMemo(
    () => [...locations].sort((a, b) => (a.pavilion ?? '~').localeCompare(b.pavilion ?? '~') || a.name.localeCompare(b.name)),
    [locations],
  );

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>Zmień miejsce — {order.number}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {order.status === 'confirmed' && (
          <Alert severity="info">Zamówienie jest potwierdzone — zapotrzebowanie przeniesie się razem z nim.</Alert>
        )}
        <Autocomplete
          options={sorted}
          loading={loading}
          groupBy={(l) => (l.pavilion ? `Pawilon ${l.pavilion}` : 'Bez pawilonu')}
          getOptionLabel={(l) => l.name}
          value={sorted.find((l) => l.id === locationId) ?? null}
          onChange={(_, v) => v && setLocationId(v.id)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => <TextField {...params} label="Lokalizacja" />}
        />
        <TextField
          label="Doprecyzowanie (opcjonalnie)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Anuluj</Button>
        <Button variant="contained" onClick={() => onSave(locationId, note.trim() || null)} disabled={busy}>
          Zapisz
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShopOrdersPage;
