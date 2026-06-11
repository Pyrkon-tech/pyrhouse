import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  TextField,
  Tooltip,
  GlobalStyles,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getReleaseAPI,
  confirmReleaseAPI,
  deleteReleaseAPI,
  updateReleaseItemsAPI,
} from '../../../services/releaseService';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../context/NotificationContext';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataTable } from '../../ui/DataTable';
import type { ReleaseDetail, ReleaseAsset, ReleaseStock } from '../../../types/release.types';

const formatDate = (dateStr: string | null) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

// Widok do druku — widoczny tylko przez window.print()
const PrintView: React.FC<{ release: ReleaseDetail }> = ({ release }) => (
  <Box
    id="release-print-view"
    sx={{
      display: 'none',
      p: 4,
      fontFamily: 'Arial, sans-serif',
      color: '#000',
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
      <Box>
        <Typography sx={{ fontSize: 22, fontWeight: 700 }}>
          Protokół wydania sprzętu
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#555' }}>
          Dokument nr: {release.reference}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography sx={{ fontSize: 12, color: '#555' }}>
          Data wystawienia: {formatDate(release.created_at)}
        </Typography>
        {release.completed_at && (
          <Typography sx={{ fontSize: 12, color: '#555' }}>
            Data potwierdzenia: {formatDate(release.completed_at)}
          </Typography>
        )}
      </Box>
    </Box>

    <Divider sx={{ mb: 2, borderColor: '#000' }} />

    <Box sx={{ display: 'flex', gap: 6, mb: 3 }}>
      {release.origin_label && (
        <Box>
          <Typography sx={{ fontSize: 11, color: '#777', textTransform: 'uppercase', mb: 0.5 }}>
            Pochodzenie
          </Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{release.origin_label}</Typography>
        </Box>
      )}
      {release.created_by_name && (
        <Box>
          <Typography sx={{ fontSize: 11, color: '#777', textTransform: 'uppercase', mb: 0.5 }}>
            Wystawił
          </Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{release.created_by_name}</Typography>
        </Box>
      )}
    </Box>

    {release.notes && (
      <Box sx={{ mb: 2, p: 1.5, border: '1px solid #ddd', borderRadius: 1 }}>
        <Typography sx={{ fontSize: 12, color: '#555' }}>Notatki: {release.notes}</Typography>
      </Box>
    )}

    {release.assets.length > 0 && (
      <>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1, mt: 2 }}>
          Sprzęt seryjny ({release.assets.length} szt.)
        </Typography>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Lp.</th>
              <th style={{ border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Kategoria</th>
              <th style={{ border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Kod PYR</th>
              <th style={{ border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Nr seryjny</th>
              <th style={{ border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Lokalizacja</th>
            </tr>
          </thead>
          <tbody>
            {release.assets.map((a, i) => (
              <tr key={a.id}>
                <td style={{ border: '1px solid #ddd', padding: '6px 10px', fontSize: 12 }}>{i + 1}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px 10px', fontSize: 12 }}>{a.category_name ?? '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px 10px', fontSize: 12 }}>{a.pyr_code ?? '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px 10px', fontSize: 12 }}>{a.item_serial ?? '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px 10px', fontSize: 12 }}>{a.location_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}

    {release.stocks.length > 0 && (
      <>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>
          Sprzęt nieseryjny
        </Typography>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Lp.</th>
              <th style={{ border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Kategoria</th>
              <th style={{ border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Ilość</th>
              <th style={{ border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left', fontSize: 12 }}>Lokalizacja</th>
            </tr>
          </thead>
          <tbody>
            {release.stocks.map((s, i) => (
              <tr key={s.id}>
                <td style={{ border: '1px solid #ddd', padding: '6px 10px', fontSize: 12 }}>{i + 1}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px 10px', fontSize: 12 }}>{s.category_name ?? '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px 10px', fontSize: 12 }}>{s.quantity}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px 10px', fontSize: 12 }}>{s.location_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}

    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: '1px solid #ddd' }}>
      <Box>
        <Typography sx={{ fontSize: 11, color: '#777' }}>Łącznie seryjnych</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{release.summary.total_assets}</Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11, color: '#777' }}>Łącznie nieseryjnych (szt.)</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{release.summary.total_stock_quantity}</Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography sx={{ fontSize: 11, color: '#777' }}>Podpis odbierającego</Typography>
        <Box sx={{ mt: 3, borderBottom: '1px solid #000', width: 200 }} />
      </Box>
    </Box>
  </Box>
);

const ReleaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit mode (only for draft)
  const [editMode, setEditMode] = useState(false);
  const [removedAssetIds, setRemovedAssetIds] = useState<Set<number>>(new Set());
  const [editedStockQty, setEditedStockQty] = useState<Map<number, number>>(new Map());
  const [saving, setSaving] = useState(false);

  const canEdit = ['admin', 'moderator', 'dispatcher'].includes(userRole ?? '') && release?.status === 'draft';
  const canDelete = (userRole === 'admin' || userRole === 'moderator') && release?.status === 'draft';
  const canConfirm = userRole === 'admin' || userRole === 'moderator';

  const fetchRelease = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getReleaseAPI(Number(id));
      setRelease(data);
    } catch (err) {
      setError((err instanceof Error ? err.message : '') || 'Błąd pobierania wydania');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRelease();
  }, [fetchRelease]);

  const handlePrint = () => {
    window.print();
  };

  const handleConfirm = async () => {
    if (!release) return;
    setConfirming(true);
    try {
      const updated = await confirmReleaseAPI(release.id);
      setRelease(updated);
      showSuccess(`Wydanie ${updated.reference} zostało potwierdzone. Sprzęt usunięty z magazynu.`);
      setConfirmDialog(false);
    } catch (err) {
      showError((err instanceof Error ? err.message : '') || 'Błąd podczas potwierdzania wydania');
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    if (!release) return;
    setDeleting(true);
    try {
      await deleteReleaseAPI(release.id);
      showSuccess('Wydanie zostało usunięte');
      navigate('/releases');
    } catch (err) {
      showError((err instanceof Error ? err.message : '') || 'Błąd podczas usuwania');
      setDeleting(false);
    }
  };

  const startEdit = () => {
    setRemovedAssetIds(new Set());
    const qtyMap = new Map<number, number>();
    release?.stocks.forEach((s) => qtyMap.set(s.stock_id, s.quantity));
    setEditedStockQty(qtyMap);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setRemovedAssetIds(new Set());
    setEditedStockQty(new Map());
  };

  const saveEdit = async () => {
    if (!release) return;
    setSaving(true);
    try {
      const keepAssets = release.assets
        .filter((a) => !removedAssetIds.has(a.item_id))
        .map((a) => a.item_id);
      const stocks = release.stocks
        .map((s) => ({
          stock_id: s.stock_id,
          quantity: editedStockQty.get(s.stock_id) ?? s.quantity,
        }))
        .filter((s) => s.quantity > 0);

      const updated = await updateReleaseItemsAPI(release.id, { assets: keepAssets, stocks });
      setRelease(updated);
      showSuccess('Wydanie zaktualizowane');
      setEditMode(false);
    } catch (err) {
      showError((err instanceof Error ? err.message : '') || 'Błąd podczas zapisywania zmian');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !release) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error ?? 'Nie znaleziono wydania'}</Alert>
        <Button variant="outline" sx={{ mt: 2 }} onClick={() => navigate('/releases')}>
          Wróć do listy
        </Button>
      </Box>
    );
  }

  const displayAssets: ReleaseAsset[] = editMode
    ? release.assets.filter((a) => !removedAssetIds.has(a.item_id))
    : release.assets;

  const displayStocks: ReleaseStock[] = release.stocks;

  return (
    <>
      <GlobalStyles styles={{
        '@media print': {
          'body *': { visibility: 'hidden' },
          '#release-print-view': { display: 'block', position: 'absolute', inset: 0, visibility: 'visible' },
          '#release-print-view *': { visibility: 'visible' },
        },
      }} />
      {/* Print view (hidden on screen, shown only when printing) */}
      <PrintView release={release} />

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
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            mb: 3,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => navigate('/releases')} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {release.reference}
                </Typography>
                <Chip
                  label={release.status === 'completed' ? 'Zakończone' : 'Roboczy'}
                  color={release.status === 'completed' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              {release.origin_label && (
                <Typography variant="body2" color="text.secondary">
                  {release.origin_label}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outline" size="sm" leftIcon={<PrintIcon />} onClick={handlePrint}>
              Drukuj / PDF
            </Button>
            {canEdit && !editMode && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                Edytuj
              </Button>
            )}
            {canDelete && !editMode && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<DeleteIcon />}
                onClick={() => setDeleteDialog(true)}
              >
                Usuń
              </Button>
            )}
            {editMode && (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  Anuluj
                </Button>
                <Button variant="primary" size="sm" loading={saving} onClick={saveEdit}>
                  Zapisz zmiany
                </Button>
              </>
            )}
            {canConfirm && release.status === 'draft' && !editMode && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircleIcon />}
                onClick={() => setConfirmDialog(true)}
              >
                Potwierdź wydanie
              </Button>
            )}
          </Box>
        </Box>

        {/* Meta info */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {release.origin_label && (
              <Box>
                <Typography variant="caption" color="text.secondary">Pochodzenie</Typography>
                <Typography variant="body1">{release.origin_label}</Typography>
              </Box>
            )}
            {release.created_by_name && (
              <Box>
                <Typography variant="caption" color="text.secondary">Wystawił</Typography>
                <Typography variant="body1">{release.created_by_name}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary">Utworzone</Typography>
              <Typography variant="body1">{formatDate(release.created_at)}</Typography>
            </Box>
            {release.completed_at && (
              <Box>
                <Typography variant="caption" color="text.secondary">Potwierdzone</Typography>
                <Typography variant="body1" color="success.main" sx={{ fontWeight: 600 }}>
                  {formatDate(release.completed_at)}
                </Typography>
              </Box>
            )}
          </Box>
          {release.notes && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Notatki</Typography>
              <Typography variant="body2">{release.notes}</Typography>
            </>
          )}
        </Paper>

        {/* Sprzęt seryjny */}
        {(displayAssets.length > 0 || (editMode && release.assets.length > 0)) && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              Sprzęt seryjny ({editMode ? displayAssets.length : release.summary.total_assets})
              {editMode && release.assets.length > 0 && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  (odznacz aby usunąć z wydania)
                </Typography>
              )}
            </Typography>
            <DataTable size="medium">
              <TableHead>
                <TableRow>
                  {editMode && <TableCell padding="checkbox" />}
                  <TableCell>Kategoria</TableCell>
                  <TableCell>Kod PYR</TableCell>
                  <TableCell>Nr seryjny</TableCell>
                  <TableCell>Lokalizacja</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(editMode ? release.assets : displayAssets).map((asset) => {
                  const removed = editMode && removedAssetIds.has(asset.item_id);
                  return (
                    <TableRow
                      key={asset.id}
                      sx={{ opacity: removed ? 0.4 : 1, textDecoration: removed ? 'line-through' : 'none' }}
                    >
                      {editMode && (
                        <TableCell padding="checkbox">
                          <input
                            type="checkbox"
                            checked={!removed}
                            onChange={() => {
                              setRemovedAssetIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(asset.item_id)) next.delete(asset.item_id); else next.add(asset.item_id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell>{asset.category_name ?? '—'}</TableCell>
                      <TableCell>{asset.pyr_code ?? '—'}</TableCell>
                      <TableCell>{asset.item_serial ?? '—'}</TableCell>
                      <TableCell>{asset.location_name ?? '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </DataTable>
          </Box>
        )}

        {/* Sprzęt nieseryjny */}
        {displayStocks.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              Sprzęt nieseryjny ({editMode
                ? Array.from(editedStockQty.values()).reduce((s, v) => s + v, 0)
                : release.summary.total_stock_quantity} szt.)
              {editMode && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  (ustaw 0 aby usunąć)
                </Typography>
              )}
            </Typography>
            <DataTable size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Kategoria</TableCell>
                  <TableCell>Ilość</TableCell>
                  <TableCell>Lokalizacja</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayStocks.map((stock) => (
                  <TableRow key={stock.id}>
                    <TableCell>{stock.category_name ?? '—'}</TableCell>
                    <TableCell>
                      {editMode ? (
                        <Tooltip title="Ustaw 0 aby usunąć z wydania">
                          <TextField
                            type="number"
                            size="small"
                            value={editedStockQty.get(stock.stock_id) ?? stock.quantity}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setEditedStockQty((prev) => {
                                const next = new Map(prev);
                                next.set(stock.stock_id, val);
                                return next;
                              });
                            }}
                            inputProps={{ min: 0 }}
                            sx={{ width: 80 }}
                          />
                        </Tooltip>
                      ) : (
                        stock.quantity
                      )}
                    </TableCell>
                    <TableCell>{stock.location_name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          </Box>
        )}
      </Box>

      {/* Confirm release dialog */}
      <ConfirmDialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        title="Potwierdź wydanie sprzętu"
        message={
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Uwaga:</strong> Po potwierdzeniu sprzęt zostanie trwale usunięty z magazynu. Operacji nie można cofnąć.
            </Alert>
            <Typography variant="body2">
              Wydanie <strong>{release.reference}</strong> zostanie potwierdzone.
              Łącznie: {release.summary.total_assets} szt. seryjnych +{' '}
              {release.summary.total_stock_quantity} szt. nieseryjnych.
            </Typography>
          </>
        }
        confirmLabel="Potwierdź i usuń z magazynu"
        confirmColor="success"
        loading={confirming}
        onConfirm={handleConfirm}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        title="Usuń wydanie"
        message={
          <>
            Czy na pewno chcesz usunąć wydanie <strong>{release.reference}</strong>? Sprzęt pozostanie w magazynie.
          </>
        }
        confirmLabel="Usuń"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
};

export default ReleaseDetailPage;
