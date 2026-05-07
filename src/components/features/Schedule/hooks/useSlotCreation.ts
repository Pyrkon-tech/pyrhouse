import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SNAP_MINUTES, SNAP_FINE_MINUTES, MIN_SLOT_DURATION_H } from '../constants';
import type { SlotCreationPreview } from '../types';

export interface CreationEndInfo {
  startISO: string;
  endISO: string;
}

interface CreationSession {
  laneIndex: number;
  startAbsH: number;
  startX: number;
  containerRect: DOMRect;
  absoluteStartH: number;
  totalHours: number;
  firstDateKey: string;
  fineMode: boolean;
}

function snapHour(h: number, fineMode = false): number {
  const minutes = fineMode ? SNAP_FINE_MINUTES : SNAP_MINUTES;
  const factor = 60 / minutes;
  return Math.round(h * factor) / factor;
}

function fmt(absH: number): string {
  const h = ((absH % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function absHourToISO(absH: number, firstDateKey: string): string {
  const dayOffset = Math.floor(absH / 24);
  const hourInDay = absH - dayOffset * 24;
  const d = new Date(firstDateKey + 'T12:00:00');
  d.setDate(d.getDate() + dayOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = Math.floor(hourInDay);
  const mm = Math.round((hourInDay - hh) * 60);
  return `${year}-${month}-${day}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}

export function useSlotCreation(onComplete: (info: CreationEndInfo) => void) {
  const [preview, setPreview] = useState<SlotCreationPreview | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const sessionRef = useRef<CreationSession | null>(null);
  const previewRef = useRef<SlotCreationPreview | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleLanePointerDown = useCallback((
    e: React.PointerEvent,
    laneIndex: number,
    containerEl: HTMLElement,
    absoluteStartH: number,
    totalHours: number,
    firstDateKey: string,
  ) => {
    // Only fire on background — skip if clicking on a chip or control
    const target = e.target as HTMLElement;
    if (target.closest('[data-chip="true"]')) return;
    if (target.closest('[data-resize-handle="true"]')) return;
    if (target.closest('button')) return;

    e.preventDefault();
    const rect = containerEl.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const rawAbsH = absoluteStartH + pct * totalHours;
    const startAbsH = snapHour(rawAbsH, e.shiftKey);

    sessionRef.current = {
      laneIndex,
      startAbsH,
      startX: e.clientX,
      containerRect: rect,
      absoluteStartH,
      totalHours,
      firstDateKey,
      fineMode: e.shiftKey,
    };
    setIsCreating(true);
  }, []);

  useEffect(() => {
    if (!isCreating) return;

    const handleMove = (e: PointerEvent) => {
      const s = sessionRef.current;
      if (!s) return;
      if (Math.abs(e.clientX - s.startX) < 6) return;

      const pct = (e.clientX - s.containerRect.left) / s.containerRect.width;
      const rawAbsH = s.absoluteStartH + pct * s.totalHours;
      const snappedEnd = snapHour(rawAbsH, e.shiftKey);
      const endAbsH = Math.max(snappedEnd, s.startAbsH + MIN_SLOT_DURATION_H);

      const startPct = ((s.startAbsH - s.absoluteStartH) / s.totalHours) * 100;
      const widthPct = ((endAbsH - s.startAbsH) / s.totalHours) * 100;

      const updated: SlotCreationPreview = {
        laneIndex: s.laneIndex,
        startPct,
        widthPct,
        timeLabel: `${fmt(s.startAbsH)} → ${fmt(endAbsH)}`,
      };
      previewRef.current = updated;
      setPreview(updated);
    };

    const handleUp = (e: PointerEvent) => {
      const s = sessionRef.current;
      const p = previewRef.current;

      if (s && p) {
        const pct = (e.clientX - s.containerRect.left) / s.containerRect.width;
        const rawAbsH = s.absoluteStartH + pct * s.totalHours;
        const endAbsH = Math.max(snapHour(rawAbsH, e.shiftKey), s.startAbsH + MIN_SLOT_DURATION_H);

        if (Math.abs(e.clientX - s.startX) >= 6) {
          onCompleteRef.current({
            startISO: absHourToISO(s.startAbsH, s.firstDateKey),
            endISO: absHourToISO(endAbsH, s.firstDateKey),
          });
        }
      }

      sessionRef.current = null;
      previewRef.current = null;
      setPreview(null);
      setIsCreating(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sessionRef.current = null;
        previewRef.current = null;
        setPreview(null);
        setIsCreating(false);
      }
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreating]);

  return { preview, isCreating, handleLanePointerDown };
}
