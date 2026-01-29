/**
 * Serwis API dla lokalizacji
 */

import { apiClient } from './apiClient';
import { env } from '../config/env';
import type {
  Location,
  LocationDetails,
  MapPosition,
  CreateLocationPayload,
  UpdateLocationPayload,
  LocationAsset,
  LocationStockItem,
} from '../types/location.types';

// ============================================================================
// Location CRUD
// ============================================================================

/**
 * Pobiera szczegóły lokalizacji wraz z assetami
 */
export const getLocationDetails = async (locationId: number): Promise<LocationDetails> => {
  // Równoległe pobieranie danych lokalizacji i assetów
  const [locationData, assetsData] = await Promise.all([
    apiClient.get<Location>(`/locations/${locationId}`),
    apiClient.get<{ assets: LocationAsset[]; stock_items: LocationStockItem[] }>(
      `/locations/${locationId}/assets`
    ),
  ]);

  return {
    ...locationData,
    assets: assetsData.assets || [],
    stock_items: assetsData.stock_items || [],
  };
};

/**
 * Tworzy nową lokalizację
 */
export const createLocation = (data: CreateLocationPayload) =>
  apiClient.post<Location>('/locations', data);

/**
 * Aktualizuje lokalizację
 */
export const updateLocation = (id: number, data: UpdateLocationPayload) => {
  // Filtruj tylko zdefiniowane pola
  const updateData: UpdateLocationPayload = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.details !== undefined) updateData.details = data.details;
  if (data.pavilion !== undefined) updateData.pavilion = data.pavilion;
  if (data.lat !== undefined) updateData.lat = data.lat;
  if (data.lng !== undefined) updateData.lng = data.lng;

  return apiClient.patch<Location>(`/locations/${id}`, updateData);
};

/**
 * Usuwa lokalizację
 */
export const deleteLocation = (id: number) =>
  apiClient.delete<void>(`/locations/${id}`);

// ============================================================================
// Location Tracking
// ============================================================================

/**
 * Aktualizuje lokalizację transferu
 */
export const updateTransferLocationAPI = (transferId: number, location: MapPosition) =>
  apiClient.patch<void>(`/transfers/${transferId}/delivery-location`, {
    delivery_location: {
      ...location,
      timestamp: new Date().toISOString(),
    },
  });

/**
 * Aktualizuje lokalizację assetu
 */
export const updateAssetLocationAPI = (assetId: number, location: MapPosition) =>
  apiClient.patch<void>(`/assets/${assetId}/logs/location`, {
    delivery_location: {
      ...location,
      timestamp: new Date().toISOString(),
    },
  });

// ============================================================================
// Geolocation Service (Browser API)
// ============================================================================

/**
 * Serwis do obsługi geolokalizacji przeglądarki i Google Maps
 */
class LocationService {
  /**
   * Pobiera aktualną pozycję użytkownika z API przeglądarki
   */
  async getCurrentPosition(): Promise<MapPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolokalizacja nie jest wspierana przez twoją przeglądarkę'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Przekroczono czas oczekiwania na lokalizację'));
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          let errorMessage = 'Wystąpił błąd podczas pobierania lokalizacji';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Brak uprawnień do pobrania lokalizacji';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informacja o lokalizacji jest niedostępna';
              break;
            case error.TIMEOUT:
              errorMessage = 'Przekroczono czas oczekiwania na lokalizację';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Pobiera klucz API Google Maps
   */
  getGoogleMapsApiKey(): string {
    return env.GOOGLE_MAPS_API_KEY;
  }

  /**
   * Aktualizuje lokalizację transferu (wrapper dla kompatybilności)
   */
  async updateTransferLocation(transferId: number, location: MapPosition): Promise<void> {
    await updateTransferLocationAPI(transferId, location);
  }

  /**
   * Aktualizuje lokalizację assetu (wrapper dla kompatybilności)
   */
  async updateAssetLocation(assetId: number, location: MapPosition): Promise<void> {
    await updateAssetLocationAPI(assetId, location);
  }
}

export const locationService = new LocationService();

// Re-export typów dla kompatybilności wstecznej
export type { MapPosition, Location } from '../types/location.types';
export type { DeliveryLocation } from '../types/location.types';
