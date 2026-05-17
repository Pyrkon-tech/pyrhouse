import { apiClient } from './apiClient';
import type {
  ScheduleDetail,
  ScheduleSlot,
  ScheduleVolunteer,
  ValidationResult,
  CreateSchedulePayload,
  ImportVolunteersPayload,
  UpdateVolunteerPayload,
  SwapAssignmentPayload,
  CreateAssignmentPayload,
  CreateSlotPayload,
  UpdateSlotPayload,
  DraftPayload,
  DraftResponse,
  OnDutyVolunteer,
  MyScheduleResponse,
  DayWindow,
  SetDayWindowPayload,
} from '../types/schedule.types';

// ---- Active schedule (singular — only one active at a time) ----------------

/** GET /schedule — 404 means no active schedule */
export const getScheduleDetailAPI = () =>
  apiClient.get<ScheduleDetail>('/schedule');

/** POST /schedule — creates new active schedule, archives previous one */
export const createScheduleAPI = (payload: CreateSchedulePayload) =>
  apiClient.post<ScheduleDetail>('/schedule', payload);

// ---- Volunteers ------------------------------------------------------------

/**
 * POST /schedule/volunteers — bulk import of volunteer data.
 * Volunteers do NOT need system accounts (user_id: null is normal).
 * Replaces previous volunteer list entirely.
 */
export const importVolunteersAPI = (payload: ImportVolunteersPayload) =>
  apiClient.post<void>('/schedule/volunteers', payload);

/** GET /schedule/volunteers — list all volunteers in active schedule */
export const getVolunteersAPI = () =>
  apiClient.get<ScheduleVolunteer[]>('/schedule/volunteers');

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
  apiClient.get<MyScheduleResponse>('/schedule/volunteers/me');

// ---- Assignments -----------------------------------------------------------

/**
 * POST /schedule/assignments — add volunteer to slot.
 * Returns 201 { id, slot_id, volunteer_id }.
 * Error 500 if volunteer already assigned to that slot (UNIQUE constraint).
 */
export const createAssignmentAPI = (payload: CreateAssignmentPayload) =>
  apiClient.post<{ id: number; slot_id: number; volunteer_id: number }>('/schedule/assignments', payload);

/** DELETE /schedule/assignments/:aid — remove a volunteer from a slot */
export const deleteAssignmentAPI = (assignmentId: number) =>
  apiClient.delete<void>(`/schedule/assignments/${assignmentId}`);

/**
 * POST /schedule/assignments/swap — exchange two volunteers between slots.
 * Both parameters are assignment IDs (SlotVolunteer.id from GET /schedule response).
 */
export const swapAssignmentsAPI = (payload: SwapAssignmentPayload) =>
  apiClient.post<void>('/schedule/assignments/swap', payload);

// ---- Slot CRUD (v2) --------------------------------------------------------

/** POST /schedule/slots — create a new slot */
export const createSlotAPI = (payload: CreateSlotPayload) =>
  apiClient.post<ScheduleSlot>('/schedule/slots', payload);

/** PATCH /schedule/slots/:sid — update slot (partial) */
export const updateSlotAPI = (slotId: number, payload: UpdateSlotPayload) =>
  apiClient.patch<ScheduleSlot>(`/schedule/slots/${slotId}`, payload);

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
  apiClient.put<DraftResponse>('/schedule/draft', payload);

// ---- Generation & validation -----------------------------------------------

/**
 * POST /schedule/generate — run solver.
 * WARNING: Deletes all existing slots and assignments, regenerates from scratch.
 * Returns full ScheduleDetail with new assignments.
 */
export const generateScheduleAPI = () =>
  apiClient.post<ScheduleDetail>('/schedule/generate', {});

/**
 * GET /schedule/validate — explicit validation of current server state.
 * Note: validation is also embedded inline in GET /schedule response.
 */
export const validateScheduleAPI = () =>
  apiClient.get<ValidationResult>('/schedule/validate');

// ---- Publishing & export ---------------------------------------------------

/** PATCH /schedule/publish — publish schedule (admin only) */
export const publishScheduleAPI = () =>
  apiClient.patch<ScheduleDetail>('/schedule/publish', {});

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
  );

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
  apiClient.post<ScheduleDetail>('/schedule/regenerate-slots', {});

// ---- Dispatch integration --------------------------------------------------

/**
 * GET /schedule/on-duty?at=<RFC3339>
 * Returns volunteers currently on a duty slot at the given time.
 * at is optional — omit for server-side "now".
 */
export const getOnDutyAPI = (at?: string): Promise<OnDutyVolunteer[]> =>
  apiClient.get<OnDutyVolunteer[]>(`/schedule/on-duty${at ? `?at=${encodeURIComponent(at)}` : ''}`);
