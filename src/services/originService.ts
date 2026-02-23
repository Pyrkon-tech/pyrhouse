import { apiClient } from './apiClient';
import type { Origin, CreateOriginPayload, UpdateOriginPayload } from '../types/origin.types';

/** Lista aktywnych originów (dla formularzy, dropdownów) */
export const getOriginsAPI = () =>
  apiClient.get<Origin[]>('/origins');

/** Lista wszystkich originów włącznie z nieaktywnymi (moderator+) */
export const getAllOriginsAPI = () =>
  apiClient.get<Origin[]>('/origins/all');

/** Tworzy nowy origin (admin) */
export const createOriginAPI = (payload: CreateOriginPayload) =>
  apiClient.post<Origin>('/origins', payload);

/** Aktualizuje origin (admin) — slug nie jest edytowalny */
export const updateOriginAPI = (id: number, payload: UpdateOriginPayload) =>
  apiClient.patch<Origin>(`/origins/${id}`, payload);

/** Dezaktywuje origin — soft delete (admin) */
export const deleteOriginAPI = (id: number) =>
  apiClient.delete<{ message: string }>(`/origins/${id}`);
