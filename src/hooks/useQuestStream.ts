import { useEffect, useRef, useState } from 'react';
import { env } from '../config/env';
import type { QuestEvent } from '../types/quest.types';

interface UseQuestStreamOptions {
  onEvent: (event: QuestEvent) => void;
  enabled?: boolean;
}

/**
 * Hook do obsługi SSE real-time updates dla questów.
 *
 * Używa natywnego fetch() + ReadableStream — obsługuje Authorization: Bearer header.
 *
 * Zachowanie:
 * - 200 OK → setConnected(true) natychmiast po otrzymaniu odpowiedzi
 * - non-200 → setError, nie retryuje
 * - Utrata połączenia → setConnected(false), auto-reconnect po 3s
 * - Cleanup (unmount) → AbortController.abort() + cancelled flag (StrictMode-safe)
 * - setTimeout(0) defer → w StrictMode tylko 2. invokacja efektu nawiązuje połączenie
 */
export const useQuestStream = ({ onEvent, enabled = true }: UseQuestStreamOptions) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable ref for onEvent — avoids stale closure without restarting the connection
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
        const response = await fetch(`${env.API_BASE_URL}/equipment-requests/stream`, {
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
              if (currentEventName === 'quest_update') {
                try {
                  onEventRef.current(JSON.parse(trimmed.slice(5).trim()) as QuestEvent);
                } catch {
                  console.warn('[SSE] Failed to parse quest_update', trimmed.slice(5));
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
        console.warn('[SSE] Connection error, retrying in 3s', err);
      }

      if (!cancelled) {
        setConnected(false);
        setError('Połączenie SSE utracone — próba ponownego połączenia...');
        retryTimeout = setTimeout(connect, 3000);
      }
    };

    // Defer przez setTimeout(0) — w StrictMode cleanup wyczyści ten timeout
    // zanim connect() wystrzeli, więc tylko 2. invokacja efektu nawiązuje połączenie.
    retryTimeout = setTimeout(connect, 0);

    return () => {
      cancelled = true;
      controller.abort();
      if (retryTimeout !== null) clearTimeout(retryTimeout);
      setConnected(false);
    };
  // onEvent celowo pominięty w deps — obsługiwany przez onEventRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { connected, error };
};
