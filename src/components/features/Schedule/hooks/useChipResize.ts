import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MIN_SLOT_DURATION_H, MAX_SLOT_DURATION_H, SNAP_MINUTES, SNAP_FINE_MINUTES } from '../constants';

export interface ResizePreview {
  slotId: number;
  assignmentId: number;
  startPct: number;
  widthPct: number;
  timeLabel: string;
}

interface ResizeSession {
  edge: 'left' | 'right';
  slotId: number;
  assignmentId: number;
  volunteerId: number;
  nickname: string;
  /** The dateKey of the column where the resize is happening */
  dateKey: string;
  /** The dateKey where the slot starts (for cross-midnight ISO generation) */
  startDateKey: string;
  /** The dateKey where the slot ends (for cross-midnight ISO generation) */
  endDateKey: string;
  minHour: number;
  maxHour: number;
  origStartPct: number;
  origWidthPct: number;
  origStartISO: string;
  origEndISO: string;
  startX: number;
  containerWidth: number;
}

function snapHour(h: number, fineMode = false): number {
  const minutes = fineMode ? SNAP_FINE_MINUTES : SNAP_MINUTES;
  const factor = 60 / minutes; // 4 for 15min, 12 for 5min
  return Math.round(h * factor) / factor;
}

function hourToTimeStr(h: number): string {
  const wrapped = h % 24;
  const hh = Math.floor(wrapped);
  const mm = Math.round((wrapped - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Convert an hour (possibly multi-day offset) to ISO string with correct date. */
function hourToISO(dateKey: string, hour: number): string {
  const dayAdvance = Math.floor(hour / 24);
  if (dayAdvance > 0) {
    const d = new Date(dateKey + 'T12:00:00');
    d.setDate(d.getDate() + dayAdvance);
    const nextKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${nextKey}T${hourToTimeStr(hour)}:00`;
  }
  return `${dateKey}T${hourToTimeStr(hour)}:00`;
}

export interface ResizeEndInfo {
  slotId: number;
  assignmentId: number;
  volunteerId: number;
  nickname: string;
  newStart: string;
  newEnd: string;
}

export function useChipResize(
  onResizeEnd: (info: ResizeEndInfo) => void,
) {
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const sessionRef = useRef<ResizeSession | null>(null);
  const previewRef = useRef<ResizePreview | null>(null);
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;

  const handleResizeStart = useCallback((
    edge: 'left' | 'right',
    slotId: number,
    assignmentId: number,
    volunteerId: number,
    nickname: string,
    origStartPct: number,
    origWidthPct: number,
    origStartISO: string,
    origEndISO: string,
    containerEl: HTMLElement,
    minHour: number,
    maxHour: number,
    dateKey: string,
    e: React.PointerEvent,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = containerEl.getBoundingClientRect();

    sessionRef.current = {
      edge,
      slotId,
      assignmentId,
      volunteerId,
      nickname,
      dateKey,
      startDateKey: origStartISO.slice(0, 10),
      endDateKey: origEndISO.slice(0, 10),
      minHour,
      maxHour,
      origStartPct,
      origWidthPct,
      origStartISO,
      origEndISO,
      startX: e.clientX,
      containerWidth: rect.width,
    };

    setIsResizing(true);

    const hourSpan = maxHour - minHour || 1;
    const origStartH = minHour + (origStartPct / 100) * hourSpan;
    const origEndH = minHour + ((origStartPct + origWidthPct) / 100) * hourSpan;

    const initialPreview: ResizePreview = {
      slotId,
      assignmentId,
      startPct: origStartPct,
      widthPct: origWidthPct,
      timeLabel: `${hourToTimeStr(origStartH)} → ${hourToTimeStr(origEndH)}`,
    };
    previewRef.current = initialPreview;
    setResizePreview(initialPreview);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: PointerEvent) => {
      const s = sessionRef.current;
      if (!s) return;

      const deltaPx = e.clientX - s.startX;
      const deltaPct = (deltaPx / s.containerWidth) * 100;
      const hourSpan = s.maxHour - s.minHour || 1;

      let newStartPct = s.origStartPct;
      let newWidthPct = s.origWidthPct;

      if (s.edge === 'right') {
        newWidthPct = s.origWidthPct + deltaPct;
      } else {
        newStartPct = s.origStartPct + deltaPct;
        newWidthPct = s.origWidthPct - deltaPct;
      }

      // Convert to hours for snapping and clamping
      let startH = s.minHour + (newStartPct / 100) * hourSpan;
      let endH = s.minHour + ((newStartPct + newWidthPct) / 100) * hourSpan;

      // Snap to 15min (or 5min with Shift held)
      const fine = e.shiftKey;
      if (s.edge === 'left') {
        startH = snapHour(startH, fine);
      } else {
        endH = snapHour(endH, fine);
      }

      // Enforce min/max duration
      const duration = endH - startH;
      if (duration < MIN_SLOT_DURATION_H) {
        if (s.edge === 'left') startH = endH - MIN_SLOT_DURATION_H;
        else endH = startH + MIN_SLOT_DURATION_H;
      }
      if (duration > MAX_SLOT_DURATION_H) {
        if (s.edge === 'left') startH = endH - MAX_SLOT_DURATION_H;
        else endH = startH + MAX_SLOT_DURATION_H;
      }

      // Boundary clamp
      startH = Math.max(s.minHour, startH);
      endH = Math.min(s.maxHour, endH);

      // Re-enforce min after boundary clamp
      if (endH - startH < MIN_SLOT_DURATION_H) {
        if (s.edge === 'left') startH = endH - MIN_SLOT_DURATION_H;
        else endH = startH + MIN_SLOT_DURATION_H;
      }

      const snappedStartPct = ((startH - s.minHour) / hourSpan) * 100;
      const snappedWidthPct = ((endH - startH) / hourSpan) * 100;

      const updated: ResizePreview = {
        slotId: s.slotId,
        assignmentId: s.assignmentId,
        startPct: snappedStartPct,
        widthPct: snappedWidthPct,
        timeLabel: `${hourToTimeStr(startH)} → ${hourToTimeStr(endH)}`,
      };
      previewRef.current = updated;
      setResizePreview(updated);
    };

    const handleUp = () => {
      const s = sessionRef.current;
      const preview = previewRef.current;
      if (s && preview) {
        const hourSpan = s.maxHour - s.minHour || 1;
        const finalStartH = s.minHour + (preview.startPct / 100) * hourSpan;
        const finalEndH = s.minHour + ((preview.startPct + preview.widthPct) / 100) * hourSpan;

        // hourToISO handles hours >= 24 by advancing to next day automatically
        const newStart = hourToISO(s.dateKey, finalStartH);
        const newEnd = hourToISO(s.dateKey, finalEndH);

        // Only commit if actually changed
        if (newStart !== s.origStartISO || newEnd !== s.origEndISO) {
          onResizeEndRef.current({
            slotId: s.slotId,
            assignmentId: s.assignmentId,
            volunteerId: s.volunteerId,
            nickname: s.nickname,
            newStart,
            newEnd,
          });
        }
      }
      sessionRef.current = null;
      previewRef.current = null;
      setResizePreview(null);
      setIsResizing(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sessionRef.current = null;
        previewRef.current = null;
        setResizePreview(null);
        setIsResizing(false);
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
  }, [isResizing]); // refs are stable — no need for resizePreview/onResizeEnd in deps

  return { resizePreview, isResizing, handleResizeStart };
}
