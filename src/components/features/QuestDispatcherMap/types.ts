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
}
