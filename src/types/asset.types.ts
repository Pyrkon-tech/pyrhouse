/**
 * Typy związane z zasobami (assets/sprzętem)
 */

import { Location } from './location.types';

/**
 * Status zasobu
 */
export type AssetStatus = 'in_stock' | 'available' | 'unavailable' | 'in_transit';

/**
 * Kategoria zasobu
 */
export interface AssetCategory {
  id: number;
  label: string;
  description?: string;
}

/**
 * Podstawowy interfejs zasobu
 */
export interface Asset {
  id: number;
  pyrcode: string;
  serial: string;
  category: AssetCategory;
  location: Location;
  status: AssetStatus;
  origin?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Walidacja kodu PYR
 */
export interface AssetValidation {
  id: number;
  pyrcode: string;
  serial: string;
  category: AssetCategory;
  location: Location;
  status: AssetStatus;
  is_valid: boolean;
}

/**
 * Pozycja magazynowa (stock)
 */
export interface StockItem {
  id: number;
  category_id: number;
  category_label: string;
  location_id: number;
  location_name: string;
  quantity: number;
}

/**
 * Payload do tworzenia pojedynczego zasobu
 */
export interface CreateAssetPayload {
  serial: string;
  category_id: number;
  location_id: number;
  origin?: string;
}

/**
 * Payload do masowego dodawania zasobów
 */
export interface BulkAddAssetPayload {
  serials: string[];
  category_id: number;
  origin: string;
}

/**
 * Pojedynczy element do bulk add (używany w formularzu)
 */
export interface BulkAddAssetItem {
  serial: string;
  category_id: number;
  origin: string;
}

/**
 * Payload do dodawania zasobów bez numeru seryjnego
 */
export interface AddAssetWithoutSerialPayload {
  quantity: number;
  category_id: number;
  origin: string;
}

/**
 * Odpowiedź z bulk add
 */
export interface BulkAddAssetsResponse {
  created: number;
  errors?: {
    serial: string;
    error: string;
  }[];
}
