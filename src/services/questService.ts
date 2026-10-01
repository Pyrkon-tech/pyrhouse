/**
 * Serwis API dla Equipment Requests (Quests)
 *
 * Wszystkie funkcje używają centralnego apiClient
 */

import { apiClient } from './apiClient';
import type {
  Quest,
  QuestsListResponse,
  QuestsListParams,
  UpdateQuestStatusPayload,
  CreateTransferFromQuestRequest,
  CreateTransferFromQuestResponse,
  UpdateQuestLocationPayload,
  UpdateQuestLocationResponse,
} from '../types/quest.types';

// ============================================================================
// Quest CRUD
// ============================================================================

/**
 * Pobiera listę questów z paginacją i filtrowaniem
 */
export const getQuestsAPI = (params?: QuestsListParams) => {
  const queryParts: string[] = [];
  if (params?.status) queryParts.push(`status=${params.status}`);
  if (params?.location_id !== undefined) queryParts.push(`location_id=${params.location_id}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.offset !== undefined) queryParts.push(`offset=${params.offset}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiClient.get<QuestsListResponse>(`/equipment-requests/quests${queryString}`);
};

/**
 * Pobiera szczegóły questa
 */
export const getQuestDetailsAPI = (questId: string) =>
  apiClient.get<Quest>(`/equipment-requests/quests/${questId}`);

/**
 * Zmienia status questa
 */
export const updateQuestStatusAPI = (questId: string, payload: UpdateQuestStatusPayload) =>
  apiClient.patch<{ message: string; status: string }>(`/equipment-requests/quests/${questId}/status`, payload);

// ============================================================================
// Transfer Integration
// ============================================================================

/**
 * Tworzy transfer magazynowy z questa
 */
export const createTransferFromQuestAPI = (questId: string, payload: CreateTransferFromQuestRequest) =>
  apiClient.post<CreateTransferFromQuestResponse>(
    `/equipment-requests/quests/${questId}/transfer`,
    payload
  );

// ============================================================================
// Location Resolution
// ============================================================================

/**
 * Ręczne przypisanie lokalizacji do questa
 */
export const updateQuestLocationAPI = (questId: string, payload: UpdateQuestLocationPayload) =>
  apiClient.patch<UpdateQuestLocationResponse>(
    `/equipment-requests/quests/${questId}/location`,
    payload,
  );
