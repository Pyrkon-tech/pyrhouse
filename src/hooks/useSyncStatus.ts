import { useState, useEffect, useCallback } from 'react';
import { getSyncStatusAPI } from '../services/questService';
import { ApiError } from '../services/apiClient';
import type { SyncStatusResponse } from '../types/quest.types';

/**
 * Hook do pobierania stanu schedulera auto-sync.
 * Odświeża dane co `refreshIntervalMs` (domyślnie 60 sekund).
 */
export const useSyncStatus = (refreshIntervalMs = 60_000) => {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus(await getSyncStatusAPI());
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, refreshIntervalMs);
    return () => clearInterval(id);
  }, [fetchStatus, refreshIntervalMs]);

  /**
   * Parsuje format Go duration "15m0s" → czytelny tekst "15 min"
   */
  const formatInterval = (interval?: string): string => {
    if (!interval) return '';
    const match = interval.match(/^(?:(\d+)h)?(?:(\d+)m)?/);
    if (!match) return interval;
    const h = match[1] ? `${match[1]}h ` : '';
    const m = match[2] ? `${match[2]} min` : '';
    return `${h}${m}`.trim();
  };

  return { status, loading, error, refresh: fetchStatus, formatInterval };
};
