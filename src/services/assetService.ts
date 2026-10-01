/**
 * Serwis API dla zasobów (assets/sprzętu)
 */

import { apiClient } from './apiClient';

// ============================================================================
// Globalne wyszukiwanie (GET /search?q=...)
// ============================================================================

export interface GlobalSearchAsset {
  id: number;
  pyrcode: string;
  serial: string;
  status: string;
  origin: string;
  location: { id: number; name: string };
  category: { id: number; name: string; label: string };
}

export interface GlobalSearchStock {
  id: number;
  quantity: number;
  origin: string;
  location: { id: number; name: string };
  category: { id: number; name: string; label: string };
}

export interface GlobalSearchResult {
  assets: GlobalSearchAsset[];
  stocks: GlobalSearchStock[];
}

/** Globalne wyszukiwanie po kodzie PYR, numerze seryjnym, kategorii, lokalizacji i pochodzeniu (min. 2 znaki) */
export const searchGlobalAPI = (query: string) =>
  apiClient.get<GlobalSearchResult>(`/search?q=${encodeURIComponent(query)}`);
import type {
  BulkAddAssetPayload,
  BulkAddAssetItem,
  CreatedAssets,
  AddAssetWithoutSerialPayload,
} from '../types/asset.types';

// ============================================================================
// Asset CRUD
// ============================================================================

/**
 * Usuwa zasób
 */
export const deleteAsset = (assetId: number) =>
  apiClient.delete<void>(`/assets/${assetId}`);

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Masowe dodawanie zasobów (z transformacją formatu)
 */
export const bulkAddAssetsAPI = (assets: BulkAddAssetItem[]) => {
  // Transformacja do formatu API
  const payload: BulkAddAssetPayload = {
    serials: assets.map((asset) => asset.serial),
    category_id: assets[0].category_id,
    origin: assets[0].origin,
  };

  return apiClient.post<CreatedAssets>('/assets/bulk', payload);
};

/**
 * Dodawanie zasobów bez numeru seryjnego
 */
export const addAssetsWithoutSerialAPI = (payload: AddAssetWithoutSerialPayload) =>
  apiClient.post<CreatedAssets>('/assets/without-serial', payload);

// ============================================================================
// Reservations
// ============================================================================

import type {
  AssetReservation,
  ReservationStatus,
  CreateReservationsPayload,
  CreateReservationsResponse,
  ClaimReservationsPayload,
  ClaimReservationsResponse,
  DeleteReservationsPayload,
  DeleteReservationsResponse,
} from '../types/asset.types';

export const createReservationsAPI = (payload: CreateReservationsPayload) =>
  apiClient.post<CreateReservationsResponse>('/assets/reservations', payload);

export const getReservationsAPI = (params?: { status?: ReservationStatus; category_id?: number }) => {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category_id) query.set('category_id', String(params.category_id));
  const qs = query.toString();
  return apiClient.getList<AssetReservation>(`/assets/reservations${qs ? `?${qs}` : ''}`);
};

export const claimReservationsAPI = (payload: ClaimReservationsPayload) =>
  apiClient.post<ClaimReservationsResponse>('/assets/reservations/claim', payload);

export const deleteReservationsAPI = (payload: DeleteReservationsPayload) =>
  apiClient.delete<DeleteReservationsResponse>('/assets/reservations', payload);
