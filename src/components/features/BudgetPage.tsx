import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Alert,
  CircularProgress,
  Drawer,
  IconButton,
  TextField,
  Tooltip,
  Divider,
  SelectChangeEvent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../ui/Button';
import {
  getBudgetAPI,
  getBudgetPersonsAPI,
  getSuppliersAPI,
  getPricesAPI,
  upsertPriceAPI,
  deletePriceAPI,
  syncPricesAPI,
} from '../../services/budgetService';
import type { BudgetSummary, PriceListItem, UpsertPriceRequest } from '../../types/budget.types';
import { ApiError } from '../../services/apiClient';

const SUPPLIER_PALETTE = ['#7C3AED', '#2563EB', '#16A34A', '#D97706', '#0891B2', '#DC2626'];

const getSupplierColor = (suppliers: string[], name: string): string => {
  const idx = suppliers.indexOf(name);
  return SUPPLIER_PALETTE[Math.max(idx, 0) % SUPPLIER_PALETTE.length];
};

const fmtMoney = (val: number, vat: boolean): string =>
  `${(val * (vat ? 1.23 : 1)).toLocaleString('pl-PL')} zł`;

// ── Summary card ─────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  color?: string;
  accent?: string;
}> = ({ label, value, sub, color, accent }) => (
  <Paper sx={{
    p: 2.5,
    flex: 1,
    minWidth: 150,
    borderTop: '3px solid',
    borderColor: accent ?? 'divider',
    position: 'relative',
    overflow: 'hidden',
    '&::after': accent ? {
      content: '""',
      position: 'absolute',
      top: 0, right: 0,
      width: 80, height: 80,
      background: `radial-gradient(circle at top right, ${accent}18, transparent 70%)`,
      pointerEvents: 'none',
    } : {},
  }}>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.1em' }}>
      {label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 800, color: color ?? 'text.primary', my: 0.75, lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{sub}</Typography>
  </Paper>
);

// ── Price list drawer ─────────────────────────────────────────────────────────

type EditingState = {
  item_name: string;
  supplier: string;
  unit_price: number | '';
  isNew: boolean;
};

const PriceDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  prices: PriceListItem[];
  suppliers: string[];
  onSaved: () => void;
  onSynced: () => void;
}> = ({ open, onClose, prices, suppliers, onSaved, onSynced }) => {
  const { showSuccess, showError } = useNotification();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const openAdd = () =>
    setEditing({ item_name: '', supplier: suppliers[0] ?? '', unit_price: '', isNew: true });

  const openEdit = (p: PriceListItem) =>
    setEditing({ item_name: p.item_name, supplier: p.supplier, unit_price: p.unit_price, isNew: false });

  const handleSave = async () => {
    if (!editing || editing.unit_price === '') return;
    setSaving(true);
    try {
      const payload: UpsertPriceRequest = {
        item_name: editing.item_name.trim(),
        supplier: editing.supplier.trim(),
        unit_price: Number(editing.unit_price),
      };
      await upsertPriceAPI(payload);
      showSuccess('Cena zapisana');
      setEditing(null);
      onSaved();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Błąd zapisu ceny');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemName: string, supplier: string) => {
    try {
      await deletePriceAPI(itemName, supplier);
      showSuccess('Cena usunięta');
      onSaved();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Błąd usuwania ceny');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncPricesAPI();
      showSuccess(`Zsynchronizowano ${res.updated} cen z arkusza Cennik`);
      onSynced();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Błąd synchronizacji');
    } finally {
      setSyncing(false);
    }
  };

  // Group by item_name for display
  const grouped = prices.reduce<Record<string, PriceListItem[]>>((acc, p) => {
    (acc[p.item_name] ??= []).push(p);
    return acc;
  }, {});
  const sortedItems = Object.keys(grouped).sort();

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 540 }, p: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Cennik</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button variant="outline" onClick={handleSync} disabled={syncing} style={{ flex: 1 }}>
          {syncing ? <CircularProgress size={16} sx={{ mr: 1 }} /> : <SyncIcon sx={{ mr: 1, fontSize: 18 }} />}
          Synchronizuj z arkusza
        </Button>
        <Button variant="outline" onClick={openAdd} style={{ flex: 1 }}>
          <AddIcon sx={{ mr: 1, fontSize: 18 }} />
          Dodaj cenę
        </Button>
      </Box>

      {editing && (
        <Paper sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'primary.main' }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            {editing.isNew ? 'Nowa cena' : `Edycja: ${editing.item_name} — ${editing.supplier}`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {editing.isNew && (
              <>
                <TextField
                  label="Przedmiot"
                  size="small"
                  value={editing.item_name}
                  onChange={e => setEditing(prev => prev && ({ ...prev, item_name: e.target.value }))}
                  sx={{ flex: '1 1 160px' }}
                />
                <TextField
                  label="Dostawca"
                  size="small"
                  value={editing.supplier}
                  onChange={e => setEditing(prev => prev && ({ ...prev, supplier: e.target.value }))}
                  sx={{ flex: '1 1 120px' }}
                  placeholder="np. Probis"
                />
              </>
            )}
            <TextField
              label="Cena / szt (netto)"
              size="small"
              type="number"
              value={editing.unit_price}
              onChange={e => setEditing(prev => prev && ({ ...prev, unit_price: e.target.value === '' ? '' : Number(e.target.value) }))}
              sx={{ flex: '1 1 120px' }}
              inputProps={{ min: 0, step: 1 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <Button variant="primary" onClick={handleSave} disabled={saving || editing.unit_price === '' || !editing.item_name || !editing.supplier}>
              Zapisz
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Anuluj</Button>
          </Box>
        </Paper>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Przedmiot</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Dostawca</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Cena / szt</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map(itemName =>
              grouped[itemName]
                .sort((a, b) => a.supplier.localeCompare(b.supplier))
                .map((p, i) => {
                  const color = getSupplierColor(suppliers, p.supplier);
                  return (
                    <TableRow key={`${p.item_name}-${p.supplier}`} hover>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        {i === 0 ? p.item_name : ''}
                      </TableCell>
                      <TableCell>
                        <Chip label={p.supplier} size="small" sx={{ bgcolor: `${color}22`, color, fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color }}>
                        {p.unit_price} zł
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Edytuj">
                          <IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Usuń">
                          <IconButton size="small" color="error" onClick={() => handleDelete(p.item_name, p.supplier)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
            {prices.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                  Brak cen — dodaj ręcznie lub synchronizuj z arkusza
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Drawer>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const BudgetPage: React.FC = () => {
  const { showError } = useNotification();

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [persons, setPersons] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [prices, setPrices] = useState<PriceListItem[]>([]);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [vatEnabled, setVatEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'comparison'>('orders');
  const [mobileSupplier, setMobileSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [priceDrawerOpen, setPriceDrawerOpen] = useState(false);

  const fetchBudget = useCallback(async () => {
    try {
      const data = await getBudgetAPI(selectedPerson || undefined, vatEnabled || undefined);
      setSummary(data);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Błąd pobierania budżetu');
    }
  }, [selectedPerson, vatEnabled, showError]);

  const fetchPrices = useCallback(async () => {
    try {
      const data = await getPricesAPI();
      setPrices(data.prices);
    } catch {
      // non-critical
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await getSuppliersAPI();
      setSuppliers(data.suppliers);
      setMobileSupplier(prev => prev || data.suppliers[0] || '');
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [suppliersData, personsData] = await Promise.all([
          getSuppliersAPI(),
          getBudgetPersonsAPI(),
          fetchBudget(),
          fetchPrices(),
        ]);
        setSuppliers(suppliersData.suppliers);
        setMobileSupplier(suppliersData.suppliers[0] ?? '');
        setPersons(personsData.persons);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading) fetchBudget();
  }, [selectedPerson, vatEnabled]);

  const handlePricesSaved = () => {
    fetchPrices();
    fetchBudget();
  };

  const handleSynced = () => {
    fetchSuppliers();
    fetchPrices();
    fetchBudget();
  };

  const handleExportCSV = useCallback(() => {
    if (!summary) return;
    const mul = vatEnabled ? 1.23 : 1;
    const vatLabel = vatEnabled ? 'brutto' : 'netto';

    const supplierHeaders = summary.supplier_totals.flatMap(st => [
      `${st.supplier}/szt (${vatLabel})`,
      `${st.supplier} razem (${vatLabel})`,
    ]);
    const header = ['Przedmiot', 'Ilość', ...supplierHeaders];

    const rows = summary.items.map(item => {
      const cells = summary.supplier_totals.flatMap(st => {
        const p = item.prices.find(pp => pp.supplier === st.supplier);
        return [
          p ? String(Math.round(p.unit_price * mul)) : 'brak',
          p ? String(Math.round(p.total * mul)) : '—',
        ];
      });
      return [item.item_name, String(item.quantity), ...cells];
    });

    const sumaRow = ['SUMA', String(summary.total_quantity),
      ...summary.supplier_totals.flatMap(st => ['', String(Math.round(st.total * mul))]),
    ];

    const csv = [header, ...rows, sumaRow]
      .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budzet_${selectedPerson ? selectedPerson.replace(/\s+/g, '_') : 'wszyscy'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [summary, vatEnabled, selectedPerson]);

  const vatLabel = vatEnabled ? 'brutto' : 'netto';

  // Comparison helpers
  const sortedByTotal = summary
    ? [...summary.supplier_totals].sort((a, b) => a.total - b.total)
    : [];
  const cheapest = sortedByTotal[0];
  const mostExpensive = sortedByTotal[sortedByTotal.length - 1];
  const savings = cheapest && mostExpensive ? mostExpensive.total - cheapest.total : 0;
  const savingsPct = mostExpensive?.total > 0
    ? Math.round((savings / mostExpensive.total) * 100)
    : 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Zapotrzebowanie techniczne</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Wybierz osobę odpowiedzialną za budżet — zobaczysz jej zamówienia i wyceny od dostawców.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button variant="outline" onClick={handleExportCSV} disabled={!summary}>
            <span style={{ marginRight: 6, fontSize: 15 }}>⬇</span>
            Eksportuj CSV
          </Button>
          <Button variant="outline" onClick={() => setPriceDrawerOpen(true)}>
            <PriceChangeIcon sx={{ mr: 1, fontSize: 18 }} />
            Cennik
          </Button>
        </Box>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 240, flex: 1 }}>
          <InputLabel id="person-label">Osoba odpowiedzialna za budżet</InputLabel>
          <Select
            labelId="person-label"
            label="Osoba odpowiedzialna za budżet"
            value={selectedPerson}
            onChange={(e: SelectChangeEvent) => setSelectedPerson(e.target.value)}
          >
            <MenuItem value="">— Wszyscy —</MenuItem>
            {persons.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Checkbox size="small" checked={vatEnabled} onChange={e => setVatEnabled(e.target.checked)} />}
          label={<Typography variant="body2">Ceny brutto (z 23% VAT)</Typography>}
        />

        <ToggleButtonGroup
          value={activeTab}
          exclusive
          size="small"
          onChange={(_, v) => v && setActiveTab(v)}
          sx={{ ml: { xs: 0, sm: 'auto' } }}
        >
          <ToggleButton value="orders" sx={{ px: 2 }}>Zamówienia</ToggleButton>
          <ToggleButton value="comparison" sx={{ px: 2 }}>Porównanie dostawców</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

      {!loading && summary && (
        <>
          {/* Summary cards */}
          {(() => {
            const grandTotal = summary.supplier_totals.reduce((acc, st) => acc + st.total, 0);
            return (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <SummaryCard
                  label="Kwota całkowita"
                  value={fmtMoney(grandTotal, vatEnabled)}
                  sub={`${vatLabel} — suma od wszystkich dostawców`}
                  color="#ff9800"
                  accent="#ff9800"
                />
                <SummaryCard
                  label="Pozycje"
                  value={summary.total_positions.toString()}
                  sub={`${summary.total_quantity} szt. łącznie`}
                  accent="divider"
                />
                <SummaryCard
                  label="Bez wyceny"
                  value={summary.unpriced_count.toString()}
                  sub="pozycji"
                  accent={summary.unpriced_count > 0 ? '#ef4444' : undefined}
                  color={summary.unpriced_count > 0 ? '#ef4444' : undefined}
                />
              </Box>
            );
          })()}

          {/* Tab: Zamówienia */}
          {activeTab === 'orders' && (
            <>
              {/* Mobile supplier toggle */}
              {suppliers.length > 1 && (
                <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  {suppliers.map((s, idx) => {
                    const color = SUPPLIER_PALETTE[idx % SUPPLIER_PALETTE.length];
                    const active = mobileSupplier === s;
                    return (
                      <Chip
                        key={s}
                        label={s}
                        clickable
                        onClick={() => setMobileSupplier(s)}
                        sx={{ bgcolor: active ? color : undefined, color: active ? '#fff' : color, borderColor: color, border: '1px solid' }}
                      />
                    );
                  })}
                </Box>
              )}

              <Paper sx={{ mb: 3 }}>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.default' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Przedmiot</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Ilość</TableCell>
                        {suppliers.map((s, idx) => {
                          const color = SUPPLIER_PALETTE[idx % SUPPLIER_PALETTE.length];
                          const visible = { xs: mobileSupplier === s ? 'table-cell' : 'none', md: 'table-cell' };
                          return [
                            <TableCell key={`${s}-unit`} align="right" sx={{ fontWeight: 700, color, display: visible }}>
                              {s} / szt
                            </TableCell>,
                            <TableCell key={`${s}-total`} align="right" sx={{ fontWeight: 700, color, display: visible }}>
                              {s} razem
                            </TableCell>,
                          ];
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.items.map(item => (
                        <TableRow key={item.item_name} hover>
                          <TableCell sx={{ fontWeight: item.prices.length > 0 ? 600 : 400 }}>
                            {item.item_name}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={item.quantity} size="small" variant="outlined" />
                          </TableCell>
                          {suppliers.map((s, idx) => {
                            const color = SUPPLIER_PALETTE[idx % SUPPLIER_PALETTE.length];
                            const visible = { xs: mobileSupplier === s ? 'table-cell' : 'none', md: 'table-cell' };
                            const p = item.prices.find(pp => pp.supplier === s);
                            return [
                              <TableCell key={`${s}-unit`} align="right" sx={{ color: p ? 'text.primary' : 'text.disabled', display: visible }}>
                                {p ? fmtMoney(p.unit_price, vatEnabled) : 'brak'}
                              </TableCell>,
                              <TableCell key={`${s}-total`} align="right" sx={{ color: p ? color : 'text.disabled', fontWeight: p ? 600 : 400, display: visible }}>
                                {p ? fmtMoney(p.total, vatEnabled) : '—'}
                              </TableCell>,
                            ];
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableBody>
                      <TableRow sx={{ bgcolor: 'background.default' }}>
                        <TableCell colSpan={2} sx={{ fontWeight: 700 }}>SUMA</TableCell>
                        {suppliers.map((s, idx) => {
                          const color = SUPPLIER_PALETTE[idx % SUPPLIER_PALETTE.length];
                          const visible = { xs: mobileSupplier === s ? 'table-cell' : 'none', md: 'table-cell' };
                          const st = summary.supplier_totals.find(t => t.supplier === s);
                          return [
                            <TableCell key={`${s}-unit`} sx={{ display: visible }} />,
                            <TableCell key={`${s}-total`} align="right" sx={{ fontWeight: 700, color, display: visible }}>
                              {st ? fmtMoney(st.total, vatEnabled) : '—'}
                              <Typography variant="caption" color="text.secondary" display="block">{vatLabel}</Typography>
                            </TableCell>,
                          ];
                        })}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}

          {/* Tab: Porównanie dostawców */}
          {activeTab === 'comparison' && (
            <>
              {sortedByTotal.length >= 2 && savings > 0 && (
                <Alert severity="success" sx={{ mb: 3 }} icon={<span>✅</span>}>
                  <Typography variant="body2" fontWeight={600}>
                    Tańszy dostawca: {cheapest.supplier}
                  </Typography>
                  <Typography variant="body2">
                    Oszczędność: ~{savings.toLocaleString('pl-PL')} zł {vatLabel} vs {mostExpensive.supplier} (ok. {savingsPct}% mniej)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ⚠ Szacunek — uwzględnia tylko pozycje z ceną u danego dostawcy.
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {summary.supplier_totals.map((st, idx) => {
                  const color = SUPPLIER_PALETTE[idx % SUPPLIER_PALETTE.length];
                  const items = summary.items
                    .map(i => ({ name: i.item_name, qty: i.quantity, price: i.prices.find(pp => pp.supplier === st.supplier) }))
                    .filter(i => i.price != null);
                  return (
                    <Box key={st.supplier} sx={{ flex: '1 1 260px', minWidth: 0 }}>
                      <Paper sx={{ p: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" fontWeight={700} sx={{ color }}>
                            📦 {st.supplier}
                          </Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ color }}>
                            {fmtMoney(st.total, vatEnabled)}
                          </Typography>
                        </Box>
                        <Divider sx={{ mb: 1.5 }} />
                        {items.map(item => (
                          <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography variant="body2">{item.name} × {item.qty}</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color }}>
                              {fmtMoney(item.price!.total, vatEnabled)}
                            </Typography>
                          </Box>
                        ))}
                        {items.length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Brak wycen
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}
        </>
      )}

      <PriceDrawer
        open={priceDrawerOpen}
        onClose={() => setPriceDrawerOpen(false)}
        prices={prices}
        suppliers={suppliers}
        onSaved={handlePricesSaved}
        onSynced={handleSynced}
      />
    </Box>
  );
};

export default BudgetPage;
