import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { APIProvider, AdvancedMarker, Map, MapMouseEvent, useMap } from '@vis.gl/react-google-maps';
import { MapPosition, locationService } from '../../services/locationService';
import { MyLocation, Save } from '@mui/icons-material';

interface LocationPickerProps {
  onLocationSelect: (location: MapPosition) => void;
  initialLocation?: MapPosition;
  onSave?: () => void;
}

const DEFAULT_CENTER = { lat: 52.0, lng: 19.0 };
const DEFAULT_ZOOM = 13;
const MAP_CONTAINER_STYLE = { width: '100%', height: '400px' };

// Inner component — needs to be inside APIProvider to use useMap()
const LocationPickerMap: React.FC<LocationPickerProps> = ({ onLocationSelect, initialLocation, onSave }) => {
  const map = useMap();
  const [selectedLocation, setSelectedLocation] = useState<MapPosition | null>(initialLocation ?? null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (map && !initialFetchDone.current && !initialLocation) {
      initialFetchDone.current = true;
      handleGetCurrentLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    const latLng = e.detail.latLng;
    if (!latLng) return;
    const pos = { lat: latLng.lat, lng: latLng.lng };
    setSelectedLocation(pos);
    onLocationSelect(pos);
  }, [onLocationSelect]);

  const handleGetCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      setError(null);
      const position = await locationService.getCurrentPosition();
      setSelectedLocation(position);
      map?.panTo(position);
      map?.setZoom(17);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas pobierania lokalizacji');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSaveLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onSave?.();
    }
  };

  return (
    <Box>
      <Box sx={{ position: 'relative', mb: 2 }}>
        <Map
          style={MAP_CONTAINER_STYLE}
          defaultCenter={selectedLocation ?? DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId="pyrhouse-map"
          onClick={handleMapClick}
          streetViewControl={false}
        >
          {selectedLocation && (
            <AdvancedMarker position={selectedLocation} />
          )}
        </Map>
        {isLoadingLocation && (
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: '10px', borderRadius: '4px',
            display: 'flex', alignItems: 'center', gap: 1
          }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Pobieranie lokalizacji...</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleGetCurrentLocation}
          disabled={isLoadingLocation}
          startIcon={isLoadingLocation ? <CircularProgress size={20} /> : <MyLocation />}
        >
          Użyj mojej lokalizacji
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveLocation}
          disabled={!selectedLocation || isLoadingLocation}
          startIcon={<Save />}
        >
          Zapisz lokalizację
        </Button>
      </Box>
      {error && <Box sx={{ color: 'error.main', mt: 1 }}>{error}</Box>}
    </Box>
  );
};

const LocationPicker: React.FC<LocationPickerProps> = (props) => (
  <APIProvider apiKey={locationService.getGoogleMapsApiKey()}>
    <LocationPickerMap {...props} />
  </APIProvider>
);

export default LocationPicker;
