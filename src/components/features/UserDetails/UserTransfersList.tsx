import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { LocalShipping, LocationOn } from '@mui/icons-material';

import type { TransferStatus, TransferSummary } from '../../../types/transfer.types';

const STATUS_LABELS: Record<TransferStatus, { label: string; color: 'warning' | 'success' | 'error' }> = {
  in_transit: { label: 'Oczekujący', color: 'warning' },
  completed: { label: 'Potwierdzony', color: 'success' },
  cancelled: { label: 'Anulowany', color: 'error' },
};

const UserTransfersList: React.FC<{
  transfers: TransferSummary[];
  loading: boolean;
  emptyMessage: string;
  onNavigate: (id: number) => void;
}> = ({ transfers, loading, emptyMessage, onNavigate }) => {
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          p: 3
        }}>
        <CircularProgress />
      </Box>
    );
  }

  if (transfers.length === 0) {
    return <Alert severity="info">{emptyMessage}</Alert>;
  }

  return (
    <List sx={{ p: 0 }}>
      {transfers.map((transfer) => {
        let formattedDate: string;
        try {
          formattedDate = format(new Date(transfer.transfer_date), 'PPpp', { locale: pl });
        } catch {
          formattedDate = transfer.transfer_date;
        }

        const status = STATUS_LABELS[transfer.status];

        return (
          <ListItem
            key={transfer.id}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 2,
              p: 0,
              '&:last-child': { mb: 0 },
            }}
          >
            <ListItemButton
              onClick={() => onNavigate(transfer.id)}
              sx={{
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: { xs: 1, sm: 0 } }}>
                <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                  <LocalShipping />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      Transfer #{transfer.id}
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
                <Chip label={status.label} color={status.color} size="small" sx={{ ml: { xs: 'auto', sm: 2 } }} />
              </Box>
              <Box sx={{ width: '100%', mt: { xs: 1, sm: 0 }, pl: { xs: 0, sm: 7 } }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.5
                  }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2">Z: {transfer.from_location.name}</Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.5
                  }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2">Do: {transfer.to_location.name}</Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: "text.secondary"
                  }}>
                  Utworzono: {formattedDate}
                </Typography>
              </Box>
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};

export default UserTransfersList;
