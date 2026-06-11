import React from 'react';
import { Box, Typography, Chip, Button, useTheme } from '@mui/material';
import { LocationOn, Delete as DeleteIcon, MonitorHeart } from '@mui/icons-material';
import QrCodeScanner from '@mui/icons-material/QrCodeScanner';
import type { EquipmentType } from './types';

interface ActionCardsProps {
  type: EquipmentType | string;
  status: string;
  isDeleting: boolean;
  onShowBarcode: () => void;
  onTagLocation: () => void;
  onDelete: () => void;
}

const getStatusChip = (status: string) => {
  switch (status) {
    case 'available':
      return <Chip label="Na Stanie" color="success" sx={{ fontWeight: 600, fontSize: '1rem' }} />;
    case 'in_transit':
      return <Chip label="W transporcie" color="warning" sx={{ fontWeight: 600, fontSize: '1rem', animation: 'pulse 2s infinite' }} />;
    case 'unavailable':
      return <Chip label="Niedostępny" color="error" sx={{ fontWeight: 600, fontSize: '1rem' }} />;
    default:
      return <Chip label="Nieznany" color="default" sx={{ fontWeight: 600, fontSize: '1rem' }} />;
  }
};

const ActionCards: React.FC<ActionCardsProps> = ({ type, status, isDeleting, onShowBarcode, onTagLocation, onDelete }) => {
  const theme = useTheme();

  const cardSx = {
    bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
    borderRadius: 3,
    p: 2,
    minHeight: 170,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 2,
    transition: 'box-shadow 0.2s, background 0.2s',
    '&:hover': {
      boxShadow: 6,
      bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
    },
  } as const;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',      // <700px: 1 kolumna
          sm: '1fr 1fr', // 700px-1099px: 2 kolumny
          md: '1fr 1fr', // 1100px-: 2 kolumny (przygotowanie do 4 kolumn powyżej)
          lg: 'repeat(4, 1fr)' // >1400px: 4 kolumny
        },
        gap: 2,
        mt: 2,
        mb: 2,
      }}
    >
      {/* Status */}
      <Box sx={cardSx}>
        <MonitorHeart sx={{ fontSize: 38, color: 'primary.main', mb: 1 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Status
        </Typography>
        {getStatusChip(status)}
      </Box>

      {/* Kod kreskowy */}
      <Box sx={cardSx}>
        <QrCodeScanner sx={{ fontSize: 38, color: 'warning.main', mb: 1 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Kod kreskowy
        </Typography>
        <Button
          variant="contained"
          color="warning"
          size="small"
          onClick={onShowBarcode}
          sx={{ borderRadius: 2, px: 3, fontWeight: 600, mt: 1 }}
        >
          Pokaż kod
        </Button>
      </Box>

      {/* Dodaj pinezkę (tylko dla asset) */}
      {type === 'asset' ? (
        <Box sx={cardSx}>
          <LocationOn sx={{ fontSize: 38, color: 'primary.main', mb: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Oznacz lokalizację
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<LocationOn />}
            onClick={onTagLocation}
            sx={{ borderRadius: 2, px: 3, fontWeight: 600, mt: 1 }}
          >
            Taguj
          </Button>
        </Box>
      ) : (
        <Box />
      )}

      {/* Usuń zasób (tylko dla asset) */}
      {type === 'asset' ? (
        <Box sx={cardSx}>
          <DeleteIcon sx={{ fontSize: 38, color: 'error.main', mb: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Usuń zasób
          </Typography>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={onDelete}
            disabled={isDeleting}
            sx={{ borderRadius: 2, px: 3, fontWeight: 600, mt: 1 }}
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </Box>
      ) : (
        <Box />
      )}
    </Box>
  );
};

export default ActionCards;
