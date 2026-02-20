import { useState, useCallback } from 'react';
import { getQuestsAPI } from '../services/questService';
import { ApiError } from '../services/apiClient';
import type { Quest, QuestsListParams } from '../types/quest.types';

export const useQuests = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuests = useCallback(async (params?: QuestsListParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getQuestsAPI(params);
      setQuests(response.quests || []);
      setCount(response.count);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Wystąpił błąd podczas pobierania zamówień');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    quests,
    count,
    loading,
    error,
    fetchQuests,
  };
};
