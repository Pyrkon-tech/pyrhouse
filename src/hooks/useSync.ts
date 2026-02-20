import { useState, useEffect, useCallback } from 'react';
import { triggerSyncAPI, getSyncLogAPI } from '../services/questService';
import { ApiError } from '../services/apiClient';
import type { SyncLog, SyncResponse } from '../types/quest.types';

export const useSync = () => {
  const [syncLog, setSyncLog] = useState<SyncLog | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSyncLog = useCallback(async () => {
    try {
      setLoading(true);
      const log = await getSyncLogAPI();
      setSyncLog(log);
    } catch (err) {
      // 404 = brak logów - to normalne
      if (err instanceof ApiError && err.status !== 404) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyncLog();
  }, [fetchSyncLog]);

  const triggerSync = useCallback(async (): Promise<SyncResponse> => {
    setSyncing(true);
    setError(null);
    try {
      const response = await triggerSyncAPI();
      await fetchSyncLog();
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [fetchSyncLog]);

  return { syncLog, syncing, loading, error, triggerSync, refreshSyncLog: fetchSyncLog };
};
