export type QuestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type CategoryMatchType = 'exact' | 'fuzzy' | 'manual' | 'none';

export interface QuestDestination {
  pavilion: string;
  location: string;
}

export interface QuestItem {
  name: string;
  quantity: number;
  category_id?: number;
  category_match: CategoryMatchType;
  category_match_confidence?: number;
  budget_owner?: string;
  notes?: string;
}

export interface Quest {
  id: string;
  destination: QuestDestination;
  recipient: string;
  delivery_date: string;
  pickup_time?: string;
  budget_owner: string;
  items: QuestItem[];
  status: QuestStatus;
  transfer_id?: number | null;
  transfer_status?: string | null;
  source_rows: number[];
  last_synced: string;
}

export interface QuestsListResponse {
  count: number;
  limit: number;
  offset: number;
  quests: Quest[];
}

export interface QuestsListParams {
  status?: QuestStatus;
  limit?: number;
  offset?: number;
}

export interface UpdateQuestStatusPayload {
  status: QuestStatus;
}

export interface SyncStats {
  quests_created: number;
  quests_updated: number;
  quests_unchanged: number;
  items_added: number;
  items_removed: number;
}

export interface SyncResponse {
  message: string;
  stats: SyncStats;
  quests: Quest[];
}

export interface SyncLog {
  id: number;
  synced_at: string;
  rows_processed: number;
  quests_created: number;
  quests_updated: number;
  quests_unchanged: number;
  items_added: number;
  items_removed: number;
  success: boolean;
  duration_ms: number;
  sheet_id: string;
  errors: string;
}

export interface CategoryMapping {
  id: number;
  form_item_name: string;
  category_id: number;
  usage_count: number;
  created_by?: number;
  created_at: string;
}

export interface CategoryMappingsResponse {
  count: number;
  mappings: CategoryMapping[];
}

// SSE events — discriminated union po data.type (event name to zawsze "quest_update")
export type QuestEvent =
  | { type: 'sync_completed'; stats?: SyncStats }
  | { type: 'stocks_changed'; location_id: number; action: 'created' | 'updated' | 'deleted' };

// Stan schedulera
export interface SyncStatusResponse {
  enabled: boolean;
  interval?: string;   // np. "15m0s"
  last_sync?: string;  // ISO datetime
  next_sync?: string;  // ISO datetime
  last_error?: string; // pusty = brak błędu
}

export interface CreateCategoryMappingPayload {
  form_item_name: string;
  category_id: number;
  created_by?: number;
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
  quantity: number;
  category_id?: number | null;
  reason: string;
}
