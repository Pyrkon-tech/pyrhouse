import { apiClient } from './apiClient';
import type { Setting, SettingWithValue } from '../types/settings.types';

/** Lista ustawień, opcjonalnie filtrowana przez prefix. Z prefixem zwraca pełne wartości. */
export const getSettingsAPI = (prefix?: string) => {
  const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
  return apiClient.getList<Setting>(`/settings${qs}`);
};

/** Pobiera pojedyncze ustawienie z wartością */
export const getSettingAPI = (key: string) =>
  apiClient.get<SettingWithValue>(`/settings/${key}`);

/** Aktualizuje wartość ustawienia (PUT) */
export const updateSettingAPI = (key: string, value: string) =>
  apiClient.put<{ message: string }>(`/settings/${key}`, { value });
