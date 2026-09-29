import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number | null;
  label: string;
  size?: 'small' | 'medium';
}

const QuantityStepper: React.FC<QuantityStepperProps> = ({ value, onChange, min = 0, max, label, size = 'medium' }) => {
  const box = size === 'small' ? 32 : 36;
  const btnSx = { width: box, height: box, borderRadius: '9px', border: 1, borderColor: 'divider' };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} role="group" aria-label={`Ilość: ${label}`}>
      <IconButton sx={btnSx} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Mniej: ${label}`}>
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography component="span" aria-live="polite" sx={{ width: 28, textAlign: 'center', fontWeight: 700 }}>
        {value}
      </Typography>
      <IconButton sx={btnSx} onClick={() => onChange(value + 1)} disabled={max != null && value >= max} aria-label={`Więcej: ${label}`}>
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default QuantityStepper;
