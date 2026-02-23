import { useState, useCallback, useEffect } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import type { Origin } from '../types/origin.types';

const CACHE_KEY = 'origins_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minut — origins zmieniają się rzadko
const ORIGINS_CHANGED_EVENT = 'origins_changed';

interface CacheData {
  data: Origin[];
  timestamp: number;
}

/** Rozgłasza zmianę originów do innych komponentów korzystających z useOrigins */
export const notifyOriginsChanged = () => {
  localStorage.removeItem(CACHE_KEY);
  window.dispatchEvent(new Event(ORIGINS_CHANGED_EVENT));
};

/**
 * Hook do pobierania i zarządzania origins.
 *
 * @param fetchAll - true: pobierz wszystkie (wlacznie z nieaktywnymi) — wymaga moderator+
 *                  false (domyślnie): tylko aktywne — dla formularzy
 *
 * Cache localStorage z TTL 5 min. Dostępny `refresh()` do wymuszenia odświeżenia.
 */
export const useOrigins = (fetchAll = false) => {
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrigins = useCallback(async (forceRefresh = false) => {
    // Cache tylko dla aktywnych (GET /origins) — admin view zawsze świeży
    if (!forceRefresh && !fetchAll) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached) as CacheData;
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setOrigins(data);
            return;
          }
        } catch {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    }

    setLoading(true);
    setError(null);
    try {
      const endpoint = fetchAll ? '/origins/all' : '/origins';
      const data = await apiClient.get<Origin[]>(endpoint);
      if (!fetchAll) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      }
      setOrigins(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Błąd pobierania originów');
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  useEffect(() => {
    fetchOrigins();
  }, [fetchOrigins]);

  // Nasłuchuj zmian z innych komponentów (np. po dodaniu/usunięciu originu w panelu admina)
  useEffect(() => {
    const handleChanged = () => fetchOrigins(true);
    window.addEventListener(ORIGINS_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(ORIGINS_CHANGED_EVENT, handleChanged);
  }, [fetchOrigins]);

  return {
    origins,
    loading,
    error,
    /** Wymuś odświeżenie z API (pomija cache) */
    refresh: useCallback(() => fetchOrigins(true), [fetchOrigins]),
  };
};
