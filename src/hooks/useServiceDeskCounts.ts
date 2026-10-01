import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { paths } from '@pyrhouse/api';

type ServiceDeskCounts = paths['/service-desk/requests/counts']['get']['responses']['200']['content']['application/json'];

const EMPTY: ServiceDeskCounts = { new: 0, in_progress: 0, waiting: 0, resolved: 0, closed: 0 };

/** Service desk request counts per status (GET /service-desk/requests/counts). */
/** @param refreshMs poll interval (menu badges); omitted = load once */
export const useServiceDeskCounts = (refreshMs?: number) => {
  const [counts, setCounts] = useState<ServiceDeskCounts>(EMPTY);

  const fetchCounts = useCallback(async () => {
    try {
      setCounts(await apiClient.get<ServiceDeskCounts>('/service-desk/requests/counts'));
    } catch {
      // Counters are best-effort; the lists show real errors
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    if (!refreshMs) return;
    const id = setInterval(fetchCounts, refreshMs);
    return () => clearInterval(id);
  }, [fetchCounts, refreshMs]);

  return { counts, refreshCounts: fetchCounts };
};
