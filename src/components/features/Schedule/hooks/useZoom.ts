import { useState, useCallback } from 'react';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_DEFAULT, ZOOM_STORAGE_KEY } from '../constants';

export function useZoom(): [number, (v: number) => void] {
  const [zoom, setZoomState] = useState<number>(() => {
    const stored = localStorage.getItem(ZOOM_STORAGE_KEY);
    if (stored) {
      const n = parseFloat(stored);
      if (!isNaN(n) && n >= ZOOM_MIN && n <= ZOOM_MAX) return n;
    }
    return ZOOM_DEFAULT;
  });

  const setZoom = useCallback((v: number) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));
    localStorage.setItem(ZOOM_STORAGE_KEY, String(clamped));
    setZoomState(clamped);
  }, []);

  return [zoom, setZoom];
}
