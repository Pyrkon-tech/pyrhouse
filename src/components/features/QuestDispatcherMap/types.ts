export type Point = [number, number];

export interface Zone {
  id: string;
  label: string;
  aliases: string[];
  points: Point[];
  shape?: 'polygon' | 'ellipse';
  lx?: number; ly?: number;
}

export interface ZoneMetrics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  urgent: number;
  /** Pending quests within 24h window (or same-day if no time specified) — show exclamation */
  alertVisible: number;
  /** Pending quests within 2h window (or same-day if no time specified) — pulse exclamation */
  alertPulsing: number;
}

// Dispatch Volunteer System

/** API zwraca tylko 'available' | 'on_mission'. 'offline' jest używany wyłącznie w mockach / stanie klienta. */
export type VolunteerStatus = 'available' | 'on_mission' | 'offline';

export interface Volunteer {
  id: number;
  username: string;
  discord_username: string | null;
  avatar_url: string | null;
  fullname: string | null;
  status: VolunteerStatus;
  current_mission: string | null;
  /** True when the volunteer has no linked system account (user_id: null in on-duty roster) */
  is_unlinked?: boolean;
}

export interface DispatchAssignment {
  quest_id: string;
  zone_id: string;
  volunteer_ids: number[];
}

export interface DispatchModalState {
  open: boolean;
  quest_id: string | null;
  zone_id: string | null;
}
