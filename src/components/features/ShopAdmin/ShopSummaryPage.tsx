import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DataTable, DataTableEmptyRow, DataTableLoadingRow } from '../../ui';
import { getShopOrdersAPI, getShopSummaryAPI } from '../../../services/shopAdminService';
import type { ShopOrder, ShopSummaryGroup, ShopSummaryRow } from '../../../types/shop.types';
import ShopAdminTabs from './ShopAdminTabs';
import { fmtDayKey, fmtMoney, shopErrorMessage } from './shopFormat';

interface Pivot {
  columns: { key: string; label: string }[];
  rows: { productId: number; name: string; cells: Record<string, number>; total: number }[];
}

/** Products down, groups (days / locations) across. */
const pivot = (rows: ShopSummaryRow[], group: ShopSummaryGroup): Pivot => {
  const columns = new Map<string, string>();
  const byProduct = new Map<number, Pivot['rows'][number]>();
  rows.forEach((r) => {
    columns.set(r.key, group === 'day' ? fmtDayKey(r.key) : r.label);
    const p = byProduct.get(r.product_id) ?? { productId: r.product_id, name: r.product_name, cells: {}, total: 0 };
    p.cells[r.key] = (p.cells[r.key] ?? 0) + r.quantity;
    p.total += r.quantity;
    byProduct.set(r.product_id, p);
  });
  return {
    columns: [...columns.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, label]) => ({ key, label })),
    rows: [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
};

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

const downloadCsv = (p: Pivot, filename: string) => {
  const lines = [
    ['Produkt', ...p.columns.map((c) => c.label), 'Razem'].map(csvCell).join(';'),
    ...p.rows.map((r) => [r.name, ...p.columns.map((c) => r.cells[c.key] ?? 0), r.total].map(csvCell).join(';')),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const GROUP_TITLE: Record<ShopSummaryGroup, string> = {
  day: 'Ile czego potrzeba — dzień dostawy',
  location: 'Ile czego potrzeba — lokalizacja',
  product: 'Ile czego potrzeba — łącznie',
};

const ShopSummaryPage: React.FC = () => {
  const [group, setGroup] = useState<ShopSummaryGroup>('day');
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [rows, setRows] = useState<ShopSummaryRow[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const [summary, list] = await Promise.all([getShopSummaryAPI(group, confirmedOnly), getShopOrdersAPI()]);
      setRows(summary.rows);
      setOrders(list);
    } catch (err) {
      setError(shopErrorMessage(err, 'Nie udało się pobrać podsumowania'));
    } finally {
      setLoading(false);
    }
  }, [group, confirmedOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    const counted = orders.filter((o) => (confirmedOnly ? o.status === 'confirmed' : o.status === 'submitted' || o.status === 'confirmed'));
    return [
      { label: 'Do potwierdzenia', value: String(orders.filter((o) => o.status === 'submitted').length), color: 'warning.main' },
      { label: 'Potwierdzone', value: String(orders.filter((o) => o.status === 'confirmed').length), color: 'secondary.main' },
      { label: 'Sztuk łącznie', value: String(counted.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0)), color: 'text.primary' },
      { label: 'Wartość zamówień', value: fmtMoney(counted.reduce((s, o) => s + (o.total ?? 0), 0)), color: 'text.primary' },
    ];
  }, [orders, confirmedOnly]);

  const table = useMemo(() => pivot(rows, group), [rows, group]);
  const colSpan = table.columns.length + 2;

  return (
    <Box>
      <ShopAdminTabs active="summary" pending={orders.filter((o) => o.status === 'submitted').length} />

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'space-between', mb: 2 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={confirmedOnly ? 'confirmed' : 'all'}
          onChange={(_, v) => v && setConfirmedOnly(v === 'confirmed')}
          aria-label="Które zamówienia liczyć"
        >
          <ToggleButton value="all">Potwierdzone + do potwierdzenia</ToggleButton>
          <ToggleButton value="confirmed">Tylko potwierdzone</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <ToggleButtonGroup size="small" exclusive value={group} onChange={(_, v) => v && setGroup(v)} aria-label="Grupowanie">
            <ToggleButton value="day">Dzień dostawy</ToggleButton>
            <ToggleButton value="location">Lokalizacja</ToggleButton>
            <ToggleButton value="product">Łącznie</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={table.rows.length === 0}
            onClick={() => downloadCsv(table, `sklep-podsumowanie-${group}.csv`)}
          >
            Eksport CSV
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k) => (
          <Grid key={k.label} size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{k.label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: k.color, mt: 0.5 }}>{k.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ mb: 1 }}>{GROUP_TITLE[group]}</Typography>
      <DataTable>
        <TableHead>
          <TableRow>
            <TableCell>Produkt</TableCell>
            {group !== 'product' && table.columns.map((c) => <TableCell key={c.key} align="right">{c.label}</TableCell>)}
            <TableCell align="right">Razem</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <DataTableLoadingRow colSpan={colSpan} />
          ) : table.rows.length === 0 ? (
            <DataTableEmptyRow colSpan={colSpan} message="Brak zamówień do zliczenia" />
          ) : (
            table.rows.map((r) => (
              <TableRow key={r.productId}>
                <TableCell>{r.name}</TableCell>
                {group !== 'product' && table.columns.map((c) => (
                  <TableCell key={c.key} align="right" sx={{ color: r.cells[c.key] ? 'text.primary' : 'text.disabled' }}>
                    {r.cells[c.key] ?? 0}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700 }}>{r.total}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </DataTable>
    </Box>
  );
};

export default ShopSummaryPage;
