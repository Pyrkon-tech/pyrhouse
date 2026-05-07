import type { SlotType, ScheduleSlot } from '../../../types/schedule.types';

// ---- Grid layout types (slot × day table) -----------------------------------

/** Cell status — derived from validation + save state */
export type GridCellStatus = 'approved' | 'warning' | 'error' | 'pending';

/** One cell in the position × day grid */
export interface GridCell {
  /** The backend slot this cell belongs to */
  slot: ScheduleSlot;
  /** Position index within the slot's capacity (0-based) */
  positionIndex: number;
  /** Assigned volunteer or null (shows "Quick Assign") */
  volunteer: { assignmentId: number; volunteerId: number; nickname: string } | null;
  /** Cell status derived from validation issues */
  status: GridCellStatus;
  /** For festival columns: horizontal start position as % of time range */
  startPct?: number;
  /** For festival columns: width as % of time range */
  widthPct?: number;
  /** Human-readable time label, e.g. "10:00 → 12:00" */
  timeLabel?: string;
}

/** One column (day) in the grid */
export interface GridColumn {
  dateKey: string;
  shortLabel: string;
  dayType: SlotType | 'mixed';
  isToday: boolean;
  /** True for montage/demontage-only days (simple cells, no time axis) */
  isFullDay: boolean;
  /** For time-based columns: hour range for axis labels */
  minHour: number;
  maxHour: number;
  /**
   * Rows for this column. Each row contains an array of GridCells.
   * For full-day columns: each row has 0 or 1 cell.
   * For time-based columns: non-overlapping slots are packed into the same row
   * (each cell is absolutely positioned by startPct/widthPct).
   */
  cells: GridCell[][];
}

/** Full grid data for the scheduler table */
export interface GridData {
  columns: GridColumn[];
  /** Total number of position rows */
  rowCount: number;
}

// ---- Timeline (Gantt) layout types ------------------------------------------

/** Day separator marker on the continuous timeline */
export interface DayMarker {
  dateKey: string;
  label: string;
  dayType: SlotType | 'mixed';
  isToday: boolean;
  /** Position % on the timeline where this day starts */
  startPct: number;
  /** Position % on the timeline where this day ends */
  endPct: number;
}

/** One horizontal lane in the timeline (holds non-overlapping cells) */
export interface TimelineLane {
  cells: GridCell[];
}

/** Full timeline data for the Gantt scheduler */
export interface TimelineData {
  lanes: TimelineLane[];
  dayMarkers: DayMarker[];
  /** Earliest date in the schedule (reference point for absolute hours) */
  firstDateKey: string;
  /** Absolute hour where the timeline starts (e.g. 5 = first day 05:00) */
  absoluteStartH: number;
  /** Absolute hour where the timeline ends */
  absoluteEndH: number;
  /** Total hours spanned by the timeline */
  totalHours: number;
}

// ---- Slot creation (click+drag on empty timeline area) ----------------------

export interface SlotCreationPreview {
  /** Lane index where the ghost is rendered */
  laneIndex: number;
  startPct: number;
  widthPct: number;
  timeLabel: string;
}

// ---- Context menu -----------------------------------------------------------

export interface SlotContextMenuState {
  slotId: number;
  slotType: import('../../../types/schedule.types').SlotType;
  assignmentId?: number;
  x: number;
  y: number;
}

// ---- Calendar (vertical day-column) layout types ----------------------------

export type CalendarCellStatus = 'approved' | 'warning' | 'error' | 'pending';

export interface CalendarSlotItem {
  slot: ScheduleSlot;
  /** Left offset as fraction 0–1 (for overlapping slots in same column) */
  left: number;
  /** Width as fraction 0–1 */
  width: number;
  status: CalendarCellStatus;
  issueCount: number;
}

export interface CalendarDay {
  dateKey: string;
  label: string;       // "Czwartek, 01.05"
  shortLabel: string;  // "Czw 01.05"
  dayType: SlotType | 'mixed';
  isToday: boolean;
  slotItems: CalendarSlotItem[];
}

export interface CalendarData {
  days: CalendarDay[];
  /** Earliest slot start hour (e.g. 8 for 08:00) */
  minHour: number;
  /** Latest slot end hour; may exceed 24 for cross-midnight slots */
  maxHour: number;
}

// ---- Shared types -----------------------------------------------------------

/** Structured API error for display */
export interface ApiErrorState {
  message: string;
  status: number;
  details?: unknown;
  operation: string;
}

/** Parsed detail item from API error response */
export interface DetailItem {
  row?: number;
  column?: string;
  field?: string;
  message: string;
}
