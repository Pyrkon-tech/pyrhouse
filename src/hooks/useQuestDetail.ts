import { useState, useEffect, useCallback } from 'react';
import { getQuestDetailsAPI, updateQuestStatusAPI } from '../services/questService';
import { ApiError } from '../services/apiClient';
import type { Quest, QuestStatus } from '../types/quest.types';

export const useQuestDetail = (questId: string | undefined) => {
  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuest = useCallback(async () => {
    if (!questId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getQuestDetailsAPI(questId);
      setQuest(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Wystąpił błąd podczas pobierania szczegółów zamówienia');
      }
    } finally {
      setLoading(false);
    }
  }, [questId]);

  useEffect(() => {
    fetchQuest();
  }, [fetchQuest]);

  const updateStatus = useCallback(async (newStatus: QuestStatus) => {
    if (!questId) return;
    await updateQuestStatusAPI(questId, { status: newStatus });
    await fetchQuest();
  }, [questId, fetchQuest]);

  return { quest, loading, error, refreshQuest: fetchQuest, updateStatus };
};
