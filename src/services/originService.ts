import { apiClient } from './apiClient';
import type { Origin, CreateOriginPayload, UpdateOriginPayload } from '../types/origin.types';

/** Tworzy nowy origin (admin) */
export const createOriginAPI = (payload: CreateOriginPayload) =>
  apiClient.post<Origin>('/origins', payload);

/** Aktualizuje origin (admin) — slug nie jest edytowalny */
export const updateOriginAPI = (id: number, payload: UpdateOriginPayload) =>
  apiClient.patch<Origin>(`/origins/${id}`, payload);

/** Dezaktywuje origin — soft delete (admin) */
export const deleteOriginAPI = (id: number) =>
  apiClient.delete<{ message: string }>(`/origins/${id}`);
