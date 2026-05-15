import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Dialog,
  DialogContent,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
} from '@mui/material';
import { bulkAddAssetsAPI } from '../../services/assetService';
import { BarcodeGenerator } from '../common/BarcodeGenerator';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { OriginSelect } from '../ui/OriginSelect';

interface AssetEntry {
  id: string;
  serial: string;
}

interface CreatedAsset {
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
}

interface BulkAddAssetFormProps {
  categories: any[];
}

const DeleteIcon = lazy(() => import('@mui/icons-material/Delete'));
const AddIcon = lazy(() => import('@mui/icons-material/Add'));

export const BulkAddAssetForm: React.FC<BulkAddAssetFormProps> = ({ categories }) => {
  // Filtrowanie kategorii tylko dla typu "asset"
  const assetCategories = categories.filter((category) => category.type === 'asset');
  
  const [assets, setAssets] = useState<AssetEntry[]>([
    { id: Date.now().toString(), serial: '' },
  ]);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [origin, setOrigin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAssets, setCreatedAssets] = useState<CreatedAsset[]>([]);
  const [showBarcodes, setShowBarcodes] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, assets.length);
  }, [assets]);

  // Efekt czyszczący stan przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      resetForm();
    };
  }, []);

  const handleSerialChange = (index: number, value: string) => {
    const newAssets = [...assets];
    newAssets[index].serial = value;
    setAssets(newAssets);
  };

  const handleDeleteRow = (index: number) => {
    const newAssets = assets.filter((_, i) => i !== index);
    setAssets(newAssets);
  };

  const handleAddRow = () => {
    setAssets([...assets, { id: Date.now().toString(), serial: '' }]);
  };

  const resetForm = () => {
    setAssets([{ id: Date.now().toString(), serial: '' }]);
    setCategoryId(0);
    setOrigin('');
    setCreatedAssets([]);
    setShowBarcodes(false);
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Validate inputs
    if (!categoryId) {
      showSnackbar('error', 'Wybierz kategorię');
      setIsSubmitting(false);
      return;
    }

    if (!origin) {
      showSnackbar('error', 'Wybierz pochodzenie');
      setIsSubmitting(false);
      return;
    }

    const validAssets = assets.filter(asset => asset.serial.trim() !== '');
    if (validAssets.length === 0) {
      showSnackbar('error', 'Dodaj co najmniej jeden numer seryjny');
      setIsSubmitting(false);
      return;
    }

    const serials = validAssets.map(a => a.serial.trim());
    const duplicates = serials.filter((item, idx) => serials.indexOf(item) !== idx);
    if (duplicates.length > 0) {
      showSnackbar('error', 'Występują powtarzające się numery seryjne!');
      setIsSubmitting(false);
      return;
    }

    try {
      const assetsToSubmit = validAssets.map(asset => ({
        serial: asset.serial,
        category_id: categoryId,
        origin,
      }));

      const response = await bulkAddAssetsAPI(assetsToSubmit);

      if (response && Array.isArray(response.created)) {
        // Resetuj formularz od razu po sukcesie
        setAssets([{ id: Date.now().toString(), serial: '' }]);
        setCategoryId(0);
        setOrigin('');
        
        // Zachowaj tylko komunikat sukcesu i otwórz modal z kodami
        showSnackbar('success', 'Zasoby zostały dodane pomyślnie');
        setCreatedAssets(response.created);
        setShowBarcodes(true);
      } else {
        if (response && response.errors && Array.isArray(response.errors)) {
          showSnackbar('error', response.errors.join('\n'));
        } else {
          showSnackbar('error', 'Niepoprawna odpowiedź z API');
        }
      }
    } catch (err: any) {
      if (err && err.errors && Array.isArray(err.errors)) {
        showSnackbar('error', err.errors.join('\n'));
      } else if (err && err.message) {
        showSnackbar('error', err.message);
      } else {
        showSnackbar('error', 'Wystąpił błąd podczas dodawania zasobów');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLDivElement>, index: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      
      if (index === assets.length - 1) {
        handleAddRow();
        
        setTimeout(() => {
          if (inputRefs.current[assets.length]) {
            inputRefs.current[assets.length]?.focus();
          }
        }, 0);
      } else {
        if (inputRefs.current[index + 1]) {
          inputRefs.current[index + 1]?.focus();
        }
      }
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Kategoria</InputLabel>
            <Select
              value={categoryId || ''}
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
        <Grid item xs={12} md={6}>
          <OriginSelect
            value={origin}
            onChange={setOrigin}
            required
          />
        </Grid>
      </Grid>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 36, color: 'text.secondary', fontSize: 12 }}>#</TableCell>
              <TableCell>Numer seryjny</TableCell>
              <TableCell sx={{ width: 40 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map((asset, index) => {
              const serialTrimmed = asset.serial.trim();
              const isDuplicate =
                serialTrimmed !== '' &&
                assets.filter((a, i) => a.serial.trim() === serialTrimmed && i !== index).length > 0;
              return (
                <TableRow key={asset.id}>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{index + 1}</TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={asset.serial}
                      onChange={(e) => handleSerialChange(index, e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, index)}
                      placeholder="Wprowadź numer seryjny"
                      inputRef={(el) => (inputRefs.current[index] = el)}
                      error={isDuplicate}
                      helperText={isDuplicate ? 'Duplikat numeru seryjnego' : ''}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <IconButton
                      onClick={() => handleDeleteRow(index)}
                      disabled={assets.length === 1}
                      size="small"
                    >
                      <Suspense fallback={null}><DeleteIcon /></Suspense>
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<Suspense fallback={null}><AddIcon /></Suspense>}
          onClick={handleAddRow}
        >
          Dodaj wiersz
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Dodawanie...' : 'Dodaj zasoby'}
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