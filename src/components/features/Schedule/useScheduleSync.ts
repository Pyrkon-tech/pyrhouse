/**
 * useScheduleSync — bulk-saves local schedule state to the server
 * via PUT /schedule/draft.
 *
 * Replaces the old per-change approach (individual POST/DELETE /assignments).
 * Now sends entire schedule state in one request → backend diffs and reconciles.
 *
 * Features:
 * - Manual save (button / Ctrl+S) — default
 * - Optional auto-save (debounce 5s)
 * - beforeunload warning when dirty
 * - Status: 'saved' | 'saving' | 'dirty' | 'error'
 * - On success: replaces local temp IDs with server IDs, updates validation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { saveDraftAPI } from '../../../services/scheduleService';
import type { DraftPayload, DraftResponse, ValidationResult } from '../../../types/schedule.types';

export type SyncStatus = 'saved' | 'saving' | 'dirty' | 'error';

interface UseScheduleSyncOptions {
  /** Build current draft payload from local state */
  toDraftPayload: () => DraftPayload | null;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Replace temp slot ID with server ID after save */
  replaceSlotId?: (tempId: number, realId: number) => void;
  /** Called after successful save with server response */
  onSaveSuccess: (response: DraftResponse) => void;
  /** Set validation from server response */
  setValidation: (v: ValidationResult) => void;
  /** Callback on API error */
  onError: (error: unknown, operation: string) => void;
  /** Full schedule refresh from server (fallback on critical error) */
  refreshFromServer: () => Promise<void>;
  /** Enable auto-save (default: false) */
  autoSave?: boolean;
  /** Auto-save debounce delay in ms (default: 5000) */
  autoSaveDelay?: number;
}

export interface UseScheduleSyncReturn {
  /** Save current state to server now */
  save: () => Promise<void>;
  /** Current sync status */
  status: SyncStatus;
  /** Last save timestamp (for "Saved at HH:MM" display) */
  lastSavedAt: Date | null;
}

export function useScheduleSync({
  toDraftPayload,
  isDirty,
  onSaveSuccess,
  setValidation,
  onError,
  refreshFromServer,
  autoSave = false,
  autoSaveDelay = 5000,
}: UseScheduleSyncOptions): UseScheduleSyncReturn {
  const [status, setStatus] = useState<SyncStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const savingRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep status in sync with isDirty
  useEffect(() => {
    if (isDirty && status === 'saved') {
      setStatus('dirty');
    }
  }, [isDirty, status]);

  // ---- beforeunload warning ------------------------------------------------

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ---- Save ----------------------------------------------------------------

  const save = useCallback(async () => {
    if (savingRef.current) return;

    const payload = toDraftPayload();
    if (!payload) return;

    savingRef.current = true;
    setStatus('saving');

    try {
      const response = await saveDraftAPI(payload);

      // Update validation from response
      if (response.validation) {
        setValidation(response.validation);
      }

      // Notify parent to replace local state with server state
      onSaveSuccess(response);

      setLastSavedAt(new Date());
      setStatus('saved');
    } catch (e) {
      setStatus('error');
      onError(e, 'Zapis harmonogramu');
      // On critical error, reconcile with server
      await refreshFromServer();
    } finally {
      savingRef.current = false;
    }
  }, [toDraftPayload, onSaveSuccess, setValidation, onError, refreshFromServer]);

  // ---- Auto-save (optional, debounced) -------------------------------------

  useEffect(() => {
    if (!autoSave || !isDirty) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      save();
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [autoSave, isDirty, save, autoSaveDelay]);

  // ---- Ctrl+S shortcut -----------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, save]);

  return {
    save,
    status,
    lastSavedAt,
  };
}
