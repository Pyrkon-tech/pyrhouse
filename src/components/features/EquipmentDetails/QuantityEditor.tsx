import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';

interface QuantityEditorProps {
  quantity: number | undefined;
  canEdit: boolean;
  /** Saves the quantity; resolves to true on success (editor closes itself then) */
  onSave: (quantity: number) => Promise<boolean>;
}

const QuantityEditor: React.FC<QuantityEditorProps> = ({ quantity, canEdit, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<number | null>(quantity ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(quantity ?? null);
  }, [quantity]);

  const handleSave = async () => {
    if (value == null || value === quantity) return;
    setSaving(true);
    try {
      if (await onSave(value)) {
        setIsEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mt: 2,
        mb: 2,
      }}
    >
      <Typography variant="subtitle1" sx={{ minWidth: 80 }}>
        Ilość:
      </Typography>
      {canEdit ? (
        isEditing ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setValue((prev) => (prev !== null ? prev - 1 : 0))}
              disabled={saving || (value !== null && value <= 0)}
            >
              -
            </Button>
            <TextField
              type="number"
              size="small"
              value={value ?? ''}
              onChange={e => setValue(Number(e.target.value))}
              disabled={saving}
              slotProps={{
                htmlInput: { min: 0, style: { textAlign: 'center', width: 60 } }
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setValue((prev) => (prev !== null ? prev + 1 : 1))}
              disabled={saving}
            >
              +
            </Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={handleSave}
              disabled={saving}
              sx={{ ml: 1 }}
            >
              Zapisz
            </Button>
            <Button
              variant="text"
              size="small"
              color="inherit"
              onClick={() => {
                setIsEditing(false);
                setValue(quantity ?? null);
              }}
              disabled={saving}
            >
              Anuluj
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{
              fontWeight: "bold"
            }}>
              {quantity}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setIsEditing(true)}
              sx={{ ml: 1 }}
            >
              Edytuj
            </Button>
          </Box>
        )
      ) : (
        <Typography variant="body1" sx={{
          fontWeight: "bold"
        }}>
          {quantity}
        </Typography>
      )}
    </Box>
  );
};

export default QuantityEditor;
