import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { LocationOn, Person, Inventory } from '@mui/icons-material';
import { TransferFormData } from '../../../../types/transfer.types';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formData: TransferFormData | null;
  locations: Array<{ id: number; name: string }>;
  loading: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  formData,
  locations,
  loading,
}) => {
  if (!formData) return null;

  return (
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Lokalizacje */}
          <Box sx={{ 
            p: 1.5, 
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
          }}>
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
            <Box sx={{ 
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}>
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
          <Box sx={{
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Inventory sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1">Elementy do transferu</Typography>
            </Box>

            {/* Summary chips */}
            {(() => {
              const validItems = formData.items.filter(item =>
                item.type === 'pyr_code' ? item.status === 'success' : Boolean(item.id)
              );
              const summary = validItems.reduce<Record<string, number>>((acc, item) => {
                const label = item.category?.label ?? (item.type === 'pyr_code' ? item.pyrcode : 'Nieznany');
                const qty = item.type === 'pyr_code' ? 1 : item.quantity;
                acc[label] = (acc[label] ?? 0) + qty;
                return acc;
              }, {});
              const entries = Object.entries(summary);
              if (entries.length === 0) return null;
              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                  {entries.map(([label, count]) => (
                    <Chip
                      key={label}
                      label={`${count}× ${label}`}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 700 }}
                    />
                  ))}
                </Box>
              );
            })()}

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
                      slotProps={{ secondary: { component: 'div' } }}
                      primary={item.type === 'pyr_code'
                        ? item.pyrcode
                        : item.category?.label}
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
        >
          Anuluj
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? 'Tworzenie...' : 'Rozpocznij transfer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 