/**
 * Serwis API dla zasobów (assets/sprzętu)
 */

import { apiClient } from './apiClient';
import type {
  Asset,
  AssetValidation,
  CreateAssetPayload,
  BulkAddAssetPayload,
  BulkAddAssetItem,
  BulkAddAssetsResponse,
  AddAssetWithoutSerialPayload,
} from '../types/asset.types';

// ============================================================================
// Asset CRUD
// ============================================================================

/**
 * Pobiera listę wszystkich zasobów
 */
export const getAssetsAPI = () => apiClient.get<Asset[]>('/assets');

/**
 * Pobiera zasób po kodzie PYR
 */
export const fetchAssetByPyrCode = (pyrCode: string) =>
  apiClient.get<AssetValidation>(`/assets/pyrcode/${pyrCode}`);

/**
 * Tworzy nowy zasób
 */
export const createAssetAPI = (payload: CreateAssetPayload) =>
  apiClient.post<Asset>('/assets', payload);

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

  return apiClient.post<BulkAddAssetsResponse>('/assets/bulk', payload);
};

/**
 * Masowe dodawanie zasobów (bezpośredni format API)
 */
export const createBulkAssetsAPI = (payload: BulkAddAssetPayload) =>
  apiClient.post<BulkAddAssetsResponse>('/assets/bulk', payload);

/**
 * Odpowiedź z API dla dodawania zasobów bez numeru seryjnego
 */
interface AddAssetsWithoutSerialResponse {
  created: Asset[];
}

/**
 * Dodawanie zasobów bez numeru seryjnego
 */
export const addAssetsWithoutSerialAPI = (payload: AddAssetWithoutSerialPayload) =>
  apiClient.post<AddAssetsWithoutSerialResponse>('/assets/without-serial', payload);
