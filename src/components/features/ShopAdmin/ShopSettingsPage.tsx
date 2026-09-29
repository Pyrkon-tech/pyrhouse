import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../context/NotificationContext';
import {
  createShopWindowAPI,
  deleteShopWindowAPI,
  getShopSettingsAPI,
  getShopWindowsAPI,
  updateShopSettingsAPI,
  updateShopWindowAPI,
} from '../../../services/shopAdminService';
import type { ShopSettings, ShopWindow, ShopWindowKind } from '../../../types/shop.types';
import ShopAdminTabs from './ShopAdminTabs';
import { dayKey, fmtDayKey, fmtWindow, shopErrorMessage, warsawToISO } from './shopFormat';

const timeOf = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const ShopSettingsPage: React.FC = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  return (
    <Box>
      <ShopAdminTabs active="settings" />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: isAdmin ? 6 : 12 }}>
          <WindowsSection />
        </Grid>
        {isAdmin && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <SettingsSection />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

// ============================================================================
// Delivery and return windows (moderator)
// ============================================================================

const WindowsSection: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [windows, setWindows] = useState<ShopWindow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogKind, setDialogKind] = useState<ShopWindowKind | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setWindows(await getShopWindowsAPI());
    } catch (err) {
      setError(shopErrorMessage(err, 'Nie udało się pobrać okien'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = (kind: ShopWindowKind) => {
    const groups = new Map<string, ShopWindow[]>();
    windows.filter((w) => w.kind === kind).forEach((w) => {
      const k = dayKey(w.starts_at);
      groups.set(k, [...(groups.get(k) ?? []), w]);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  };

  const remove = async (w: ShopWindow) => {
    try {
      await deleteShopWindowAPI(w.id);
      showSuccess('Okno usunięte');
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'window_in_use') {
        // Used by orders: hide it from new orders instead.
        await updateShopWindowAPI(w.id, { kind: w.kind, starts_at: w.starts_at, ends_at: w.ends_at, label: w.label, active: false });
        showSuccess('Okno jest w zamówieniach — ukryłem je dla nowych zamówień');
      } else {
        showError(shopErrorMessage(err, 'Nie udało się usunąć okna'));
      }
    }
    await load();
  };

  const reactivate = async (w: ShopWindow) => {
    try {
      await updateShopWindowAPI(w.id, { kind: w.kind, starts_at: w.starts_at, ends_at: w.ends_at, label: w.label, active: true });
      await load();
    } catch (err) {
      showError(shopErrorMessage(err, 'Nie udało się przywrócić okna'));
    }
  };

  const renderKind = (kind: ShopWindowKind) => {
    const days = byDay(kind);
    if (days.length === 0) {
      return <Typography variant="body2" sx={{ color: 'text.secondary' }}>Brak okien.</Typography>;
    }
    return days.map(([day, list]) => (
      <Box key={day} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{fmtDayKey(day)}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {list.map((w) => (
            <Chip
              key={w.id}
              variant="outlined"
              color={w.active ? 'default' : 'warning'}
              label={
                <span>
                  {timeOf(w.starts_at)}–{timeOf(w.ends_at)}
                  {w.label ? ` · ${w.label}` : ''}
                  <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                    {w.active ? `${w.orders_count ?? 0} zam.` : 'ukryte'}
                  </Typography>
                </span>
              }
              onClick={w.active ? undefined : () => reactivate(w)}
              onDelete={w.active ? () => remove(w) : undefined}
              title={w.active ? undefined : 'Kliknij, aby przywrócić'}
            />
          ))}
        </Box>
      </Box>
    ));
  };

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Okna dostaw</Typography>
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setDialogKind('delivery')}>Dodaj okno</Button>
      </Box>
      {renderKind('delivery')}
      <Divider />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Okna zwrotu{' '}
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>(organizator wybiera jedno)</Typography>
        </Typography>
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setDialogKind('return')}>Dodaj okno</Button>
      </Box>
      {renderKind('return')}

      <WindowDialog
        kind={dialogKind}
        onClose={() => setDialogKind(null)}
        onSaved={async () => {
          setDialogKind(null);
          await load();
        }}
      />
    </Paper>
  );
};

interface WindowDialogProps {
  kind: ShopWindowKind | null;
  onClose: () => void;
  onSaved: () => void;
}

const WindowDialog: React.FC<WindowDialogProps> = ({ kind, onClose, onSaved }) => {
  const { showError, showSuccess } = useNotification();
  const [form, setForm] = useState({ kind: 'delivery' as ShopWindowKind, date: '', from: '16:00', to: '20:00', label: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (kind) setForm((f) => ({ ...f, kind, label: '' }));
  }, [kind]);

  const preview = useMemo(() => {
    if (!form.date || !form.from || !form.to) return null;
    const start = warsawToISO(form.date, form.from);
    let end = warsawToISO(form.date, form.to);
    // "22:00–02:00" crosses midnight
    if (end <= start) end = new Date(new Date(end).getTime() + 24 * 3600 * 1000).toISOString();
    return { start, end };
  }, [form]);

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await createShopWindowAPI({ kind: form.kind, starts_at: preview.start, ends_at: preview.end, label: form.label.trim() });
      showSuccess('Okno dodane');
      onSaved();
    } catch (err) {
      showError(shopErrorMessage(err, 'Nie udało się dodać okna'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={kind !== null} onClose={() => !saving && onClose()} fullWidth maxWidth="xs">
      <DialogTitle>Nowe okno</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <TextField select label="Rodzaj" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ShopWindowKind })}>
          <MenuItem value="delivery">Dostawa</MenuItem>
          <MenuItem value="return">Zwrot</MenuItem>
        </TextField>
        <TextField type="date" label="Dzień" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField type="time" label="Od" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField type="time" label="Do" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        </Box>
        <TextField label="Etykieta (opcjonalnie)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} slotProps={{ htmlInput: { maxLength: 255 } }} />
        {preview && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {fmtWindow({ starts_at: preview.start, ends_at: preview.end })} (czas polski)
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Anuluj</Button>
        <Button variant="contained" onClick={save} disabled={saving || !preview}>Dodaj</Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// Shop settings (admin)
// ============================================================================

/** ISO instant → value for <input type="datetime-local"> in Warsaw time */
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

const SettingsSection: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [closeAt, setCloseAt] = useState('');
  const [domains, setDomains] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getShopSettingsAPI()
      .then((s) => {
        setSettings(s);
        setCloseAt(toLocalInput(s.orders_open_until));
        setDomains(s.auto_domains.join(', '));
      })
      .catch((err) => showError(shopErrorMessage(err, 'Nie udało się pobrać ustawień')));
  }, [showError]);

  const save = async (next: ShopSettings) => {
    setSaving(true);
    try {
      const saved = await updateShopSettingsAPI(next);
      setSettings({ ...saved, auto_domains: saved.auto_domains ?? [] });
      showSuccess('Ustawienia zapisane');
    } catch (err) {
      showError(shopErrorMessage(err, 'Nie udało się zapisać ustawień'));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return null;

  const toggles: { key: 'orders_open' | 'show_prices' | 'domain_auto_join'; title: string; desc: string }[] = [
    { key: 'orders_open', title: 'Przyjmowanie zamówień', desc: 'Wyłączone = organizatorzy widzą katalog i swoje zamówienia, ale nie złożą ani nie zmienią zamówienia.' },
    { key: 'show_prices', title: 'Pokazuj ceny organizatorom', desc: 'Wyłączone = API sklepu nie zwraca cen ani sum, koszyk pokazuje tylko ilości.' },
    {
      key: 'domain_auto_join',
      title: 'Automatyczny dostęp dla domeny',
      desc: 'Wyłączone = nowe osoby wchodzą tylko z allowlisty i zaproszeń. Nie blokuje kont, które już istnieją — konkretną osobę blokujesz w Dostępach.',
    },
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Ustawienia sklepu{' '}
        <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>· tylko admin</Typography>
      </Typography>
      {toggles.map((t) => (
        <Box key={t.key} sx={{ py: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
          <Box>
            <Typography>{t.title}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t.desc}</Typography>
          </Box>
          <Switch
            checked={settings[t.key]}
            disabled={saving}
            onChange={(e) => save({ ...settings, [t.key]: e.target.checked })}
            slotProps={{ input: { 'aria-label': t.title } }}
          />
        </Box>
      ))}
      <Box sx={{ py: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography>Zamówienia przyjmowane do</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Po tej chwili sklep działa tylko do podglądu. Puste = bez terminu.</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            type="datetime-local"
            size="small"
            value={closeAt}
            onChange={(e) => setCloseAt(e.target.value)}
            slotProps={{ htmlInput: { 'aria-label': 'Data zamknięcia zamówień' } }}
          />
          <Button
            variant="outlined"
            disabled={saving}
            onClick={() => {
              const [d, t] = closeAt.split('T');
              save({ ...settings, orders_open_until: closeAt ? warsawToISO(d, t) : null });
            }}
          >
            Zapisz
          </Button>
        </Box>
      </Box>
      <Box sx={{ py: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography>Domeny z automatycznym dostępem</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Google Workspace, po przecinku. Weryfikowane po domenie konta Google (hd), nie po końcówce adresu.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" fullWidth value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="pyrkon.pl" />
          <Button
            variant="outlined"
            disabled={saving}
            onClick={() => save({ ...settings, auto_domains: domains.split(',').map((d) => d.trim()).filter(Boolean) })}
          >
            Zapisz
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default ShopSettingsPage;
