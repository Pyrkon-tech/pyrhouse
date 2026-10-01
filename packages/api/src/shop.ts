/**
 * Organizer shop types — aliases of the generated API contract (@pyrhouse/api, from
 * backend/docs/openapi.yaml). Change the spec and run `npm run api:types`; do not hand-edit shapes here.
 */
import type { components } from './openapi';

type Schemas = components['schemas'];

export type ShopOrder = Schemas['ShopOrder'];
export type ShopOrderDetail = Schemas['ShopOrderDetail'];
export type ShopOrderItem = Schemas['ShopOrderItem'];
export type ShopOrderEvent = Schemas['ShopOrderEvent'];
export type ShopOrderStatus = ShopOrder['status'];
export type ShopQuestStatus = NonNullable<ShopOrder['quest_status']>;

export type ShopLocation = Schemas['ShopLocation'];
export type ShopWindow = Schemas['ShopWindow'];
export type ShopWindowKind = ShopWindow['kind'];
export type ShopWindowInput = Schemas['ShopWindowInput'];

export type ShopProduct = Schemas['ShopProduct'];
export type ShopProductInput = Schemas['ShopProductInput'];

export type ShopSummary = Schemas['ShopSummary'];
export type ShopSummaryGroup = ShopSummary['group'];
export type ShopSummaryRow = Schemas['ShopSummaryRow'];

export type ShopAccount = Schemas['ShopAccount'];
export type ShopAccessSource = ShopAccount['access_source'];
export type ShopInvite = Schemas['ShopInvite'];
export type ShopInviteStatus = ShopInvite['status'];
export type CreatedShopInvite = Schemas['ShopInviteCreated'];

export type ShopSettings = Schemas['ShopSettings'];
export type ShopConfig = Schemas['ShopConfig'];

/** Organizer order body (POST /shop/orders; PUT adds version) */
export type ShopOrderInput = Schemas['ShopOrderInput'] & { version?: number };

/** Warehouse correction (PATCH /admin/shop/orders/:id) */
export interface ShopOrderPatch {
  version: number;
  location_id?: number;
  location_note?: string | null;
  items?: Schemas['ShopOrderItemInput'][];
}
