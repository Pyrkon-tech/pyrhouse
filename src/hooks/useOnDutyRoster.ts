import { useState, useCallback, useRef } from 'react';
import type { OnDutyVolunteer } from '../types/schedule.types';
import { getOnDutyAPI } from '../services/scheduleService';
import { useDispatchStream } from './useDispatchStream';
import type { VolunteerStatusChangedEvent, DutyRosterChangedEvent } from './useDispatchStream';

interface UseOnDutyRosterResult {
  roster: OnDutyVolunteer[];
  loading: boolean;
  error: string | null;
  streamConnected: boolean;
  fetchRoster: (simulatedTime?: Date) => Promise<void>;
}

/**
 * Manages the on-duty volunteer roster for the dispatch view.
 *
 * - Initial load: GET /schedule/on-duty (with optional simulated time in dev mode)
 * - Real-time: SSE /dispatch/stream updates status in-place (volunteer_status_changed)
 *   or triggers a full refetch (duty_roster_changed — slot boundary crossed)
 */
export const useOnDutyRoster = (simulatedTime?: Date): UseOnDutyRosterResult => {
  const [roster, setRoster] = useState<OnDutyVolunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep simulated time in a ref so SSE callbacks always see the latest value
  const simulatedTimeRef = useRef(simulatedTime);
  simulatedTimeRef.current = simulatedTime;

  // Stale-request guard: ignore results from superseded fetches (rapid time changes, StrictMode double-invoke)
  const fetchGenRef = useRef(0);

  const fetchRoster = useCallback(async (overrideTime?: Date) => {
    const generation = ++fetchGenRef.current;
    const t = overrideTime ?? simulatedTimeRef.current;
    const at = t ? t.toISOString() : undefined;
    setLoading(true);
    setError(null);
    try {
      const data = await getOnDutyAPI(at);
      if (fetchGenRef.current !== generation) return;
      setRoster(data);
    } catch (e) {
      if (fetchGenRef.current !== generation) return;
      setError((e instanceof Error ? e.message : '') || 'Błąd pobierania dyżurnych');
    } finally {
      if (fetchGenRef.current === generation) setLoading(false);
    }
  }, []);

  const handleVolunteerStatusChanged = useCallback((event: VolunteerStatusChangedEvent) => {
    setRoster(prev => prev.map(entry => {
      if (entry.user_id !== event.user_id) return entry;
      return {
        ...entry,
        status: event.status,
        current_mission: event.current_mission ?? null,
      };
    }));
  }, []);

  const handleDutyRosterChanged = useCallback((_event: DutyRosterChangedEvent) => {
    // Slot boundary crossed — full refetch with current simulated time
    fetchRoster();
  }, [fetchRoster]);

  const { connected: streamConnected } = useDispatchStream({
    onVolunteerStatusChanged: handleVolunteerStatusChanged,
    onDutyRosterChanged: handleDutyRosterChanged,
  });

  return { roster, loading, error, streamConnected, fetchRoster };
};
