/**
 * Typy związane z lokalizacjami
 */

/**
 * Podstawowy interfejs lokalizacji
 */
export interface Location {
  id: number;
  name: string;
  lat: number;
  lng: number;
  pavilion: string | null;
  details?: string | null;
}

/**
 * Pozycja na mapie (współrzędne GPS)
 */
export interface MapPosition {
  lat: number;
  lng: number;
}

/**
 * Lokalizacja dostawy z timestampem
 */
export interface DeliveryLocation extends MapPosition {
  timestamp: string;
}

/**
 * Szczegóły lokalizacji z powiązanymi zasobami
 */
export interface LocationDetails extends Location {
  assets: LocationAsset[];
  stock_items: LocationStockItem[];
}

/**
 * Asset przypisany do lokalizacji
 */
export interface LocationAsset {
  id: number;
  pyrcode: string;
  serial: string;
  category: {
    id: number;
    label: string;
  };
  status: 'in_stock' | 'available' | 'unavailable';
}

/**
 * Pozycja magazynowa w lokalizacji
 */
export interface LocationStockItem {
  id: number;
  category_id: number;
  category_label: string;
  quantity: number;
}

/**
 * Payload do tworzenia lokalizacji
 */
export type CreateLocationPayload = Omit<Location, 'id'>;

/**
 * Payload do aktualizacji lokalizacji
 */
export type UpdateLocationPayload = Partial<Omit<Location, 'id'>>;
