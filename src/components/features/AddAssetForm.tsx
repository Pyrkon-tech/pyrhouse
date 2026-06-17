import React, { useState, lazy, Suspense } from 'react';
import {
  Box,
  Button,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Dialog,
} from '@mui/material';
import QrCodeScanner from '@mui/icons-material/QrCodeScanner';
import { apiClient, ApiError } from '../../services/apiClient';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { OriginSelect } from '../ui/OriginSelect';

// jspdf + html2canvas (~650KB) load only when barcodes are actually shown
const BarcodeGenerator = lazy(() =>
  import('../common/BarcodeGenerator').then((m) => ({ default: m.BarcodeGenerator }))
);

// Quagga (~kamera) load only when the scanner is actually opened
const BarcodeScanner = lazy(() => import('../common/BarcodeScanner'));


interface Asset {
  id: number;
  serial: string;
  location: {
    id: number;
    name: string;
    details: string | null;
  };
  category: {
    id: number;
    name: string;
    label: string;
    pyr_id: string;
    type: string;
  };
  status: string;
  pyrcode: string;
  origin?: string;
}

export const AddAssetForm: React.FC<{
  categories: Array<{ id: number; label: string; type: 'asset' | 'stock' }>;
  loading: boolean;
}> = ({ categories }) => {
  const [serial, setSerial] = useState('');
  const [origin, setOrigin] = useState('probis');
  const [categoryID, setCategoryID] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdAsset, setCreatedAsset] = useState<Asset | null>(null);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  // Filter categories to only include type "asset"
  const assetCategories = categories.filter((category) => category.type === 'asset');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setCreatedAsset(null);
    setShowBarcode(false);

    const finalOrigin = origin;

    try {
      const responseData = await apiClient.post<Asset>('/assets', {
        serial,
        category_id: categoryID,
        origin: finalOrigin,
      });
      setCreatedAsset(responseData);
      setShowBarcode(true);

      // Reset form
      setSerial('');
      setCategoryID('');
      setOrigin('probis');
    } catch (err) {
      if (err instanceof ApiError) {
        showSnackbar('error', `HTTP ${err.status}: Nie udało się dodać sprzętu`, err.message, null);
      } else {
        showSnackbar('error', 'Wystąpił nieoczekiwany błąd', err instanceof Error ? err.message : 'Brak szczegółów', null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {/* Display Error Message */}
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />

      {/* Serial Input — z opcją skanowania kodu na mobile */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 2 }}>
        <TextField
          label="Numer Seryjny"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          fullWidth
          required
        />
        <Button
          variant="outlined"
          onClick={() => setShowScanner(true)}
          sx={{ minWidth: 0, px: 1.5, height: 56, display: { xs: 'inline-flex', sm: 'none' } }}
          aria-label="Skanuj numer seryjny"
        >
          <QrCodeScanner />
        </Button>
      </Box>

      {/* Category Select */}
      <Select
        value={categoryID}
        onChange={(e) => setCategoryID(e.target.value)}
        displayEmpty
        fullWidth
        required
        sx={{ mb: 2, borderRadius: 0 }}
      >
        <MenuItem value="" disabled>
          Wybierz kategorię
        </MenuItem>
        {assetCategories.map((category) => (
          <MenuItem key={category.id} value={category.id}>
            {category.label}
          </MenuItem>
        ))}
      </Select>

      {/* Origin Select */}
      <OriginSelect
        value={origin}
        onChange={setOrigin}
        required
        sx={{ mb: 2 }}
      />

      {/* Submit Button */}
      <Button variant="contained" color="primary" type="submit" disabled={submitting}>
        {submitting ? <CircularProgress size={24} /> : 'Dodaj sprzęt'}
      </Button>

      {/* Barcode Scanner — skanowanie numeru seryjnego z urządzenia.
          Szerszy zestaw czytników 1D niż domyślny PYR (Code 128), bo serial
          producenta bywa zakodowany różnymi symbolikami (Code 39, EAN, …). */}
      {showScanner && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onClose={() => setShowScanner(false)}
            onScan={(code) => {
              setSerial(code);
              setShowScanner(false);
            }}
            title="Skanuj numer seryjny"
            subtitle="Zeskanuj kod kreskowy z urządzenia"
            readers={[
              'code_128_reader',
              'code_39_reader',
              'code_39_vin_reader',
              'code_93_reader',
              'ean_reader',
              'ean_8_reader',
              'upc_reader',
              'upc_e_reader',
              'codabar_reader',
              'i2of5_reader',
            ]}
          />
        </Suspense>
      )}

      {/* Barcode Dialog */}
      <Dialog
        open={showBarcode}
        onClose={() => setShowBarcode(false)}
        maxWidth="md"
        fullWidth
      >
        {createdAsset && (
          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            <BarcodeGenerator
              assets={[createdAsset]}
              onClose={() => setShowBarcode(false)}
            />
          </Suspense>
        )}
      </Dialog>
    </Box>
  );
};
