import React, { useState } from 'react';
import {
  Box,
  Button,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Dialog,
} from '@mui/material';
import { BarcodeGenerator } from '../common/BarcodeGenerator';
import { apiClient, ApiError } from '../../services/apiClient';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { OriginSelect } from '../ui/OriginSelect';

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

      {/* Serial Input */}
      <TextField
        label="Numer Seryjny"
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
        fullWidth
        required
        sx={{ mb: 2 }}
      />

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

      {/* Barcode Dialog */}
      <Dialog
        open={showBarcode}
        onClose={() => setShowBarcode(false)}
        maxWidth="md"
        fullWidth
      >
        {createdAsset && (
          <BarcodeGenerator
            assets={[createdAsset]}
            onClose={() => setShowBarcode(false)}
          />
        )}
      </Dialog>
    </Box>
  );
};
