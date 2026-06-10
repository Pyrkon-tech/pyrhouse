import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScheduleValidation } from '../useScheduleValidation';
import type { ScheduleSlot, ScheduleVolunteer } from '../../../../types/schedule.types';

// ---- Fixtures ---------------------------------------------------------------

function makeSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: 1,
    type: 'festival',
    label: 'Festival 1',
    start: '2026-06-19T10:00:00Z',
    end: '2026-06-19T14:00:00Z',
    credit_hours: 4,
    capacity: 2,
    volunteers: [],
    ...overrides,
  };
}

function makeVol(overrides: Partial<ScheduleVolunteer> = {}): ScheduleVolunteer {
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

// ---- Tests ------------------------------------------------------------------

describe('useScheduleValidation', () => {
  describe('slot capacity', () => {
    // Capacity validation was intentionally removed in v1 (658bd97) — slot staffing
    // is signalled visually in the grid, not as a validation issue
    it('does not flag under/overstaffed slots', () => {
      const slots = [
        makeSlot({ id: 1, capacity: 3, volunteers: [{ id: 1, nickname: 'Alice' }] }),
        makeSlot({
          id: 2,
          capacity: 1,
          volunteers: [{ id: 1, nickname: 'Alice' }, { id: 2, nickname: 'Bob' }],
        }),
      ];
      const { result } = renderHook(() => useScheduleValidation(slots, []));
      const capacityIssues = result.current.issues.filter(
        (i) => i.type === 'slot_understaffed' || i.type === 'slot_overstaffed',
      );
      expect(capacityIssues).toHaveLength(0);
    });
  });

  describe('volunteer hours', () => {
    it('warns under_hours when assigned < target', () => {
      const vols = [makeVol({ assigned_hours: 8, target_hours: 14 })];
      const { result } = renderHook(() => useScheduleValidation([], vols));
      const issue = result.current.issues.find((i) => i.type === 'under_hours');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('warning');
    });

    it('warns over_hours when assigned > target', () => {
      const vols = [makeVol({ assigned_hours: 16, target_hours: 14 })];
      const { result } = renderHook(() => useScheduleValidation([], vols));
      const issue = result.current.issues.find((i) => i.type === 'over_hours');
      expect(issue).toBeDefined();
    });

    it('no hours issue when at target', () => {
      const vols = [makeVol({ assigned_hours: 14, target_hours: 14 })];
      const { result } = renderHook(() => useScheduleValidation([], vols));
      const hoursIssues = result.current.issues.filter(
        (i) => i.type === 'under_hours' || i.type === 'over_hours',
      );
      expect(hoursIssues).toHaveLength(0);
    });
  });

  describe('double booking', () => {
    it('detects overlapping slots for same volunteer', () => {
      const slots = [
        makeSlot({
          id: 1,
          start: '2026-06-19T10:00:00Z',
          end: '2026-06-19T14:00:00Z',
          volunteers: [{ id: 100, nickname: 'Alice' }],
        }),
        makeSlot({
          id: 2,
          start: '2026-06-19T12:00:00Z',
          end: '2026-06-19T16:00:00Z',
          volunteers: [{ id: 101, nickname: 'Alice' }],
        }),
      ];
      const vols = [makeVol({ id: 1, nickname: 'Alice' })];
      const { result } = renderHook(() => useScheduleValidation(slots, vols));
      const issue = result.current.issues.find((i) => i.type === 'double_booked');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('error');
      expect(issue?.volunteer).toBe('Alice');
    });

    it('does not flag non-overlapping slots', () => {
      const slots = [
        makeSlot({
          id: 1,
          start: '2026-06-19T08:00:00Z',
          end: '2026-06-19T10:00:00Z',
          volunteers: [{ id: 100, nickname: 'Alice' }],
        }),
        makeSlot({
          id: 2,
          start: '2026-06-19T10:00:00Z',
          end: '2026-06-19T12:00:00Z',
          volunteers: [{ id: 101, nickname: 'Alice' }],
        }),
      ];
      const vols = [makeVol({ id: 1, nickname: 'Alice' })];
      const { result } = renderHook(() => useScheduleValidation(slots, vols));
      const doubleBooked = result.current.issues.filter((i) => i.type === 'double_booked');
      expect(doubleBooked).toHaveLength(0);
    });

    it('does not flag different volunteers in overlapping slots', () => {
      const slots = [
        makeSlot({
          id: 1,
          start: '2026-06-19T10:00:00Z',
          end: '2026-06-19T14:00:00Z',
          volunteers: [{ id: 100, nickname: 'Alice' }],
        }),
        makeSlot({
          id: 2,
          start: '2026-06-19T12:00:00Z',
          end: '2026-06-19T16:00:00Z',
          volunteers: [{ id: 101, nickname: 'Bob' }],
        }),
      ];
      const vols = [
        makeVol({ id: 1, nickname: 'Alice' }),
        makeVol({ id: 2, nickname: 'Bob' }),
      ];
      const { result } = renderHook(() => useScheduleValidation(slots, vols));
      const doubleBooked = result.current.issues.filter((i) => i.type === 'double_booked');
      expect(doubleBooked).toHaveLength(0);
    });
  });

  describe('outside availability', () => {
    it('errors when slot is before available_from', () => {
      const slots = [makeSlot({
        start: '2026-06-18T10:00:00Z',
        end: '2026-06-18T14:00:00Z',
        volunteers: [{ id: 100, nickname: 'Alice' }],
      })];
      const vols = [makeVol({
        nickname: 'Alice',
        available_from: '2026-06-19T00:00:00Z',
        available_to: '2026-06-22T00:00:00Z',
      })];
      const { result } = renderHook(() => useScheduleValidation(slots, vols));
      const issue = result.current.issues.find((i) => i.type === 'outside_availability');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('error');
    });

    it('errors when slot extends past available_to', () => {
      const slots = [makeSlot({
        start: '2026-06-22T20:00:00Z',
        end: '2026-06-22T23:00:00Z',
        volunteers: [{ id: 100, nickname: 'Alice' }],
      })];
      const vols = [makeVol({
        nickname: 'Alice',
        available_from: '2026-06-19T00:00:00Z',
        available_to: '2026-06-22T22:00:00Z',
      })];
      const { result } = renderHook(() => useScheduleValidation(slots, vols));
      const issue = result.current.issues.find((i) => i.type === 'outside_availability');
      expect(issue).toBeDefined();
    });

    it('no issue when slot within availability', () => {
      const slots = [makeSlot({
        start: '2026-06-19T10:00:00Z',
        end: '2026-06-19T14:00:00Z',
        volunteers: [{ id: 100, nickname: 'Alice' }],
      })];
      const vols = [makeVol({
        nickname: 'Alice',
        available_from: '2026-06-19T00:00:00Z',
        available_to: '2026-06-22T00:00:00Z',
      })];
      const { result } = renderHook(() => useScheduleValidation(slots, vols));
      const issue = result.current.issues.find((i) => i.type === 'outside_availability');
      expect(issue).toBeUndefined();
    });

    it('skips availability check when no window set', () => {
      const slots = [makeSlot({
        volunteers: [{ id: 100, nickname: 'Alice' }],
      })];
      const vols = [makeVol({ nickname: 'Alice' })]; // no available_from/to
      const { result } = renderHook(() => useScheduleValidation(slots, vols));
      const issue = result.current.issues.find((i) => i.type === 'outside_availability');
      expect(issue).toBeUndefined();
    });
  });

  describe('valid result', () => {
    it('returns valid=true when no issues', () => {
      const slots = [makeSlot({
        capacity: 1,
        volunteers: [{ id: 100, nickname: 'Alice' }],
      })];
      const vols = [makeVol({ assigned_hours: 14, target_hours: 14 })];
      const { result } = renderHook(() => useScheduleValidation(slots, vols));
      expect(result.current.valid).toBe(true);
      expect(result.current.issues).toHaveLength(0);
    });

    it('returns valid=false when issues exist', () => {
      // Slot longer than 8h → slot_too_long issue
      const slots = [makeSlot({ start: '2026-06-19T08:00:00Z', end: '2026-06-19T20:00:00Z' })];
      const { result } = renderHook(() => useScheduleValidation(slots, []));
      expect(result.current.valid).toBe(false);
    });
  });
});
