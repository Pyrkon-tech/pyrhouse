import type { SlotType, ScheduleSlot } from '../../../types/schedule.types';

// ---- Legacy horizontal types (kept for compatibility) -----------------------

/** Per-person horizontal assignment card data */
export interface AssignmentCardH {
  assignmentId: number;
  volunteerId: number;
  slotId: number;
  nickname: string;
  slotType: SlotType;
  slotLabel: string;
  creditHours: number;
  startTime: string;
  endTime: string;
  left: number;
  width: number;
  lane: number;
}

/** One day column in the old horizontal calendar grid */
export interface DayGanttColumn {
  dateKey: string;
  label: string;
  shortLabel: string;
  dayType: SlotType | 'mixed';
  isToday: boolean;
  isFullDay: boolean;
  slots: ScheduleSlot[];
  cards: AssignmentCardH[];
  emptySlots: ScheduleSlot[];
  numLanes: number;
  columnWidth: number;
  contentHeight: number;
}

// ---- New vertical calendar types --------------------------------------------

/** Vertical slot block positioning */
export interface SlotBlockV {
  slot: ScheduleSlot;
  /** Top position in pixels (relative to grid area) */
  top: number;
  /** Height in pixels */
  height: number;
}

/** One day column in the new vertical calendar */
export interface DayColumnData {
  dateKey: string;
  /** Full label e.g. "Poniedziałek, 7 kwietnia" */
  label: string;
  /** Short label e.g. "pon. 07.04" */
  shortLabel: string;
  dayType: SlotType | 'mixed';
  isToday: boolean;
  /** True for montage/demontage-only days (compact layout, no time axis) */
  isFullDay: boolean;
  /** Sorted slots for this day */
  slots: ScheduleSlot[];
  /** Positioned slot blocks (for time-based layout) */
  slotBlocks: SlotBlockV[];
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
