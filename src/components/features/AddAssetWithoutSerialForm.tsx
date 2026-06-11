import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Grid
} from '@mui/material';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { AppSnackbar } from '../ui/AppSnackbar';
import { addAssetsWithoutSerialAPI } from '../../services/assetService';
import { BarcodeGenerator } from '../common/BarcodeGenerator';
import { OriginSelect } from '../ui/OriginSelect';

export const AddAssetWithoutSerialForm: React.FC<{
  categories: Array<{ id: number; label: string; type: 'asset' | 'stock' }>;
}> = ({ categories }) => {
  const assetCategories = categories.filter((category) => category.type === 'asset');
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [origin, setOrigin] = useState<string>('probis');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAssets, setCreatedAssets] = useState<React.ComponentProps<typeof BarcodeGenerator>['assets']>([]);
  const [showBarcodes, setShowBarcodes] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const handleQuantityFocus = () => {
    setQuantityInput(quantity.toString());
  };

  const handleQuantityBlur = () => {
    const numValue = parseInt(quantityInput, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setQuantity(numValue);
      setQuantityInput(numValue.toString());
    } else {
      setQuantity(1);
      setQuantityInput('1');
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantityInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseInt(quantityInput, 10);
    if (!numValue || numValue < 1) {
      showSnackbar('error', 'Podaj poprawną ilość (min. 1)');
      return;
    }
    if (!categoryId) {
      showSnackbar('error', 'Wybierz kategorię');
      return;
    }
    if (!origin) {
      showSnackbar('error', 'Wybierz pochodzenie');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await addAssetsWithoutSerialAPI({
        quantity,
        category_id: Number(categoryId),
        origin
      });
      if (response && Array.isArray(response.created)) {
        setCreatedAssets(response.created);
        setShowBarcodes(true);
        showSnackbar('success', 'Sprzęty zostały dodane pomyślnie!');
        // Resetuj formularz
        setQuantity(1);
        setCategoryId('');
        setOrigin('probis');
      } else {
        showSnackbar('error', 'Niepoprawna odpowiedź z API');
      }
    } catch (err) {
      showSnackbar('error', (err instanceof Error ? err.message : '') || 'Wystąpił błąd podczas dodawania sprzętu bez numeru seryjnego');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            label="Ilość"
            type="text"
            value={quantityInput}
            onChange={handleQuantityChange}
            onFocus={handleQuantityFocus}
            onBlur={handleQuantityBlur}
            inputProps={{ min: 1 }}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth required>
            <InputLabel>Kategoria</InputLabel>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              label="Kategoria"
            >
              {assetCategories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <OriginSelect
            value={origin}
            onChange={setOrigin}
            required
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Dodaj sprzęt(y)'}
        </Button>
      </Box>
      <Dialog
        open={showBarcodes}
        onClose={() => {
          setShowBarcodes(false);
          setCreatedAssets([]);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Wygenerowane kody kreskowe</DialogTitle>
        <DialogContent>
          {createdAssets.length > 0 ? (
            <BarcodeGenerator
              assets={createdAssets}
              onClose={() => {
                setShowBarcodes(false);
                setCreatedAssets([]);
              }}
            />
          ) : (
            <Typography color="error">
              Brak danych do wygenerowania kodów kreskowych
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}; 