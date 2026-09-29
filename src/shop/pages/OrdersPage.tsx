import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link as RouterLink, useLocation, useSearchParams } from 'react-router-dom';
import { ShopApiError, shopApi } from '../api';
import { useCart } from '../Cart';
import { useCatalog } from '../Catalog';
import { useShopSession } from '../ShopSession';
import { organizerStatus } from '../status';
import { fmtDateTime, fmtDayKey, fmtLocation, fmtMoney, fmtOrderDates, fmtWindow } from '../../utils/shopFormat';
import type { ShopOrder } from '../../types/shop.types';

const STEPS = ['Złożone', 'Potwierdzone', 'W drodze', 'Dostarczone', 'Zwrot'];

const OrderDetail: React.FC<{ order: ShopOrder; onChanged: (o: ShopOrder) => void }> = ({ order, onChanged }) => {
  const { config } = useShopSession();
  const { replace, setOpen } = useCart();
  const { byId } = useCatalog();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const st = organizerStatus(order);
  const canEdit = order.status === 'submitted' && !!config?.orders_open;
  const locked = order.status === 'confirmed';
  const items = order.items.reduce((n, i) => n + i.quantity, 0);
  const returnLabel = order.return_date ? fmtDayKey(order.return_date) : fmtWindow(order.return_window);

  const stepWhen = (i: number) => {
    if (i === 0) return fmtDateTime(order.created_at);
    if (i === 1 && st.step >= 2) return fmtDateTime(order.decided_at);
    if (i === 4) return `do ${returnLabel}`;
    return '—';
  };

  const cancel = async () => {
    setBusy(true);
    try {
      onChanged(await shopApi.cancel(order.id, order.version));
      setCancelOpen(false);
    } catch (err) {
      setError((err as ShopApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const reorder = () => {
    // Only products still in the catalog; quantities capped at today's limits.
    replace(order.items.flatMap((i) => {
      const p = byId.get(i.product_id);
      return p ? [{ productId: p.id, quantity: p.max_per_order ? Math.min(i.quantity, p.max_per_order) : i.quantity }] : [];
    }));
    setOpen(true);
  };

  return (
    <Paper component="section" aria-label="Szczegóły zamówienia" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3.5 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: 26, fontWeight: 700 }}>{order.number}</Typography>
            <Chip label={st.label} color={st.color} />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
            Złożone {fmtDateTime(order.created_at)} · {items} szt.{order.total != null ? ` · ${fmtMoney(order.total)}` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
          {canEdit && (
            <>
              <Button component={RouterLink} to={`/checkout?edit=${order.id}`} variant="outlined" startIcon={<EditOutlinedIcon />}>Edytuj</Button>
              <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)}>Anuluj zamówienie</Button>
            </>
          )}
          {order.status !== 'submitted' && config?.orders_open && (
            <Button variant="contained" startIcon={<ReplayIcon />} onClick={reorder}>Zamów ponownie</Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {order.status === 'rejected' && (
        <Alert severity="error"><strong>Powód odrzucenia:</strong> {order.status_reason || '—'}</Alert>
      )}
      {locked && (
        <Alert severity="info" icon={<LockOutlinedIcon />}>
          Zamówienie potwierdzone przez magazyn — nie można go już zmienić. Potrzebujesz czegoś więcej? Użyj „Zamów ponownie”.
        </Alert>
      )}

      {st.step > 0 && (
        <Box component="ol" aria-label="Postęp zamówienia" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1 }}>
          {STEPS.map((label, i) => {
            const done = i < st.step;
            return (
              <Box component="li" key={label} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }} aria-current={i === st.step - 1 ? 'step' : undefined}>
                <Box sx={{ height: 6, borderRadius: 999, bgcolor: done ? 'primary.main' : 'action.hover' }} />
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: i === st.step - 1 ? 'text.primary' : done ? 'text.primary' : 'text.secondary' }}>{label}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{stepWhen(i)}</Typography>
              </Box>
            );
          })}
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Miejsce</Typography>
          <Typography sx={{ mt: 0.75 }}>{fmtLocation(order.location)}</Typography>
          {order.location_note && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{order.location_note}</Typography>}
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Termin</Typography>
          <Typography sx={{ mt: 0.75 }}>{fmtWindow(order.delivery_window)}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>zwrot: {returnLabel}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Odbiera</Typography>
          <Typography sx={{ mt: 0.75 }}>{order.contact_name}</Typography>
          {order.budget_owner && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Dział: {order.budget_owner}</Typography>}
        </Paper>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Pozycja</TableCell>
            <TableCell align="right">Ilość</TableCell>
            {order.total != null && <TableCell align="right">Cena</TableCell>}
            {order.total != null && <TableCell align="right">Razem</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {order.items.map((i) => (
            <TableRow key={i.product_id}>
              <TableCell>{i.product_name}</TableCell>
              <TableCell align="right">{i.quantity}</TableCell>
              {order.total != null && <TableCell align="right" sx={{ color: 'text.secondary' }}>{fmtMoney(i.unit_price)}</TableCell>}
              {order.total != null && <TableCell align="right">{i.unit_price != null ? fmtMoney(i.unit_price * i.quantity) : '—'}</TableCell>}
            </TableRow>
          ))}
          {order.total != null && (
            <TableRow>
              <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Razem</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtMoney(order.total)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {order.notes && (
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Uwagi</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{order.notes}</Typography>
        </Box>
      )}

      <Dialog open={cancelOpen} onClose={() => !busy && setCancelOpen(false)}>
        <DialogTitle>Anulować {order.number}?</DialogTitle>
        <DialogContent>
          <DialogContentText>Magazyn nie zrealizuje tego zamówienia. Tego nie da się cofnąć — możesz złożyć nowe.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={busy}>Nie</Button>
          <Button color="error" variant="contained" onClick={cancel} disabled={busy}>Anuluj zamówienie</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const OrdersPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced;
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedId = Number(params.get('order')) || orders[0]?.id || null;
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const load = useCallback(async () => {
    try {
      setError(null);
      setOrders(await shopApi.orders());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ display: 'flex', gap: 3.5, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start' }}>
      <Box component="section" aria-label="Lista zamówień" sx={{ width: { xs: '100%', md: 420 }, flex: 'none', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography component="h1" sx={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 28, mb: 1 }}>Moje zamówienia</Typography>
        {justPlaced && <Alert severity="success">Zamówienie złożone. Magazyn je potwierdzi — status sprawdzisz tutaj.</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {orders.length === 0 && (
          <Typography sx={{ color: 'text.secondary' }}>
            Nie masz jeszcze zamówień. <RouterLink to="/">Przejdź do katalogu</RouterLink>.
          </Typography>
        )}
        {orders.map((o) => {
          const st = organizerStatus(o);
          const active = o.id === selected?.id;
          return (
            <Card key={o.id} variant="outlined" sx={{ borderColor: active ? 'rgba(255,152,0,0.5)' : 'divider', bgcolor: active ? 'background.paper' : 'transparent' }}>
              <CardActionArea onClick={() => setParams({ order: String(o.id) }, { replace: true })} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 700 }}>{o.number}</Typography>
                  <Chip size="small" label={st.label} color={st.color} />
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{fmtLocation(o.location)}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'text.secondary' }}>
                  <span>{fmtOrderDates(o)}</span>
                  <span>{o.total != null ? fmtMoney(o.total) : ''}</span>
                </Box>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
      {selected && (
        <OrderDetail
          key={selected.id}
          order={selected}
          onChanged={(o) => setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)))}
        />
      )}
    </Box>
  );
};

export default OrdersPage;
