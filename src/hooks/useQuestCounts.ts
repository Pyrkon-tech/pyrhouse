import { useState, useCallback, useEffect } from 'react';
import { getQuestsAPI } from '../services/questService';

interface QuestCounts {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

/**
 * Pobiera liczniki questów dla każdego statusu niezależnie od aktywnego filtra.
 * Używa 4 równoległych requestów z limit=1 — interesuje nas tylko pole `count`.
 */
export const useQuestCounts = () => {
  const [counts, setCounts] = useState<QuestCounts>({ pending: 0, in_progress: 0, completed: 0, cancelled: 0 });

  const fetchCounts = useCallback(async () => {
    try {
      // Nie przekazujemy limit — backend używa domyślnego i zwraca poprawny count.
      // (przy limit=1 niektóre backendy zwracają count=1 zamiast total)
      const [pending, inProgress, completed, cancelled] = await Promise.all([
        getQuestsAPI({ status: 'pending' }),
        getQuestsAPI({ status: 'in_progress' }),
        getQuestsAPI({ status: 'completed' }),
        getQuestsAPI({ status: 'cancelled' }),
      ]);
      setCounts({
        pending: pending.quests.length,
        in_progress: inProgress.quests.length,
        completed: completed.quests.length,
        cancelled: cancelled.quests.length,
      });
    } catch {
      // Błąd liczników nie jest krytyczny — stats puste to mniejszy problem
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, refreshCounts: fetchCounts };
};
