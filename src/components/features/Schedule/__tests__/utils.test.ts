import { describe, it, expect } from 'vitest';
import {
  avatarColor,
  parseAsLocal,
  computeHourRange,
  computeGlobalHourRange,
  buildGridData,
  extractLaneMap,
  extractDetailItems,
  buildApiErrorState,
  extractSheetId,
  toAbsoluteHour,
  absoluteHourToISO,
  buildTimelineData,
  extractTimelineLaneMap,
} from '../utils';
import { ApiError } from '../../../../services/apiClient';
import type { ScheduleSlot, ScheduleVolunteer, ValidationResult } from '../../../../types/schedule.types';

// ---- Fixtures ---------------------------------------------------------------

function makeSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: 1,
    type: 'festival',
    label: 'Festiwal 1',
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

// ---- avatarColor ------------------------------------------------------------

describe('avatarColor', () => {
  it('returns a string for any positive id', () => {
    expect(typeof avatarColor(1)).toBe('string');
    expect(avatarColor(1)).toMatch(/^#/);
  });

  it('wraps around for large ids', () => {
    expect(avatarColor(0)).toBe(avatarColor(16));
    expect(avatarColor(1)).toBe(avatarColor(17));
  });

  it('handles negative ids via Math.abs', () => {
    expect(avatarColor(-3)).toBe(avatarColor(3));
  });
});

// ---- parseAsLocal -----------------------------------------------------------

describe('parseAsLocal', () => {
  it('strips Z suffix and treats as local time', () => {
    const d = parseAsLocal('2026-06-19T10:00:00Z');
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(0);
  });

  it('handles strings without Z suffix', () => {
    const d = parseAsLocal('2026-06-19T08:30:00');
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(30);
  });

  it('preserves the date part', () => {
    const d = parseAsLocal('2026-06-19T22:00:00Z');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // June = 5
    expect(d.getDate()).toBe(19);
  });
});

// ---- computeHourRange -------------------------------------------------------

describe('computeHourRange', () => {
  it('returns default 8-20 for empty slots', () => {
    expect(computeHourRange([])).toEqual({ minHour: 8, maxHour: 20 });
  });

  it('returns correct range for a single slot', () => {
    const slot = makeSlot({ start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z' });
    expect(computeHourRange([slot])).toEqual({ minHour: 10, maxHour: 14 });
  });

  it('handles midnight-ending slot (00:00 = 24:00)', () => {
    const slot = makeSlot({ start: '2026-06-19T20:00:00Z', end: '2026-06-20T00:00:00Z' });
    expect(computeHourRange([slot])).toEqual({ minHour: 20, maxHour: 24 });
  });

  it('expands to cover cross-midnight slot', () => {
    const slot = makeSlot({ start: '2026-06-19T22:00:00Z', end: '2026-06-20T02:00:00Z' });
    const range = computeHourRange([slot]);
    // Cross-midnight contributes 0 to minMin and 24*60 to maxMin
    expect(range.minHour).toBe(0);
    expect(range.maxHour).toBe(24);
  });

  it('combines ranges from multiple slots', () => {
    const slots = [
      makeSlot({ id: 1, start: '2026-06-19T08:00:00Z', end: '2026-06-19T12:00:00Z' }),
      makeSlot({ id: 2, start: '2026-06-19T18:00:00Z', end: '2026-06-19T22:00:00Z' }),
    ];
    expect(computeHourRange(slots)).toEqual({ minHour: 8, maxHour: 22 });
  });

  it('rounds minutes down for min and up for max', () => {
    const slot = makeSlot({ start: '2026-06-19T10:30:00Z', end: '2026-06-19T14:30:00Z' });
    expect(computeHourRange([slot])).toEqual({ minHour: 10, maxHour: 15 });
  });
});

// ---- computeGlobalHourRange -------------------------------------------------

describe('computeGlobalHourRange', () => {
  it('returns default 8-20 for empty slots', () => {
    expect(computeGlobalHourRange([])).toEqual({ minHour: 8, maxHour: 20 });
  });

  it('includes full-day (montage/demontage) slots in range computation', () => {
    const slot = makeSlot({ type: 'montage', start: '2026-06-19T08:00:00Z', end: '2026-06-19T20:00:00Z' });
    // min = floor(8)-1 = 7, max = ceil(20)+1 = 21
    expect(computeGlobalHourRange([slot])).toEqual({ minHour: 7, maxHour: 21 });
  });

  it('returns padded range for festival slots', () => {
    const slot = makeSlot({ start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z' });
    // min = floor(10)-1 = 9, max = ceil(14)+1 = 15
    expect(computeGlobalHourRange([slot])).toEqual({ minHour: 9, maxHour: 15 });
  });

  it('handles cross-midnight slot', () => {
    const slot = makeSlot({ start: '2026-06-19T22:00:00Z', end: '2026-06-20T02:00:00Z' });
    // min = floor(22)-1 = 21, max = ceil(26)+1 = 27
    expect(computeGlobalHourRange([slot])).toEqual({ minHour: 21, maxHour: 27 });
  });

  it('combines ranges from multiple days', () => {
    const slots = [
      makeSlot({ id: 1, start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z' }),
      makeSlot({ id: 2, start: '2026-06-20T02:00:00Z', end: '2026-06-20T06:00:00Z' }),
    ];
    // min = floor(2)-1 = 1, max = ceil(14)+1 = 15
    expect(computeGlobalHourRange(slots)).toEqual({ minHour: 1, maxHour: 15 });
  });

  it('combines montage and festival slots in range computation', () => {
    const slots = [
      makeSlot({ id: 1, type: 'montage', start: '2026-06-19T06:00:00Z', end: '2026-06-19T20:00:00Z' }),
      makeSlot({ id: 2, type: 'festival', start: '2026-06-20T10:00:00Z', end: '2026-06-20T14:00:00Z' }),
    ];
    // min = floor(6)-1 = 5, max = ceil(20)+1 = 21
    expect(computeGlobalHourRange(slots)).toEqual({ minHour: 5, maxHour: 21 });
  });

  it('buildGridData uses provided axisRange instead of computing', () => {
    const slot = makeSlot({ start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z' });
    const fixedRange = { minHour: 5, maxHour: 30 };
    const grid = buildGridData([slot], [], null, '2026-06-19', undefined, undefined, fixedRange);
    expect(grid.columns[0].minHour).toBe(5);
    expect(grid.columns[0].maxHour).toBe(30);
  });
});

// ---- buildGridData ----------------------------------------------------------

describe('buildGridData', () => {
  const TODAY = '2026-06-19';

  it('returns empty grid for no slots', () => {
    const grid = buildGridData([], [], null, TODAY);
    expect(grid.columns).toEqual([]);
    expect(grid.rowCount).toBe(1); // Math.max(1, ...)
  });

  describe('single same-day festival slot', () => {
    const slot = makeSlot({ capacity: 2, volunteers: [] });
    const grid = buildGridData([slot], [], null, TODAY);

    it('creates one column for the slot date', () => {
      expect(grid.columns).toHaveLength(1);
      expect(grid.columns[0].dateKey).toBe('2026-06-19');
    });

    it('marks today column', () => {
      expect(grid.columns[0].isToday).toBe(true);
    });

    it('festival columns are not full-day', () => {
      expect(grid.columns[0].isFullDay).toBe(false);
    });

    it('creates positions = max(capacity, volunteers+1)', () => {
      // capacity=2, volunteers=0, so posCount = max(2, 0+1) = 2
      // Both are empty cells in lane packing → 2 lanes
      expect(grid.rowCount).toBe(2);
    });

    it('cells have startPct and widthPct for time positioning', () => {
      const cells = grid.columns[0].cells;
      const firstCell = cells[0][0];
      expect(firstCell.startPct).toBeDefined();
      expect(firstCell.widthPct).toBeDefined();
      expect(firstCell.timeLabel).toContain('10:00');
      expect(firstCell.timeLabel).toContain('14:00');
    });

    it('empty cells have null volunteer', () => {
      const firstCell = grid.columns[0].cells[0][0];
      expect(firstCell.volunteer).toBeNull();
    });
  });

  describe('full-day (montage) slot', () => {
    const slot = makeSlot({ type: 'montage', capacity: 3 });
    const grid = buildGridData([slot], [], null, TODAY);

    it('is marked as full-day', () => {
      expect(grid.columns[0].isFullDay).toBe(true);
    });

    it('full-day cells have no startPct/widthPct', () => {
      const firstCell = grid.columns[0].cells[0][0];
      expect(firstCell.startPct).toBeUndefined();
      expect(firstCell.widthPct).toBeUndefined();
    });

    it('each position gets its own row (sequential packing)', () => {
      // capacity=3, volunteers=0, posCount = max(3, 0+1) = 3
      expect(grid.rowCount).toBe(3);
      expect(grid.columns[0].cells).toHaveLength(3);
      // Each row has exactly 1 cell
      for (const row of grid.columns[0].cells) {
        expect(row).toHaveLength(1);
      }
    });
  });

  describe('cross-midnight slot (single-chip model)', () => {
    const crossSlot = makeSlot({
      id: 10,
      start: '2026-06-19T22:00:00Z',
      end: '2026-06-20T02:00:00Z',
      capacity: 1,
      volunteers: [{ id: 100, nickname: 'Alice' }],
    });
    const vols = [makeVol({ id: 1, nickname: 'Alice' })];

    it('appears in start-day column only (single chip)', () => {
      const grid = buildGridData([crossSlot], vols, null, TODAY);
      expect(grid.columns).toHaveLength(1);
      expect(grid.columns[0].dateKey).toBe('2026-06-19');
    });

    it('time axis extends past 24h to cover the cross-midnight end', () => {
      const grid = buildGridData([crossSlot], vols, null, TODAY);
      const col = grid.columns[0];
      // minHour = floor(22)-1 = 21, maxHour = ceil(26)+1 = 27
      expect(col.minHour).toBe(21);
      expect(col.maxHour).toBe(27);
    });

    it('chip widthPct spans from 22h to 26h within dynamic axis', () => {
      const grid = buildGridData([crossSlot], vols, null, TODAY);
      const cell = grid.columns[0].cells[0][0];
      // minHour=21, maxHour=27, span=6, startH=22, endH=26
      // startPct = (22-21)/6*100 ≈ 16.7%, widthPct = (4/6)*100 ≈ 66.7%
      const span = 6;
      expect(cell.startPct).toBeCloseTo((1 / span) * 100, 1);
      expect(cell.widthPct).toBeCloseTo((4 / span) * 100, 1);
    });

    it('midnight-ending slot stays in single day with padded maxHour', () => {
      const midnightEnd = makeSlot({
        start: '2026-06-19T20:00:00Z',
        end: '2026-06-20T00:00:00Z',
      });
      const grid = buildGridData([midnightEnd], [], null, TODAY);
      expect(grid.columns).toHaveLength(1);
      // minHour = floor(20)-1 = 19, maxHour = ceil(24)+1 = 25
      expect(grid.columns[0].minHour).toBe(19);
      expect(grid.columns[0].maxHour).toBe(25);
    });
  });

  describe('lane packing for time-based columns', () => {
    it('non-overlapping slots share the same lane', () => {
      const slots = [
        makeSlot({ id: 1, start: '2026-06-19T08:00:00Z', end: '2026-06-19T10:00:00Z', capacity: 1 }),
        makeSlot({ id: 2, start: '2026-06-19T10:00:00Z', end: '2026-06-19T12:00:00Z', capacity: 1 }),
      ];
      const grid = buildGridData(slots, [], null, TODAY);
      // Both should fit in lane 0 (non-overlapping)
      const col = grid.columns[0];
      expect(col.cells[0]).toHaveLength(2); // Two cells in the same lane
    });

    it('overlapping slots go into separate lanes', () => {
      const slots = [
        makeSlot({ id: 1, start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z', capacity: 1 }),
        makeSlot({ id: 2, start: '2026-06-19T12:00:00Z', end: '2026-06-19T16:00:00Z', capacity: 1 }),
      ];
      const grid = buildGridData(slots, [], null, TODAY);
      const col = grid.columns[0];
      // Each slot's empty position creates 1 cell, overlapping → 2 lanes
      // But each has capacity=1, volunteers=0, so posCount = max(1, 0+1) = 1
      // Two overlapping cells → 2 lanes
      expect(col.cells.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('lane stability with prevLaneMap', () => {
    it('extractLaneMap captures lane assignments', () => {
      const slots = [
        makeSlot({ id: 1, start: '2026-06-19T08:00:00Z', end: '2026-06-19T10:00:00Z', capacity: 1 }),
        makeSlot({ id: 2, start: '2026-06-19T10:00:00Z', end: '2026-06-19T12:00:00Z', capacity: 1 }),
      ];
      const grid = buildGridData(slots, [], null, TODAY);
      const laneMap = extractLaneMap(grid);
      expect(laneMap.size).toBeGreaterThan(0);
      // Both non-overlapping → lane 0
      expect(laneMap.get('2026-06-19:1:0')).toBe(0);
      expect(laneMap.get('2026-06-19:2:0')).toBe(0);
    });

    it('prevLaneMap preserves lane assignments across rebuilds', () => {
      const slots = [
        makeSlot({ id: 1, start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z', capacity: 1 }),
        makeSlot({ id: 2, start: '2026-06-19T12:00:00Z', end: '2026-06-19T16:00:00Z', capacity: 1 }),
      ];
      const grid1 = buildGridData(slots, [], null, TODAY);
      const laneMap = extractLaneMap(grid1);

      // Rebuild with same data + prevLaneMap → lanes should stay the same
      const grid2 = buildGridData(slots, [], null, TODAY, undefined, laneMap);
      const laneMap2 = extractLaneMap(grid2);

      for (const [key, lane] of laneMap.entries()) {
        expect(laneMap2.get(key)).toBe(lane);
      }
    });

    it('compaction recovers after displacement is resolved (resize scenario)', () => {
      // Step 1: Two adjacent non-overlapping slots in lane 0
      const slotsOriginal = [
        makeSlot({ id: 1, start: '2026-06-19T10:00:00Z', end: '2026-06-19T12:00:00Z', capacity: 1 }),
        makeSlot({ id: 2, start: '2026-06-19T12:00:00Z', end: '2026-06-19T14:00:00Z', capacity: 1 }),
      ];
      const grid1 = buildGridData(slotsOriginal, [], null, TODAY);
      const laneMap1 = extractLaneMap(grid1);
      expect(laneMap1.get('2026-06-19:1:0')).toBe(0);
      expect(laneMap1.get('2026-06-19:2:0')).toBe(0);

      // Step 2: Resize slot 1 to overlap slot 2 (10-14 overlaps 12-14)
      const slotsExpanded = [
        makeSlot({ id: 1, start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z', capacity: 1 }),
        makeSlot({ id: 2, start: '2026-06-19T12:00:00Z', end: '2026-06-19T14:00:00Z', capacity: 1 }),
      ];
      const grid2 = buildGridData(slotsExpanded, [], null, TODAY, undefined, laneMap1);
      const laneMap2 = extractLaneMap(grid2);
      // Slot 2 must be displaced to lane 1 due to overlap
      expect(laneMap2.get('2026-06-19:1:0')).toBe(0);
      expect(laneMap2.get('2026-06-19:2:0')).toBe(1);

      // Step 3: Resize slot 1 back to original (10-12) — no more overlap
      const grid3 = buildGridData(slotsOriginal, [], null, TODAY, undefined, laneMap2);
      const laneMap3 = extractLaneMap(grid3);
      // Compaction should pull slot 2 back to lane 0
      expect(laneMap3.get('2026-06-19:1:0')).toBe(0);
      expect(laneMap3.get('2026-06-19:2:0')).toBe(0);
    });
  });

  describe('validation status mapping', () => {
    const slot = makeSlot({
      volunteers: [{ id: 100, nickname: 'Alice' }, { id: 101, nickname: 'Bob' }],
    });
    const vols = [
      makeVol({ id: 1, nickname: 'Alice' }),
      makeVol({ id: 2, nickname: 'Bob' }),
    ];

    it('marks cells as error for error-severity issues', () => {
      const validation: ValidationResult = {
        valid: false,
        issues: [{ type: 'double_booked', severity: 'error', volunteer_id: 1 }],
      };
      const grid = buildGridData([slot], vols, validation, TODAY);
      const aliceCell = grid.columns[0].cells.flat().find((c) => c.volunteer?.nickname === 'Alice');
      expect(aliceCell?.status).toBe('error');
    });

    it('marks cells as warning for warning-severity issues', () => {
      const validation: ValidationResult = {
        valid: false,
        issues: [{ type: 'over_hours', severity: 'warning', volunteer_id: 2 }],
      };
      const grid = buildGridData([slot], vols, validation, TODAY);
      const bobCell = grid.columns[0].cells.flat().find((c) => c.volunteer?.nickname === 'Bob');
      expect(bobCell?.status).toBe('warning');
    });

    it('marks cells as pending for pending assignment IDs', () => {
      const pending = new Set([100]); // Alice's assignment ID
      const grid = buildGridData([slot], vols, null, TODAY, pending);
      const aliceCell = grid.columns[0].cells.flat().find((c) => c.volunteer?.nickname === 'Alice');
      expect(aliceCell?.status).toBe('pending');
    });

    it('pending takes precedence over error', () => {
      const validation: ValidationResult = {
        valid: false,
        issues: [{ type: 'double_booked', severity: 'error', volunteer_id: 1 }],
      };
      const pending = new Set([100]);
      const grid = buildGridData([slot], vols, validation, TODAY, pending);
      const aliceCell = grid.columns[0].cells.flat().find((c) => c.volunteer?.nickname === 'Alice');
      expect(aliceCell?.status).toBe('pending');
    });

    it('approved when no validation issues', () => {
      const grid = buildGridData([slot], vols, null, TODAY);
      const aliceCell = grid.columns[0].cells.flat().find((c) => c.volunteer?.nickname === 'Alice');
      expect(aliceCell?.status).toBe('approved');
    });
  });

  describe('mixed day types', () => {
    it('detects mixed dayType when multiple slot types on same day', () => {
      const slots = [
        makeSlot({ id: 1, type: 'montage' }),
        makeSlot({ id: 2, type: 'festival' }),
      ];
      const grid = buildGridData(slots, [], null, TODAY);
      expect(grid.columns[0].dayType).toBe('mixed');
    });

    it('single type returns that type', () => {
      const slots = [
        makeSlot({ id: 1, type: 'montage' }),
        makeSlot({ id: 2, type: 'montage' }),
      ];
      const grid = buildGridData(slots, [], null, TODAY);
      expect(grid.columns[0].dayType).toBe('montage');
    });
  });
});

// ---- extractDetailItems -----------------------------------------------------

describe('extractDetailItems', () => {
  it('returns empty for null/undefined', () => {
    expect(extractDetailItems(null)).toEqual([]);
    expect(extractDetailItems(undefined)).toEqual([]);
  });

  it('returns empty for non-object', () => {
    expect(extractDetailItems('string')).toEqual([]);
    expect(extractDetailItems(42)).toEqual([]);
  });

  it('extracts from top-level array', () => {
    const items = extractDetailItems(['error 1', 'error 2']);
    expect(items).toEqual([{ message: 'error 1' }, { message: 'error 2' }]);
  });

  it('extracts from .errors key', () => {
    const items = extractDetailItems({ errors: ['err'] });
    expect(items).toEqual([{ message: 'err' }]);
  });

  it('extracts from .validation_errors key', () => {
    const items = extractDetailItems({ validation_errors: [{ message: 'invalid' }] });
    expect(items).toEqual([{ message: 'invalid' }]);
  });

  it('extracts from .details key', () => {
    const items = extractDetailItems({ details: [{ message: 'detail' }] });
    expect(items).toEqual([{ message: 'detail' }]);
  });

  it('parses object items with row/column/field/message', () => {
    const items = extractDetailItems([
      { row: 3, column: 'A', field: 'name', message: 'required' },
    ]);
    expect(items[0]).toEqual({ row: 3, column: 'A', field: 'name', message: 'required' });
  });

  it('uses .col as fallback for column', () => {
    const items = extractDetailItems([{ col: 'B', message: 'test' }]);
    expect(items[0].column).toBe('B');
  });

  it('falls back to .error, .detail, then JSON.stringify', () => {
    expect(extractDetailItems([{ error: 'e' }])[0].message).toBe('e');
    expect(extractDetailItems([{ detail: 'd' }])[0].message).toBe('d');
    expect(extractDetailItems([{ foo: 'bar' }])[0].message).toContain('foo');
  });
});

// ---- buildApiErrorState -----------------------------------------------------

describe('buildApiErrorState', () => {
  it('extracts from ApiError', () => {
    const err = new ApiError('Not found', 404, undefined, { errors: ['missing'] });
    const state = buildApiErrorState(err, 'fetch');
    expect(state).toEqual({
      message: 'Not found',
      status: 404,
      details: { errors: ['missing'] },
      operation: 'fetch',
    });
  });

  it('extracts from regular Error', () => {
    const state = buildApiErrorState(new Error('boom'), 'save');
    expect(state.message).toBe('boom');
    expect(state.status).toBe(0);
  });

  it('handles unknown error types', () => {
    const state = buildApiErrorState('string error', 'op');
    expect(state.message).toBe('Nieznany błąd');
    expect(state.status).toBe(0);
  });
});

// ---- extractSheetId ---------------------------------------------------------

describe('extractSheetId', () => {
  it('extracts ID from Google Sheets URL', () => {
    expect(extractSheetId('https://docs.google.com/spreadsheets/d/abc123_-XYZ/edit'))
      .toBe('abc123_-XYZ');
  });

  it('returns null for non-matching URL', () => {
    expect(extractSheetId('https://example.com')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractSheetId('')).toBeNull();
  });
});

// ---- toAbsoluteHour / absoluteHourToISO ------------------------------------

describe('toAbsoluteHour', () => {
  it('returns hour offset within the same day', () => {
    expect(toAbsoluteHour('2026-06-19T10:00:00', '2026-06-19')).toBe(10);
  });

  it('returns offset for next day', () => {
    expect(toAbsoluteHour('2026-06-20T02:00:00', '2026-06-19')).toBe(26);
  });

  it('handles minutes', () => {
    expect(toAbsoluteHour('2026-06-19T10:30:00', '2026-06-19')).toBe(10.5);
  });

  it('handles multi-day offset', () => {
    expect(toAbsoluteHour('2026-06-21T06:00:00', '2026-06-19')).toBe(54);
  });

  it('handles midnight', () => {
    expect(toAbsoluteHour('2026-06-20T00:00:00', '2026-06-19')).toBe(24);
  });
});

describe('absoluteHourToISO', () => {
  it('converts same-day hour', () => {
    expect(absoluteHourToISO(10, '2026-06-19')).toBe('2026-06-19T10:00:00');
  });

  it('converts next-day hour', () => {
    expect(absoluteHourToISO(26, '2026-06-19')).toBe('2026-06-20T02:00:00');
  });

  it('converts hour with minutes', () => {
    expect(absoluteHourToISO(10.5, '2026-06-19')).toBe('2026-06-19T10:30:00');
  });

  it('converts multi-day hour', () => {
    expect(absoluteHourToISO(54, '2026-06-19')).toBe('2026-06-21T06:00:00');
  });

  it('roundtrips with toAbsoluteHour', () => {
    const iso = '2026-06-20T14:30:00';
    const absH = toAbsoluteHour(iso, '2026-06-19');
    expect(absoluteHourToISO(absH, '2026-06-19')).toBe(iso);
  });
});

// ---- buildTimelineData ------------------------------------------------------

describe('buildTimelineData', () => {
  const TODAY = '2026-06-19';

  it('returns empty timeline for no slots', () => {
    const tl = buildTimelineData([], [], null, TODAY);
    expect(tl.lanes).toEqual([]);
    expect(tl.dayMarkers).toEqual([]);
    expect(tl.totalHours).toBe(12);
  });

  it('creates a single lane for a single slot', () => {
    const slot = makeSlot({ capacity: 1, volunteers: [] });
    const tl = buildTimelineData([slot], [], null, TODAY);
    // posCount = max(1, 0+1) = 1 → 1 cell
    expect(tl.lanes.length).toBeGreaterThanOrEqual(1);
    expect(tl.lanes[0].cells).toHaveLength(1);
    expect(tl.lanes[0].cells[0].timeLabel).toContain('10:00');
  });

  it('cells have correct startPct/widthPct relative to absolute timeline', () => {
    const slot = makeSlot({ capacity: 1 });
    const tl = buildTimelineData([slot], [], null, TODAY);
    const cell = tl.lanes[0].cells[0];
    expect(cell.startPct).toBeDefined();
    expect(cell.widthPct).toBeDefined();
    // 4h slot on a padded timeline — widthPct should be > 0
    expect(cell.widthPct!).toBeGreaterThan(0);
  });

  it('cross-midnight slot has no gap — single continuous chip', () => {
    const slotFri = makeSlot({
      id: 1,
      start: '2026-06-19T18:00:00Z',
      end: '2026-06-20T02:00:00Z',
      capacity: 1,
    });
    const slotSat = makeSlot({
      id: 2,
      start: '2026-06-20T02:00:00Z',
      end: '2026-06-20T06:00:00Z',
      capacity: 1,
    });
    const tl = buildTimelineData([slotFri, slotSat], [], null, TODAY);

    // Find cells
    const cellFri = tl.lanes.flatMap((l) => l.cells).find((c) => c.slot.id === 1)!;
    const cellSat = tl.lanes.flatMap((l) => l.cells).find((c) => c.slot.id === 2)!;

    // Friday chip's right edge should equal Saturday chip's left edge (contiguous)
    const friEnd = cellFri.startPct! + cellFri.widthPct!;
    expect(friEnd).toBeCloseTo(cellSat.startPct!, 5);
  });

  it('non-overlapping slots share the same lane', () => {
    const slots = [
      makeSlot({ id: 1, start: '2026-06-19T08:00:00Z', end: '2026-06-19T10:00:00Z', capacity: 1 }),
      makeSlot({ id: 2, start: '2026-06-19T10:00:00Z', end: '2026-06-19T12:00:00Z', capacity: 1 }),
    ];
    const tl = buildTimelineData(slots, [], null, TODAY);
    // Both should be packed in the same lane
    expect(tl.lanes[0].cells).toHaveLength(2);
  });

  it('overlapping slots go to separate lanes', () => {
    const slots = [
      makeSlot({ id: 1, start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z', capacity: 1 }),
      makeSlot({ id: 2, start: '2026-06-19T12:00:00Z', end: '2026-06-19T16:00:00Z', capacity: 1 }),
    ];
    const tl = buildTimelineData(slots, [], null, TODAY);
    expect(tl.lanes.length).toBeGreaterThanOrEqual(2);
  });

  it('creates correct day markers', () => {
    const slots = [
      makeSlot({ id: 1, start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z' }),
      makeSlot({ id: 2, start: '2026-06-20T10:00:00Z', end: '2026-06-20T14:00:00Z' }),
    ];
    const tl = buildTimelineData(slots, [], null, TODAY);
    expect(tl.dayMarkers).toHaveLength(2);
    expect(tl.dayMarkers[0].dateKey).toBe('2026-06-19');
    expect(tl.dayMarkers[1].dateKey).toBe('2026-06-20');
    expect(tl.dayMarkers[0].isToday).toBe(true);
    expect(tl.dayMarkers[1].isToday).toBe(false);
  });

  it('multi-day slots across 3 days have correct firstDateKey', () => {
    const slots = [
      makeSlot({ id: 1, start: '2026-06-18T10:00:00Z', end: '2026-06-18T14:00:00Z' }),
      makeSlot({ id: 2, start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z' }),
      makeSlot({ id: 3, start: '2026-06-20T10:00:00Z', end: '2026-06-20T14:00:00Z' }),
    ];
    const tl = buildTimelineData(slots, [], null, TODAY);
    expect(tl.firstDateKey).toBe('2026-06-18');
    expect(tl.dayMarkers).toHaveLength(3);
  });

  it('extractTimelineLaneMap captures lane assignments', () => {
    const slots = [
      makeSlot({ id: 1, start: '2026-06-19T08:00:00Z', end: '2026-06-19T10:00:00Z', capacity: 1 }),
      makeSlot({ id: 2, start: '2026-06-19T10:00:00Z', end: '2026-06-19T12:00:00Z', capacity: 1 }),
    ];
    const tl = buildTimelineData(slots, [], null, TODAY);
    const laneMap = extractTimelineLaneMap(tl);
    expect(laneMap.get('1:0')).toBe(0);
    expect(laneMap.get('2:0')).toBe(0);
  });

  it('prevLaneMap preserves lane stability across rebuilds', () => {
    const slots = [
      makeSlot({ id: 1, start: '2026-06-19T10:00:00Z', end: '2026-06-19T14:00:00Z', capacity: 1 }),
      makeSlot({ id: 2, start: '2026-06-19T12:00:00Z', end: '2026-06-19T16:00:00Z', capacity: 1 }),
    ];
    const tl1 = buildTimelineData(slots, [], null, TODAY);
    const laneMap = extractTimelineLaneMap(tl1);

    const tl2 = buildTimelineData(slots, [], null, TODAY, undefined, laneMap);
    const laneMap2 = extractTimelineLaneMap(tl2);

    for (const [key, lane] of laneMap.entries()) {
      expect(laneMap2.get(key)).toBe(lane);
    }
  });

  it('validation status propagates correctly', () => {
    const slot = makeSlot({
      volunteers: [{ id: 100, nickname: 'Alice' }],
    });
    const vols = [makeVol({ id: 1, nickname: 'Alice' })];
    const validation: ValidationResult = {
      valid: false,
      issues: [{ type: 'double_booked', severity: 'error', volunteer_id: 1 }],
    };
    const tl = buildTimelineData([slot], vols, validation, TODAY);
    const aliceCell = tl.lanes.flatMap((l) => l.cells).find((c) => c.volunteer?.nickname === 'Alice');
    expect(aliceCell?.status).toBe('error');
  });
});
