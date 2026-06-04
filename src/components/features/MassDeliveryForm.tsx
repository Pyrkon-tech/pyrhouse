import React, { useState, lazy, Suspense } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { createReservationsAPI } from '../../services/assetService';
import type { AssetReservation } from '../../types/asset.types';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';

const OpenInNewIcon = lazy(() => import('@mui/icons-material/OpenInNew'));

interface MassDeliveryFormProps {
  categories: any[];
}

const MAX_PER_REQUEST = 200;

export const MassDeliveryForm: React.FC<MassDeliveryFormProps> = ({ categories }) => {
  const navigate = useNavigate();
  const assetCategories = categories.filter((c) => c.type === 'asset');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [quantity, setQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [reservations, setReservations] = useState<AssetReservation[]>([]);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const handleReserve = async () => {
    if (!categoryId) {
      showSnackbar('error', 'Wybierz kategorię');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      showSnackbar('error', 'Podaj prawidłową ilość (min. 1)');
      return;
    }

    setIsSubmitting(true);
    try {
      const allReservations: AssetReservation[] = [];
      const batchCount = Math.ceil(qty / MAX_PER_REQUEST);
      for (let i = 0; i < batchCount; i++) {
        const batchQty = Math.min(MAX_PER_REQUEST, qty - i * MAX_PER_REQUEST);
        const result = await createReservationsAPI({ category_id: categoryId, quantity: batchQty });
        allReservations.push(...result.reservations);
      }
      setReservations(allReservations);
      showSnackbar('success', `Zarezerwowano ${allReservations.length} kodów PYR`);
    } catch (err: any) {
      showSnackbar('error', err?.message || 'Błąd podczas rezerwacji');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateBarcodeSVGDataUrl = (value: string, isPortrait = false) => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const svgWidth = isPortrait ? 240 : 400;
    const svgHeight = isPortrait ? 400 : 180;
    svg.setAttribute('width', svgWidth.toString());
    svg.setAttribute('height', svgHeight.toString());
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: true,
      fontSize: 18,
      margin: 5,
      background: '#FFFFFF',
      lineColor: '#000000',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 2,
      text: value,
    });
    const svgString = new XMLSerializer().serializeToString(svg);
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  };

  const handleDownloadPDF = () => {
    if (reservations.length === 0) return;
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [40, 80] });
      for (let i = 0; i < reservations.length; i++) {
        if (i > 0) doc.addPage();
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 240;
        JsBarcode(canvas, reservations[i].pyr_code, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          background: '#FFFFFF',
          lineColor: '#000000',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2,
          text: reservations[i].pyr_code,
        });
        doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 10, 7.5, 60, 25);
      }
      doc.save(`rezerwacje-${reservations.length}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (reservations.length === 0) return;
    setIsGenerating(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Nie można otworzyć okna drukowania');
      const isPortrait = orientation === 'portrait';
      let html = `
        <html><head><title>Drukuj kody kreskowe</title><style>
          @page { size: ${orientation}; margin: 0; }
          body { margin: 0; display: flex; flex-direction: column; align-items: center; background: white; }
          .barcode-container { page-break-after: always; display: flex; justify-content: center; align-items: center; height: 100vh; width: 100%; }
          .barcode-container:last-child { page-break-after: avoid; }
        </style></head><body>`;
      for (const r of reservations) {
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
        imgs.forEach((img) => {
          img.onload = () => { if (++loaded === imgs.length) resolve(); };
        });
      });
      printWindow.print();
      printWindow.close();
    } catch {
      showSnackbar('error', 'Nie udało się otworzyć okna drukowania');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setReservations([]);
    setCategoryId(0);
    setQuantity('');
  };

  return (
    <Box sx={{ mt: 2 }}>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Wygeneruj kody PYR z wyprzedzeniem, wydrukuj naklejki, a potem przypisz numery seryjne podczas odbierania sprzętu.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Kategoria</InputLabel>
          <Select
            value={categoryId || ''}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            label="Kategoria"
            disabled={reservations.length > 0}
          >
            {assetCategories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Ilość"
          type="number"
          size="small"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          inputProps={{ min: 1, max: 9999 }}
          sx={{ width: 120 }}
          disabled={reservations.length > 0}
        />

        <Button
          variant="contained"
          size="small"
          onClick={handleReserve}
          disabled={isSubmitting || reservations.length > 0}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isSubmitting ? 'Rezerwuję...' : 'Zarezerwuj kody'}
        </Button>
      </Box>

      {reservations.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />

          <Alert severity="success" sx={{ mb: 2 }}>
            Wygenerowano {reservations.length} kodów PYR dla kategorii{' '}
            <strong>{assetCategories.find((c) => c.id === categoryId)?.label}</strong>.
            Wydrukuj naklejki, naklejaj na sprzęt, następnie przejdź do listy rezerwacji aby przypisać seriale.
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleDownloadPDF}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generowanie...' : 'Pobierz PDF'}
              </Button>
              <Typography variant="subtitle2">Orientacja druku:</Typography>
              <RadioGroup
                row
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
              >
                <FormControlLabel value="landscape" control={<Radio size="small" />} label="Pozioma" />
                <FormControlLabel value="portrait" control={<Radio size="small" />} label="Pionowa" />
              </RadioGroup>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePrint}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generowanie...' : 'Drukuj'}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<Suspense fallback={null}><OpenInNewIcon /></Suspense>}
                onClick={() => navigate('/reservations')}
              >
                Lista rezerwacji
              </Button>
              <Button variant="text" color="inherit" onClick={handleReset}>
                Nowa rezerwacja
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 300, overflowY: 'auto' }}>
            {reservations.map((r) => (
              <Chip key={r.id} label={r.pyr_code} size="small" variant="outlined" />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};
