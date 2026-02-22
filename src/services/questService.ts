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
  SyncResponse,
  SyncLog,
  SyncStatusResponse,
  CreateCategoryMappingPayload,
  CategoryMapping,
  CategoryMappingsResponse,
  TransferPreview,
  CreateTransferFromQuestRequest,
  CreateTransferFromQuestResponse,
  LocationMapping,
  LocationMappingsResponse,
  CreateLocationMappingPayload,
  UpdateQuestLocationPayload,
  UpdateQuestLocationResponse,
  UnresolvedLocationsResponse,
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
// Sync Operations
// ============================================================================

/**
 * Ręczna synchronizacja z Google Sheets
 */
export const triggerSyncAPI = () =>
  apiClient.post<SyncResponse>('/equipment-requests/sync');

/**
 * Pobiera log ostatniej synchronizacji
 */
export const getSyncLogAPI = () =>
  apiClient.get<SyncLog>('/equipment-requests/sync-log');

// ============================================================================
// Category Mapping
// ============================================================================

/**
 * Tworzy mapowanie kategorii
 */
export const createCategoryMappingAPI = (payload: CreateCategoryMappingPayload) =>
  apiClient.post<{ message: string; mapping: CategoryMapping }>('/equipment-requests/category-mapping', payload);

// ============================================================================
// Transfer Integration
// ============================================================================

/**
 * Podgląd transferu z questa (preview resolved/unresolved items)
 */
export const getTransferPreviewAPI = (questId: string, fromLocationId: number) =>
  apiClient.get<TransferPreview>(
    `/equipment-requests/quests/${questId}/transfer-preview?from_location_id=${fromLocationId}`
  );

/**
 * Tworzy transfer magazynowy z questa
 */
export const createTransferFromQuestAPI = (questId: string, payload: CreateTransferFromQuestRequest) =>
  apiClient.post<CreateTransferFromQuestResponse>(
    `/equipment-requests/quests/${questId}/transfer`,
    payload
  );

// ============================================================================
// Phase 4 — Sync Status, Category Mappings, SSE
// ============================================================================

/**
 * Pobiera stan schedulera (auto-sync)
 */
export const getSyncStatusAPI = () =>
  apiClient.get<SyncStatusResponse>('/equipment-requests/sync-status');

/**
 * Pobiera listę mapowań kategorii
 */
export const getCategoryMappingsAPI = () =>
  apiClient.get<CategoryMappingsResponse>('/equipment-requests/category-mappings');

/**
 * Usuwa mapowanie kategorii (204 No Content)
 */
export const deleteCategoryMappingAPI = (id: number): Promise<void> =>
  apiClient.delete<void>(`/equipment-requests/category-mappings/${id}`);

// ============================================================================
// Location Resolution
// ============================================================================

/**
 * Questy z nierozwiązaną lokalizacją (location_resolved: false)
 */
export const getUnresolvedLocationsAPI = () =>
  apiClient.get<UnresolvedLocationsResponse>('/equipment-requests/quests/unresolved-locations');

/**
 * Ręczne przypisanie lokalizacji do questa
 * save_mapping: true → zapisz jako mapping do auto-resolution w przyszłości
 */
export const updateQuestLocationAPI = (questId: string, payload: UpdateQuestLocationPayload) =>
  apiClient.patch<UpdateQuestLocationResponse>(
    `/equipment-requests/quests/${questId}/location`,
    payload,
  );

/**
 * Lista mapowań pavilion+location_name → location_id
 */
export const getLocationMappingsAPI = () =>
  apiClient.get<LocationMappingsResponse>('/equipment-requests/location-mappings');

/**
 * Tworzy nowe mapowanie lokalizacji
 */
export const createLocationMappingAPI = (payload: CreateLocationMappingPayload) =>
  apiClient.post<{ message: string; mapping: LocationMapping }>('/equipment-requests/location-mappings', payload);

/**
 * Usuwa mapowanie lokalizacji (204 No Content)
 */
export const deleteLocationMappingAPI = (id: number): Promise<void> =>
  apiClient.delete<void>(`/equipment-requests/location-mappings/${id}`);

