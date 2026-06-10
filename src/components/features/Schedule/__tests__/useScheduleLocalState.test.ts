import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScheduleLocalState } from '../useScheduleLocalState';
import type { ScheduleDetail, ScheduleSlot, ScheduleVolunteer } from '../../../../types/schedule.types';

// ---- Fixtures ---------------------------------------------------------------

function makeVolunteer(overrides: Partial<ScheduleVolunteer> = {}): ScheduleVolunteer {
  return {
    id: 1,
    nickname: 'Alice',
    user_id: null,
    target_hours: 14,
    assigned_hours: 0,
    slots: [],
    ...overrides,
  };
}

function makeSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: 1,
    type: 'festival',
    label: 'Slot A',
    start: '2026-06-10T10:00:00Z',
    end: '2026-06-10T14:00:00Z',
    credit_hours: 4,
    capacity: 2,
    volunteers: [],
    ...overrides,
  };
}

function makeDetail(overrides: Partial<ScheduleDetail> = {}): ScheduleDetail {
  return {
    id: 1,
    name: 'Pyrkon 2026',
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    event_start: '2026-06-08T00:00:00Z',
    event_end: '2026-06-15T00:00:00Z',
    festival_start: '2026-06-10T00:00:00Z',
    festival_end: '2026-06-12T00:00:00Z',
    slots: [],
    volunteers: [],
    ...overrides,
  };
}

// ---- loadFromServer ---------------------------------------------------------

describe('loadFromServer', () => {
  it('populates state from server response', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot();
    const detail = makeDetail({ volunteers: [vol], slots: [slot] });

    act(() => { result.current.loadFromServer(detail); });

    expect(result.current.state.schedule).toEqual(detail);
    expect(result.current.state.volunteers).toHaveLength(1);
    expect(result.current.state.slots).toHaveLength(1);
    expect(result.current.state.isDirty).toBe(false);
  });

  it('clears undo/redo stacks on load', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const detail = makeDetail({ volunteers: [makeVolunteer()] });

    act(() => { result.current.loadFromServer(detail); });
    act(() => { result.current.assignVolunteer(1, 'Alice', 0); });
    expect(result.current.canUndo).toBe(true);

    act(() => { result.current.loadFromServer(detail); });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

// ---- assignVolunteer --------------------------------------------------------

describe('assignVolunteer', () => {
  it('adds volunteer to slot volunteers list', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 2, volunteers: [] });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });

    const updated = result.current.state.slots.find((s) => s.id === 1);
    expect(updated?.volunteers).toHaveLength(1);
    expect(updated?.volunteers[0].nickname).toBe('Alice');
  });

  it('returns a negative temp assignment ID', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    let tempId!: number;
    act(() => { tempId = result.current.assignVolunteer(1, 'Alice', 1); });

    expect(tempId).toBeLessThan(0);
  });

  it('auto-increases slot capacity if full', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 0, volunteers: [] });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });

    const updated = result.current.state.slots.find((s) => s.id === 1);
    expect(updated?.capacity).toBe(1);
  });

  it('recomputes volunteer assigned_hours after assignment', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer({ assigned_hours: 0, slots: [] });
    const slot = makeSlot({ credit_hours: 4, capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });

    const updatedVol = result.current.state.volunteers.find((v) => v.id === 1);
    expect(updatedVol?.assigned_hours).toBe(4);
  });

  it('marks state as dirty after assignment', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });

    expect(result.current.state.isDirty).toBe(true);
  });
});

// ---- unassignVolunteer ------------------------------------------------------

describe('unassignVolunteer', () => {
  it('removes volunteer from slot by assignment ID', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 2, volunteers: [{ id: 99, nickname: 'Alice' }] });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.unassignVolunteer(99); });

    const updated = result.current.state.slots.find((s) => s.id === 1);
    expect(updated?.volunteers).toHaveLength(0);
  });

  it('recomputes volunteer assigned_hours after unassignment', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer({ assigned_hours: 4, slots: [1] });
    const slot = makeSlot({ credit_hours: 4, capacity: 2, volunteers: [{ id: 99, nickname: 'Alice' }] });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.unassignVolunteer(99); });

    const updatedVol = result.current.state.volunteers.find((v) => v.id === 1);
    expect(updatedVol?.assigned_hours).toBe(0);
  });
});

// ---- moveVolunteer ----------------------------------------------------------

describe('moveVolunteer', () => {
  it('removes from source slot and adds to target slot', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slotA = makeSlot({ id: 10, volunteers: [{ id: 99, nickname: 'Alice' }], capacity: 2 });
    const slotB = makeSlot({ id: 20, volunteers: [], capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slotA, slotB] })); });

    act(() => { result.current.moveVolunteer(99, 1, 'Alice', 10, 20); });

    const a = result.current.state.slots.find((s) => s.id === 10);
    const b = result.current.state.slots.find((s) => s.id === 20);
    expect(a?.volunteers).toHaveLength(0);
    expect(b?.volunteers).toHaveLength(1);
    expect(b?.volunteers[0].nickname).toBe('Alice');
  });

  it('returns a negative temp assignment ID for the new assignment', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slotA = makeSlot({ id: 10, volunteers: [{ id: 99, nickname: 'Alice' }], capacity: 2 });
    const slotB = makeSlot({ id: 20, volunteers: [], capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slotA, slotB] })); });

    let newId!: number;
    act(() => { newId = result.current.moveVolunteer(99, 1, 'Alice', 10, 20); });

    expect(newId).toBeLessThan(0);
  });
});

// ---- deleteVolunteer --------------------------------------------------------

describe('deleteVolunteer', () => {
  it('removes volunteer from roster', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol] })); });

    act(() => { result.current.deleteVolunteer(1); });

    expect(result.current.state.volunteers).toHaveLength(0);
  });

  it('removes volunteer from all slot assignments', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ volunteers: [{ id: 99, nickname: 'Alice' }], capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.deleteVolunteer(1); });

    const updated = result.current.state.slots.find((s) => s.id === 1);
    expect(updated?.volunteers).toHaveLength(0);
  });
});

// ---- createSlot / deleteSlot ------------------------------------------------

describe('createSlot', () => {
  it('adds a temp slot with negative ID', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    act(() => { result.current.loadFromServer(makeDetail()); });

    let tempId!: number;
    act(() => { tempId = result.current.createSlot('festival', '2026-06-10T10:00:00Z', '2026-06-10T14:00:00Z'); });

    expect(tempId).toBeLessThan(0);
    const slot = result.current.state.slots.find((s) => s.id === tempId);
    expect(slot).toBeDefined();
    expect(slot?.type).toBe('festival');
  });

  it('computes credit_hours = 4 for a 4-hour festival slot', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    act(() => { result.current.loadFromServer(makeDetail()); });

    let tempId!: number;
    act(() => { tempId = result.current.createSlot('festival', '2026-06-10T10:00:00Z', '2026-06-10T14:00:00Z'); });

    const slot = result.current.state.slots.find((s) => s.id === tempId);
    expect(slot?.credit_hours).toBe(4);
  });

  it('computes credit_hours from actual duration for montage slots', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    act(() => { result.current.loadFromServer(makeDetail()); });

    let tempId!: number;
    act(() => { tempId = result.current.createSlot('montage', '2026-06-08T08:00:00Z', '2026-06-08T20:00:00Z'); });

    const slot = result.current.state.slots.find((s) => s.id === tempId);
    expect(slot?.credit_hours).toBe(12);
  });
});

describe('deleteSlot', () => {
  it('removes slot from state', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const slot = makeSlot();
    act(() => { result.current.loadFromServer(makeDetail({ slots: [slot] })); });

    act(() => { result.current.deleteSlot(1); });

    expect(result.current.state.slots).toHaveLength(0);
  });

  it('skipHistory=false adds to undo stack', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const slot = makeSlot();
    act(() => { result.current.loadFromServer(makeDetail({ slots: [slot] })); });

    act(() => { result.current.deleteSlot(1, false); });

    expect(result.current.canUndo).toBe(true);
  });

  it('skipHistory=true does NOT add to undo stack', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const slot = makeSlot();
    act(() => { result.current.loadFromServer(makeDetail({ slots: [slot] })); });

    act(() => { result.current.deleteSlot(1, true); });

    expect(result.current.canUndo).toBe(false);
  });
});

// ---- replaceSlot / addPersistedSlot -----------------------------------------

describe('replaceSlot', () => {
  it('replaces temp slot with real slot by id', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    act(() => { result.current.loadFromServer(makeDetail()); });

    let tempId!: number;
    act(() => { tempId = result.current.createSlot('festival', '2026-06-10T10:00:00Z', '2026-06-10T12:00:00Z'); });

    const realSlot = makeSlot({ id: 500, label: 'Saved Slot' });
    act(() => { result.current.replaceSlot(tempId, realSlot); });

    expect(result.current.state.slots.find((s) => s.id === tempId)).toBeUndefined();
    expect(result.current.state.slots.find((s) => s.id === 500)).toBeDefined();
  });
});

describe('addPersistedSlot', () => {
  it('appends real slot to state without creating temp ID', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    act(() => { result.current.loadFromServer(makeDetail({ slots: [makeSlot({ id: 1 })] })); });

    const newSlot = makeSlot({ id: 999, label: 'Duplicated' });
    act(() => { result.current.addPersistedSlot(newSlot); });

    expect(result.current.state.slots).toHaveLength(2);
    expect(result.current.state.slots.find((s) => s.id === 999)).toBeDefined();
  });

  it('does not mark state as dirty (no pending changes)', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    act(() => { result.current.loadFromServer(makeDetail()); });

    act(() => { result.current.addPersistedSlot(makeSlot({ id: 999 })); });

    expect(result.current.state.isDirty).toBe(false);
  });
});

// ---- updateSlot -------------------------------------------------------------

describe('updateSlot', () => {
  it('updates slot label', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const slot = makeSlot();
    act(() => { result.current.loadFromServer(makeDetail({ slots: [slot] })); });

    act(() => { result.current.updateSlot(1, { label: 'New Label' }); });

    expect(result.current.state.slots[0].label).toBe('New Label');
  });

  it('updates slot capacity', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const slot = makeSlot({ capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ slots: [slot] })); });

    act(() => { result.current.updateSlot(1, { capacity: 5 }); });

    expect(result.current.state.slots[0].capacity).toBe(5);
  });

  it('recomputes credit_hours when time changes', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const slot = makeSlot({ start: '2026-06-10T10:00:00Z', end: '2026-06-10T14:00:00Z', credit_hours: 4 });
    act(() => { result.current.loadFromServer(makeDetail({ slots: [slot] })); });

    act(() => { result.current.updateSlot(1, { end: '2026-06-10T16:00:00Z' }); });

    expect(result.current.state.slots[0].credit_hours).toBe(6);
  });
});

// ---- toDraftPayload ---------------------------------------------------------

describe('toDraftPayload', () => {
  it('returns null when no schedule is loaded', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    expect(result.current.toDraftPayload()).toBeNull();
  });

  it('includes persisted slot with id', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const slot = makeSlot({ id: 42 });
    act(() => { result.current.loadFromServer(makeDetail({ slots: [slot] })); });

    const payload = result.current.toDraftPayload();
    expect(payload?.slots[0]).toMatchObject({ id: 42 });
    expect(payload?.slots[0]).not.toHaveProperty('temp_id');
  });

  it('includes temp slot with temp_id instead of id', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    act(() => { result.current.loadFromServer(makeDetail()); });

    let tempId!: number;
    act(() => { tempId = result.current.createSlot('festival', '2026-06-10T10:00:00Z', '2026-06-10T12:00:00Z'); });

    const payload = result.current.toDraftPayload();
    expect(payload?.slots[0]).toMatchObject({ temp_id: String(tempId) });
    expect(payload?.slots[0]).not.toHaveProperty('id');
  });

  it('maps assignment to slot_id for persisted slots', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ id: 42, capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 42); });

    const payload = result.current.toDraftPayload();
    expect(payload?.assignments[0]).toMatchObject({ volunteer_id: 1, slot_id: 42 });
  });

  it('uses schedule version in payload', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    act(() => { result.current.loadFromServer(makeDetail({ version: 7 })); });

    expect(result.current.toDraftPayload()?.version).toBe(7);
  });
});

// ---- undo / redo ------------------------------------------------------------

describe('undo / redo', () => {
  it('canUndo is false initially', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    act(() => { result.current.loadFromServer(makeDetail()); });
    expect(result.current.canUndo).toBe(false);
  });

  it('canUndo becomes true after an assignment', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });

    expect(result.current.canUndo).toBe(true);
  });

  it('undo reverts assignment', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });
    expect(result.current.state.slots[0].volunteers).toHaveLength(1);

    act(() => { result.current.undo(); });
    expect(result.current.state.slots[0].volunteers).toHaveLength(0);
  });

  it('redo re-applies undone action', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });
    act(() => { result.current.undo(); });
    expect(result.current.canRedo).toBe(true);

    act(() => { result.current.redo(); });
    expect(result.current.state.slots[0].volunteers).toHaveLength(1);
  });

  it('rapid undo twice pops two distinct entries', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 3 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    // Two separate assignments = two undo entries
    act(() => {
      result.current.assignVolunteer(1, 'Alice', 1);
      result.current.assignVolunteer(1, 'Alice', 1);
    });
    expect(result.current.state.slots[0].volunteers).toHaveLength(2);

    // Rapid undo ×2
    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.state.slots[0].volunteers).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('undoLabel reflects the last action name', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });

    expect(result.current.undoLabel).toBe('Przypisz Alice');
  });

  it('new action clears redo stack', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 3 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });
    act(() => { result.current.undo(); });
    expect(result.current.canRedo).toBe(true);

    // Advance timers so restoringRef.current resets to false before the new action
    act(() => { vi.runAllTimers(); });
    vi.useRealTimers();

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });
    expect(result.current.canRedo).toBe(false);
  });
});

// ---- replaceAssignmentId ----------------------------------------------------

describe('replaceAssignmentId', () => {
  it('replaces temp assignment ID with real server ID', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot = makeSlot({ capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    let tempId!: number;
    act(() => { tempId = result.current.assignVolunteer(1, 'Alice', 1); });
    act(() => { result.current.replaceAssignmentId(tempId, 9999); });

    const updated = result.current.state.slots[0];
    expect(updated.volunteers[0].id).toBe(9999);
    expect(updated.volunteers.find((sv) => sv.id === tempId)).toBeUndefined();
  });
});

// ---- recomputeVolunteerHours edge cases -------------------------------------

describe('recomputeVolunteerHours', () => {
  it('preserves server-provided assigned_hours on load (no local recompute)', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    // Server says 10h but slot has no volunteers — server is source of truth on load
    const vol = makeVolunteer({ assigned_hours: 10, slots: [1] });
    const slot = makeSlot({ credit_hours: 4, volunteers: [] });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });
    expect(result.current.state.volunteers[0].assigned_hours).toBe(10);
  });

  it('recomputes hours to 0 after unassigning the only assignment', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer({ assigned_hours: 4, slots: [1] });
    const slot = makeSlot({ credit_hours: 4, capacity: 2, volunteers: [{ id: 99, nickname: 'Alice' }] });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot] })); });

    act(() => { result.current.unassignVolunteer(99); });

    expect(result.current.state.volunteers[0].assigned_hours).toBe(0);
  });

  it('accumulates hours across multiple slots', () => {
    const { result } = renderHook(() => useScheduleLocalState());
    const vol = makeVolunteer();
    const slot1 = makeSlot({ id: 1, credit_hours: 4, capacity: 2 });
    const slot2 = makeSlot({ id: 2, credit_hours: 3, capacity: 2 });
    act(() => { result.current.loadFromServer(makeDetail({ volunteers: [vol], slots: [slot1, slot2] })); });

    act(() => { result.current.assignVolunteer(1, 'Alice', 1); });
    act(() => { result.current.assignVolunteer(1, 'Alice', 2); });

    const updatedVol = result.current.state.volunteers[0];
    expect(updatedVol.assigned_hours).toBe(7);
  });
});
