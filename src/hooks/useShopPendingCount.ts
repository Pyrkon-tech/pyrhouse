import { useEffect, useState } from 'react';
import { getShopOrdersAPI } from '../services/shopAdminService';

const REFRESH_MS = 60_000;
const CHANGED_EVENT = 'shop_orders_changed';

/** Call after confirming or rejecting an order so the menu badge updates right away. */
export const notifyShopOrdersChanged = () => window.dispatchEvent(new Event(CHANGED_EVENT));

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
    window.addEventListener(CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener(CHANGED_EVENT, load);
    };
  }, [enabled]);

  return count;
};
