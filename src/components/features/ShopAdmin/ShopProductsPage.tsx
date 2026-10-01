import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Link,
  Paper,
  Switch,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink } from 'react-router-dom';
import { DataTable, DataTableEmptyRow, DataTableLoadingRow } from '../../ui';
import { useNotification } from '../../../context/NotificationContext';
import { useCategories } from '../../../hooks/useCategories';
import { createShopProductAPI, getShopProductsAPI, updateShopProductAPI } from '../../../services/shopAdminService';
import type { ShopProduct, ShopProductInput } from '@pyrhouse/api';
import ShopAdminTabs from './ShopAdminTabs';
import { fmtMoney, shopErrorMessage } from './shopFormat';

interface FormState {
  name: string;
  description: string;
  section: string;
  sortOrder: string;
  categoryId: number | null;
  price: string;
  maxPerOrder: string;
  imageUrl: string;
  active: boolean;
}

const emptyForm: FormState = {
  name: '', description: '', section: '', sortOrder: '0', categoryId: null,
  price: '', maxPerOrder: '', imageUrl: '', active: true,
};

const toForm = (p: ShopProduct): FormState => ({
  name: p.name,
  description: p.description ?? '',
  section: p.section,
  sortOrder: String(p.sort_order),
  categoryId: p.category_id,
  price: p.price == null ? '' : String(p.price).replace('.', ','),
  maxPerOrder: p.max_per_order == null ? '' : String(p.max_per_order),
  imageUrl: p.image_url ?? '',
  active: p.active,
});

const toInput = (p: ShopProduct): ShopProductInput => ({
  name: p.name,
  description: p.description,
  image_url: p.image_url,
  section: p.section,
  sort_order: p.sort_order,
  category_id: p.category_id,
  price: p.price,
  max_per_order: p.max_per_order,
  active: p.active,
});

/** "180,00 zł" / "180.5" → 180.5; empty → null; garbage → NaN */
const parsePrice = (raw: string): number | null => {
  const v = raw.replace(/\s|zł/gi, '').replace(',', '.');
  return v === '' ? null : Number(v);
};

const ShopProductsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const { categories } = useCategories();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ShopProduct | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setProducts(await getShopProductsAPI());
    } catch (err) {
      setError(shopErrorMessage(err, 'Nie udało się pobrać produktów'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.label.localeCompare(b.label)), [categories]);
  const sections = useMemo(() => [...new Set(products.map((p) => p.section).filter(Boolean))].sort(), [products]);

  const openNew = () => {
    setEditing('new');
    setForm(emptyForm);
  };
  const openEdit = (p: ShopProduct) => {
    setEditing(p);
    setForm(toForm(p));
  };
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const price = parsePrice(form.price);
    const max = form.maxPerOrder.trim() === '' ? null : Number(form.maxPerOrder);
    if (!form.name.trim() || form.categoryId == null) {
      showError('Podaj nazwę i kategorię sprzętu');
      return;
    }
    if (price != null && (Number.isNaN(price) || price < 0)) {
      showError('Nieprawidłowa cena');
      return;
    }
    if (max != null && (!Number.isInteger(max) || max <= 0)) {
      showError('Limit musi być dodatnią liczbą całkowitą');
      return;
    }
    const payload: ShopProductInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: form.imageUrl.trim() || null,
      section: form.section.trim(),
      sort_order: Number(form.sortOrder) || 0,
      category_id: form.categoryId,
      price,
      max_per_order: max,
      active: form.active,
    };
    setSaving(true);
    try {
      const saved = editing === 'new' || editing == null
        ? await createShopProductAPI(payload)
        : await updateShopProductAPI(editing.id, payload);
      showSuccess('Produkt zapisany');
      await load();
      setEditing(saved);
      setForm(toForm(saved));
    } catch (err) {
      showError(shopErrorMessage(err, 'Nie udało się zapisać produktu'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: ShopProduct) => {
    try {
      await updateShopProductAPI(p.id, { ...toInput(p), active: !p.active });
      await load();
    } catch (err) {
      showError(shopErrorMessage(err, 'Nie udało się zmienić widoczności'));
    }
  };

  return (
    <Box>
      <ShopAdminTabs active="products" />

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Dodaj produkt</Button>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell>Produkt</TableCell>
                <TableCell>Sekcja</TableCell>
                <TableCell>Kategoria sprzętu</TableCell>
                <TableCell align="right">Cena</TableCell>
                <TableCell align="right">Limit</TableCell>
                <TableCell>Widoczny</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <DataTableLoadingRow colSpan={6} />
              ) : products.length === 0 ? (
                <DataTableEmptyRow colSpan={6} message="Brak produktów — dodaj pierwszy" />
              ) : (
                products.map((p) => (
                  <TableRow
                    key={p.id}
                    hover
                    selected={editing !== 'new' && editing?.id === p.id}
                    onClick={() => openEdit(p)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ color: p.active ? 'text.primary' : 'text.secondary' }}>{p.name}</TableCell>
                    <TableCell>{p.section || '—'}</TableCell>
                    <TableCell>{p.category_name ? <Chip size="small" color="secondary" variant="outlined" label={p.category_name} /> : `#${p.category_id}`}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{fmtMoney(p.price)}</TableCell>
                    <TableCell align="right">{p.max_per_order ?? '—'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={p.active}
                        onChange={() => toggleActive(p)}
                        slotProps={{ input: { 'aria-label': `Widoczny w sklepie: ${p.name}` } }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </DataTable>
        </Box>

        {editing && (
          <Paper component="aside" aria-label="Edycja produktu" sx={{ width: { xs: '100%', lg: 420 }, flex: 'none', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">{editing === 'new' ? 'Nowy produkt' : 'Edycja produktu'}</Typography>
            <TextField label="Nazwa widoczna dla organizatorów" value={form.name} onChange={(e) => set('name', e.target.value)} required slotProps={{ htmlInput: { maxLength: 255 } }} />
            <TextField label="Opis" value={form.description} onChange={(e) => set('description', e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 4000 } }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Autocomplete
                freeSolo
                options={sections}
                inputValue={form.section}
                onInputChange={(_, v) => set('section', v)}
                renderInput={(params) => <TextField {...params} label="Sekcja" />}
              />
              <Autocomplete
                options={sortedCategories}
                getOptionLabel={(c) => c.label}
                value={sortedCategories.find((c) => c.id === form.categoryId) ?? null}
                onChange={(_, v) => set('categoryId', v?.id ?? null)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="Kategoria sprzętu" required />}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: -1 }}>
              Kategoria mówi dispatchowi, co spakować. Nie ma pasującej?{' '}
              <Link component={RouterLink} to="/categories">Utwórz nową kategorię</Link>
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField label="Cena za sztukę (zł)" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="np. 180,00" />
              <TextField label="Maks. na zamówienie" value={form.maxPerOrder} onChange={(e) => set('maxPerOrder', e.target.value)} placeholder="bez limitu" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
            </Box>
            <TextField label="Zdjęcie (adres URL, opcjonalnie)" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
            <TextField label="Kolejność w sekcji" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
            <FormControlLabel control={<Switch checked={form.active} onChange={(e) => set('active', e.target.checked)} />} label="Widoczny w sklepie" />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={save} disabled={saving} sx={{ flexGrow: 1 }}>Zapisz</Button>
              <Button variant="outlined" onClick={() => setEditing(null)} disabled={saving}>Anuluj</Button>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ShopProductsPage;
