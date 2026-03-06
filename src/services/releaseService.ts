import { apiClient } from './apiClient';
import type {
  Release,
  ReleaseDetail,
  SuggestResponse,
  CreateReleasePayload,
  UpdateReleaseItemsPayload,
} from '../types/release.types';

export const getReleasesSuggestAPI = (originId: number, locationId?: number): Promise<SuggestResponse> => {
  const params = new URLSearchParams({ origin_id: String(originId) });
  if (locationId) params.append('location_id', String(locationId));
  return apiClient.get<SuggestResponse>(`/releases/suggest?${params.toString()}`);
};

export const getReleasesAPI = (filters?: { status?: string; origin_id?: number }): Promise<Release[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.origin_id) params.append('origin_id', String(filters.origin_id));
  const qs = params.toString();
  return apiClient.get<Release[]>(qs ? `/releases?${qs}` : '/releases');
};

export const getReleaseAPI = (id: number): Promise<ReleaseDetail> =>
  apiClient.get<ReleaseDetail>(`/releases/${id}`);

export const createReleaseAPI = (payload: CreateReleasePayload): Promise<ReleaseDetail> =>
  apiClient.post<ReleaseDetail>('/releases', payload);

export const updateReleaseItemsAPI = (id: number, payload: UpdateReleaseItemsPayload): Promise<ReleaseDetail> =>
  apiClient.put<ReleaseDetail>(`/releases/${id}/items`, payload);

export const confirmReleaseAPI = (id: number): Promise<ReleaseDetail> =>
  apiClient.post<ReleaseDetail>(`/releases/${id}/confirm`, {});

export const deleteReleaseAPI = (id: number): Promise<void> =>
  apiClient.delete<void>(`/releases/${id}`);
