import type { Quest } from '../../../../types/quest.types';
import type { ServiceDeskRequest } from '../../../../types/servicedesk.types';
import type { ZoneMetrics } from '../types';
import { ZONES } from '../constants/zones';

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

function isSameDay(dateStr: string, now: number): boolean {
  const d = new Date(dateStr);
  const today = new Date(now);
  return d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate();
}

export function getZoneMetrics(quests: Quest[], urgencyHours = 8, simulatedTime?: Date, sdRequests: ServiceDeskRequest[] = []): ZoneMetrics {
  const now = simulatedTime ? simulatedTime.getTime() : Date.now();
  const H = 3_600_000;
  return {
    total: quests.length,
    pending: quests.filter(q => q.status === 'pending').length,
    inProgress: quests.filter(q => q.status === 'in_progress').length,
    completed: quests.filter(q => q.status === 'completed').length,
    urgent: quests.filter(q =>
      q.status === 'pending' &&
      new Date(q.delivery_date).getTime() - now <= urgencyHours * H
    ).length,
    alertVisible: quests.filter(q => {
      if (q.status !== 'pending') return false;
      const d = q.delivery_date;
      return hasTimeComponent(d)
        ? new Date(d).getTime() - now <= 24 * H
        : isSameDay(d, now);
    }).length,
    alertPulsing: quests.filter(q => {
      if (q.status !== 'pending') return false;
      const d = q.delivery_date;
      return hasTimeComponent(d)
        ? new Date(d).getTime() - now <= 2 * H
        : isSameDay(d, now);
    }).length,
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
