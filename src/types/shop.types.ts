/**
 * Organizer shop — warehouse panel types (/admin/shop/*).
 * Source of truth: backend/docs/openapi.yaml, tags `shop` and `shop-admin`.
 */

export type ShopOrderStatus = 'submitted' | 'confirmed' | 'rejected' | 'cancelled';
export type ShopWindowKind = 'delivery' | 'return';
export type ShopAccessSource = 'domain' | 'allowlist' | 'invite';
export type ShopInviteStatus = 'active' | 'used' | 'revoked' | 'expired';
export type ShopQuestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ShopLocation {
  id: number;
  name: string;
  pavilion: string | null;
}

export interface ShopWindow {
  id: number;
  kind: ShopWindowKind;
  starts_at: string;
  ends_at: string;
  label: string;
  active: boolean;
  /** Panel only: submitted + confirmed orders using the window */
  orders_count?: number;
}

export interface ShopWindowInput {
  kind: ShopWindowKind;
  starts_at: string;
  ends_at: string;
  label?: string;
  active?: boolean;
}

export interface ShopProduct {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  section: string;
  sort_order: number;
  category_id: number;
  category_name?: string | null;
  price: number | null;
  max_per_order: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopProductInput {
  name: string;
  description?: string | null;
  image_url?: string | null;
  section?: string;
  sort_order?: number;
  category_id: number;
  price?: number | null;
  max_per_order?: number | null;
  active?: boolean;
}

export interface ShopOrderItem {
  product_id: number;
  product_name: string;
  category_id: number;
  category_name?: string | null;
  quantity: number;
  unit_price: number | null;
}

export interface ShopOrderEvent {
  actor_kind: 'account' | 'user';
  actor_id: number;
  type: 'submitted' | 'updated' | 'cancelled' | 'confirmed' | 'rejected' | 'items_changed' | 'location_changed';
  payload: Record<string, unknown> | null;
  at: string;
}

export interface ShopOrder {
  id: number;
  number: string;
  account_id: number;
  account_email?: string;
  account_name?: string | null;
  location: ShopLocation;
  location_note: string | null;
  contact_name: string;
  budget_owner: string | null;
  delivery_window: ShopWindow;
  return_window: ShopWindow;
  return_date: string | null;
  notes: string | null;
  status: ShopOrderStatus;
  status_reason: string | null;
  decided_at: string | null;
  version: number;
  /** Go serializes an empty slice as null — normalized in shopAdminService */
  items: ShopOrderItem[];
  total: number | null;
  quest_id: string | null;
  quest_status: ShopQuestStatus | null;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderDetail extends ShopOrder {
  events: ShopOrderEvent[];
}

export interface ShopOrderPatch {
  version: number;
  location_id?: number;
  location_note?: string | null;
  items?: { product_id: number; quantity: number }[];
}

export type ShopSummaryGroup = 'product' | 'day' | 'location';

export interface ShopSummaryRow {
  key: string;
  label: string;
  product_id: number;
  product_name: string;
  quantity: number;
  orders: number;
}

export interface ShopSummary {
  group: ShopSummaryGroup;
  rows: ShopSummaryRow[];
}

export interface ShopAccount {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  active: boolean;
  access_source: ShopAccessSource;
  /** false = allowlist entry that has not logged in yet */
  logged_in: boolean;
  created_at: string;
  last_login_at: string | null;
  orders_count: number;
}

export interface ShopInvite {
  id: number;
  label: string;
  created_by: number | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_email: string | null;
  revoked_at: string | null;
  status: ShopInviteStatus;
}

export interface CreatedShopInvite {
  invite: ShopInvite;
  /** Plaintext, returned only once */
  token: string;
  /** Present when the backend knows SHOP_URL */
  url?: string;
}

/** GET /shop/config — what organizers may do right now */
export interface ShopConfig {
  show_prices: boolean;
  /** Deadline already applied */
  orders_open: boolean;
  orders_open_until: string | null;
}

/** Organizer order body (POST /shop/orders, PUT adds version) */
export interface ShopOrderInput {
  location_id: number;
  location_note?: string | null;
  contact_name?: string;
  budget_owner?: string | null;
  delivery_window_id: number;
  return_window_id: number;
  return_date?: string | null;
  notes?: string | null;
  items: { product_id: number; quantity: number }[];
  version?: number;
}

export interface ShopSettings {
  show_prices: boolean;
  orders_open: boolean;
  orders_open_until: string | null;
  domain_auto_join: boolean;
  auto_domains: string[];
}
