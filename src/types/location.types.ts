/**
 * Location shapes are aliases of the generated API contract (@pyrhouse/api, from backend/docs/openapi.yaml).
 * Map positions below are client-side only.
 */
import type { paths, Schemas } from '@pyrhouse/api';

export type Location = Schemas['Location'];
/** Assets and stock stored in a location (GET /locations/{id}/assets) */
export type LocationEquipment = Schemas['LocationEquipment'];
export type LocationAsset = Schemas['Item'];
export type LocationStockItem = Schemas['Stock'];
/** A location together with its equipment, as shown on the location details page */
export type LocationDetails = Location & LocationEquipment;

export type CreateLocationPayload =
  paths['/locations']['post']['requestBody']['content']['application/json'];
/** An empty pavilion or details clears the field */
export type UpdateLocationPayload = NonNullable<
  paths['/locations/{locationID}']['patch']['requestBody']
>['content']['application/json'];

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
