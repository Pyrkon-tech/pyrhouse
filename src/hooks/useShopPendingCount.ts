import { useEffect, useState } from 'react';
import { getShopOrdersAPI } from '../services/shopAdminService';

const REFRESH_MS = 60_000;

/**
 * Number of shop orders waiting for a warehouse decision — the "Sklep" menu badge (D26: no
 * notifications in the MVP, moderators see this counter). Polls only when enabled (moderator+).
 */
export const useShopPendingCount = (enabled: boolean): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const pending = await getShopOrdersAPI('submitted');
        if (!cancelled) setCount(pending.length);
      } catch {
        // The badge is best-effort; the Sklep pages show real errors.
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  return count;
};
