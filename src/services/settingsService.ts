import { apiClient } from './apiClient';
import type { Setting } from '../types/settings.types';

/** Lista ustawień, opcjonalnie filtrowana przez prefix. Z prefixem zwraca pełne wartości. */
export const getSettingsAPI = (prefix?: string) => {
  const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
  return apiClient.get<Setting[]>(`/settings${qs}`);
};

/** Pobiera pojedyncze ustawienie z wartością */
export const getSettingAPI = (key: string) =>
  apiClient.get<Setting>(`/settings/${key}`);

/** Aktualizuje wartość ustawienia (PUT) */
export const updateSettingAPI = (key: string, value: string) =>
  apiClient.put<{ message: string }>(`/settings/${key}`, { value });
