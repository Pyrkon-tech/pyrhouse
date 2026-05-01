import type { SlotType } from '../../../types/schedule.types';

/** Roster sidebar width */
export const ROSTER_WIDTH = 220;

// ---- Grid layout (slot × day table) -----------------------------------------

/** Row height in the grid layout */
export const GRID_ROW_H = 68;

/** Width of the left "Slot N" label column */
export const SLOT_LABEL_W = 80;

/** Resize handle visual width in pixels */
export const RESIZE_HANDLE_W = 6;
/** Resize handle hit area width (larger for touch/trackpad) */
export const RESIZE_HANDLE_HIT_W = 14;

/** Snap granularity in minutes (default 15, Shift+drag = 5) */
export const SNAP_MINUTES = 15;
export const SNAP_FINE_MINUTES = 5;

/** Minimum slot duration (hours) — 30 minutes */
export const MIN_SLOT_DURATION_H = 0.5;

/** Maximum slot duration (hours) — limited only by column extent (full day/schedule) */
export const MAX_SLOT_DURATION_H = 24;

// ---- Timeline (Gantt) layout ------------------------------------------------

/** Height of each lane row in the timeline */
export const TIMELINE_LANE_H = 52;
/** Width of the lane label column (#1, #2, ...) */
export const TIMELINE_LANE_LABEL_W = 48;
/** Pixels per hour on the timeline */
export const TIMELINE_PX_PER_HOUR = 50;

/** Grid cell status colors */
export const CELL_STATUS_COLORS = {
  approved: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.40)' },
  warning:  { color: '#ff8c00', bg: 'rgba(255,140,0,0.15)',  border: 'rgba(255,140,0,0.40)'  },
  error:    { color: '#ef4444', bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.50)'  },
  pending:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.40)' },
} as const;

// ---- Shared visual config ---------------------------------------------------

export const SLOT_TYPE_CONFIG: Record<SlotType, { label: string; color: string; bg: string; border: string }> = {
  montage:   { label: 'Montaż',   color: '#42a5f5', bg: 'rgba(66,165,245,0.10)',  border: 'rgba(66,165,245,0.35)' },
  festival:  { label: 'Festiwal', color: '#ff9800', bg: 'rgba(255,152,0,0.10)',   border: 'rgba(255,152,0,0.35)' },
  demontage: { label: 'Demontaż', color: '#ab47bc', bg: 'rgba(171,71,188,0.10)',  border: 'rgba(171,71,188,0.35)' },
};

export const DAY_TYPE_COLORS: Record<SlotType | 'mixed', { color: string; bg: string; label: string }> = {
  montage:   { color: '#42a5f5', bg: 'rgba(66,165,245,0.06)',  label: 'Montaż'   },
  festival:  { color: '#ff9800', bg: 'rgba(255,152,0,0.06)',   label: 'Festiwal' },
  demontage: { color: '#ab47bc', bg: 'rgba(171,71,188,0.06)',  label: 'Demontaż' },
  mixed:     { color: '#9e9e9e', bg: 'rgba(158,158,158,0.04)', label: 'Mieszany' },
};

export const ISSUE_TYPE_LABEL: Record<string, string> = {
  under_hours:          'Za mało godzin',
  over_hours:           'Za dużo godzin',
  no_festival_shifts:   'Brak zmian festiwalowych',
  slot_understaffed:    'Niedobór wolontariuszy w slocie',
  slot_overstaffed:     'Nadmiar wolontariuszy w slocie',
  consecutive_over_6h:  'Ciągła praca ponad 6h',
  insufficient_break:   'Za krótka przerwa',
  double_booked:        'Podwójna rezerwacja',
  outside_availability: 'Poza oknem dostępności',
};

export const AVATAR_COLORS = [
  '#ff9800', '#00acc1', '#66bb6a', '#ab47bc', '#42a5f5', '#ef5350', '#ffd54f',
  '#26a69a', '#ec407a', '#7e57c2', '#8d6e63', '#78909c', '#d4e157', '#29b6f6',
  '#ff7043', '#9ccc65',
];

export const SHEET_FORMAT_INFO = `Wymagany format arkusza (kolumny A–F):
A: Pseudonim (wymagane)
B: Miasto (opcjonalne)
C: Godziny (14 lub 18, domyślnie 14)
D: Dostępny od (YYYY-MM-DD HH:MM, wymagane)
E: Dostępny do (YYYY-MM-DD HH:MM, wymagane)
F: Uwagi (opcjonalne)

Wiersz 1 = nagłówki (pomijane).
Import jest addytywny — nie kasuje istniejących wolontariuszy.`;

/** Phase filter options */
export type PhaseFilter = SlotType | 'all';
