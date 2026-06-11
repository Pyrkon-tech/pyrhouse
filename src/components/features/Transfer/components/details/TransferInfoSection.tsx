import React, { lazy, Suspense } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import type { TransferDetails } from '../../../../../types/transfer.types';
import { statusTranslations, statusChipColor } from './transferStatus';

const PersonIcon = lazy(() => import('@mui/icons-material/Person'));
const LocalShippingIcon = lazy(() => import('@mui/icons-material/LocalShipping'));
const MyLocationIcon = lazy(() => import('@mui/icons-material/MyLocation'));
const LocationOnIcon = lazy(() => import('@mui/icons-material/LocationOn'));
const NavigationIcon = lazy(() => import('@mui/icons-material/Navigation'));
const EditIcon = lazy(() => import('@mui/icons-material/Edit'));

interface TransferInfoSectionProps {
  transfer: TransferDetails;
  loading: boolean;
  hasAdminAccess: boolean;
  onOpenLocationDialog: () => void;
  onNavigateToLocation: () => void;
  onEditUsers: () => void;
  /** Map widget rendered by the parent (owns geolocation state) */
  mapContent: React.ReactNode;
}

const TransferInfoSection: React.FC<TransferInfoSectionProps> = ({
  transfer,
  loading,
  hasAdminAccess,
  onOpenLocationDialog,
  onNavigateToLocation,
  onEditUsers,
  mapContent,
}) => (
  <Paper sx={{ mt: 4, p: { xs: 1.5, sm: 3 } }}>
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}>
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Suspense fallback={null}><LocalShippingIcon color="primary" /></Suspense>
        Informacje
      </Typography>
      {(transfer.status === 'in_transit' || transfer.status === 'completed') && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          {transfer.status === 'in_transit' && (
            <Button
              variant="outlined"
              color="primary"
              onClick={onOpenLocationDialog}
              disabled={loading}
              startIcon={<Suspense fallback={null}><MyLocationIcon /></Suspense>}
              sx={{
                py: 0.75,
                px: 1.5,
                borderRadius: 1.5,
                fontSize: '0.875rem',
                borderWidth: 1.5,
                width: { xs: '100%', sm: 'auto' },
                mb: { xs: 1, sm: 0 },
                '&:hover': {
                  borderWidth: 1.5,
                  backgroundColor: 'primary.lighter',
                }
              }}
            >
              Aktualizuj lokalizację
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={onNavigateToLocation}
            disabled={!transfer?.delivery_location?.lat || !transfer?.delivery_location?.lng}
            startIcon={<Suspense fallback={null}><NavigationIcon /></Suspense>}
            sx={{
              py: 0.75,
              px: 1.5,
              borderRadius: 1.5,
              fontSize: '0.875rem',
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Nawiguj
          </Button>
        </Stack>
      )}
    </Box>
    <Divider sx={{ mb: 3 }} />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Lokalizacja źródłowa
        </Typography>
        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
          <Suspense fallback={null}><LocationOnIcon fontSize="small" color="action" /></Suspense>
          {transfer.from_location?.name} {transfer.from_location?.pavilion ? `(${transfer.from_location?.pavilion})` : ''}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Lokalizacja docelowa
        </Typography>
        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
          <Suspense fallback={null}><LocationOnIcon fontSize="small" color="action" /></Suspense>
          {transfer.to_location?.name} {transfer.to_location?.pavilion ? `(${transfer.to_location?.pavilion})` : ''}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Status
        </Typography>
        <Chip
          label={statusTranslations[transfer.status] || transfer.status}
          color={statusChipColor(transfer.status)}
          size="small"
          sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, px: 1.5 }}
        />
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Data transferu
        </Typography>
        <Typography variant="body1" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
          {new Date(transfer.transfer_date).toLocaleString()}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>Gżdacze</span>
          {hasAdminAccess && (
            <Tooltip title="Edytuj listę Gżdaczy">
              <IconButton
                size="small"
                onClick={onEditUsers}
                aria-label="edit users"
                sx={{ ml: 1 }}
              >
                <Suspense fallback={null}><EditIcon fontSize="small" /></Suspense>
              </IconButton>
            </Tooltip>
          )}
        </Typography>
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          width: '100%',
          justifyContent: { xs: 'center', sm: 'flex-start' }
        }}>
          {transfer.users && transfer.users.length > 0 ? (
            transfer.users.map((user) => (
              <Chip
                key={user.id}
                label={user.username}
                icon={<Suspense fallback={null}><PersonIcon /></Suspense>}
                color="primary"
                variant="outlined"
                sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, px: 1.5, my: 0.5 }}
              />
            ))
          ) : (
            <Typography color="text.secondary">Brak przypisanych Gżdaczy</Typography>
          )}
        </Box>
      </Box>
    </Box>

    {(transfer.status === 'in_transit' || transfer.status === 'completed') && transfer.delivery_location && (
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {transfer.status === 'in_transit' ? 'Aktualna lokalizacja dostawy' : 'Lokalizacja dostawy'}
        </Typography>
        <Box sx={{
          position: 'relative',
          mb: 1,
          width: '100%',
          height: { xs: 200, sm: 260, md: 340 },
          maxWidth: { xs: 340, sm: 400, md: 800 },
          mx: 'auto',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: 1,
          background: '#eee',
        }}>
          {mapContent}
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          Ostatnia aktualizacja: {new Date(transfer.delivery_location.timestamp).toLocaleString()}
        </Typography>
      </Box>
    )}
  </Paper>
);

export default TransferInfoSection;
