import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
} from '@mui/material';
import { createTransferAPI } from '../../../../services/transferService';

interface StockItem {
  id: number;
  category: {
    id: number;
    name: string;
    type: string;
  };
  quantity: number;
}

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  fromLocationId: number;
  selectedAssets: number[];
  selectedStocks: number[];
  stockItems: StockItem[];
  locations: Array<{ id: number; name: string }>;
  locationsLoading?: boolean;
  locationsError?: string | null;
  onSuccess: (transferId: number) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  open,
  onClose,
  fromLocationId,
  selectedAssets,
  selectedStocks,
  stockItems,
  locations,
  locationsLoading,
  locationsError,
  onSuccess
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toLocationId, setToLocationId] = React.useState<number | ''>('');
  const [stockQuantities, setStockQuantities] = React.useState<Record<number, number>>({});

  React.useEffect(() => {
    const initialQuantities: Record<number, number> = {};
    selectedStocks.forEach(stockId => {
      const stockItem = stockItems.find(item => item.id === stockId);
      if (stockItem) {
        initialQuantities[stockId] = stockItem.quantity;
      }
    });
    setStockQuantities(initialQuantities);
  }, [selectedStocks, stockItems]);

  const handleQuantityChange = (stockId: number, quantity: number) => {
    setStockQuantities(prev => ({
      ...prev,
      [stockId]: quantity
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Walidacja ilości przedmiotów
      for (const stockId of selectedStocks) {
        const stockItem = stockItems.find(item => item.id === stockId);
        const requestedQuantity = stockQuantities[stockId] || 1;
        
        if (!stockItem) {
          throw new Error('Nie znaleziono wybranego przedmiotu');
        }
        
        if (requestedQuantity > stockItem.quantity) {
          throw new Error(`Nie można przenieść ${requestedQuantity} sztuk przedmiotu ${stockItem.category.name}. Dostępna ilość: ${stockItem.quantity}`);
        }
      }

      const payload = {
        from_location_id: fromLocationId,
        location_id: Number(toLocationId),
        assets: selectedAssets.map(id => ({ id })),
        stocks: selectedStocks.map(id => ({ 
          id,
          quantity: stockQuantities[id] || 1
        })),
      };

      const response = await createTransferAPI(payload);
      onSuccess(response.id);
      onClose();
    } catch (err) {
      setError((err instanceof Error ? err.message : '') || 'Wystąpił błąd podczas tworzenia transferu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      role="dialog"
      aria-modal="true"
    >
      <DialogTitle>Utwórz transfer</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Wybierz lokalizację docelową</InputLabel>
          <Select
            value={toLocationId}
            onChange={(e) => setToLocationId(Number(e.target.value))}
            label="Wybierz lokalizację docelową"
            disabled={loading || locationsLoading}
          >
            {locationsLoading ? (
              <MenuItem disabled>
                <CircularProgress size={20} />
              </MenuItem>
            ) : locationsError ? (
              <MenuItem disabled>
                <Typography color="error">{locationsError}</Typography>
              </MenuItem>
            ) : locations.length === 0 ? (
              <MenuItem disabled>
                <Typography>Brak dostępnych lokalizacji</Typography>
              </MenuItem>
            ) : (
              locations
                .filter(loc => loc.id !== fromLocationId)
                .map(location => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))
            )}
          </Select>
        </FormControl>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Zaznaczone elementy:
          </Typography>
          {selectedAssets.length > 0 && (
            <Typography variant="body2">
              Sprzęt: {selectedAssets.length} sztuk
            </Typography>
          )}
          {selectedStocks.length > 0 && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Zasoby:
              </Typography>
              {selectedStocks.map(stockId => {
                const stockItem = stockItems.find(item => item.id === stockId);
                return (
                  <Box key={stockId} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="body2">
                      {stockItem?.category.name || 'Nieznany zasób'}
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      value={stockQuantities[stockId] || ''}
                      onChange={(e) => {
                        // const value = e.target.value === '' ? '' : Number(e.target.value);
                        handleQuantityChange(stockId, Number(e.target.value));
                      }}
                      helperText=""
                      error={
                        !/^[1-9][0-9]*$/.test(stockQuantities[stockId]?.toString() || '') ||
                        Number(stockQuantities[stockId]) > Number(stockItem?.quantity || 1)
                      }
                      inputProps={{
                        min: 1,
                        max: stockItem?.quantity || 1,
                        inputMode: 'numeric',
                        pattern: '[0-9]*'
                      }}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      (dostępne: {stockItem?.quantity || 0})
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Anuluj
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !toLocationId || (selectedAssets.length === 0 && selectedStocks.length === 0)}
        >
          {loading ? <CircularProgress size={24} /> : 'Utwórz transfer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 