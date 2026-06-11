import React, { useState, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { Quest } from '../../../../types/quest.types';
import type { ServiceDeskRequest } from '../../../../types/servicedesk.types';
import type { Point } from '../types';
import { ZONES } from '../constants/zones';
import { DEFAULT_URGENCY_HOURS } from '../constants/thresholds';
import { getZoneMetrics } from '../utils/matching';
import { svgCoords, toSvgPoints } from '../utils/geometry';
import ZoneOverlay from './ZoneOverlay';

interface MapCanvasProps {
  questsByZone: Record<string, Quest[]>;
  sdByZone?: Record<string, ServiceDeskRequest[]>;
  selectedZoneId: string | null;
  onZoneSelect: (id: string | null) => void;
  onZoneDispatch?: (zoneId: string) => void;
  onZoneSdClick?: (zoneId: string) => void;
  debugMode?: boolean;
  urgencyHours?: number;
  /** Current timestamp (ms) — real or simulated; drives all urgency thresholds */
  now?: number;
  children?: React.ReactNode;
}

const MapCanvas: React.FC<MapCanvasProps> = ({ questsByZone, sdByZone = {}, selectedZoneId, onZoneSelect, onZoneDispatch, onZoneSdClick, debugMode = false, urgencyHours = DEFAULT_URGENCY_HOURS, now = Date.now(), children }) => {

  // Debug state
  const [debugCoords, setDebugCoords] = useState<{ x: number; y: number } | null>(null);
  const [debugPoints, setDebugPoints] = useState<Point[]>([]);
  const debugCountRef = useRef(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: debugMode ? 1 : 0 }}>
      {/* Debug toolbar */}
      {debugMode && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, bgcolor: '#0a0a0a', border: '1px solid #333', borderRadius: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontSize: 11 }}>POLYGON TRACER</Typography>
          <Typography sx={{ color: '#666', fontFamily: 'monospace', fontSize: 10 }}>Kliknij rogi budynku →</Typography>
          <Typography sx={{ color: '#4fc3f7', fontFamily: 'monospace', fontSize: 10 }}>
            [{debugPoints.map(([x,y]) => `[${x},${y}]`).join(', ')}]
          </Typography>
          <Typography sx={{ color: '#888', fontFamily: 'monospace', fontSize: 10 }}>({debugPoints.length} pts)</Typography>
          <Button size="small" onClick={() => {
            if (debugPoints.length >= 3) {
              const label = `zone_${debugCountRef.current++}`;
              const output = `{ id: '${label}', label: '${label}',\n    aliases: ['${label}'],\n    points: [${debugPoints.map(([x,y]) => `[${x},${y}]`).join(',')}] },`;
              console.log(`\n🏗️ ZONE: ${label}\n${output}\n`);
              navigator.clipboard?.writeText(output);
            }
            setDebugPoints([]);
          }} sx={{ color: '#66bb6a', fontFamily: 'monospace', fontSize: 10, minWidth: 'auto', textTransform: 'none' }}>
            {debugPoints.length >= 3 ? '✓ Zapisz & Kopiuj' : 'Reset'}
          </Button>
          <Button size="small" onClick={() => setDebugPoints(prev => prev.slice(0, -1))}
            sx={{ color: '#ef5350', fontFamily: 'monospace', fontSize: 10, minWidth: 'auto', textTransform: 'none' }}>
            Cofnij
          </Button>
        </Box>
      )}

      {/* SVG Map — sizes by width via aspectRatio, no flex stretching */}
      <Box sx={{
        width: '100%',
        aspectRatio: '2130 / 1035',
        bgcolor: '#040a14', borderRadius: 2,
        border: '1px solid #152535', overflow: 'hidden', position: 'relative',
      }}
      >
        <svg
          viewBox="0 0 2130 1035"
          style={{ width: '100%', height: '100%', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          onMouseMove={debugMode ? (e) => {
            const [x, y] = svgCoords(e);
            setDebugCoords({ x, y });
          } : undefined}
          onClick={debugMode ? (e) => {
            const [x, y] = svgCoords(e);
            console.log(`📍 x: ${x}, y: ${y}`);
            setDebugPoints(prev => [...prev, [x, y]]);
          } : undefined}
        >
          <defs>
            <filter id="dispatch-dark">
              <feColorMatrix type="matrix" values="
                0.04 0.01 0.01 0 0.01
                0.01 0.06 0.02 0 0.03
                0.01 0.02 0.10 0 0.05
                0    0    0    1 0
              "/>
            </filter>
          </defs>

          <image
            href="/mtp-map.webp"
            x="0" y="0" width="2130" height="1035"
            filter="url(#dispatch-dark)"
            preserveAspectRatio="xMidYMid slice"
          />

          <rect width="2130" height="1035" fill="rgba(0,5,15,0.3)" />

          {/* Building zones */}
          {ZONES.map(zone => (
            <ZoneOverlay
              key={zone.id}
              zone={zone}
              metrics={getZoneMetrics(questsByZone[zone.id] ?? [], urgencyHours, now, sdByZone[zone.id] ?? [])}
              isSelected={selectedZoneId === zone.id}
              onSelect={(id) => onZoneSelect(selectedZoneId === id ? null : id)}
              onDispatch={onZoneDispatch}
              onSdClick={onZoneSdClick}
            />
          ))}


          {/* Watermark */}
          <text x="1065" y="1020" textAnchor="middle" fill="rgba(20,60,90,0.5)" fontSize={18} fontFamily="monospace" letterSpacing={6}>
            MTP POZNAŃ · PYRKON DISPATCH
          </text>

          {/* Debug overlays */}
          {debugMode && (
            <g style={{ pointerEvents: 'none' }}>
              {debugCoords && (
                <>
                  <line x1={debugCoords.x} y1={0} x2={debugCoords.x} y2={1035} stroke="#ff980066" strokeWidth={1} strokeDasharray="8 4" />
                  <line x1={0} y1={debugCoords.y} x2={2130} y2={debugCoords.y} stroke="#ff980066" strokeWidth={1} strokeDasharray="8 4" />
                  <rect x={debugCoords.x + 12} y={debugCoords.y - 28} width={160} height={26} fill="rgba(0,0,0,0.85)" rx={3} />
                  <text x={debugCoords.x + 18} y={debugCoords.y - 10} fill="#ff9800" fontSize={18} fontFamily="monospace" fontWeight="bold">
                    x: {debugCoords.x}  y: {debugCoords.y}
                  </text>
                </>
              )}
              {debugPoints.length >= 2 && (
                <polyline points={toSvgPoints(debugPoints)} fill="none" stroke="#4fc3f7" strokeWidth={3} strokeDasharray="6 3" />
              )}
              {debugPoints.length >= 3 && (
                <polygon points={toSvgPoints(debugPoints)} fill="rgba(79,195,247,0.12)" stroke="#4fc3f7" strokeWidth={2} />
              )}
              {debugPoints.map(([px, py], i) => (
                <g key={i}>
                  <circle cx={px} cy={py} r={6} fill="#4fc3f7" stroke="#fff" strokeWidth={2} />
                  <text x={px + 10} y={py - 8} fill="#4fc3f7" fontSize={14} fontFamily="monospace" fontWeight="bold">{i + 1}</text>
                </g>
              ))}
            </g>
          )}

          {/* Legend */}
          <g transform="translate(16, 16)">
            <circle cx={8} cy={8}  r={7} fill="#ff9800">
              <animate attributeName="r" values="5;9;5" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <text x={22} y={13} fill="rgba(60,130,160,0.7)" fontSize={13} fontFamily="monospace">OCZEKUJĄCE</text>
            <circle cx={8} cy={30} r={7} fill="#00acc1" />
            <text x={22} y={35} fill="rgba(60,130,160,0.7)" fontSize={13} fontFamily="monospace">W REALIZACJI</text>
            <circle cx={8} cy={52} r={7} fill="#66bb6a" />
            <text x={22} y={57} fill="rgba(60,130,160,0.7)" fontSize={13} fontFamily="monospace">ZREALIZOWANE</text>
          </g>
        </svg>
        {children}
      </Box>
    </Box>
  );
};

export default MapCanvas;
