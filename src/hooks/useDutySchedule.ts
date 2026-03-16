import { useState, useEffect, useCallback } from 'react';
import { getScheduleDetailAPI } from '../services/scheduleService';
import { ApiError } from '../services/apiClient';
import type { ScheduleDetail } from '../types/schedule.types';

export function useDutySchedule() {
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [noActive, setNoActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoActive(false);
    try {
      const data = await getScheduleDetailAPI();
      setSchedule(data);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        setNoActive(true);
        setSchedule(null);
      } else {
        setError(e instanceof Error ? e.message : 'Błąd pobierania harmonogramu');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  return { schedule, setSchedule, noActive, loading, error, refetch: fetchSchedule };
}
