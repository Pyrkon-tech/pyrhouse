import React from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import LocationOn from '@mui/icons-material/LocationOn';
import Person from '@mui/icons-material/Person';
import Inventory from '@mui/icons-material/Inventory';
import Close from '@mui/icons-material/Close';
import Check from '@mui/icons-material/Check';
import type { TransferFormValues, FormStock } from './transferFormModel';
import type { Location } from '../../../../types/location.types';

interface TransferConfirmDialogProps {
  open: boolean;
  loading: boolean;
  formData: TransferFormValues | null;
  locations: Location[];
  stocks: FormStock[];
  onClose: () => void;
  onConfirm: () => void;
}

const sectionSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'background.paper',
  '&:hover': {
    bgcolor: 'background.paper'
  }
} as const;

const TransferConfirmDialog: React.FC<TransferConfirmDialogProps> = ({
  open,
  loading,
  formData,
  locations,
  stocks,
  onClose,
  onConfirm,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="md"
    fullWidth
    slotProps={{
      paper: {
        sx: {
          borderRadius: 1,
          p: 0.5
        }
      }
    }}
  >
    <DialogTitle
      component="div"
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1
      }}
    >
      <Typography variant="h6">
        Potwierdź szczegóły questa
      </Typography>
    </DialogTitle>

    <DialogContent sx={{ mt: 1 }}>
      {formData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Lokalizacje */}
          <Box sx={sectionSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1">Lokalizacje</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{
                flex: 1
              }}>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>Z lokalizacji</Typography>
                <Typography>{locations.find(l => l.id === formData.fromLocation)?.name}</Typography>
              </Box>
              <Box sx={{
                flex: 1
              }}>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>Do lokalizacji</Typography>
                <Typography>{locations.find(l => l.id === parseInt(formData.toLocation?.toString() || ''))?.name}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Uczestnicy */}
          {formData.users && formData.users.length > 0 && (
            <Box sx={sectionSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Person sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle1">Uczestnicy questa</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {formData.users.map((user) => (
                  <Chip
                    key={user.id}
                    label={user.username}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Elementy */}
          <Box sx={sectionSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Inventory sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1">Elementy do transferu</Typography>
            </Box>
            <List disablePadding>
              {formData.items
                .filter(item => item.type === 'pyr_code' ? item.status === 'success' : Boolean(item.id))
                .map((item, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      py: 0.5,
                      borderBottom: index !== formData.items.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemText
                      primary={item.type === 'pyr_code'
                        ? item.pyrcode
                        : stocks.find(s => s.id === parseInt(item.id))?.category.label}
                      secondary={
                        <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                          <Chip
                            size="small"
                            label={item.type === 'pyr_code' ? 'Sprzęt' : `${item.quantity} szt.`}
                            color={item.type === 'pyr_code' ? 'primary' : 'default'}
                            variant="outlined"
                          />
                          {item.category?.label && (
                            <Chip
                              size="small"
                              label={item.category.label}
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
            </List>
          </Box>
        </Box>
      )}
    </DialogContent>

    <DialogActions sx={{
      borderTop: '1px solid',
      borderColor: 'divider',
      p: 1,
      gap: 1
    }}>
      <Button
        onClick={onClose}
        variant="outlined"
        startIcon={<Close />}
      >
        Anuluj
      </Button>
      <Button
        onClick={onConfirm}
        variant="contained"
        color="primary"
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <Check />}
      >
        {loading ? 'Tworzenie...' : 'Rozpocznij transfer'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default TransferConfirmDialog;
