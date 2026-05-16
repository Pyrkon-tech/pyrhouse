import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useCategories } from '../../hooks/useCategories';
import { useLocations } from '../../hooks/useLocations';
import {
  getReservationsAPI,
  deleteReservationsAPI,
  claimReservationsAPI,
} from '../../services/assetService';
import { OriginSelect } from '../ui/OriginSelect';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import type {
  AssetReservation,
  ReservationStatus,
  ClaimItem,
} from '../../types/asset.types';

const RefreshIcon = lazy(() => import('@mui/icons-material/Refresh'));
const DeleteIcon = lazy(() => import('@mui/icons-material/Delete'));
const CheckIcon = lazy(() => import('@mui/icons-material/Check'));
const PrintIcon = lazy(() => import('@mui/icons-material/Print'));

// ─── Claim Dialog ─────────────────────────────────────────────────────────────

interface ClaimRow {
  id: string;
  pyr_code: string;
  serial: string;
}

interface ClaimDialogProps {
  open: boolean;
  initialRows: ClaimRow[];
  locations: { id: number; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
  showSnackbar: (type: 'success' | 'error', msg: string) => void;
}

const ClaimDialog: React.FC<ClaimDialogProps> = ({
  open,
  initialRows,
  locations,
  onClose,
  onSuccess,
  showSnackbar,
}) => {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [origin, setOrigin] = useState('');
  const [locationId, setLocationId] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimErrors, setClaimErrors] = useState<{ pyr_code: string; reason: string }[]>([]);

  const pyrRefs = useRef<(HTMLInputElement | null)[]>([]);
  const serialRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      const init =
        initialRows.length > 0
          ? initialRows
          : [{ id: Date.now().toString(), pyr_code: '', serial: '' }];
      setRows(init);
      setClaimErrors([]);
      setOrigin('');
    }
  }, [open, initialRows]);

  useEffect(() => {
    pyrRefs.current = pyrRefs.current.slice(0, rows.length);
    serialRefs.current = serialRefs.current.slice(0, rows.length);
  }, [rows.length]);

  const addRow = useCallback((afterIndex?: number) => {
    const newRow: ClaimRow = { id: Date.now().toString() + Math.random(), pyr_code: '', serial: '' };
    setRows((prev) => {
      if (afterIndex === undefined || afterIndex >= prev.length - 1) {
        return [...prev, newRow];
      }
      const copy = [...prev];
      copy.splice(afterIndex + 1, 0, newRow);
      return copy;
    });
    return newRow;
  }, []);

  const updateRow = (index: number, field: 'pyr_code' | 'serial', value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const focusPyr = (index: number) => {
    setTimeout(() => pyrRefs.current[index]?.focus(), 50);
  };

  const focusSerial = (index: number) => {
    setTimeout(() => serialRefs.current[index]?.focus(), 50);
  };

  const handlePyrKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusSerial(index);
    }
  };

  const handleSerialKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === rows.length - 1) {
        addRow();
        setTimeout(() => focusPyr(rows.length), 60);
      } else {
        focusPyr(index + 1);
      }
    }
  };

  const handleSubmit = async () => {
    if (!origin) {
      showSnackbar('error', 'Wybierz pochodzenie');
      return;
    }
    const items: ClaimItem[] = rows
      .filter((r) => r.pyr_code.trim())
      .map((r) => ({ pyr_code: r.pyr_code.trim(), serial: r.serial.trim() || undefined }));

    if (items.length === 0) {
      showSnackbar('error', 'Dodaj co najmniej jeden kod PYR');
      return;
    }

    setIsSubmitting(true);
    setClaimErrors([]);
    try {
      const result = await claimReservationsAPI({ origin, location_id: locationId, items });
      showSnackbar('success', `Utworzono ${result.created.length} assetów`);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.details) {
        try {
          const parsed = JSON.parse(err.details);
          if (parsed?.details && Array.isArray(parsed.details)) {
            setClaimErrors(parsed.details);
            return;
          }
        } catch {}
      }
      showSnackbar('error', err?.message || 'Błąd podczas odbioru sprzętu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = rows.filter((r) => r.pyr_code.trim()).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Odbierz sprzęt</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1, mb: 3 }}>
          <Box sx={{ minWidth: 200 }}>
            <OriginSelect value={origin} onChange={setOrigin} required />
          </Box>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Lokalizacja docelowa</InputLabel>
            <Select
              value={locationId}
              onChange={(e) => setLocationId(Number(e.target.value))}
              label="Lokalizacja docelowa"
            >
              {locations.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {claimErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Błędy — popraw poniższe kody:</Typography>
            {claimErrors.map((e) => (
              <Box key={e.pyr_code}>
                <strong>{e.pyr_code}</strong>: {e.reason}
              </Box>
            ))}
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Skanuj kod PYR ze stickera → Enter → skanuj numer seryjny → Enter (automatycznie przejdzie do następnego wiersza)
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>Kod PYR</TableCell>
                <TableCell>Numer seryjny</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => {
                const hasError = claimErrors.some((e) => e.pyr_code === row.pyr_code);
                return (
                  <TableRow key={row.id} sx={hasError ? { bgcolor: 'error.main', opacity: 0.15 } : {}}>
                    <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{i + 1}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={row.pyr_code}
                        onChange={(e) => updateRow(i, 'pyr_code', e.target.value)}
                        onKeyDown={(e) => handlePyrKeyDown(e, i)}
                        inputRef={(el) => (pyrRefs.current[i] = el)}
                        placeholder="PYR-XXX"
                        fullWidth
                        error={hasError}
                        autoFocus={i === 0 && !initialRows[0]?.pyr_code}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={row.serial}
                        onChange={(e) => updateRow(i, 'serial', e.target.value)}
                        onKeyDown={(e) => handleSerialKeyDown(e, i)}
                        inputRef={(el) => (serialRefs.current[i] = el)}
                        placeholder="SN (opcjonalny)"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                      >
                        <Suspense fallback={null}><DeleteIcon fontSize="small" /></Suspense>
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Button
          size="small"
          variant="text"
          sx={{ mt: 1 }}
          onClick={() => {
            addRow();
            setTimeout(() => focusPyr(rows.length), 60);
          }}
        >
          + Dodaj wiersz
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Anuluj
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || validCount === 0}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Suspense fallback={null}><CheckIcon /></Suspense>
            )
          }
        >
          {isSubmitting ? 'Tworzę assety...' : `Utwórz ${validCount} asset${validCount !== 1 ? 'y' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ReservationsPage: React.FC = () => {
  const { userRole } = useAuth();
  const { categories } = useCategories();
  const { locations } = useLocations();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const [reservations, setReservations] = useState<AssetReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus>('free');
  const [categoryFilter, setCategoryFilter] = useState<number>(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [claimOpen, setClaimOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isPrinting, setIsPrinting] = useState(false);

  const isModerator = userRole === 'admin' || userRole === 'moderator';
  const assetCategories = categories.filter((c) => c.type === 'asset');

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReservationsAPI({
        status: statusFilter,
        category_id: categoryFilter || undefined,
      });
      setReservations(data);
      setSelected(new Set());
    } catch (err: any) {
      showSnackbar('error', err?.message || 'Błąd pobierania rezerwacji');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // ─── Selection ───────────────────────────────────────────────────────────

  const allIds = reservations.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = allIds.some((id) => selected.has(id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedReservations = reservations.filter((r) => selected.has(r.id));
  const selectedFree = selectedReservations.filter((r) => r.claimed_at === null);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleDeleteConfirmed = async () => {
    if (selected.size === 0) return;
    const pyr_codes = selectedReservations.map((r) => r.pyr_code);
    setDeleteConfirmOpen(false);
    setDeleting(true);
    try {
      const result = await deleteReservationsAPI({ pyr_codes });
      showSnackbar('success', `Usunięto ${result.deleted} rezerwacji`);
      fetchReservations();
    } catch (err: any) {
      showSnackbar('error', err?.message || 'Błąd usuwania rezerwacji');
    } finally {
      setDeleting(false);
    }
  };

  const generateBarcodeSVGDataUrl = (value: string, isPortrait: boolean) => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const svgWidth = isPortrait ? 240 : 400;
    const svgHeight = isPortrait ? 400 : 180;
    svg.setAttribute('width', svgWidth.toString());
    svg.setAttribute('height', svgHeight.toString());
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    JsBarcode(svg, value, {
      format: 'CODE128', width: 2, height: 40, displayValue: true,
      fontSize: 18, margin: 5, background: '#FFFFFF', lineColor: '#000000',
      textAlign: 'center', textPosition: 'bottom', textMargin: 2, text: value,
    });
    const svgString = new XMLSerializer().serializeToString(svg);
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  };

  const handlePrintBarcodes = async () => {
    if (selectedReservations.length === 0) return;
    setIsPrinting(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Nie można otworzyć okna drukowania');
      const isPortrait = orientation === 'portrait';
      let html = `<html><head><title>Etykiety PYR</title><style>
        @page { size: ${orientation}; margin: 0; }
        body { margin: 0; display: flex; flex-direction: column; align-items: center; background: white; }
        .barcode-container { page-break-after: always; display: flex; justify-content: center; align-items: center; height: 100vh; width: 100%; }
        .barcode-container:last-child { page-break-after: avoid; }
      </style></head><body>`;
      for (const r of selectedReservations) {
        const dataUrl = generateBarcodeSVGDataUrl(r.pyr_code, isPortrait);
        html += `<div class="barcode-container"><img src="${dataUrl}" style="${
          isPortrait
            ? 'transform: rotate(-90deg); width: 95vh; height: auto; margin: auto; display: block;'
            : 'width: 95%; height: auto; margin: auto; display: block;'
        }" /></div>`;
      }
      html += '</body></html>';
      printWindow.document.write(html);
      printWindow.document.close();
      await new Promise<void>((resolve) => {
        const imgs = printWindow.document.querySelectorAll('img');
        let loaded = 0;
        if (imgs.length === 0) { resolve(); return; }
        imgs.forEach((img) => { img.onload = () => { if (++loaded === imgs.length) resolve(); }; });
      });
      printWindow.print();
      printWindow.close();
    } catch {
      showSnackbar('error', 'Nie udało się otworzyć okna drukowania');
    } finally {
      setIsPrinting(false);
      setPrintDialogOpen(false);
    }
  };

  const handleDownloadPDF = () => {
    if (selectedReservations.length === 0) return;
    setIsPrinting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [40, 80] });
      for (let i = 0; i < selectedReservations.length; i++) {
        if (i > 0) doc.addPage();
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 240;
        JsBarcode(canvas, selectedReservations[i].pyr_code, {
          format: 'CODE128', width: 2, height: 40, displayValue: true,
          fontSize: 12, margin: 5, background: '#FFFFFF', lineColor: '#000000',
          textAlign: 'center', textPosition: 'bottom', textMargin: 2,
          text: selectedReservations[i].pyr_code,
        });
        doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 10, 7.5, 60, 25);
      }
      doc.save(`etykiety-${selectedReservations.length}.pdf`);
    } finally {
      setIsPrinting(false);
      setPrintDialogOpen(false);
    }
  };

  const claimInitialRows: ClaimRow[] = selectedFree.map((r) => ({
    id: String(r.id),
    pyr_code: r.pyr_code,
    serial: '',
  }));

  const getCategoryLabel = (id: number) => {
    const cat = assetCategories.find((c) => c.id === id);
    return cat?.label || `#${id}`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Container>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Typography variant="h4">Rezerwacje PYR kodów</Typography>
        <Tooltip title="Odśwież">
          <span>
            <IconButton size="small" onClick={fetchReservations} disabled={loading}>
              <Suspense fallback={null}><RefreshIcon fontSize="small" /></Suspense>
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReservationStatus)}
            label="Status"
          >
            <MenuItem value="free">Wolne</MenuItem>
            <MenuItem value="claimed">Odebrane</MenuItem>
            <MenuItem value="all">Wszystkie</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Kategoria</InputLabel>
          <Select
            value={categoryFilter || ''}
            onChange={(e) => setCategoryFilter(Number(e.target.value) || 0)}
            label="Kategoria"
          >
            <MenuItem value="">Wszystkie</MenuItem>
            {assetCategories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Selection action bar */}
      {selected.size > 0 && (
        <Paper
          sx={{
            px: 2,
            py: 1,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            borderLeft: '3px solid',
            borderColor: 'primary.main',
          }}
          elevation={2}
        >
          <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }}>
            Zaznaczono: <strong>{selected.size}</strong>
            {selectedFree.length !== selected.size && ` (wolnych: ${selectedFree.length})`}
          </Typography>

          {selectedFree.length > 0 && (
            <Button
              variant="contained"
              size="small"
              startIcon={<Suspense fallback={null}><CheckIcon /></Suspense>}
              onClick={() => setClaimOpen(true)}
            >
              Odbierz zaznaczone ({selectedFree.length})
            </Button>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<Suspense fallback={null}><PrintIcon /></Suspense>}
            onClick={() => setPrintDialogOpen(true)}
          >
            Drukuj etykiety ({selected.size})
          </Button>

          {isModerator && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={
                deleting ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <Suspense fallback={null}><DeleteIcon /></Suspense>
                )
              }
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
            >
              Usuń zaznaczone
            </Button>
          )}

          <Button size="small" color="inherit" onClick={() => setSelected(new Set())}>
            Odznacz
          </Button>
        </Paper>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={reservations.length === 0}
                />
              </TableCell>
              <TableCell>Kod PYR</TableCell>
              <TableCell>Kategoria</TableCell>
              <TableCell>Data rezerwacji</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!loading && reservations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Brak rezerwacji dla wybranych filtrów
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              reservations.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  selected={selected.has(r.id)}
                  onClick={() => toggleOne(r.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {r.pyr_code}
                  </TableCell>
                  <TableCell>{getCategoryLabel(r.category_id)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(r.reserved_at)}</TableCell>
                  <TableCell>
                    {r.claimed_at ? (
                      <Chip label="Odebrano" color="success" size="small" />
                    ) : (
                      <Chip label="Wolny" color="warning" size="small" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {!loading && `${reservations.length} rekordów`}
      </Typography>

      <Divider sx={{ my: 3 }} />
      <Typography variant="body2" color="text.secondary">
        Nowe rezerwacje tworzysz w{' '}
        <strong>Dodaj przedmiot → Masowa dostawa</strong>.
      </Typography>

      {/* Print barcodes dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Drukuj etykiety ({selected.size})</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Każda etykieta zostanie wydrukowana na osobnej stronie jako kod kreskowy CODE128.
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Orientacja strony</Typography>
          <RadioGroup
            row
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
          >
            <FormControlLabel value="landscape" control={<Radio size="small" />} label="Pozioma" />
            <FormControlLabel value="portrait" control={<Radio size="small" />} label="Pionowa" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)} disabled={isPrinting}>Anuluj</Button>
          <Button
            variant="outlined"
            onClick={handleDownloadPDF}
            disabled={isPrinting}
            startIcon={isPrinting ? <CircularProgress size={14} /> : undefined}
          >
            Pobierz PDF
          </Button>
          <Button
            variant="contained"
            onClick={handlePrintBarcodes}
            disabled={isPrinting}
            startIcon={isPrinting ? <CircularProgress size={14} color="inherit" /> : <Suspense fallback={null}><PrintIcon /></Suspense>}
          >
            Drukuj
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Usuń rezerwacje</DialogTitle>
        <DialogContent>
          <Typography>
            Czy na pewno chcesz usunąć <strong>{selected.size}</strong>{' '}
            {selected.size === 1 ? 'rezerwację' : 'rezerwacje'}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {selectedReservations.map((r) => r.pyr_code).join(', ')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Anuluj</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirmed}>
            Usuń
          </Button>
        </DialogActions>
      </Dialog>

      <ClaimDialog
        open={claimOpen}
        initialRows={claimInitialRows}
        locations={locations}
        onClose={() => setClaimOpen(false)}
        onSuccess={fetchReservations}
        showSnackbar={(type, msg) => showSnackbar(type, msg)}
      />
    </Container>
  );
};

export default ReservationsPage;
