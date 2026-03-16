// ============================================================================
// Schedule (Harmonogram dyżurów) types
// Matches backend API: singular /schedule (one active schedule at a time)
// ============================================================================

export type SlotType = 'montage' | 'festival' | 'demontage';
export type ScheduleStatus = 'draft' | 'published';
export type ValidationIssueType =
  | 'under_hours'
  | 'over_hours'
  | 'no_festival_shifts'
  | 'slot_understaffed'
  | 'slot_overstaffed'
  | 'consecutive_over_6h'
  | 'insufficient_break'
  | 'double_booked'
  | 'outside_availability';

export type ValidationSeverity = 'error' | 'warning' | 'info';

// ---- Slot volunteer (assignment) --------------------------------------------

/**
 * Volunteer record inside a slot.
 * `id` = assignment_id (used for DELETE /schedule/assignments/:id and swap).
 */
export interface SlotVolunteer {
  /** Assignment ID — used for delete/swap operations */
  id: number;
  nickname: string;
}

// ---- Volunteer in schedule -------------------------------------------------

/**
 * Volunteer imported into the active schedule.
 * May or may not have a system account (user_id: null = no account, norma!).
 */
export interface ScheduleVolunteer {
  id: number;
  nickname: string;
  /** null = no system account (volunteer registered only in schedule) */
  user_id: number | null;
  /** Target duty hours (standard: 14, extended: 18) */
  target_hours: number;
  /** Hours already assigned in this schedule */
  assigned_hours: number;
  /** IDs of slots this volunteer is assigned to */
  slots: number[];
  // Optional metadata from import
  city?: string;
  available_from?: string;
  available_to?: string;
  notes?: string;
}

// ---- Slot ------------------------------------------------------------------

export interface ScheduleSlot {
  id: number;
  type: SlotType;
  /** Human-readable label e.g. "Montaż - Wtorek" */
  label: string;
  /** ISO datetime */
  start: string;
  /** ISO datetime */
  end: string;
  /** Credit hours for this slot (not calendar hours — e.g. full day = 7h credit) */
  credit_hours: number;
  /** Required number of volunteers */
  capacity: number;
  volunteers: SlotVolunteer[];
}

// ---- Schedule base ---------------------------------------------------------

export interface Schedule {
  id: number;
  name: string;
  status: ScheduleStatus;
  created_at: string;
}

// ---- Validation ------------------------------------------------------------

export interface ValidationIssue {
  type: ValidationIssueType;
  /** Severity: error blocks publish, warning/info are informational */
  severity?: ValidationSeverity;
  /** Volunteer nickname (for volunteer-related issues) */
  volunteer?: string;
  /** Volunteer ID (for UI highlighting) */
  volunteer_id?: number;
  /** Slot ID (for slot-related issues / UI highlighting) */
  slot_id?: number;
  /** Legacy field — same as slot_id */
  slot?: number;
  /** Assigned hours (for under_hours / over_hours) */
  assigned?: number;
  /** Target hours (for under_hours) */
  target?: number;
  /** Slot capacity (for slot_understaffed / slot_overstaffed) */
  capacity?: number;
  /** Generic message from backend */
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ---- Schedule detail (GET /schedule) ---------------------------------------

/** Full schedule with slots, volunteers and optional inline validation */
export interface ScheduleDetail extends Schedule {
  slots: ScheduleSlot[];
  volunteers: ScheduleVolunteer[];
  /**
   * Validation is included inline in GET /schedule response.
   * May also be fetched separately via GET /schedule/validate.
   */
  validation?: ValidationResult;
}

// ---- Payloads ---------------------------------------------------------------

export interface CreateSchedulePayload {
  name: string;
  /** ISO date string e.g. "2026-04-07" */
  event_start: string;
  event_end: string;
  /** ISO datetime string e.g. "2026-04-10 10:00" — festival phase within event */
  festival_start: string;
  festival_end: string;
}

/**
 * Single volunteer for bulk import.
 * user_id: null = no system account (common — volunteers don't need accounts).
 * Dates format: "YYYY-MM-DD HH:MM"
 */
export interface ImportVolunteerItem {
  nickname: string;
  city?: string;
  /** Target duty hours. Standard = 14, extended = 18 */
  hours: number;
  /** Format: YYYY-MM-DD HH:MM */
  available_from: string;
  /** Format: YYYY-MM-DD HH:MM */
  available_to: string;
  notes?: string;
  /** null = no system account (link later via PATCH /schedule/volunteers/:vid) */
  user_id?: number | null;
}

/** Body for POST /schedule/volunteers */
export interface ImportVolunteersPayload {
  volunteers: ImportVolunteerItem[];
}

/**
 * Body for PATCH /schedule/volunteers/:vid.
 * All fields optional — typical use: link system account after volunteer registers.
 */
export interface UpdateVolunteerPayload {
  user_id?: number | null;
  nickname?: string;
  hours?: number;
  notes?: string;
}

/** Body for POST /schedule/assignments/swap */
export interface SwapAssignmentPayload {
  assignment_a: number;
  assignment_b: number;
}

/** Body for POST /schedule/assignments — add volunteer to slot */
export interface CreateAssignmentPayload {
  volunteer_id: number;
  slot_id: number;
}

// ---- Slot CRUD payloads ---------------------------------------------------

/** Body for POST /schedule/slots */
export interface CreateSlotPayload {
  type: SlotType;
  start: string;
  end: string;
  capacity: number;
  label?: string;
}

/** Body for PATCH /schedule/slots/:id (all fields optional) */
export interface UpdateSlotPayload {
  type?: SlotType;
  start?: string;
  end?: string;
  capacity?: number;
  label?: string;
}

// ---- Draft (bulk save) payloads -------------------------------------------

/** Slot item in PUT /schedule/draft body */
export interface DraftSlotItem {
  /** Existing slot ID (update) */
  id?: number;
  /** Client-side temp ID (create) — mapped back in response */
  temp_id?: string;
  type: SlotType;
  start: string;
  end: string;
  capacity: number;
  label?: string;
}

/** Assignment item in PUT /schedule/draft body */
export interface DraftAssignmentItem {
  volunteer_id: number;
  /** Reference to existing slot */
  slot_id?: number;
  /** Reference to slot with temp_id (for newly created slots) */
  slot_temp_id?: string;
}

/** Body for PUT /schedule/draft */
export interface DraftPayload {
  slots: DraftSlotItem[];
  assignments: DraftAssignmentItem[];
}

/** Response from PUT /schedule/draft */
export interface DraftResponse {
  schedule: ScheduleDetail;
  created_slots: { temp_id: string; id: number }[];
  validation: ValidationResult;
}
