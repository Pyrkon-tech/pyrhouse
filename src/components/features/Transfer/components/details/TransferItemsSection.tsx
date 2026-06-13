import React, { lazy, Suspense } from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { TransferDetails } from '../../../../../types/transfer.types';
import { getStatusIcon } from './transferStatus';

const RestoreIcon = lazy(() => import('@mui/icons-material/Restore'));

interface TransferItemsSectionProps {
  transfer: TransferDetails;
  onRestoreClick: (id: number, type: 'asset' | 'stock', categoryId?: number) => void;
}

const TransferItemsSection: React.FC<TransferItemsSectionProps> = ({ transfer, onRestoreClick }) => (
  <>
    <Paper sx={{ mt: 4, p: { xs: 1.5, sm: 3 } }}>
      <Typography variant="h6">Sprzęt</Typography>
      {transfer.assets && transfer.assets.length > 0 ? (
        <List sx={{ width: '100%' }}>
          {transfer.assets.map((asset) => (
            <ListItem
              key={asset.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 2,
                px: 0,
              }}
              secondaryAction={
                transfer.status === 'in_transit' && (
                  <Tooltip title="Przywróć do magazynu">
                    <IconButton
                      edge="end"
                      aria-label="restore"
                      onClick={() => onRestoreClick(asset.id, 'asset')}
                      sx={{ ml: 2 }}
                    >
                      <Suspense fallback={null}><RestoreIcon /></Suspense>
                    </IconButton>
                  </Tooltip>
                )
              }
            >
              <ListItemAvatar sx={{ minWidth: 0 }}>
                <Chip
                  icon={getStatusIcon(asset.status)}
                  color="success"
                  sx={{ mr: 2, pl: 1, fontSize: { xs: '0.85rem', sm: '1rem' }, minWidth: 44, height: 36 }}
                />
              </ListItemAvatar>
              <ListItemText
                slotProps={{ primary: { component: 'div' }, secondary: { component: 'div' } }}
                primary={<Typography sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>{`${asset.category?.label || 'N/A'} ${asset.pyrcode}`}</Typography>}
                secondary={<Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{`Pochodzenie: ${asset.origin || 'N/A'}`}</Typography>}
                sx={{ ml: 1 }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography>Brak sprzętu w tej dostawie.</Typography>
      )}
    </Paper>

    <Paper sx={{ mt: 4, p: { xs: 1.5, sm: 3 } }}>
      <Typography variant="h6">Zasoby</Typography>
      {transfer.stock_items && transfer.stock_items.length > 0 ? (
        <List sx={{ width: '100%' }}>
          {transfer.stock_items.map((stock) => (
            <ListItem
              key={stock.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 2,
                px: 0,
              }}
              secondaryAction={
                transfer.status === 'in_transit' && (
                  <Tooltip title="Przywróć do magazynu">
                    <IconButton
                      edge="end"
                      aria-label="restore"
                      onClick={() => onRestoreClick(stock.id, 'stock', stock.category.id)}
                      sx={{ ml: 2 }}
                    >
                      <Suspense fallback={null}><RestoreIcon /></Suspense>
                    </IconButton>
                  </Tooltip>
                )
              }
            >
              <ListItemAvatar sx={{ minWidth: 0 }}>
                <Chip
                  label={`${stock.quantity}`}
                  color="primary"
                  sx={{ mr: 2, fontSize: { xs: '0.85rem', sm: '1rem' }, minWidth: 44, height: 36 }}
                />
              </ListItemAvatar>
              <ListItemText
                slotProps={{ primary: { component: 'div' }, secondary: { component: 'div' } }}
                primary={<Typography sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>{`${stock.category?.label || 'N/A'}`}</Typography>}
                secondary={<Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{`Pochodzenie: ${stock.origin || 'N/A'}`}</Typography>}
                sx={{ ml: 1 }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography>Brak zasobów w tej dostawie.</Typography>
      )}
    </Paper>
  </>
);

export default TransferItemsSection;
