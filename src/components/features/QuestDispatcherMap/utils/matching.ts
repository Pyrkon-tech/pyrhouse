import type { Quest } from '../../../../types/quest.types';
import type { ZoneMetrics } from '../types';
import { ZONES } from '../constants/zones';

export const matchZone = (pavilion: string): string | null => {
  const p = pavilion.toLowerCase().trim();
  for (const zone of ZONES) {
    if (zone.aliases.some(a => a === p)) return zone.id;
  }
  for (const zone of ZONES) {
    if (zone.aliases.some(a => p.includes(a) || a.includes(p))) return zone.id;
  }
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

export function groupQuestsByZone(quests: Quest[]): Record<string, Quest[]> {
  const map: Record<string, Quest[]> = {};
  for (const quest of quests) {
    const key = matchZone(quest.destination.pavilion) ?? '__unmatched';
    if (!map[key]) map[key] = [];
    map[key].push(quest);
  }
  return map;
}
