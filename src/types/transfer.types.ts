/**
 * Typy związane z transferami
 */

import type { TransferUser } from './user.types';

// Podstawowe typy dla elementów transferu
export type TransferStatus = 'in_transit' | 'confirmed' | 'cancelled' | 'completed';
export type ItemType = 'pyr_code' | 'stock';
export type ValidationStatus = 'success' | 'failure' | '';

// Prosta wersja Location dla transferów (bez współrzędnych)
export interface TransferLocation {
  id: number;
  name: string;
}

// Interfejs dla pojedynczego przedmiotu w transferze
export interface TransferItem {
  id: number;
  transfer_id: number;
  item_id: number;
  quantity: number;
  status: TransferStatus;
  type: ItemType;
  pyrcode?: string;
  category?: {
    id?: number;
    label: string;
  };
}

// Bazowy interfejs dla transferu
export interface BaseTransfer {
  id: number;
  status: TransferStatus;
  items: TransferItem[];
}

// Interfejs dla transferu z zagnieżdżonymi obiektami (używany w UI)
export interface Transfer extends BaseTransfer {
  from_location: TransferLocation;
  to_location: TransferLocation;
  transfer_date: string;
}

// Interfejs dla transferu z płaską strukturą (używany w API)
export interface FlatTransfer extends BaseTransfer {
  from_location_id: number;
  from_location_name: string;
  to_location_id: number;
  to_location_name: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  description: string;
}

// Element formularza transferu
export interface TransferFormItem {
  type: ItemType;
  id: string;
  pyrcode: string;
  quantity: number;
  status: ValidationStatus;
  category?: {
    label: string;
  };
}

// Interfejs dla formularza tworzenia transferu
export interface TransferFormData {
  fromLocation: number;
  toLocation: string;
  items: TransferFormItem[];
  users: TransferUser[];
}

// Interfejs dla sugestii kodów PYR
export interface PyrCodeSuggestion {
  id: number;
  pyrcode: string;
  serial: string;
  location: TransferLocation;
  category: {
    id: number;
    label: string;
  };
  status: 'in_stock' | 'available' | 'unavailable';
}

// Payload do tworzenia transferu (rzeczywisty format API)
export interface CreateTransferPayload {
  from_location_id: number;
  location_id: number; // docelowa lokalizacja
  assets?: { id: number }[];
  stocks?: { id: number; quantity: number }[];
  users?: { id: number }[];
} 