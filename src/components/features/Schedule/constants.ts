import type { SlotType } from '../../../types/schedule.types';

// ---- Legacy horizontal layout (kept for compatibility) ----------------------
export const PX_PER_HOUR = 80;
export const CARD_HEIGHT = 36;
export const CARD_GAP = 4;
export const HOUR_AXIS_H = 26;
export const DAY_HEADER_H = 42;
export const FULL_DAY_COL_WIDTH = 200;

// ---- New vertical calendar layout -------------------------------------------

/** Pixels per hour on vertical axis */
export const PX_PER_HOUR_V = 60;

/** Left-side hour axis width */
export const HOUR_AXIS_WIDTH = 48;

/** Day column header height (date + type label) */
export const DAY_HEADER_HEIGHT = 52;

/** Minimum day column width */
export const DAY_COL_MIN_WIDTH = 160;

/** Maximum day column width */
export const DAY_COL_MAX_WIDTH = 280;

/** Volunteer chip height inside slot block */
export const VOLUNTEER_CHIP_H = 26;

/** Gap between volunteer chips in slot */
export const CHIP_GAP = 3;

/** Minimum slot block height (regardless of short duration) */
export const SLOT_MIN_HEIGHT = 50;

/** Padding inside slot block */
export const SLOT_PADDING = 6;

/** Slot header height (label + capacity indicator) */
export const SLOT_HEADER_H = 22;

/** Roster sidebar width */
export const ROSTER_WIDTH = 220;

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

export const AVATAR_COLORS = ['#ff9800', '#00acc1', '#66bb6a', '#ab47bc', '#42a5f5', '#ef5350', '#ffd54f'];

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
