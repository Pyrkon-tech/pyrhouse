import { useState, useCallback, useRef } from 'react';
import type { OnDutyVolunteer } from '../types/schedule.types';
import { getOnDutyAPI } from '../services/scheduleService';
import { useDispatchStream } from './useDispatchStream';
import type { VolunteerStatusChangedEvent, DutyRosterChangedEvent } from './useDispatchStream';

/**
 * Format a Date's local wall-clock components as a `Z`-suffixed ISO string.
 *
 * The schedule stores Polish wall-clock times with a fake `Z` suffix (see parseAsLocal:
 * "10:00:00Z" means 10:00 Polish time). The on-duty matcher compares `at` against those
 * stored values literally, so `at` must carry wall-clock time — NOT real UTC. Sending
 * `new Date().toISOString()` would be UTC, which lags wall-clock by the local offset
 * (2h in CEST), matching the slot from ~2h ago.
 */
const toWallClockZ = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}Z`;
};

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
    // Simulated time is already stored as a wall-clock-as-UTC instant (built from `value + 'Z'`),
    // so toISOString() yields the correct wall-clock `Z` string. For real "now" we must convert
    // local wall-clock into a `Z` string, otherwise the backend matches the slot ~offset hours ago.
    const at = t ? t.toISOString() : toWallClockZ(new Date());
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
