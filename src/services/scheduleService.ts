import { apiClient } from './apiClient';
import type {
  ScheduleDetail,
  ScheduleSlot,
  ScheduleVolunteer,
  ValidationResult,
  CreateSchedulePayload,
  UpdateVolunteerPayload,
  CreateSlotPayload,
  UpdateSlotPayload,
  DraftPayload,
  DraftResponse,
  OnDutyVolunteer,
  MyScheduleResponse,
  DayWindow,
  SetDayWindowPayload,
} from '../types/schedule.types';

// ---- Nil-slice normalization ------------------------------------------------

/**
 * The Go backend serializes empty/nil slices as JSON `null`, not `[]`. Nested
 * arrays (a slot with nobody assigned, a schedule with no issues) therefore
 * arrive as `null` while still typed as arrays, and blow up far from the fetch
 * — typically inside a `useMemo` in the Schedule module. Normalize on arrival.
 */
const arr = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);

const normalizeSlot = (s: ScheduleSlot): ScheduleSlot => ({
  ...s,
  volunteers: arr(s.volunteers),
});

const normalizeValidation = (v: ValidationResult): ValidationResult => ({
  ...v,
  issues: arr(v.issues),
});

const normalizeScheduleDetail = (d: ScheduleDetail): ScheduleDetail => ({
  ...d,
  slots: arr(d.slots).map(normalizeSlot),
  volunteers: arr(d.volunteers).map((v) => ({ ...v, slots: arr(v.slots) })),
  day_windows: d.day_windows == null ? d.day_windows : arr(d.day_windows),
  validation: d.validation == null ? d.validation : normalizeValidation(d.validation),
});

// ---- Active schedule (singular — only one active at a time) ----------------

/** GET /schedule — 404 means no active schedule */
export const getScheduleDetailAPI = () =>
  apiClient.get<ScheduleDetail>('/schedule').then(normalizeScheduleDetail);

/** POST /schedule — creates new active schedule, archives previous one */
export const createScheduleAPI = (payload: CreateSchedulePayload) =>
  apiClient.post<ScheduleDetail>('/schedule', payload).then(normalizeScheduleDetail);

// ---- Volunteers ------------------------------------------------------------

/** GET /schedule/volunteers — list all volunteers in active schedule */
export const getVolunteersAPI = () =>
  apiClient.getList<ScheduleVolunteer>('/schedule/volunteers');

/**
 * PATCH /schedule/volunteers/:vid — update volunteer metadata.
 * Typical use: link system account after volunteer registers (set user_id).
 */
export const updateVolunteerAPI = (vid: number, payload: UpdateVolunteerPayload) =>
  apiClient.patch<ScheduleVolunteer>(`/schedule/volunteers/${vid}`, payload);

/** DELETE /schedule/volunteers/:vid — remove volunteer and cascade-delete their assignments */
export const deleteVolunteerAPI = (vid: number) =>
  apiClient.delete<void>(`/schedule/volunteers/${vid}`);

/** GET /schedule/volunteers/me — current user's volunteer record + assigned slots (JWT-based) */
export const getMyVolunteerScheduleAPI = () =>
  apiClient.get<MyScheduleResponse>('/schedule/volunteers/me').then((r) => ({
    ...r,
    slots: arr(r.slots),
  }));

// ---- Assignments -----------------------------------------------------------

// ---- Slot CRUD (v2) --------------------------------------------------------

/** POST /schedule/slots — create a new slot */
export const createSlotAPI = (payload: CreateSlotPayload) =>
  apiClient.post<ScheduleSlot>('/schedule/slots', payload).then(normalizeSlot);

/** PATCH /schedule/slots/:sid — update slot (partial) */
export const updateSlotAPI = (slotId: number, payload: UpdateSlotPayload) =>
  apiClient.patch<ScheduleSlot>(`/schedule/slots/${slotId}`, payload).then(normalizeSlot);

/** DELETE /schedule/slots/:sid — delete slot + cascade assignments */
export const deleteSlotAPI = (slotId: number) =>
  apiClient.delete<void>(`/schedule/slots/${slotId}`);

/** DELETE /schedule/:id — permanently delete schedule with all slots, volunteers, assignments (admin only) */
export const deleteScheduleAPI = (scheduleId: number) =>
  apiClient.delete<void>(`/schedule/${scheduleId}`);

// ---- Draft (bulk save) -----------------------------------------------------

/**
 * PUT /schedule/draft — bulk save entire schedule state.
 * Slots with `id` → update, with `temp_id` → create, missing → delete.
 * Assignments reconciled: add missing, remove extra.
 * Returns full ScheduleDetail + temp_id→real_id mapping + validation.
 */
export const saveDraftAPI = (payload: DraftPayload) =>
  apiClient.put<DraftResponse>('/schedule/draft', payload).then((r) => ({
    ...r,
    schedule: normalizeScheduleDetail(r.schedule),
    created_slots: arr(r.created_slots),
    validation: normalizeValidation(r.validation),
  }));

// ---- Generation & validation -----------------------------------------------

/**
 * POST /schedule/generate — run solver.
 * WARNING: Deletes all existing slots and assignments, regenerates from scratch.
 * Returns full ScheduleDetail with new assignments.
 */
export const generateScheduleAPI = () =>
  apiClient.post<ScheduleDetail>('/schedule/generate', {}).then(normalizeScheduleDetail);

/**
 * GET /schedule/validate — explicit validation of current server state.
 * Note: validation is also embedded inline in GET /schedule response.
 */
export const validateScheduleAPI = () =>
  apiClient.get<ValidationResult>('/schedule/validate').then(normalizeValidation);

// ---- Publishing & export ---------------------------------------------------

/**
 * POST /schedule/export/sheets — push schedule to Google Sheets.
 * Requires backend settings: scheduling.sheet_id, scheduling.sheet_name.
 */
export const exportSheetsAPI = () =>
  apiClient.post<{ rows_written: number; sheet_url?: string }>('/schedule/export/sheets', {});

/**
 * POST /schedule/volunteers/import-sheet — import volunteers from Google Sheets.
 * Extract sheet_id from URL with: url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
 * sheet_name is the tab name (manually entered, can't be extracted from URL).
 * Returns { imported: number } — count of volunteers added.
 * Import is ADDITIVE — existing volunteers are NOT deleted.
 * Requires active schedule (POST /schedule first).
 */
export const importFromSheetAPI = (sheetId: string, sheetName: string) =>
  apiClient.post<{ imported: number; updated: number; skipped: number; errors: string[] }>(
    '/schedule/volunteers/import-sheet',
    { sheet_id: sheetId, sheet_name: sheetName },
  ).then((r) => ({ ...r, errors: arr(r.errors) }));

// ---- Day windows -----------------------------------------------------------

/**
 * PUT /schedule/day-windows — upsert operational window for a single day.
 * If a window already exists for that date, it is overwritten.
 * Requires moderator role.
 */
export const setDayWindowAPI = (payload: SetDayWindowPayload) =>
  apiClient.put<DayWindow>('/schedule/day-windows', payload);

/**
 * DELETE /schedule/day-windows/:date — remove window for a date.
 * After deletion, next regeneration will use the default 08:00–20:00.
 * Requires moderator role.
 */
export const deleteDayWindowAPI = (date: string) =>
  apiClient.delete<void>(`/schedule/day-windows/${date}`);

/**
 * POST /schedule/regenerate-slots — regenerate all montage/demontage slots.
 * Deletes existing montage/demontage slots and assignments, recreates hourly
 * slots according to current day_windows. Festival slots are untouched.
 * Returns full ScheduleDetail with new version.
 * Requires admin role.
 */
export const regenerateSlotsAPI = () =>
  apiClient.post<ScheduleDetail>('/schedule/regenerate-slots', {}).then(normalizeScheduleDetail);

// ---- Dispatch integration --------------------------------------------------

/**
 * GET /schedule/on-duty?at=<RFC3339>
 * Returns volunteers currently on a duty slot at the given time.
 * at is optional — omit for server-side "now".
 */
export const getOnDutyAPI = (at?: string): Promise<OnDutyVolunteer[]> =>
  apiClient.getList<OnDutyVolunteer>(`/schedule/on-duty${at ? `?at=${encodeURIComponent(at)}` : ''}`);
