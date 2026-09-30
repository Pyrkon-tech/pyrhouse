/**
 * Serwis API dla transferów
 *
 * Wszystkie funkcje używają centralnego apiClient
 */

import { apiClient } from './apiClient';
import type {
  TransferSummary,
  TransferDetails,
  TransferStatus,
  CreateTransferPayload,
} from '../types/transfer.types';
import type { Asset } from '../types/asset.types';

type Message = { message?: string };

// ============================================================================
// Transfer CRUD
// ============================================================================

export const createTransferAPI = (payload: CreateTransferPayload) =>
  apiClient.post<TransferDetails>('/transfers', payload);

export const getTransferDetailsAPI = (transferId: number) =>
  apiClient.get<TransferDetails>(`/transfers/${transferId}`);

/**
 * Before 2026-09-30 the backend sent the raw DB row with Go field names ({ID, FromLocationName, ...}).
 * Accept both shapes so the page works during a deploy with either backend.
 */
type LegacyUserTransfer = {
  ID: number;
  FromLocationID: number;
  FromLocationName: string;
  ToLocationID: number;
  ToLocationName: string;
  TransferDate: string;
  Status: TransferStatus;
};

export const normalizeUserTransfer = (t: TransferSummary | LegacyUserTransfer): TransferSummary =>
  'ID' in t
    ? {
        id: t.ID,
        from_location: { id: t.FromLocationID, name: t.FromLocationName, pavilion: null, details: null },
        to_location: { id: t.ToLocationID, name: t.ToLocationName, pavilion: null, details: null },
        transfer_date: t.TransferDate,
        status: t.Status,
      }
    : t;

/** Transfers the user is assigned to, in the given status */
export const getUserTransfersAPI = async (userId: number, status: TransferStatus) => {
  const rows = await apiClient.getList<TransferSummary | LegacyUserTransfer>(
    `/transfers/users/${userId}?status=${status}`
  );
  return rows.map(normalizeUserTransfer);
};

// ============================================================================
// Transfer Actions
// ============================================================================

export const confirmTransferAPI = (id: number) =>
  apiClient.patch<Message>(`/transfers/${id}/confirm`);

export const cancelTransferAPI = (transferId: string | number) =>
  apiClient.patch<Message>(`/transfers/${transferId}/cancel`);

/** Replaces the users carrying out the transfer */
export const updateTransferUsersAPI = (transferId: number, userIds: number[]) =>
  apiClient.put<Message>(`/transfers/${transferId}/users`, { users: userIds });

// ============================================================================
// Asset Operations
// ============================================================================

/**
 * Waliduje kod PYR
 */
export const validatePyrCodeAPI = (pyrCode: string) =>
  apiClient.get<Asset>(`/assets/pyrcode/${pyrCode}`);

/**
 * Wyszukuje kody PYR w lokalizacji
 */
export const searchPyrCodesAPI = (query: string, locationId: number) =>
  apiClient.getList<Asset>(
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
