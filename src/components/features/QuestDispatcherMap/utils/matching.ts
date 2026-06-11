import type { Quest } from '../../../../types/quest.types';
import type { ServiceDeskRequest } from '../../../../types/servicedesk.types';
import type { ZoneMetrics } from '../types';
import { ZONES } from '../constants/zones';
import { ALERT_HOURS, DEFAULT_URGENCY_HOURS, PULSE_HOURS } from '../constants/thresholds';

export const matchZone = (pavilion: string): string | null => {
  const p = pavilion.toLowerCase().trim();
  // Step 1: exact match (case-insensitive)
  for (const zone of ZONES) {
    if (zone.aliases.some(a => a.toLowerCase() === p)) return zone.id;
  }
  // Step 2: substring fuzzy — only for aliases with length >= 3 to prevent
  // short codes like "6" from matching "6b", "6a", etc.
  for (const zone of ZONES) {
    if (zone.aliases.some(a => { const al = a.toLowerCase(); return al.length >= 3 && (p.includes(al) || al.includes(p)); })) return zone.id;
  }
  // Step 3: extract numeric pavilion code from text (e.g. "Pawilon 5" → "5", "5B" → "5b")
  const numMatch = p.match(/\b(\d+[a-z]?)\b/);
  if (numMatch) {
    const num = numMatch[1];
    for (const zone of ZONES) {
      if (zone.aliases.some(a => a.toLowerCase() === num)) return zone.id;
    }
  }
  return null;
};

export const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('pl-PL'); } catch { return d; }
};

function hasTimeComponent(dateStr: string): boolean {
  return dateStr.length > 10 && dateStr.includes('T');
}

const H = 3_600_000;

/**
 * Effective deadline timestamp for a delivery date:
 * - date with time → that exact moment
 * - date-only → end of that day in LOCAL time (23:59:59.999); parsing the raw
 *   string would give midnight UTC, which shifts the deadline to the previous evening
 *
 * All urgency metrics derive from this single timeline, so date-only quests get
 * the same calm → urgent → pulse → overdue escalation as timed ones.
 */
export function getEffectiveDeadline(deliveryDate: string): number {
  if (hasTimeComponent(deliveryDate)) return new Date(deliveryDate).getTime();
  const [y, m, d] = deliveryDate.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** Per-quest urgency level — same thresholds as the map zone metrics */
export type QuestUrgency = 'none' | 'soon' | 'urgent' | 'overdue';

export function getQuestUrgency(quest: Quest, urgencyHours = DEFAULT_URGENCY_HOURS, now = Date.now()): QuestUrgency {
  if (quest.status !== 'pending') return 'none';
  const diff = getEffectiveDeadline(quest.delivery_date) - now;
  if (diff < 0) return 'overdue';
  if (diff <= urgencyHours * H) return 'urgent';
  if (diff <= ALERT_HOURS * H) return 'soon';
  return 'none';
}

export function getZoneMetrics(quests: Quest[], urgencyHours = DEFAULT_URGENCY_HOURS, now = Date.now(), sdRequests: ServiceDeskRequest[] = []): ZoneMetrics {
  // Time remaining to effective deadline for each pending quest (negative = overdue)
  const pendingDiffs = quests
    .filter(q => q.status === 'pending')
    .map(q => getEffectiveDeadline(q.delivery_date) - now);
  return {
    total: quests.length,
    pending: pendingDiffs.length,
    inProgress: quests.filter(q => q.status === 'in_progress').length,
    completed: quests.filter(q => q.status === 'completed').length,
    urgent: pendingDiffs.filter(diff => diff <= urgencyHours * H).length,
    alertVisible: pendingDiffs.filter(diff => diff <= ALERT_HOURS * H).length,
    alertPulsing: pendingDiffs.filter(diff => diff <= PULSE_HOURS * H).length,
    overdue: pendingDiffs.filter(diff => diff < 0).length,
    sdNew: sdRequests.filter(r => r.status === 'new').length,
  };
}

/**
 * Grupuje Service Desk requesty według stref na mapie.
 * Używa matchZone(req.location) — client-side fuzzy match.
 */
export function groupServiceDeskByZone(
  requests: ServiceDeskRequest[],
): Record<string, ServiceDeskRequest[]> {
  const result: Record<string, ServiceDeskRequest[]> = {};
  for (const req of requests) {
    const zoneId = req.location ? matchZone(req.location) : null;
    const key = zoneId ?? 'other';
    (result[key] ??= []).push(req);
  }
  return result;
}

/**
 * Grupuje questy według stref na mapie.
 *
 * Strategia matchowania (od najbardziej do najmniej wiarygodnej):
 * 1. Jeśli quest.location_resolved i locationPavilionMap zawiera location_id:
 *    → matchZone(canonicalPavilion) — znormalizowany pawilon z bazy danych
 * 2. Fallback: matchZone(destination.pavilion) — surowy input z formularza
 * 3. Brak dopasowania → 'other'
 *
 * @param locationPavilionMap Map<location_id, pavilion> zbudowana z GET /locations
 */
export function groupQuestsByZone(
  quests: Quest[],
  locationPavilionMap?: Map<number, string>,
): Record<string, Quest[]> {
  const result: Record<string, Quest[]> = {};

  for (const quest of quests) {
    let zoneId: string | null = null;

    // Primary: resolved location → canonical pavilion from DB
    if (quest.location_resolved && quest.location_id != null && locationPavilionMap) {
      const canonicalPavilion = locationPavilionMap.get(quest.location_id);
      if (canonicalPavilion) {
        zoneId = matchZone(canonicalPavilion);
      }
    }

    // Fallback: text-based matching on raw form input
    if (!zoneId) {
      zoneId = matchZone(quest.destination.pavilion);
    }

    const key = zoneId ?? 'other';
    if (!result[key]) result[key] = [];
    result[key].push(quest);
  }

  return result;
}
