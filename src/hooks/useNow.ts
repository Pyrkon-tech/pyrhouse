import { useEffect, useState } from 'react';

/**
 * Returns the current timestamp (ms), re-rendering every `intervalMs`.
 * Use for views whose state depends on the passage of time (e.g. urgency
 * thresholds on the dispatch map) and would otherwise only update on data events.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
