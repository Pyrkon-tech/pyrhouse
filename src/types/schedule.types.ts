// ============================================================================
// Schedule (Harmonogram dyżurów) types — aliases of the generated API contract
// (@pyrhouse/api, from backend/docs/openapi.yaml). One active schedule at a time.
// ============================================================================
import type { Schemas } from '@pyrhouse/api';

export type SlotType = Schemas['SlotType'];
type ServerValidationIssue = Schemas['ValidationIssue'];
/**
 * Issues come from the server (GET/POST /schedule/validate, inline in the schedule) or from the client-side
 * pre-check (useScheduleValidation), which adds `slot_too_long` and may omit `message`.
 * `slot` is a human-readable slot description — use `slot_id` to find the slot.
 */
export type ValidationIssueType = ServerValidationIssue['type'] | 'slot_too_long';
export type ValidationIssue = Omit<ServerValidationIssue, 'type' | 'message'> & {
  type: ValidationIssueType;
  message?: string;
};
export type ValidationSeverity = ServerValidationIssue['severity'];
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/** Volunteer inside a slot; `id` is the assignment ID (delete/move/swap use it) */
export type SlotVolunteer = Schemas['SlotVolunteer'];
/** Volunteer of the active schedule; user_id null = no warehouse account (normal) */
export type ScheduleVolunteer = Schemas['VolunteerWithSlots'];
export type ScheduleSlot = Schemas['SlotWithVolunteers'];
export type Schedule = Schemas['Schedule'];
/** Operating window for montage/demontage on one date (default 08:00–20:00) */
export type DayWindow = Schemas['DayWindow'];
export type SetDayWindowPayload = Schemas['UpsertDayWindowRequest'];
export type ScheduleDetail = Omit<Schemas['ScheduleDetail'], 'validation'> & { validation: ValidationResult };

export type CreateSchedulePayload = Schemas['CreateScheduleRequest'];
export type ImportVolunteerItem = Schemas['VolunteerInput'];
export type ImportVolunteersPayload = Schemas['ImportVolunteersRequest'];
export type ImportResult = Schemas['ImportResult'];
export type ImportSheetResult = Schemas['ImportSheetResult'];
/** PATCH /schedule/volunteers/:vid — user_id null unlinks, omitted keeps the link */
export type UpdateVolunteerPayload = Schemas['UpdateVolunteerRequest'];
export type SwapAssignmentPayload = Schemas['SwapRequest'];
export type CreateAssignmentPayload = Schemas['AddAssignmentRequest'];
export type AssignmentDetail = Schemas['AssignmentDetail'];
export type CreateSlotPayload = Schemas['CreateSlotRequest'];
export type UpdateSlotPayload = Schemas['UpdateSlotRequest'];

export type OnDutyUser = Schemas['OnDutyUser'];
export type OnDutyVolunteer = Schemas['OnDutyEntry'];

export type DraftSlotItem = Schemas['DraftSlot'];
export type DraftAssignmentItem = Schemas['DraftAssignment'];
/** PUT /schedule/draft — version from the last read; 0 skips the conflict check */
export type DraftPayload = Schemas['SaveDraftRequest'];
export type DraftResponse = Omit<Schemas['SaveDraftResponse'], 'schedule' | 'validation'> & {
  schedule: ScheduleDetail;
  validation: ValidationResult;
};

export type MyScheduleSlot = Schemas['MyScheduleSlot'];
export type MyScheduleVolunteer = Schemas['ScheduleVolunteer'];
export type MyScheduleResponse = Schemas['MySchedule'];
