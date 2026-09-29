import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getScheduleDetailAPI,
  validateScheduleAPI,
  createSlotAPI,
  importFromSheetAPI,
} from '../scheduleService';

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * The Go backend serializes empty slices as JSON `null`. These tests pin the
 * boundary contract: nothing downstream ever sees a null where an array is typed.
 */
describe('scheduleService nil-slice normalization', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes null slots, volunteers and nested arrays in GET /schedule', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 1, name: 'Pyrkon', slots: null, volunteers: null }),
    );

    const detail = await getScheduleDetailAPI();

    expect(detail.slots).toEqual([]);
    expect(detail.volunteers).toEqual([]);
  });

  it('normalizes null volunteers inside a slot and null slots inside a volunteer', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 1,
        slots: [{ id: 10, label: 'Montaż', volunteers: null }],
        volunteers: [{ id: 5, nickname: 'warrmag', slots: null }],
      }),
    );

    const detail = await getScheduleDetailAPI();

    expect(detail.slots[0].volunteers).toEqual([]);
    expect(detail.volunteers[0].slots).toEqual([]);
  });

  it('normalizes null validation.issues inside the schedule detail', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 1, slots: [], volunteers: [], validation: { valid: true, issues: null } }),
    );

    const detail = await getScheduleDetailAPI();

    expect(detail.validation?.issues).toEqual([]);
  });

  it('leaves absent validation absent rather than inventing one', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, slots: [], volunteers: [] }));

    const detail = await getScheduleDetailAPI();

    expect(detail.validation).toBeUndefined();
  });

  it('preserves populated arrays untouched', async () => {
    const slots = [{ id: 10, label: 'Montaż', volunteers: [{ id: 1, nickname: 'a' }] }];
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, slots, volunteers: [] }));

    const detail = await getScheduleDetailAPI();

    expect(detail.slots[0].volunteers).toEqual([{ id: 1, nickname: 'a' }]);
  });

  it('normalizes null issues from GET /schedule/validate', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ valid: true, issues: null }));

    const validation = await validateScheduleAPI();

    expect(validation.issues).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it('normalizes a freshly created slot with no volunteers', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 42, label: 'Nowy', volunteers: null }));

    const slot = await createSlotAPI({} as never);

    expect(slot.volunteers).toEqual([]);
  });

  it('normalizes null errors from a clean sheet import', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ imported: 3, updated: 0, skipped: 0, errors: null }),
    );

    const result = await importFromSheetAPI('sheet-1', 'Arkusz1');

    expect(result.errors).toEqual([]);
    expect(result.imported).toBe(3);
  });
});
