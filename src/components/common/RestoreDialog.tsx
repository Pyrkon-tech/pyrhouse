import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

interface RestoreDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (locationId: number, quantity?: number) => void;
  locations: Array<{ id: number; name: string }>;
  itemType: 'asset' | 'stock';
  currentQuantity?: number;
}

const RestoreDialog: React.FC<RestoreDialogProps> = ({ 
  open, 
  onClose, 
  onConfirm, 
  locations, 
  itemType, 
  currentQuantity 
}) => {
  const [selectedLocation, setSelectedLocation] = useState<number>(1);
  const [quantity, setQuantity] = useState<string>('');

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setQuantity(value);
    }
  };

  const handleConfirm = () => {
    const numericQuantity = quantity === '' ? 0 : parseInt(quantity);
    if (itemType === 'stock' && (numericQuantity <= 0 || numericQuantity > (currentQuantity || 1))) {
      return;
    }
    onConfirm(selectedLocation, itemType === 'stock' ? numericQuantity : undefined);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Przywróć do magazynu</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Wybierz magazyn</InputLabel>
          <Select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(Number(e.target.value))}
            label="Wybierz magazyn"
          >
            {locations.map((location) => (
              <MenuItem key={location.id} value={location.id}>
                {location.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {itemType === 'stock' && (
          <TextField
            fullWidth
            label="Ilość do zwrócenia"
            value={quantity}
            onChange={handleQuantityChange}
            inputProps={{ 
              inputMode: 'numeric',
              pattern: '[0-9]*',
              min: 1,
              max: currentQuantity
            }}
            helperText={`Maksymalna dostępna ilość: ${currentQuantity}`}
            sx={{ mt: 2 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="primary"
          disabled={itemType === 'stock' && (quantity === '' || parseInt(quantity) <= 0 || parseInt(quantity) > (currentQuantity || 1))}
        >
          Potwierdź
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RestoreDialog; 