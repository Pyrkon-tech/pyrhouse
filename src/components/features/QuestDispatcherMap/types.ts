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
}

// Dispatch Volunteer System

export type VolunteerStatus = 'available' | 'on_mission' | 'offline';

export interface Volunteer {
  id: number;
  username: string;
  discord_username: string | null;
  avatar_url: string | null;
  fullname: string | null;
  status: VolunteerStatus;
  current_mission?: string;
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
