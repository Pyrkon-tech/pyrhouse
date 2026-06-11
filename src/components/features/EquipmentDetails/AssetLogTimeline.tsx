import React from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import {
  AddCircle,
  LocationOn,
  Inventory2,
  History,
  LocalShipping,
  RemoveCircle,
  CheckCircleOutline,
  Warehouse,
  GpsFixed,
  Navigation,
  ArrowForward,
} from '@mui/icons-material';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { locationService } from '../../../services/locationService';
import type { AssetLog } from './types';

const getLocationInfo = (log: AssetLog) => {
  if (log.action === 'in_transfer' || log.action === 'delivered') {
    const fromLocation = '#' + (log.data.from_location_id ? log.data.from_location_id : 'Nieznana');
    const fromLocationName = log.data.from_location_name ? log.data.from_location_name : 'Brak logu nazwy';
    const toLocation = '#' + (log.data.to_location_id ? log.data.to_location_id : 'Nieznana');
    const toLocationName = log.data.to_location_name ? log.data.to_location_name : 'Brak logu nazwy';

    // Sprawdź, czy to_location_id to 1 (magazyn)
    const isReturnedToWarehouse = log.data.to_location_id === 1;

    return {
      fromLocation,
      fromLocationName,
      toLocation,
      toLocationName,
      isReturnedToWarehouse
    };
  }
  return null;
};

const isWarehouseReturn = (log: AssetLog) =>
  log.action.toUpperCase() === 'DELIVERED' && log.data.to_location_id === 1;

const getActionLabel = (action: string, log: AssetLog) => {
  if (isWarehouseReturn(log)) {
    return 'Zwrócono do magazynu';
  }

  switch (action.toUpperCase()) {
    case 'DELIVERED':
      return 'Dostarczone';
    case 'IN_TRANSFER':
      return 'W dostawie';
    case 'REMOVE':
      return 'Usunięte';
    case 'LAST_KNOWN_LOCATION':
      return 'Ostatnia znana lokalizacja';
    case 'CREATE':
      return 'Dodano';
    default:
      return action.toUpperCase();
  }
};

const getTimelineIcon = (action: string, log: AssetLog) => {
  if (isWarehouseReturn(log)) return <Warehouse sx={{ fontSize: 20 }} />;
  switch (action.toUpperCase()) {
    case 'DELIVERED': return <CheckCircleOutline sx={{ fontSize: 20 }} />;
    case 'IN_TRANSFER': return <LocalShipping sx={{ fontSize: 20 }} />;
    case 'REMOVE': return <RemoveCircle sx={{ fontSize: 20 }} />;
    case 'CREATE': return <AddCircle sx={{ fontSize: 20 }} />;
    case 'LAST_KNOWN_LOCATION': return <GpsFixed sx={{ fontSize: 20 }} />;
    default: return <History sx={{ fontSize: 20 }} />;
  }
};

const getActionColor = (action: string, log: AssetLog): string => {
  if (isWarehouseReturn(log)) return 'success.main';
  switch (action.toUpperCase()) {
    case 'DELIVERED': return 'success.main';
    case 'IN_TRANSFER': return 'info.main';
    case 'REMOVE': return 'error.main';
    case 'LAST_KNOWN_LOCATION': return 'warning.main';
    case 'CREATE': return 'text.secondary';
    default: return 'text.secondary';
  }
};

const LogLocationMap: React.FC<{ log: AssetLog }> = ({ log }) => {
  if (log.action !== 'last_known_location' || !log.data.location) {
    return null;
  }

  const mapLocation = {
    lat: log.data.location.latitude,
    lng: log.data.location.longitude
  };

  const handleNavigateToLocation = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${mapLocation.lat},${mapLocation.lng}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <Box
        sx={{
          height: '200px',
          width: '100%',
          borderRadius: '8px 8px 0 0',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          position: 'relative',
          mt: 2
        }}
      >
        <APIProvider apiKey={locationService.getGoogleMapsApiKey()}>
          <Map
            defaultCenter={mapLocation}
            defaultZoom={17}
            mapId="pyrhouse-map"
            gestureHandling={'greedy'}
            disableDefaultUI={false}
          >
            <AdvancedMarker position={mapLocation}>
              <Pin
                background={'#1976d2'}
                borderColor={'#1565c0'}
                glyphColor={'#ffffff'}
              />
            </AdvancedMarker>
          </Map>
        </APIProvider>
      </Box>
      <Button
        variant="contained"
        startIcon={<Navigation />}
        onClick={handleNavigateToLocation}
        fullWidth
        sx={{
          mt: -1,
          borderRadius: '0 0 8px 8px',
          py: 1.5,
          bgcolor: 'primary.main',
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          boxShadow: 'none',
          borderTop: 'none',
          border: '1px solid',
          borderColor: 'primary.main'
        }}
      >
        Nawiguj do lokalizacji
      </Button>
    </>
  );
};

const AssetLogTimeline: React.FC<{ logs: AssetLog[] }> = ({ logs }) => {
  // Sortowanie logów według daty utworzenia (od najnowszych do najstarszych)
  const sortedLogs = [...logs].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 3,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <History color="action" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Historia
        </Typography>
        {logs.length > 0 && (
          <Chip size="small" label={`${logs.length} zdarzeń`} variant="outlined" />
        )}
      </Box>

      {logs.length > 0 ? (
        <Box>
          {sortedLogs.map((log, index) => {
            const locationInfo = getLocationInfo(log);
            const isLast = index === sortedLogs.length - 1;
            const actionColor = getActionColor(log.action, log);

            return (
              <Box key={log.id} sx={{ display: 'flex', gap: 2 }}>
                {/* Timeline column: icon + vertical line */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 40 }}>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: actionColor,
                    color: 'common.white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 2,
                    flexShrink: 0,
                    zIndex: 1,
                  }}>
                    {getTimelineIcon(log.action, log)}
                  </Box>
                  {!isLast && (
                    <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', mt: 0.5, mb: 0.5, minHeight: 24 }} />
                  )}
                </Box>

                {/* Event card */}
                <Box sx={{ flex: 1, pb: isLast ? 0 : 2.5 }}>
                  <Box sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 3 },
                  }}>
                    {/* Card header */}
                    <Box sx={{
                      px: 2,
                      py: 1.25,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: 'background.paper',
                      borderBottom: locationInfo || log.data?.quantity || log.data?.msg ? '1px solid' : 'none',
                      borderColor: 'divider',
                      gap: 1,
                    }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: actionColor }}>
                        {getActionLabel(log.action, log)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {new Date(log.created_at).toLocaleString('pl-PL')}
                      </Typography>
                    </Box>

                    {/* Card body */}
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* Location from → to */}
                      {locationInfo && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            icon={<LocationOn />}
                            label={locationInfo.fromLocationName}
                            variant="outlined"
                            sx={{ fontSize: '0.72rem' }}
                          />
                          <ArrowForward sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Chip
                            size="small"
                            icon={locationInfo.isReturnedToWarehouse ? <Warehouse /> : <LocationOn />}
                            label={locationInfo.toLocationName}
                            color={locationInfo.isReturnedToWarehouse ? 'success' : 'primary'}
                            variant="outlined"
                            sx={{ fontSize: '0.72rem' }}
                          />
                        </Box>
                      )}

                      {/* Message */}
                      {log.data?.msg && (
                        <Typography variant="body2" color="text.secondary">
                          {log.data.msg}
                        </Typography>
                      )}

                      {/* Quantity badge */}
                      {log.data?.quantity && (
                        <Box>
                          <Chip
                            size="small"
                            icon={<Inventory2 />}
                            label={`${log.data.quantity} szt.`}
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>
                      )}

                      {/* GPS map */}
                      <LogLocationMap log={log} />
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box sx={{
          textAlign: 'center',
          py: 6,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
        }}>
          <History sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Brak historii dla tego elementu
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AssetLogTimeline;
