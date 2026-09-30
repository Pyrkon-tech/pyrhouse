/**
 * Asset shapes are aliases of the generated API contract (@pyrhouse/api, from backend/docs/openapi.yaml).
 * Form payloads and reservations below are still hand-written.
 */
import type { paths, Schemas } from '@pyrhouse/api';

/** A serialized asset (GET /assets/pyrcode/{code}, created assets, location listings) */
export type Asset = Schemas['Item'];
export type CreatedAssets = Schemas['CreatedAssets'];

export type BulkAddAssetPayload =
  paths['/assets/bulk']['post']['requestBody']['content']['application/json'];

/**
 * Pojedynczy element do bulk add (używany w formularzu)
 */
export interface BulkAddAssetItem {
  serial: string;
  category_id: number;
  origin: string;
}

export type AddAssetWithoutSerialPayload =
  paths['/assets/without-serial']['post']['requestBody']['content']['application/json'];

// ============================================================================
// Reservations
// ============================================================================

export type ReservationStatus = 'free' | 'claimed' | 'all';

export interface AssetReservation {
  id: number;
  pyr_code: string;
  category_id: number;
  reserved_at: string;
  claimed_at: string | null;
}

export interface CreateReservationsPayload {
  category_id: number;
  quantity: number;
}

export interface CreateReservationsResponse {
  reservations: AssetReservation[];
}

export interface ClaimItem {
  pyr_code: string;
  serial?: string;
}

export interface ClaimReservationsPayload {
  origin: string;
  location_id?: number;
  items: ClaimItem[];
}

export interface ClaimReservationsResponse {
  created: Asset[];
}

export interface DeleteReservationsPayload {
  pyr_codes?: string[];
  ids?: number[];
}

export interface DeleteReservationsResponse {
  deleted: number;
}
