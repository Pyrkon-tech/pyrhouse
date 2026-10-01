import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { paths } from '@pyrhouse/api';

type QuestCounts = paths['/equipment-requests/quests/counts']['get']['responses']['200']['content']['application/json'];

const EMPTY: QuestCounts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };

/** Quest counts per status from one grouped query (GET /equipment-requests/quests/counts). */
export const useQuestCounts = () => {
  const [counts, setCounts] = useState<QuestCounts>(EMPTY);

  const fetchCounts = useCallback(async () => {
    try {
      setCounts(await apiClient.get<QuestCounts>('/equipment-requests/quests/counts'));
    } catch {
      // Counters are best-effort; the lists show real errors
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, refreshCounts: fetchCounts };
};
