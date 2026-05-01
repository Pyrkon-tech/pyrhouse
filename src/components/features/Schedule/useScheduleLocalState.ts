/**
 * useScheduleLocalState — local state management for schedule editing.
 *
 * All mutations are instant (no API calls). The sync layer (useScheduleSync)
 * handles persisting changes to the server.
 *
 * Key concepts:
 * - Server state loads via `loadFromServer(detail)`
 * - Local mutations update state immediately and push to `pendingChanges` queue
 * - `isDirty` = pendingChanges.length > 0
 * - `pendingChanges` consumed by sync layer, then cleared
 * - Temporary assignment IDs (negative numbers) used for locally-added assignments
 *   until the server returns real IDs via sync
 */

import { useState, useCallback, useRef } from 'react';
import type {
  ScheduleDetail,
  ScheduleSlot,
  ScheduleVolunteer,
  ValidationResult,
  SlotType,
  DraftPayload,
} from '../../../types/schedule.types';

// ---- Change tracking types -------------------------------------------------

export type ScheduleChange =
  | { type: 'assign'; volunteerId: number; nickname: string; slotId: number; tempAssignmentId: number }
  | { type: 'unassign'; assignmentId: number }
  | { type: 'move'; assignmentId: number; volunteerId: number; nickname: string; fromSlotId: number; toSlotId: number; tempAssignmentId: number };

// ---- Credit hours calculation (mirrors backend logic) ----------------------

function computeCreditHours(type: SlotType, start: string, end: string): number {
  if (type === 'montage' || type === 'demontage') return 7;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hours = ms / 3_600_000;
  return Math.round(hours * 2) / 2; // round to nearest 0.5h
}

// ---- Undo/Redo history -----------------------------------------------------

const MAX_HISTORY = 50;

interface HistoryEntry {
  schedule: ScheduleDetail;
  label: string; // human-readable description for tooltip
}

// ---- Hook ------------------------------------------------------------------

export interface ScheduleLocalState {
  schedule: ScheduleDetail | null;
  volunteers: ScheduleVolunteer[];
  slots: ScheduleSlot[];
  validation: ValidationResult | null;
  isDirty: boolean;
  pendingChanges: ScheduleChange[];
}

export interface UseScheduleLocalStateReturn {
  state: ScheduleLocalState;

  /** Initialize/replace local state from server response */
  loadFromServer: (detail: ScheduleDetail) => void;

  /** Clear schedule (e.g. 404 — no active schedule) */
  clear: () => void;

  /** Set validation result from server */
  setValidation: (v: ValidationResult) => void;

  // ---- Assignment operations (all local, instant) -------------------------

  /** Add volunteer to slot. Returns the temp assignment ID. */
  assignVolunteer: (volunteerId: number, nickname: string, slotId: number) => number;

  /** Remove assignment from slot. */
  unassignVolunteer: (assignmentId: number) => void;

  /** Move assignment from one slot to another. Returns new temp assignment ID. */
  moveVolunteer: (assignmentId: number, volunteerId: number, nickname: string, fromSlotId: number, toSlotId: number) => number;

  // ---- Slot operations (local, instant) -----------------------------------

  /** Create a new slot. Returns temp slot ID. */
  createSlot: (type: SlotType, start: string, end: string, capacity: number, label?: string) => number;

  /** Update slot properties. */
  updateSlot: (slotId: number, changes: Partial<Pick<ScheduleSlot, 'start' | 'end' | 'capacity' | 'type' | 'label'>>) => void;

  /** Delete slot and all its assignments. */
  deleteSlot: (slotId: number) => void;

  // ---- Sync helpers -------------------------------------------------------

  /** Consume and clear pending changes (called by sync layer after processing) */
  consumeChanges: () => ScheduleChange[];

  /** Replace a temp assignment ID with the real server ID (after API call succeeds) */
  replaceAssignmentId: (tempId: number, realId: number) => void;

  /** Update schedule metadata (e.g. status after publish) */
  updateScheduleMeta: (updates: Partial<Pick<ScheduleDetail, 'status' | 'name'>>) => void;

  /** Build PUT /schedule/draft payload from current local state */
  toDraftPayload: () => DraftPayload | null;

  // ---- Undo/Redo -----------------------------------------------------------

  /** Undo last local mutation */
  undo: () => void;

  /** Redo last undone mutation */
  redo: () => void;

  /** Whether undo is available */
  canUndo: boolean;

  /** Whether redo is available */
  canRedo: boolean;

  /** Human-readable label for next undo action */
  undoLabel: string | null;

  /** Human-readable label for next redo action */
  redoLabel: string | null;
}

export function useScheduleLocalState(): UseScheduleLocalStateReturn {
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [validation, setValidationState] = useState<ValidationResult | null>(null);
  const pendingRef = useRef<ScheduleChange[]>([]);
  const tempIdCounterRef = useRef(0);
  const nextTempId = useCallback(() => {
    tempIdCounterRef.current -= 1;
    return tempIdCounterRef.current;
  }, []);
  // Incremented on every pending change to trigger re-render for isDirty
  const [, setPendingVersion] = useState(0);

  // ---- Undo/Redo history ---------------------------------------------------
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const [, setHistoryVersion] = useState(0);
  // Guard to skip pushHistory during undo/redo restores
  const restoringRef = useRef(false);

  const pushHistory = useCallback((label: string) => {
    if (restoringRef.current) return;
    setSchedule((current) => {
      if (current) {
        undoStackRef.current = [
          ...undoStackRef.current.slice(-(MAX_HISTORY - 1)),
          { schedule: current, label },
        ];
        redoStackRef.current = [];
      }
      return current; // no mutation — just reading current value
    });
    // Trigger re-render for undo/redo label updates — MUST be outside setSchedule updater
    setHistoryVersion((v) => v + 1);
  }, []);

  // ---- Helpers to update derived volunteer fields -------------------------

  const recomputeVolunteerHours = useCallback((prev: ScheduleDetail): ScheduleDetail => {
    const volunteerSlotMap = new Map<number, { slotIds: number[]; hours: number }>();

    // Init all volunteers
    for (const v of prev.volunteers) {
      volunteerSlotMap.set(v.id, { slotIds: [], hours: 0 });
    }

    // Walk slots, accumulate hours per volunteer
    for (const slot of prev.slots) {
      for (const sv of slot.volunteers) {
        // Find volunteer by nickname (slot volunteers have assignment ID, not volunteer ID)
        const vol = prev.volunteers.find((v) => v.nickname === sv.nickname);
        if (vol) {
          const entry = volunteerSlotMap.get(vol.id);
          if (entry) {
            entry.slotIds.push(slot.id);
            entry.hours += slot.credit_hours;
          }
        }
      }
    }

    return {
      ...prev,
      volunteers: prev.volunteers.map((v) => {
        const entry = volunteerSlotMap.get(v.id);
        return entry
          ? { ...v, assigned_hours: entry.hours, slots: entry.slotIds }
          : v;
      }),
    };
  }, []);

  // ---- Public API ----------------------------------------------------------

  const loadFromServer = useCallback((detail: ScheduleDetail) => {
    setSchedule(detail);
    if (detail.validation) setValidationState(detail.validation);
    pendingRef.current = [];
    undoStackRef.current = [];
    redoStackRef.current = [];
    tempIdCounterRef.current = 0;
    setPendingVersion((v) => v + 1);
    setHistoryVersion((v) => v + 1);
  }, []);

  const clear = useCallback(() => {
    setSchedule(null);
    setValidationState(null);
    pendingRef.current = [];
    undoStackRef.current = [];
    redoStackRef.current = [];
    tempIdCounterRef.current = 0;
    setPendingVersion((v) => v + 1);
    setHistoryVersion((v) => v + 1);
  }, []);

  const setValidation = useCallback((v: ValidationResult) => {
    setValidationState(v);
  }, []);

  const assignVolunteer = useCallback((volunteerId: number, nickname: string, slotId: number): number => {
    const tempId = nextTempId();
    pushHistory(`Przypisz ${nickname}`);

    setSchedule((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        slots: prev.slots.map((s) => {
          if (s.id !== slotId) return s;
          const newVols = [...s.volunteers, { id: tempId, nickname }];
          // Auto-increase capacity if slot is full
          const newCapacity = Math.max(s.capacity, newVols.length);
          return { ...s, volunteers: newVols, capacity: newCapacity };
        }),
      };
      return recomputeVolunteerHours(updated);
    });

    pendingRef.current.push({ type: 'assign', volunteerId, nickname, slotId, tempAssignmentId: tempId });
    setPendingVersion((v) => v + 1);
    return tempId;
  }, [recomputeVolunteerHours, nextTempId, pushHistory]);

  const unassignVolunteer = useCallback((assignmentId: number) => {
    pushHistory('Usuń przypisanie');
    setSchedule((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        slots: prev.slots.map((s) => ({
          ...s,
          volunteers: s.volunteers.filter((sv) => sv.id !== assignmentId),
        })),
      };
      return recomputeVolunteerHours(updated);
    });

    pendingRef.current.push({ type: 'unassign', assignmentId });
    setPendingVersion((v) => v + 1);
  }, [recomputeVolunteerHours, pushHistory]);

  const moveVolunteer = useCallback((
    assignmentId: number,
    volunteerId: number,
    nickname: string,
    fromSlotId: number,
    toSlotId: number,
  ): number => {
    const tempId = nextTempId();
    pushHistory(`Przenieś ${nickname}`);

    setSchedule((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        slots: prev.slots.map((s) => {
          if (s.id === fromSlotId) {
            return { ...s, volunteers: s.volunteers.filter((sv) => sv.id !== assignmentId) };
          }
          if (s.id === toSlotId) {
            return { ...s, volunteers: [...s.volunteers, { id: tempId, nickname }] };
          }
          return s;
        }),
      };
      return recomputeVolunteerHours(updated);
    });

    pendingRef.current.push({
      type: 'move', assignmentId, volunteerId, nickname, fromSlotId, toSlotId, tempAssignmentId: tempId,
    });
    setPendingVersion((v) => v + 1);
    return tempId;
  }, [recomputeVolunteerHours, nextTempId, pushHistory]);

  const createSlot = useCallback((
    type: SlotType, start: string, end: string, capacity: number, label?: string,
  ): number => {
    pushHistory('Utwórz slot');
    const tempId = nextTempId();
    const creditHours = computeCreditHours(type, start, end);
    const autoLabel = label ?? `${type === 'montage' ? 'Montaż' : type === 'demontage' ? 'Demontaż' : 'Festiwal'} ${new Date(start.replace('Z', '')).toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' })}`;

    setSchedule((prev) => {
      if (!prev) return prev;
      const newSlot: ScheduleSlot = {
        id: tempId,
        type,
        label: autoLabel,
        start,
        end,
        credit_hours: creditHours,
        capacity,
        volunteers: [],
      };
      return { ...prev, slots: [...prev.slots, newSlot] };
    });

    setPendingVersion((v) => v + 1);
    return tempId;
  }, [nextTempId, pushHistory]);

  const updateSlot = useCallback((slotId: number, changes: Partial<Pick<ScheduleSlot, 'start' | 'end' | 'capacity' | 'type' | 'label'>>) => {
    pushHistory('Edytuj slot');
    setSchedule((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        slots: prev.slots.map((s) => {
          if (s.id !== slotId) return s;
          const merged = { ...s, ...changes };
          // Recompute credit_hours if time or type changed
          if (changes.start || changes.end || changes.type) {
            merged.credit_hours = computeCreditHours(merged.type, merged.start, merged.end);
          }
          return merged;
        }),
      };
      return recomputeVolunteerHours(updated);
    });
    setPendingVersion((v) => v + 1);
  }, [recomputeVolunteerHours, pushHistory]);

  const deleteSlot = useCallback((slotId: number) => {
    pushHistory('Usuń slot');
    setSchedule((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        slots: prev.slots.filter((s) => s.id !== slotId),
      };
      return recomputeVolunteerHours(updated);
    });
    setPendingVersion((v) => v + 1);
  }, [recomputeVolunteerHours, pushHistory]);

  const consumeChanges = useCallback((): ScheduleChange[] => {
    const changes = [...pendingRef.current];
    pendingRef.current = [];
    setPendingVersion((v) => v + 1);
    return changes;
  }, []);

  const replaceAssignmentId = useCallback((tempId: number, realId: number) => {
    setSchedule((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map((s) => ({
          ...s,
          volunteers: s.volunteers.map((sv) =>
            sv.id === tempId ? { ...sv, id: realId } : sv,
          ),
        })),
      };
    });
  }, []);

  const updateScheduleMeta = useCallback((updates: Partial<Pick<ScheduleDetail, 'status' | 'name'>>) => {
    setSchedule((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  // ---- Build draft payload for PUT /schedule/draft --------------------------

  const toDraftPayload = useCallback((): DraftPayload | null => {
    if (!schedule) return null;

    // Build nickname → volunteer ID lookup
    const nicknameToVolId = new Map<string, number>();
    for (const v of schedule.volunteers) {
      nicknameToVolId.set(v.nickname, v.id);
    }

    const slots: DraftPayload['slots'] = schedule.slots.map((s) => {
      const isTemp = s.id < 0;
      return {
        ...(isTemp ? { temp_id: String(s.id) } : { id: s.id }),
        type: s.type,
        start: s.start,
        end: s.end,
        capacity: s.capacity,
        label: s.label,
      };
    });

    const assignments: DraftPayload['assignments'] = [];
    for (const s of schedule.slots) {
      const isSlotTemp = s.id < 0;
      for (const sv of s.volunteers) {
        const volId = nicknameToVolId.get(sv.nickname);
        if (!volId) continue;
        assignments.push({
          volunteer_id: volId,
          ...(isSlotTemp ? { slot_temp_id: String(s.id) } : { slot_id: s.id }),
        });
      }
    }

    return { slots, assignments };
  }, [schedule]);

  // ---- Undo / Redo ---------------------------------------------------------

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;

    setSchedule((current) => {
      if (!current) return current;
      const entry = stack[stack.length - 1];
      undoStackRef.current = stack.slice(0, -1);
      redoStackRef.current = [...redoStackRef.current, { schedule: current, label: entry.label }];
      restoringRef.current = true;
      setHistoryVersion((v) => v + 1);
      setPendingVersion((v) => v + 1);
      return entry.schedule;
    });
    // Reset guard after state update
    setTimeout(() => { restoringRef.current = false; }, 0);
  }, []);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;

    setSchedule((current) => {
      if (!current) return current;
      const entry = stack[stack.length - 1];
      redoStackRef.current = stack.slice(0, -1);
      undoStackRef.current = [...undoStackRef.current, { schedule: current, label: entry.label }];
      restoringRef.current = true;
      setHistoryVersion((v) => v + 1);
      setPendingVersion((v) => v + 1);
      return entry.schedule;
    });
    setTimeout(() => { restoringRef.current = false; }, 0);
  }, []);

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;
  const undoLabel = canUndo ? undoStackRef.current[undoStackRef.current.length - 1].label : null;
  const redoLabel = canRedo ? redoStackRef.current[redoStackRef.current.length - 1].label : null;

  // ---- Derived state -------------------------------------------------------

  const state: ScheduleLocalState = {
    schedule,
    volunteers: schedule?.volunteers ?? [],
    slots: schedule?.slots ?? [],
    validation,
    isDirty: pendingRef.current.length > 0,
    pendingChanges: pendingRef.current,
  };

  return {
    state,
    loadFromServer,
    clear,
    setValidation,
    assignVolunteer,
    unassignVolunteer,
    moveVolunteer,
    createSlot,
    updateSlot,
    deleteSlot,
    consumeChanges,
    replaceAssignmentId,
    updateScheduleMeta,
    toDraftPayload,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  };
}
