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
import { getApiUrl } from '../../config/api';

const ORIGIN_OPTIONS = ['druga-era', 'probis', 'netland', 'dj-sound', 'oki-event', 'targowe', 'personal', 'other'];

export const AddStockForm: React.FC<{ categories: any[]; loading: boolean }> = ({ categories }) => {
  const stockCategories = categories.filter((category) => category.type === 'stock');
  const [stockCategoryID, setStockCategoryID] = useState('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [origin, setOrigin] = useState('probis'); // Default value for origin
  const [customOrigin, setCustomOrigin] = useState(''); // For personal/other origin
  const [submitting, setSubmitting] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    // Validate custom origin if required
    if ((origin === 'personal' || origin === 'other') && !customOrigin.trim()) {
      showSnackbar('error', 'Wymagane dodatkowe informacje dla personal/other');
      setSubmitting(false);
      return;
    }

    // Construct final origin
    let finalOrigin = origin;
    if (origin === 'personal') finalOrigin = `personal-${customOrigin}`;
    else if (origin === 'other') finalOrigin = `other-${customOrigin}`;

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
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/stocks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: stockCategoryID,
          quantity: Number(quantity),
          origin: finalOrigin,
        }),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        showSnackbar('error', 'Nie udało się dodać stanu magazynowego', errorResponse.error || 'Brak szczegółów');
        return;
      }

      await response.json();
      showSnackbar('success', 'Stan magazynowy został dodany pomyślnie');

      // Reset form
      setStockCategoryID('');
      setQuantity('');
      // setOrigin('probis'); // Reset to default origin
      setCustomOrigin(''); // Clear custom origin
    } catch (err: any) {
      showSnackbar('error', 'Wystąpił błąd podczas dodawania zasobu', err.message);
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
      <FormControl fullWidth required sx={{ mb: 2 }}>
        <InputLabel>Pochodzenie</InputLabel>
        <Select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          label="Pochodzenie"
          defaultValue='druga-era'
        >
          {ORIGIN_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Custom Origin Input */}
      {(origin === 'personal' || origin === 'other') && (
        <TextField
          label={origin === 'personal' ? 'Do kogo należy?' : 'Inne? Jakie?'}
          value={customOrigin}
          onChange={(e) => setCustomOrigin(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
      )}

      {/* Submit Button */}
      <Button variant="contained" color="primary" type="submit" disabled={submitting}>
        {submitting ? <CircularProgress size={24} /> : 'Dodaj stan magazynowy'}
      </Button>
    </Box>
  );
};
