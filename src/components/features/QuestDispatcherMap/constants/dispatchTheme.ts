import type { QuestStatus } from '../../../../types/quest.types';

/**
 * Dispatch design tokens — "paper on dark" style inspired by the Dispatch video game:
 * dark command-center shell (map, panel frames) + cream paper content cards
 * with solid colored status bars and near-black text for maximum readability.
 *
 * Content (names, titles, locations) uses the default sans font; monospace is
 * reserved for dates, counters and section labels to keep the terminal vibe.
 */
export const dt = {
  /** Dark command-center shell — panel frames, map background */
  shell: {
    bg: '#060e1a',
    panel: '#050d18',
    raised: '#07111e',
    border: '#152535',
    borderLight: '#1a3548',
    /** Section headers on dark (DISPATCH · CENTRUM DOWODZENIA) */
    header: '#5a93a8',
    text: '#c8e8f5',
    textMuted: '#6fa8bd',
  },
  /** Cream paper cards and modals — game-style content panels */
  paper: {
    bg: '#f0e7d3',
    /** Slightly darker paper for nested boxes (items list, comments) */
    bgAlt: '#e5dac1',
    bgInput: '#faf4e6',
    border: '#c7b896',
    divider: '#d8ccae',
    text: '#251f12',
    textSecondary: '#5d5341',
    textMuted: '#857a60',
    shadow: '0 4px 16px rgba(0,0,0,0.55)',
    shadowHover: '0 6px 20px rgba(0,0,0,0.7)',
  },
  /** Primary action colors */
  action: {
    orange: '#ff9800',
    orangeHover: '#ffa726',
    onOrange: '#241500',
    teal: '#00acc1',
    tealHover: '#26c6da',
    onTeal: '#00262b',
    green: '#66bb6a',
    greenHover: '#81c784',
    onGreen: '#11260f',
  },
};

/** Solid status bars on paper cards — game-style colored card headers */
export const STATUS_BAR: Record<QuestStatus | 'overdue', { bg: string; text: string; label: string }> = {
  pending: { bg: '#ef9000', text: '#2b1a00', label: 'OCZEKUJĄCE' },
  in_progress: { bg: '#0097ab', text: '#002b30', label: 'W REALIZACJI' },
  completed: { bg: '#5da861', text: '#11260f', label: 'ZREALIZOWANE' },
  cancelled: { bg: '#8d9aa3', text: '#1d2429', label: 'ANULOWANE' },
  overdue: { bg: '#c62828', text: '#ffffff', label: 'PO TERMINIE' },
};

/** Urgency text accents readable on cream paper (darker than the neon map variants) */
export const URGENCY_ON_PAPER: Record<'overdue' | 'urgent', string> = {
  overdue: '#b71c1c',
  urgent: '#a85e00',
};
