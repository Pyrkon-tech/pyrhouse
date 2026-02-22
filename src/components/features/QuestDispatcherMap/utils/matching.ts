import type { Quest } from '../../../../types/quest.types';
import type { ZoneMetrics } from '../types';
import { ZONES } from '../constants/zones';

export const matchZone = (pavilion: string): string | null => {
  const p = pavilion.toLowerCase().trim();
  // Step 1: exact match
  for (const zone of ZONES) {
    if (zone.aliases.some(a => a === p)) return zone.id;
  }
  // Step 2: substring fuzzy — only for aliases with length >= 3 to prevent
  // short codes like "6" from matching "6b", "6a", etc.
  for (const zone of ZONES) {
    if (zone.aliases.some(a => a.length >= 3 && (p.includes(a) || a.includes(p)))) return zone.id;
  }
  // Step 3: extract numeric pavilion code from text (e.g. "Pawilon 5" → "5", "5B" → "5b")
  const numMatch = p.match(/\b(\d+[a-z]?)\b/);
  if (numMatch) {
    const num = numMatch[1];
    for (const zone of ZONES) {
      if (zone.aliases.includes(num)) return zone.id;
    }
  }
  return null;
};

export const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('pl-PL'); } catch { return d; }
};

export function getZoneMetrics(quests: Quest[]): ZoneMetrics {
  return {
    total: quests.length,
    pending: quests.filter(q => q.status === 'pending').length,
    inProgress: quests.filter(q => q.status === 'in_progress').length,
    completed: quests.filter(q => q.status === 'completed').length,
  };
}

/**
 * Grupuje questy według stref na mapie.
 *
 * Strategia matchowania (od najbardziej do najmniej wiarygodnej):
 * 1. Jeśli quest.location_resolved i locationPavilionMap zawiera location_id:
 *    → matchZone(canonicalPavilion) — znormalizowany pawilon z bazy danych
 * 2. Fallback: matchZone(destination.pavilion) — surowy input z formularza
 * 3. Brak dopasowania → '__unmatched'
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

    const key = zoneId ?? '__unmatched';
    if (!result[key]) result[key] = [];
    result[key].push(quest);
  }

  return result;
}
