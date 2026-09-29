export type QuestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/** 'sheet' = historic Google Sheets import, 'shop' = confirmed organizer shop order */
export type QuestSource = 'sheet' | 'shop';

export interface QuestDestination {
  pavilion: string;
  location: string;
}

export interface QuestItem {
  name: string;
  /** null = quantity unknown (historic sheet items, "do ustalenia"); dispatcher fills it in at issue time */
  quantity: number | null;
  /** Missing only for historic sheet items that matched no category */
  category_id?: number;
  category_name?: string | null;
  budget_owner?: string;
  notes?: string;
}

export interface QuestVolunteer {
  id: number;
  username: string;
  fullname: string | null;
}

export interface QuestTransfer {
  transfer_id: number;
  status: string;
  created_at: string;
}

export interface Quest {
  id: string;
  destination: QuestDestination;
  recipient: string;
  delivery_date: string;
  /** YYYY-MM-DD; null for sheet quests */
  return_date: string | null;
  source: QuestSource;
  /** Shop order this quest was confirmed from (source 'shop') */
  shop_order_id: number | null;
  pickup_time?: string;
  budget_owner: string;
  items: QuestItem[];
  status: QuestStatus;
  transfers: QuestTransfer[];
  location_id: number | null;
  location_name: string | null;
  location_resolved: boolean;
  /** Wolontariusze przypisani do transferów questa. Pustа tablica gdy brak transferów. */
  assigned_volunteers: QuestVolunteer[];
}

export interface QuestsListResponse {
  count: number;
  limit: number;
  offset: number;
  quests: Quest[];
}

export interface QuestsListParams {
  status?: QuestStatus;
  location_id?: number;
  limit?: number;
  offset?: number;
}

export interface UpdateQuestStatusPayload {
  status: QuestStatus;
}

// SSE events — discriminated union on data.type (the event name is always "quest_update").
// quests_changed is emitted once shop orders are confirmed into quests (shop phase 1).
export type QuestEvent =
  | { type: 'quests_changed' }
  | { type: 'stocks_changed'; location_id: number; action: 'created' | 'updated' | 'deleted' };

// Location Resolution Types

export interface UpdateQuestLocationPayload {
  location_id: number;
}

export interface UpdateQuestLocationResponse {
  message: string;
  location_id: number;
}

export interface UnresolvedLocationsResponse {
  count: number;
  quests: Quest[];
}

// Transfer Integration Types

export interface CreateTransferFromQuestRequest {
  from_location_id: number;
  to_location_id?: number;
  stock_items?: StockItemOverride[];
  assets?: AssetOverride[];
  users?: UserOverride[];
}

export interface StockItemOverride {
  id: number;
  quantity: number;
}

export interface AssetOverride {
  id: number;
}

export interface UserOverride {
  id: number;
}

export interface CreateTransferFromQuestResponse {
  message: string;
  transfer_id: number;
  quest_id: string;
}

export interface TransferPreview {
  from_location_id: number;
  to_location_id?: number | null;
  to_location_name?: string;
  resolved_items: ResolvedStockItem[];
  unresolved_items: UnresolvedItem[];
}

export interface ResolvedStockItem {
  stock_id: number;
  category_id: number;
  category_name?: string;
  item_name: string;
  quantity: number;
  available: number;
}

export interface UnresolvedItem {
  item_name: string;
  /** null when the reason is a missing quantity (reason: "quantity not specified in sheet") */
  quantity: number | null;
  category_id?: number | null;
  reason: string;
}
