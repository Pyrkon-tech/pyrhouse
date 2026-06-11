import React from 'react';
import { Box, IconButton, Tooltip, Alert } from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { locationService } from '../../services/locationService';

interface MapComponentProps {
  transfer: { delivery_location?: { lat: number; lng: number } | null } | null;
  userLocation: { lat: number; lng: number } | null;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  locationError?: string | null;
  showLocationAlert?: boolean;
  onGetUserLocation?: () => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  transfer,
  userLocation,
  locationError,
  showLocationAlert,
  onGetUserLocation
}) => {
  if (!transfer?.delivery_location?.lat || !transfer?.delivery_location?.lng) {
    console.warn('Brak danych o lokalizacji:', transfer?.delivery_location);
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Brak danych o lokalizacji
      </Alert>
    );
  }

  const mapLocation = {
    lat: transfer.delivery_location.lat,
    lng: transfer.delivery_location.lng
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: 340, sm: 500, md: 800 }, mx: 'auto' }}>
      <Box
        sx={{
          height: { xs: '200px', sm: '260px', md: '340px' },
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
        id="map-container"
      >
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1,
            display: 'flex',
            gap: 1
          }}
        >
          <Tooltip title="Pokaż moją lokalizację">
            <IconButton
              onClick={onGetUserLocation}
              sx={{
                backgroundColor: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                }
              }}
            >
              <GpsFixedIcon />
            </IconButton>
          </Tooltip>
        </Box>
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
            {userLocation && (
              <AdvancedMarker position={userLocation}>
                <Pin
                  background={'#4caf50'}
                  borderColor={'#388e3c'}
                  glyphColor={'#ffffff'}
                />
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      </Box>
      {locationError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {locationError}
        </Alert>
      )}
      {userLocation && showLocationAlert && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Twoja lokalizacja została oznaczona na mapie (zielony marker)
        </Alert>
      )}
    </Box>
  );
};

export default MapComponent; 