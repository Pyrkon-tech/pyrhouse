import { useEffect, useRef, useState } from 'react';
import { env } from '../config/env';

export interface VolunteerStatusChangedEvent {
  type: 'volunteer_status_changed';
  user_id: number;
  status: 'available' | 'on_mission';
  current_mission?: string;
}

export interface DutyRosterChangedEvent {
  type: 'duty_roster_changed';
  reason: 'slot_started' | 'slot_ended';
  slot_id: number;
}

export type DispatchStreamEvent = VolunteerStatusChangedEvent | DutyRosterChangedEvent;

interface UseDispatchStreamOptions {
  onVolunteerStatusChanged: (event: VolunteerStatusChangedEvent) => void;
  onDutyRosterChanged: (event: DutyRosterChangedEvent) => void;
  enabled?: boolean;
}

/**
 * SSE hook for GET /dispatch/stream.
 * Same pattern as useQuestStream — fetch() + ReadableStream with Authorization: Bearer.
 */
export const useDispatchStream = ({
  onVolunteerStatusChanged,
  onDutyRosterChanged,
  enabled = true,
}: UseDispatchStreamOptions) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStatusRef = useRef(onVolunteerStatusChanged);
  const onRosterRef = useRef(onDutyRosterChanged);
  useEffect(() => { onStatusRef.current = onVolunteerStatusChanged; });
  useEffect(() => { onRosterRef.current = onDutyRosterChanged; });

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('token') ?? '';
    const controller = new AbortController();
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      try {
        const response = await fetch(`${env.API_BASE_URL}/dispatch/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (cancelled) return;

        if (!response.ok || !response.body) {
          setConnected(false);
          setError(`Błąd SSE dispatch: HTTP ${response.status}`);
          return;
        }

        setConnected(true);
        setError(null);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventName = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trimEnd();

            if (trimmed.startsWith('event:')) {
              currentEventName = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              try {
                const payload = JSON.parse(trimmed.slice(5).trim());
                if (currentEventName === 'volunteer_status_changed') {
                  onStatusRef.current(payload as VolunteerStatusChangedEvent);
                } else if (currentEventName === 'duty_roster_changed') {
                  onRosterRef.current(payload as DutyRosterChangedEvent);
                }
              } catch {
                console.warn('[SSE dispatch] Failed to parse event', trimmed.slice(5));
              }
              currentEventName = '';
            } else if (trimmed === '') {
              currentEventName = '';
            }
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        console.warn('[SSE dispatch] Connection error, retrying in 3s', err);
      }

      if (!cancelled) {
        setConnected(false);
        setError('Połączenie SSE dispatch utracone — próba ponownego połączenia...');
        retryTimeout = setTimeout(connect, 3000);
      }
    };

    retryTimeout = setTimeout(connect, 0);

    return () => {
      cancelled = true;
      controller.abort();
      if (retryTimeout !== null) clearTimeout(retryTimeout);
      setConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { connected, error };
};
