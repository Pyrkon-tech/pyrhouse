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

export interface UserTransfer {
  ID: number;
  FromLocationID: number;
  FromLocationName: string;
  ToLocationID: number;
  ToLocationName: string;
  TransferDate: string;
  Status: 'in_transit' | 'completed' | 'cancelled';
}

const STATUS_LABELS: Record<UserTransfer['Status'], { label: string; color: 'warning' | 'success' | 'error' }> = {
  in_transit: { label: 'Oczekujący', color: 'warning' },
  completed: { label: 'Potwierdzony', color: 'success' },
  cancelled: { label: 'Anulowany', color: 'error' },
};

const UserTransfersList: React.FC<{
  transfers: UserTransfer[];
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
          formattedDate = format(new Date(transfer.TransferDate), 'PPpp', { locale: pl });
        } catch {
          formattedDate = transfer.TransferDate;
        }

        const status = STATUS_LABELS[transfer.Status];

        return (
          <ListItem
            key={transfer.ID}
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
              onClick={() => onNavigate(transfer.ID)}
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
                      Transfer #{transfer.ID}
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
                  <Typography variant="body2">Z: {transfer.FromLocationName}</Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.5
                  }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2">Do: {transfer.ToLocationName}</Typography>
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
