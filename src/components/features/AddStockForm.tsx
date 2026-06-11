import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { apiClient, ApiError } from '../../services/apiClient';
import { OriginSelect } from '../ui/OriginSelect';

export const AddStockForm: React.FC<{
  categories: Array<{ id: number; label: string; type: 'asset' | 'stock' }>;
  loading: boolean;
}> = ({ categories }) => {
  const stockCategories = categories.filter((category) => category.type === 'stock');
  const [stockCategoryID, setStockCategoryID] = useState('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [origin, setOrigin] = useState('probis');
  const [submitting, setSubmitting] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const finalOrigin = origin;

    if (!stockCategoryID) {
      showSnackbar('error', 'Wybierz kategorię');
      setSubmitting(false);
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      showSnackbar('error', 'Podaj poprawną ilość');
      setSubmitting(false);
      return;
    }

    try {
      await apiClient.post('/stocks', {
        category_id: stockCategoryID,
        quantity: Number(quantity),
        origin: finalOrigin,
      });
      showSnackbar('success', 'Stan magazynowy został dodany pomyślnie');

      // Reset form
      setStockCategoryID('');
      setQuantity('');
    } catch (err) {
      if (err instanceof ApiError) {
        showSnackbar('error', 'Nie udało się dodać stanu magazynowego', err.message || 'Brak szczegółów');
      } else {
        showSnackbar('error', 'Wystąpił błąd podczas dodawania zasobu', err instanceof Error ? err.message : 'Brak szczegółów');
      }
    } finally {
      setSubmitting(false);
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

      {/* Category Select */}
      <FormControl fullWidth required sx={{ mb: 2 }}>
        <InputLabel id="category-label" shrink={true} >Kategoria</InputLabel>
        <Select
          labelId="category-label"
          value={stockCategoryID}
          onChange={(e) => setStockCategoryID(e.target.value)}
          label="Kategoria"
          displayEmpty
          sx={{
            '& .MuiSelect-select': { color: 'text.primary' }
          }}
        >
          <MenuItem value="" disabled>
            Wybierz kategorię
          </MenuItem>
          {stockCategories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Quantity Input */}
      <TextField
        label="Ilość"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        fullWidth
        required
        type="number"
        sx={{ mb: 2 }}
      />

      {/* Origin Select */}
      <OriginSelect
        value={origin}
        onChange={setOrigin}
        required
        sx={{ mb: 2 }}
      />

      {/* Submit Button */}
      <Button variant="contained" color="primary" type="submit" disabled={submitting}>
        {submitting ? <CircularProgress size={24} /> : 'Dodaj stan magazynowy'}
      </Button>
    </Box>
  );
};
