/**
 * Quest (equipment request) shapes are aliases of the generated API contract (@pyrhouse/api, from
 * backend/docs/openapi.yaml). Request payloads and SSE events below are still hand-written.
 */
import type { Schemas } from '@pyrhouse/api';

export type Quest = Schemas['EquipmentRequestQuest'];
export type QuestStatus = Quest['status'];
/** 'sheet' = historic Google Sheets import, 'shop' = confirmed organizer shop order */
export type QuestSource = Quest['source'];
export type QuestDestination = Schemas['QuestDestination'];
/** quantity null = unknown (historic sheet items); category_id null = no category matched */
export type QuestItem = Schemas['QuestItem'];
export type QuestVolunteer = Schemas['QuestVolunteer'];
export type QuestTransfer = Schemas['QuestTransfer'];
export type QuestsListResponse = Schemas['QuestsListResponse'];

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
