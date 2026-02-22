import type { Point } from '../types';

export function centroid(pts: Point[]): [number, number] {
  const n = pts.length;
  if (n === 0) return [0, 0];
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  return [sx / n, sy / n];
}

export function toSvgPoints(pts: Point[]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

export function bbox(pts: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

export function svgCoords(e: React.MouseEvent<SVGSVGElement>): Point {
  const svg = e.currentTarget;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  return [Math.round(svgPt.x), Math.round(svgPt.y)];
}
