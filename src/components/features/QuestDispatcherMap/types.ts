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
  /** Pending quests within ALERT_HOURS of effective deadline — show exclamation */
  alertVisible: number;
  /** Pending quests within PULSE_HOURS of effective deadline — pulse exclamation */
  alertPulsing: number;
  /** Pending quests past their effective deadline — exclamation turns red */
  overdue: number;
  /** SD tickets with status 'new' in this zone */
  sdNew: number;
}

// Dispatch Volunteer System

/** API zwraca tylko 'available' | 'on_mission'. 'offline' jest używany wyłącznie w mockach / stanie klienta. */
export type VolunteerStatus = 'available' | 'on_mission' | 'offline';

export interface Volunteer {
  id: number;
  /** System user ID — used to pre-fill transfer participants. Null for unlinked volunteers. */
  user_id: number | null;
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
  /** System user IDs (from users table) — used to pre-fill TransferFormCore participants */
  user_ids: number[];
}

export interface DispatchModalState {
  open: boolean;
  quest_id: string | null;
  zone_id: string | null;
}
