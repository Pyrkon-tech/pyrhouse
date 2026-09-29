import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Link,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ShopApiError, shopApi } from '../api';
import { useCart, type CartLine } from '../Cart';
import { useCatalog } from '../Catalog';
import { useShopSession } from '../ShopSession';
import QuantityStepper from '../QuantityStepper';
import { dayKey, fmtDayKey, fmtMoney, fmtWindow } from '../../utils/shopFormat';
import type { ShopLocation, ShopOrder, ShopWindow } from '../../types/shop.types';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Typography component="h2" sx={{ fontSize: 18, fontWeight: 500, display: 'flex', gap: 1.25, alignItems: 'center' }}>
      <Box sx={{ color: 'primary.light', display: 'flex' }}>{icon}</Box>
      {title}
    </Typography>
    {children}
  </Paper>
);

/** Calendar days (Warsaw) a window touches — a night return window may end the next day. */
const windowDays = (w: ShopWindow): string[] => {
  const days: string[] = [];
  const last = dayKey(w.ends_at);
  for (let t = new Date(w.starts_at).getTime(); days.length < 8; t += 86400000) {
    const d = dayKey(new Date(t).toISOString());
    if (!days.includes(d)) days.push(d);
    if (d >= last) break;
  }
  return days;
};

const daysBetween = (fromIso: string, toIso: string) =>
  Math.max(1, Math.round((new Date(`${dayKey(toIso)}T12:00:00Z`).getTime() - new Date(`${dayKey(fromIso)}T12:00:00Z`).getTime()) / 86400000) + 1);

const newIdempotencyKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const CheckoutPage: React.FC = () => {
  const [params] = useSearchParams();
  const editId = Number(params.get('edit')) || null;
  const navigate = useNavigate();
  const { account, config } = useShopSession();
  const cart = useCart();
  const { byId } = useCatalog();

  const [locations, setLocations] = useState<ShopLocation[]>([]);
  const [windows, setWindows] = useState<ShopWindow[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [editing, setEditing] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const [lines, setLines] = useState<CartLine[]>(editId ? [] : cart.lines);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [locationNote, setLocationNote] = useState('');
  const [deliveryId, setDeliveryId] = useState<number | null>(null);
  const [returnId, setReturnId] = useState<number | ''>('');
  const [returnDate, setReturnDate] = useState('');
  const [contactName, setContactName] = useState(account?.display_name ?? '');
  const [budgetOwner, setBudgetOwner] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(newIdempotencyKey());

  useEffect(() => {
    Promise.all([
      shopApi.locations(),
      shopApi.windows(),
      shopApi.budgetOwners().catch(() => [] as string[]),
      editId ? shopApi.order(editId) : Promise.resolve(null),
    ])
      .then(([locs, wins, own, order]) => {
        setLocations(locs);
        setWindows(wins);
        setOwners(own);
        if (order) {
          setEditing(order);
          setLines(order.items.map((i) => ({ productId: i.product_id, quantity: i.quantity })));
          setLocationId(order.location.id);
          setLocationNote(order.location_note ?? '');
          setDeliveryId(order.delivery_window.id);
          setReturnId(order.return_window.id);
          setReturnDate(order.return_date ?? '');
          setContactName(order.contact_name);
          setBudgetOwner(order.budget_owner ?? '');
          setNotes(order.notes ?? '');
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [editId]);

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => (a.pavilion ?? '~').localeCompare(b.pavilion ?? '~', 'pl', { numeric: true }) || a.name.localeCompare(b.name, 'pl')),
    [locations],
  );

  const now = Date.now();
  const deliveryWindows = windows.filter((w) => w.kind === 'delivery' && new Date(w.starts_at).getTime() > now);
  const delivery = windows.find((w) => w.id === deliveryId) ?? null;
  const returnWindows = windows.filter((w) => w.kind === 'return' && (!delivery || w.starts_at >= delivery.ends_at));
  const ret = windows.find((w) => w.id === returnId) ?? null;
  const returnDays = useMemo(() => (ret ? windowDays(ret) : []), [ret]);

  // Picking another delivery window can invalidate the chosen return window.
  useEffect(() => {
    if (ret && delivery && ret.starts_at < delivery.ends_at) setReturnId('');
  }, [ret, delivery]);
  useEffect(() => {
    if (returnDate && !returnDays.includes(returnDate)) setReturnDate('');
  }, [returnDate, returnDays]);

  const deliveryByDay = useMemo(() => {
    const groups = new Map<string, ShopWindow[]>();
    deliveryWindows.forEach((w) => groups.set(dayKey(w.starts_at), [...(groups.get(dayKey(w.starts_at)) ?? []), w]));
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [deliveryWindows]);

  const rows = lines.flatMap((l) => {
    const p = byId.get(l.productId);
    return p ? [{ line: l, product: p }] : [];
  });
  const showPrices = !!config?.show_prices;
  const total = rows.reduce((s, r) => s + (r.product.price ?? 0) * r.line.quantity, 0);

  const setLineQty = (productId: number, quantity: number) => {
    const next = quantity > 0
      ? lines.map((l) => (l.productId === productId ? { ...l, quantity } : l))
      : lines.filter((l) => l.productId !== productId);
    setLines(next);
    if (!editId) cart.setQuantity(productId, quantity);
  };

  const missing: string[] = [];
  if (rows.length === 0) missing.push('co najmniej jedną pozycję');
  if (!locationId) missing.push('salę');
  if (!delivery) missing.push('okno dostawy');
  if (!ret) missing.push('okno zwrotu');

  const submit = async () => {
    if (missing.length || !locationId || !delivery || !ret) return;
    setSubmitting(true);
    setError(null);
    const input = {
      location_id: locationId,
      location_note: locationNote.trim() || null,
      contact_name: contactName.trim(),
      budget_owner: budgetOwner.trim() || null,
      delivery_window_id: delivery.id,
      return_window_id: ret.id,
      return_date: returnDate || null,
      notes: notes.trim() || null,
      items: rows.map((r) => ({ product_id: r.product.id, quantity: r.line.quantity })),
    };
    try {
      const saved = editing
        ? await shopApi.update(editing.id, { ...input, version: editing.version })
        : await shopApi.submit(input, idempotencyKey.current);
      if (!editing) cart.clear();
      navigate(`/orders?order=${saved.id}`, { replace: true, state: { justPlaced: !editing } });
    } catch (err) {
      const e = err as ShopApiError;
      setError(e.code === 'version_conflict'
        ? 'Zamówienie zmieniło się w międzyczasie (np. poprawił je magazyn). Wróć do zamówień i otwórz edycję jeszcze raz.'
        : e.message);
      setSubmitting(false);
    }
  };

  if (!config) return null;
  if (!config.orders_open) {
    return <Alert severity="info">Przyjmowanie zamówień jest zamknięte. Swoje zamówienia sprawdzisz w zakładce „Moje zamówienia”.</Alert>;
  }
  if (!loading && !editId && cart.lines.length === 0 && lines.length === 0) return <Navigate to="/" replace />;
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (editId && editing && editing.status !== 'submitted') {
    return <Alert severity="info">To zamówienie jest już {editing.status === 'confirmed' ? 'potwierdzone' : 'zamknięte'} — nie można go edytować.</Alert>;
  }

  return (
    <Box>
      <Link component={RouterLink} to={editing ? `/orders?order=${editing.id}` : '/'} onClick={editing ? undefined : (e) => { e.preventDefault(); cart.setOpen(true); }}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 14, mb: 1 }}>
        <ArrowBackIcon fontSize="small" /> {editing ? 'Wróć do zamówienia' : 'Wróć do koszyka'}
      </Link>
      <Typography component="h1" sx={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 32, mb: 2.5 }}>
        {editing ? `Edycja ${editing.number}` : 'Składanie zamówienia'}
      </Typography>

      <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}
        sx={{ display: 'flex', gap: 3.5, alignItems: 'flex-start', flexDirection: { xs: 'column', lg: 'row' } }}>
        <Box sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Section icon={<PlaceOutlinedIcon />} title="Miejsce dostawy">
            <Autocomplete
              options={sortedLocations}
              groupBy={(l) => (l.pavilion ? `Pawilon ${l.pavilion}` : 'Inne')}
              getOptionLabel={(l) => l.name}
              value={sortedLocations.find((l) => l.id === locationId) ?? null}
              onChange={(_, v) => setLocationId(v?.id ?? null)}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(p) => <TextField {...p} label="Sala / lokalizacja" required />}
            />
            <TextField
              label="Doprecyzowanie (opcjonalnie)"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              helperText="Magazyn może poprawić lokalizację, jeśli wybierzesz niewłaściwą — zobaczysz to w szczegółach zamówienia."
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
          </Section>

          <Section icon={<EventOutlinedIcon />} title="Termin">
            <Box component="fieldset" sx={{ border: 0, m: 0, p: 0 }}>
              <Typography component="legend" variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Dostawa — wybierz okno</Typography>
              {deliveryByDay.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Brak dostępnych okien dostawy.</Typography>}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
                {deliveryByDay.map(([day, list]) => (
                  <Box key={day} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{fmtDayKey(day)}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {list.map((w) => (
                        <ToggleButton key={w.id} value={w.id} size="small" selected={deliveryId === w.id} onChange={() => setDeliveryId(w.id)}
                          sx={{ borderRadius: '10px', px: 1.75, textTransform: 'none' }}>
                          {fmtWindow(w).split(' · ')[1]}{w.label ? ` · ${w.label}` : ''}
                        </ToggleButton>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField select required label="Zwrot — okno odbioru sprzętu" value={returnId} onChange={(e) => setReturnId(Number(e.target.value))}
                helperText={delivery ? undefined : 'Najpierw wybierz okno dostawy'} disabled={!delivery}>
                {returnWindows.map((w) => <MenuItem key={w.id} value={w.id}>{fmtWindow(w)}{w.label ? ` · ${w.label}` : ''}</MenuItem>)}
              </TextField>
              {returnDays.length > 1 && (
                <TextField select label="Dokładny dzień zwrotu (opcjonalnie)" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}>
                  <MenuItem value="">Bez wskazania</MenuItem>
                  {returnDays.map((d) => <MenuItem key={d} value={d}>{fmtDayKey(d)}</MenuItem>)}
                </TextField>
              )}
            </Box>
            {delivery && ret && (
              <Alert severity="info" icon={<LocalShippingOutlinedIcon />}>
                Sprzęt u Ciebie: <strong>{fmtWindow(delivery)} → {fmtWindow(ret)}</strong> ({daysBetween(delivery.starts_at, ret.ends_at)} dni)
              </Alert>
            )}
          </Section>

          <Section icon={<PersonOutlineIcon />} title="Kontakt i uwagi">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label="Osoba odbierająca" value={contactName} onChange={(e) => setContactName(e.target.value)}
                helperText="Puste = Twoje imię i nazwisko z konta Google" slotProps={{ htmlInput: { maxLength: 255 } }} />
              <Autocomplete freeSolo options={owners} inputValue={budgetOwner} onInputChange={(_, v) => setBudgetOwner(v)}
                renderInput={(p) => <TextField {...p} label="Dział (opcjonalnie)" />} />
            </Box>
            <TextField label="Uwagi dla magazynu" multiline minRows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 4000 } }} />
          </Section>
        </Box>

        <Paper component="aside" sx={{ width: { xs: '100%', lg: 400 }, flex: 'none', p: 3, display: 'flex', flexDirection: 'column', gap: 2, position: { lg: 'sticky' }, top: { lg: 96 } }}>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 500 }}>Podsumowanie</Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {rows.map(({ line, product }) => (
              <Box component="li" key={product.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, fontSize: 14 }}>
                  <span>{product.name}</span>
                  {showPrices && product.price != null && <span>{fmtMoney(product.price * line.quantity)}</span>}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <QuantityStepper size="small" label={product.name} value={line.quantity} min={1} max={product.max_per_order} onChange={(q) => setLineQty(product.id, q)} />
                  <IconButton size="small" onClick={() => setLineQty(product.id, 0)} aria-label={`Usuń: ${product.name}`} sx={{ ml: 'auto' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
          {showPrices && (
            <>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography sx={{ color: 'text.secondary' }}>Razem</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{fmtMoney(total)}</Typography>
              </Box>
            </>
          )}
          <Alert severity="warning" icon={false}>
            Do potwierdzenia przez magazyn możesz zamówienie edytować lub anulować. Po potwierdzeniu jest zablokowane — zmiany
            złożysz jako nowe zamówienie.
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          {missing.length > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Brakuje: {missing.join(', ')}.</Typography>
          )}
          <Button type="submit" variant="contained" size="large" disabled={submitting || missing.length > 0} sx={{ height: 48 }}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : editing ? 'Zapisz zmiany' : 'Złóż zamówienie'}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default CheckoutPage;
