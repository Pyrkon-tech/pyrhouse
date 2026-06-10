import { useEffect, useRef, useState } from 'react';
import { env } from '../config/env';

export type ServiceDeskEventType = 'request_created' | 'request_updated' | 'comment_added';

export interface ServiceDeskSSEEvent {
  type: ServiceDeskEventType;
  request_id: number;
  request_type?: string; // request_created
  field?: string;        // request_updated
  value?: string;        // request_updated
}

interface UseServiceDeskStreamOptions {
  onEvent: (event: ServiceDeskSSEEvent) => void;
  enabled?: boolean;
}

/**
 * Hook do obsługi SSE real-time updates dla Service Desk.
 *
 * Wzorzec identyczny z useQuestStream:
 * - native fetch + ReadableStream (obsługuje Authorization header)
 * - auto-reconnect po 3s przy utracie połączenia
 * - StrictMode-safe przez setTimeout(0) defer + cancelled flag
 */
export const useServiceDeskStream = ({ onEvent, enabled = true }: UseServiceDeskStreamOptions) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('token') ?? '';
    const controller = new AbortController();
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      try {
        const response = await fetch(`${env.API_BASE_URL}/service-desk/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (cancelled) return;

        if (!response.ok || !response.body) {
          setConnected(false);
          setError(`Błąd SSE: HTTP ${response.status}`);
          return;
        }

        setConnected(true);
        setError(null);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventName = '';

         
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
              if (currentEventName === 'service_desk_update') {
                try {
                  onEventRef.current(JSON.parse(trimmed.slice(5).trim()) as ServiceDeskSSEEvent);
                } catch {
                  console.warn('[SSE:servicedesk] Failed to parse event', trimmed.slice(5));
                }
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
        console.warn('[SSE:servicedesk] Connection error, retrying in 3s', err);
      }

      if (!cancelled) {
        setConnected(false);
        setError('Połączenie SSE utracone — próba ponownego połączenia...');
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
   
  }, [enabled]);

  return { connected, error };
};
