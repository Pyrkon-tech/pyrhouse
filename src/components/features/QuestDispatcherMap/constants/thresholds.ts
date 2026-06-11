/**
 * Time thresholds (hours before effective deadline) driving the dispatch map
 * urgency escalation: exclamation (calm) → orange zone → aggressive pulse → overdue (red).
 *
 * The orange-zone threshold is user-configurable on DispatchPage (URGENCY_OPTIONS);
 * DEFAULT_URGENCY_HOURS is only the fallback.
 */
export const ALERT_HOURS = 24;
export const DEFAULT_URGENCY_HOURS = 8;
export const PULSE_HOURS = 2;
