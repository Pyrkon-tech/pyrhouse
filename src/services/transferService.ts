/**
 * Serwis API dla transferów
 *
 * Wszystkie funkcje używają centralnego apiClient
 */

import { apiClient } from './apiClient';
import type {
  FlatTransfer,
  TransferStatus,
  CreateTransferPayload,
  PyrCodeSuggestion,
} from '../types/transfer.types';
import type { MapPosition } from '../types/location.types';
import type { AssetValidation } from '../types/asset.types';

// ============================================================================
// Transfer CRUD
// ============================================================================

/**
 * Tworzy nowy transfer
 */
export const createTransferAPI = (payload: CreateTransferPayload) =>
  apiClient.post<FlatTransfer>('/transfers', payload);

/**
 * Pobiera szczegóły transferu
 */
export const getTransferDetailsAPI = (transferId: number) =>
  apiClient.get<FlatTransfer>(`/transfers/${transferId}`);

/**
 * Pobiera transfery użytkownika według statusu
 */
export const getUserTransfersAPI = (userId: number, status: TransferStatus) =>
  apiClient.get<FlatTransfer[]>(`/transfers/user/${userId}/status/${status}`);

// ============================================================================
// Transfer Actions
// ============================================================================

/**
 * Potwierdza transfer
 */
export const confirmTransferAPI = (id: number, payload: { status: string }) =>
  apiClient.patch<FlatTransfer>(`/transfers/${id}/confirm`, payload);

/**
 * Anuluje transfer
 */
export const cancelTransferAPI = (transferId: string | number) =>
  apiClient.patch<void>(`/transfers/${transferId}/cancel`);

/**
 * Aktualizuje listę użytkowników przypisanych do transferu
 */
export const updateTransferUsersAPI = (transferId: number, userIds: number[]) =>
  apiClient.put<FlatTransfer>(`/transfers/${transferId}/users`, { users: userIds });

// ============================================================================
// Asset Operations
// ============================================================================

/**
 * Waliduje kod PYR
 */
export const validatePyrCodeAPI = (pyrCode: string) =>
  apiClient.get<AssetValidation>(`/assets/pyrcode/${pyrCode}`);

/**
 * Wyszukuje kody PYR w lokalizacji
 */
export const searchPyrCodesAPI = (query: string, locationId: number) =>
  apiClient.get<PyrCodeSuggestion[]>(
    `/locations/${locationId}/search?q=${encodeURIComponent(query)}`
  );

/**
 * Przywraca asset do lokalizacji
 */
export const restoreAssetToLocationAPI = (
  transferId: number,
  assetId: number,
  locationId: number = 1
) =>
  apiClient.patch(`/transfers/${transferId}/assets/${assetId}/restore-to-location`, {
    location_id: locationId,
  });

/**
 * Przywraca pozycję magazynową do lokalizacji
 */
export const restoreStockToLocationAPI = (
  transferId: number,
  categoryId: number,
  locationId: number = 1,
  quantity?: number
) =>
  apiClient.patch(`/transfers/${transferId}/categories/${categoryId}/restore-to-location`, {
    location_id: locationId,
    ...(quantity !== undefined && { quantity }),
  });

// ============================================================================
// Location Tracking
// ============================================================================

interface UpdateLocationResponse {
  id: number;
  delivery_location: MapPosition & { timestamp: string };
  status: string;
  message: string;
}

/**
 * Aktualizuje lokalizację dostawy transferu
 * TODO: Zamienić mock na prawdziwe API gdy będzie gotowe
 */
export const updateTransferLocationAPI = (
  transferId: number,
  location: MapPosition
): Promise<UpdateLocationResponse> => {
  // Mock - do zastąpienia prawdziwym API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: transferId,
        delivery_location: {
          ...location,
          timestamp: new Date().toISOString(),
        },
        status: 'success',
        message: 'Lokalizacja dostawy została zaktualizowana',
      });
    }, 500);
  });

  // Prawdziwe API (odkomentuj gdy gotowe):
  // return apiClient.patch(`/transfers/${transferId}/delivery-location`, {
  //   delivery_location: { ...location, timestamp: new Date().toISOString() },
  // });
};
