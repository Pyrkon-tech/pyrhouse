import { useState, useCallback } from 'react';
import { COL_W_MIN, COL_W_MAX, COL_W_DEFAULT, COL_W_STORAGE_KEY } from '../constants';

export function useColWidth(): [number, (v: number) => void] {
  const [colWidth, setColWidthState] = useState<number>(() => {
    const stored = localStorage.getItem(COL_W_STORAGE_KEY);
    if (stored) {
      const n = parseFloat(stored);
      if (!isNaN(n) && n >= COL_W_MIN && n <= COL_W_MAX) return n;
    }
    return COL_W_DEFAULT;
  });

  const setColWidth = useCallback((v: number) => {
    const clamped = Math.max(COL_W_MIN, Math.min(COL_W_MAX, v));
    localStorage.setItem(COL_W_STORAGE_KEY, String(clamped));
    setColWidthState(clamped);
  }, []);

  return [colWidth, setColWidth];
}
