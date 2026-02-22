import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Box, Typography, Chip, Divider, IconButton, Tooltip, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Quest, QuestStatus } from '../../types/quest.types';

// ─── Zone definitions — polygon points on 2130×1035 mtp-map.png ─────────────
// Each zone is a polygon (array of [x,y] vertices) that traces the building outline.
// Use DEBUG_MODE to click corners and capture coordinates.

type Point = [number, number]; // [x, y]

interface Zone {
  id: string;
  label: string;
  aliases: string[];
  points: Point[];
  shape?: 'polygon' | 'ellipse'; // defaults to polygon
  // Label position override (defaults to centroid)
  lx?: number; ly?: number;
}

// Helper: compute polygon centroid
function centroid(pts: Point[]): [number, number] {
  const n = pts.length;
  if (n === 0) return [0, 0];
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  return [sx / n, sy / n];
}

// Helper: polygon points → SVG points string
function toSvgPoints(pts: Point[]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

// Helper: compute bounding box for beacon placement
function bbox(pts: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

// ─── ZONES ──────────────────────────────────────────────────────────────────
// Placeholder polygons converted from old rects. Replace with real traced outlines.

const ZONES: Zone[] = [
  // ── PCC (Poznań Congress Center) — L-shaped ────────────────────────
  { id: 'congress', label: 'PCC',
    aliases: ['kongresowe', 'centrum kongresowe', 'ck', 'congress', 'poznań congress center', 'congress center', 'aula', 'centrum', 'pcc', '15', 'hala 15', 'pawilon 15'],
    points: [[388,334],[522,299],[547,358],[439,395],[441,414],[486,430],[473,452],[500,467],[528,548],[473,630],[263,552]] },

  // ── Paw 7A ───────────────────────────────────────────────────────────
  { id: 'paw7a', label: '7A',
    aliases: ['7a', 'hala 7a', 'pawilon 7a'],
    points: [[559,194],[602,375],[769,347],[716,167]] },

  // ── Paw 7 ────────────────────────────────────────────────────────────
  { id: 'paw7', label: '7',
    aliases: ['7', 'hala 7', 'pawilon 7', 'hall 7', 'h7'],
    points: [[718,163],[769,349],[930,316],[877,135]] },

  // ── Paw 8A ───────────────────────────────────────────────────────────
  { id: 'paw8a', label: '8A',
    aliases: ['8a', 'hala 8a', 'pawilon 8a'],
    points: [[610,378],[770,349],[806,470],[645,500]] },

  // ── Paw 8 ────────────────────────────────────────────────────────────
  { id: 'paw8', label: '8',
    aliases: ['8', 'hala 8', 'pawilon 8', 'hall 8', 'h8'],
    points: [[770,349],[804,470],[960,440],[927,320]] },

  // ── Paw 13 ───────────────────────────────────────────────────────────
  { id: 'paw13', label: '13',
    aliases: ['13', 'hala 13', 'pawilon 13'],
    points: [[834,514],[849,582],[930,555],[912,500]] },

  // ── Paw 14 ───────────────────────────────────────────────────────────
  { id: 'paw14', label: '14',
    aliases: ['14', 'hala 14', 'pawilon 14'],
    points: [[781,533],[808,610],[716,633],[698,547]] },

  // ── Paw 6A ───────────────────────────────────────────────────────────
  { id: 'paw6a', label: '6A',
    aliases: ['6a', 'hala 6a', 'pawilon 6a'],
    points: [[1165,318],[1187,412],[1620,329],[1587,235]] },

  // ── Paw 6 ────────────────────────────────────────────────────────────
  { id: 'paw6', label: '6',
    aliases: ['6', 'hala 6', 'pawilon 6', 'hall 6', 'h6'],
    points: [[1587,233],[1612,316],[1808,278],[1789,196]] },

  // ── Paw 5A ───────────────────────────────────────────────────────────
  { id: 'paw5a', label: '5A',
    aliases: ['5a', 'hala 5a', 'pawilon 5a'],
    points: [[937,518],[960,595],[1234,544],[1210,466]] },

  // ── Paw 5 ────────────────────────────────────────────────────────────
  { id: 'paw5', label: '5',
    aliases: ['5', 'hala 5', 'pawilon 5', 'hall 5', 'h5'],
    points: [[1210,466],[1250,595],[1805,495],[1765,361]] },

  // ── Paw 1 ────────────────────────────────────────────────────────────
  { id: 'paw1', label: '1',
    aliases: ['1', 'hala 1', 'pawilon 1', 'hall 1', 'h1'],
    points: [[134,580],[429,684],[378,767],[85,665]] },

  // ── Paw 2 ────────────────────────────────────────────────────────────
  { id: 'paw2', label: '2',
    aliases: ['2', 'hala 2', 'pawilon 2', 'hall 2', 'h2'],
    points: [[547,728],[851,832],[796,922],[506,818]] },

  // ── Paw 4 ────────────────────────────────────────────────────────────
  { id: 'paw4', label: '4',
    aliases: ['4', 'hala 4', 'pawilon 4', 'hall 4', 'h4'],
    points: [[1498,604],[1514,675],[1861,622],[1840,547]] },

  // ── Paw 10 ───────────────────────────────────────────────────────────
  { id: 'paw10', label: '10',
    aliases: ['10', 'hala 10', 'pawilon 10'],
    points: [[1260,643],[1431,611],[1451,671],[1373,685],[1363,649],[1265,667]] },

  // ── Paw 11 (Iglica) — okrąg ──────────────────────────────────────────
  { id: 'paw11', label: '11',
    aliases: ['11', 'hala 11', 'pawilon 11', 'iglica'],
    shape: 'ellipse',
    points: [[1183,837],[1222,849],[1259,845],[1291,759],[1267,743],[1224,735],[1187,732],[1151,790],[1161,819]] },

  // ── Paw 3 (irregular with notch) ──────────────────────────────────────
  { id: 'paw3', label: '3',
    aliases: ['3', 'hala 3', 'pawilon 3', 'hall 3', 'h3', '3b', 'hala 3b'],
    points: [[1457,869],[1473,932],[1445,938],[1452,965],[1608,935],[1612,955],[1852,910],[1820,802]] },

  // ── Paw 3A ──────────────────────────────────────────────────────────
  { id: 'paw3a', label: '3A',
    aliases: ['3a', 'hala 3a', 'pawilon 3a'],
    points: [[1794,701],[1860,921],[2075,878],[2005,661]] },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<QuestStatus, string> = {
  pending: '#ff9800', in_progress: '#ffd54f', completed: '#66bb6a', cancelled: '#ef5350',
};
const STATUS_LABELS: Record<QuestStatus, string> = {
  pending: 'Oczekujące', in_progress: 'W realizacji', completed: 'Zrealizowane', cancelled: 'Anulowane',
};

const matchZone = (pavilion: string): string | null => {
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

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('pl-PL'); } catch { return d; }
};

interface ZoneMetrics { total: number; pending: number; inProgress: number; completed: number; }

function getZoneMetrics(quests: Quest[]): ZoneMetrics {
  return {
    total: quests.length,
    pending: quests.filter(q => q.status === 'pending').length,
    inProgress: quests.filter(q => q.status === 'in_progress').length,
    completed: quests.filter(q => q.status === 'completed').length,
  };
}

// ─── Main component ──────────────────────────────────────────────────────────

interface QuestDispatcherMapProps { quests: Quest[]; }

const QuestDispatcherMap: React.FC<QuestDispatcherMapProps> = ({ quests }) => {
  const navigate = useNavigate();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [debugCoords, setDebugCoords] = useState<{ x: number; y: number } | null>(null);

  // ── DEBUG MODE ──────────────────────────────────────────────────────
  const DEBUG_MODE = false; // ← włącz ponownie do tracingu
  const [debugPoints, setDebugPoints] = useState<Point[]>([]);
  const [debugLabel, setDebugLabel] = useState('');
  const debugCountRef = useRef(0);

  const questsByZone = useMemo(() => {
    const map: Record<string, Quest[]> = {};
    for (const quest of quests) {
      const key = matchZone(quest.destination.pavilion) ?? '__unmatched';
      if (!map[key]) map[key] = [];
      map[key].push(quest);
    }
    return map;
  }, [quests]);

  const unmatchedQuests = questsByZone['__unmatched'] ?? [];
  const selectedZone = ZONES.find(z => z.id === selectedZoneId) ?? null;
  const selectedQuests: Quest[] = selectedZoneId ? (questsByZone[selectedZoneId] ?? []) : [];

  const handleZoneClick = useCallback((id: string) => {
    setSelectedZoneId(prev => prev === id ? null : id);
  }, []);

  // ── Zone overlay render ─────────────────────────────────────────────
  const renderZone = (zone: Zone) => {
    const zoneQuests = questsByZone[zone.id] ?? [];
    const m = getZoneMetrics(zoneQuests);
    const isSelected = selectedZoneId === zone.id;
    const hasQuests = m.total > 0;
    const isUrgent = m.pending > 0;
    const isActive = m.inProgress > 0;

    const [cx, cy] = zone.lx != null && zone.ly != null ? [zone.lx, zone.ly] : centroid(zone.points);
    const bb = bbox(zone.points);

    // Colors for overlay
    const fill = isSelected
      ? 'rgba(255,152,0,0.40)'
      : isUrgent ? 'rgba(255,152,0,0.30)'
      : isActive ? 'rgba(255,213,79,0.22)'
      : hasQuests ? 'rgba(102,187,106,0.20)'
      : 'rgba(255,255,255,0.03)';

    const stroke = isSelected
      ? '#ff9800'
      : isUrgent ? '#ff9800'
      : isActive ? '#ffd54f'
      : hasQuests ? '#66bb6a'
      : 'rgba(255,255,255,0.08)';

    const strokeW = isSelected ? 4 : hasQuests ? 3 : 1;

    const labelLines = zone.label.split('\n');

    return (
      <g
        key={zone.id}
        onClick={(e) => { e.stopPropagation(); handleZoneClick(zone.id); }}
        style={{ cursor: 'pointer' }}
        role="button"
        aria-label={`Pawilon ${zone.label}`}
      >
        {/* Shape rendering — ellipse or polygon */}
        {zone.shape === 'ellipse' ? (() => {
          const rx = (bb.maxX - bb.minX) / 2;
          const ry = (bb.maxY - bb.minY) / 2;
          const ecx = bb.minX + rx;
          const ecy = bb.minY + ry;
          return (
            <>
              {isUrgent && (
                <ellipse cx={ecx} cy={ecy} rx={rx + 6} ry={ry + 6}
                  fill="none" stroke="#ff9800" strokeWidth={10} opacity={0.2}
                  style={{ filter: 'blur(12px)' }} />
              )}
              {isSelected && !isUrgent && (
                <ellipse cx={ecx} cy={ecy} rx={rx + 4} ry={ry + 4}
                  fill="none" stroke={stroke} strokeWidth={8} opacity={0.25}
                  style={{ filter: 'blur(8px)' }} />
              )}
              <ellipse cx={ecx} cy={ecy} rx={rx} ry={ry}
                fill={fill} stroke={stroke} strokeWidth={strokeW}
                style={{ transition: 'fill 0.25s, stroke 0.25s' }} />
            </>
          );
        })() : (
          <>
            {isUrgent && (
              <polygon points={toSvgPoints(zone.points)}
                fill="none" stroke="#ff9800" strokeWidth={10} opacity={0.2}
                style={{ filter: 'blur(12px)' }} />
            )}
            {isSelected && !isUrgent && (
              <polygon points={toSvgPoints(zone.points)}
                fill="none" stroke={stroke} strokeWidth={8} opacity={0.25}
                style={{ filter: 'blur(8px)' }} />
            )}
            <polygon
              points={toSvgPoints(zone.points)}
              fill={fill} stroke={stroke} strokeWidth={strokeW}
              strokeLinejoin="round"
              style={{ transition: 'fill 0.25s, stroke 0.25s' }} />
          </>
        )}

        {/* Label */}
        {labelLines.map((line, i) => (
          <text
            key={i}
            x={cx} y={cy + i * 28 - (labelLines.length - 1) * 14 + (hasQuests ? -12 : 0)}
            textAnchor="middle" dominantBaseline="central"
            fill={hasQuests ? '#fff' : 'rgba(255,255,255,0.35)'}
            fontSize={hasQuests ? 26 : 22}
            fontFamily="'Courier New', monospace"
            fontWeight="700"
            style={{ userSelect: 'none', pointerEvents: 'none', textShadow: hasQuests ? '0 2px 8px rgba(0,0,0,0.8)' : 'none' }}
          >
            {line}
          </text>
        ))}

        {/* Quest count badge */}
        {hasQuests && (
          <text
            x={cx} y={cy + (labelLines.length > 1 ? 28 : 16)}
            textAnchor="middle" dominantBaseline="central"
            fill={isUrgent ? '#ff9800' : isActive ? '#ffd54f' : '#66bb6a'}
            fontSize={18}
            fontFamily="'Courier New', monospace"
            fontWeight="700"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {isUrgent
              ? `⚡${m.pending}${m.inProgress > 0 ? ` ▶${m.inProgress}` : ''}`
              : isActive
              ? `▶ ${m.inProgress}`
              : `✓ ${m.completed}`}
          </text>
        )}

        {/* Pulsing beacon — top-right of bounding box */}
        {m.pending > 0 && (
          <circle cx={bb.maxX - 18} cy={bb.minY + 18} r={10} fill="#ff9800">
            <animate attributeName="r" values="8;14;8" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        )}
        {m.inProgress > 0 && m.pending === 0 && (
          <circle cx={bb.maxX - 18} cy={bb.minY + 18} r={8} fill="#ffd54f">
            <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
          </circle>
        )}
      </g>
    );
  };

  // ── Sidebar ─────────────────────────────────────────────────────────
  const renderQuestItem = (quest: Quest) => (
    <Box
      key={quest.id}
      onClick={() => navigate(`/quests/${quest.id}`)}
      sx={{
        p: 1.5, borderRadius: 1, cursor: 'pointer',
        bgcolor: '#07111e', border: '1px solid #1a3548',
        borderLeft: `3px solid ${STATUS_COLORS[quest.status]}`,
        '&:hover': { bgcolor: '#0e1f31', borderColor: '#2a4a60' },
        transition: 'all 0.15s ease',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.3, fontSize: 12 }}>
          {quest.recipient}
        </Typography>
        <Chip label={STATUS_LABELS[quest.status]} size="small"
          sx={{ height: 18, fontSize: 9, flexShrink: 0, bgcolor: `${STATUS_COLORS[quest.status]}22`, color: STATUS_COLORS[quest.status], border: `1px solid ${STATUS_COLORS[quest.status]}44` }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: '#3a7a8a', fontFamily: 'monospace', display: 'block', mt: 0.25, fontSize: 10 }}>
        {quest.destination.pavilion} · {quest.destination.location} · {quest.items.length} poz.
      </Typography>
      <Typography variant="caption" sx={{ color: '#204050', fontFamily: 'monospace', fontSize: 10 }}>
        {formatDate(quest.delivery_date)}{quest.pickup_time && ` · ${quest.pickup_time}`}
      </Typography>
    </Box>
  );

  const renderSidebar = () => {
    const isUnmatched = selectedZoneId === '__unmatched';
    const showDetail = selectedZoneId && (selectedZone || isUnmatched);

    if (showDetail) {
      return (
        <>
          <Box sx={{ p: 1.5, borderBottom: '1px solid #1a3548', bgcolor: '#050d18', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                {isUnmatched ? '⚠ Nieprzypisane' : `▶ Pawilon ${selectedZone!.label.replace('\n', ' ')}`}
              </Typography>
              <Tooltip title="Zamknij">
                <IconButton size="small" onClick={() => setSelectedZoneId(null)} sx={{ color: '#3a7a8a', '&:hover': { color: '#ff9800' } }}>
                  <svg width={12} height={12} viewBox="0 0 12 12">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
                  </svg>
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
              {(['pending', 'in_progress', 'completed', 'cancelled'] as QuestStatus[]).map(status => {
                const cnt = selectedQuests.filter(q => q.status === status).length;
                if (!cnt) return null;
                return (
                  <Chip key={status} label={`${STATUS_LABELS[status]}: ${cnt}`} size="small"
                    sx={{ height: 18, fontSize: 9, bgcolor: `${STATUS_COLORS[status]}1a`, color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}33` }}
                  />
                );
              })}
            </Box>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {selectedQuests.length === 0
              ? <Typography sx={{ color: '#1a4a5a', fontFamily: 'monospace', textAlign: 'center', mt: 3, fontSize: 11 }}>Brak zamówień</Typography>
              : selectedQuests.map(renderQuestItem)}
          </Box>
        </>
      );
    }

    const activeZones = ZONES.filter(z => (questsByZone[z.id] ?? []).length > 0);
    return (
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography sx={{ color: '#1a5a6a', fontFamily: 'monospace', textAlign: 'center', fontSize: 11, mt: 2, letterSpacing: 1 }}>
          {'>>> WYBIERZ PAWILON <<<'}
        </Typography>
        <Typography sx={{ color: '#0f3040', fontFamily: 'monospace', textAlign: 'center', fontSize: 10 }}>
          kliknij budynek na mapie
        </Typography>
        <Divider sx={{ borderColor: '#1a3548', my: 1 }} />
        {activeZones.length === 0 ? (
          <Typography sx={{ color: '#1a3a4a', fontFamily: 'monospace', textAlign: 'center', fontSize: 10 }}>Brak aktywnych zamówień</Typography>
        ) : (
          <>
            <Typography sx={{ color: '#2a6a7a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>AKTYWNE PAWILONY:</Typography>
            {activeZones.map(z => {
              const m = getZoneMetrics(questsByZone[z.id] ?? []);
              return (
                <Box key={z.id} onClick={() => setSelectedZoneId(z.id)}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', p: 0.75, borderRadius: 0.5, border: '1px solid #0f2a38', '&:hover': { bgcolor: '#0d1f2e', borderColor: '#2a4a5a' }, transition: 'all 0.15s' }}
                >
                  <Typography sx={{ color: '#9ad0e0', fontFamily: 'monospace', fontSize: 11 }}>Paw. {z.label.replace('\n', ' ')}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {m.pending > 0 && <Chip label={`⚡${m.pending}`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#ff980025', color: '#ff9800' }} />}
                    {m.inProgress > 0 && <Chip label={`▶${m.inProgress}`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#ffd54f25', color: '#ffd54f' }} />}
                  </Box>
                </Box>
              );
            })}
          </>
        )}
        {unmatchedQuests.length > 0 && (
          <>
            <Divider sx={{ borderColor: '#1a3548', my: 0.5 }} />
            <Box onClick={() => setSelectedZoneId('__unmatched')}
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', p: 0.75, borderRadius: 0.5, border: '1px solid #3a2000', '&:hover': { bgcolor: '#1a0f00' } }}
            >
              <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontSize: 11 }}>⚠ Nieprzypisane</Typography>
              <Chip label={unmatchedQuests.length} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#ff980025', color: '#ff9800' }} />
            </Box>
          </>
        )}
      </Box>
    );
  };

  // ── SVG mouse helpers ───────────────────────────────────────────────
  const svgCoords = (e: React.MouseEvent<SVGSVGElement>): Point => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [Math.round(svgPt.x), Math.round(svgPt.y)];
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', gap: 2, minHeight: 520, flexDirection: 'column' }}>

      {/* ── DEBUG TOOLBAR ── */}
      {DEBUG_MODE && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, bgcolor: '#0a0a0a', border: '1px solid #333', borderRadius: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontSize: 11 }}>
            POLYGON TRACER
          </Typography>
          <Typography sx={{ color: '#666', fontFamily: 'monospace', fontSize: 10 }}>
            Kliknij rogi budynku w kolejności →
          </Typography>
          <Typography sx={{ color: '#4fc3f7', fontFamily: 'monospace', fontSize: 10 }}>
            [{debugPoints.map(([x,y]) => `[${x},${y}]`).join(', ')}]
          </Typography>
          <Typography sx={{ color: '#888', fontFamily: 'monospace', fontSize: 10 }}>
            ({debugPoints.length} pts)
          </Typography>
          <Button size="small" onClick={() => {
            if (debugPoints.length >= 3) {
              const label = debugLabel || `zone_${debugCountRef.current++}`;
              const output = `{ id: '${label}', label: '${label}',\n    aliases: ['${label}'],\n    points: [${debugPoints.map(([x,y]) => `[${x},${y}]`).join(',')}] },`;
              console.log(`\n🏗️ ZONE: ${label}\n${output}\n`);
              navigator.clipboard?.writeText(output);
            }
            setDebugPoints([]);
            setDebugLabel('');
          }} sx={{ color: '#66bb6a', fontFamily: 'monospace', fontSize: 10, minWidth: 'auto', textTransform: 'none' }}>
            {debugPoints.length >= 3 ? '✓ Zapisz & Kopiuj' : 'Reset'}
          </Button>
          <Button size="small" onClick={() => setDebugPoints(prev => prev.slice(0, -1))}
            sx={{ color: '#ef5350', fontFamily: 'monospace', fontSize: 10, minWidth: 'auto', textTransform: 'none' }}
          >
            Cofnij
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 480 }}>
        {/* ── MAP ── */}
        <Box sx={{
          flex: 1, bgcolor: '#040a14', borderRadius: 2,
          border: '1px solid #152535', overflow: 'hidden', position: 'relative',
        }}>
          <svg
            viewBox="0 0 2130 1035"
            style={{ width: '100%', height: '100%', display: 'block' }}
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            onMouseMove={DEBUG_MODE ? (e) => {
              const [x, y] = svgCoords(e);
              setDebugCoords({ x, y });
            } : undefined}
            onClick={DEBUG_MODE ? (e) => {
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

            {/* Background image with dark tactical filter */}
            <image
              href="/mtp-map.png"
              x="0" y="0" width="2130" height="1035"
              filter="url(#dispatch-dark)"
              preserveAspectRatio="xMidYMid slice"
            />

            {/* Extra darkness overlay */}
            <rect width="2130" height="1035" fill="rgba(0,5,15,0.3)" />

            {/* Interactive building zones */}
            {ZONES.map(renderZone)}

            {/* Unmatched indicator */}
            {unmatchedQuests.length > 0 && (
              <g onClick={(e) => { e.stopPropagation(); setSelectedZoneId('__unmatched'); }} style={{ cursor: 'pointer' }}>
                <rect x="80" y="940" width="300" height="60" fill="rgba(80,30,0,0.4)" stroke="#ff980066" strokeWidth={2} rx={6} />
                <text x="230" y="964" textAnchor="middle" fill="#ff9800" fontSize={18} fontFamily="monospace">⚠ NIEPRZYPISANE</text>
                <text x="230" y="988" textAnchor="middle" fill="#ffa726" fontSize={16} fontFamily="monospace" fontWeight="bold">{unmatchedQuests.length} zamówień</text>
              </g>
            )}

            {/* Watermark */}
            <text x="1065" y="1020" textAnchor="middle" fill="rgba(20,60,90,0.5)" fontSize={18} fontFamily="monospace" letterSpacing={6}>
              MTP POZNAŃ · PYRKON DISPATCH
            </text>

            {/* ── DEBUG overlays ── */}
            {DEBUG_MODE && (
              <g style={{ pointerEvents: 'none' }}>
                {/* Crosshair */}
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

                {/* Traced polygon preview */}
                {debugPoints.length >= 2 && (
                  <polyline
                    points={toSvgPoints(debugPoints)}
                    fill="none" stroke="#4fc3f7" strokeWidth={3} strokeDasharray="6 3"
                  />
                )}
                {debugPoints.length >= 3 && (
                  <polygon
                    points={toSvgPoints(debugPoints)}
                    fill="rgba(79,195,247,0.12)" stroke="#4fc3f7" strokeWidth={2}
                  />
                )}
                {/* Vertex dots */}
                {debugPoints.map(([px, py], i) => (
                  <g key={i}>
                    <circle cx={px} cy={py} r={6} fill="#4fc3f7" stroke="#fff" strokeWidth={2} />
                    <text x={px + 10} y={py - 8} fill="#4fc3f7" fontSize={14} fontFamily="monospace" fontWeight="bold">
                      {i + 1}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Legend */}
            <g transform="translate(700, 950)">
              <circle cx={0} cy={10} r={8} fill="#ff9800">
                <animate attributeName="r" values="6;10;6" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <text x={16} y={15} fill="rgba(60,130,160,0.7)" fontSize={14} fontFamily="monospace">OCZEKUJĄCE</text>
              <circle cx={190} cy={10} r={8} fill="#ffd54f" />
              <text x={206} y={15} fill="rgba(60,130,160,0.7)" fontSize={14} fontFamily="monospace">W REALIZACJI</text>
              <circle cx={410} cy={10} r={8} fill="#66bb6a" />
              <text x={426} y={15} fill="rgba(60,130,160,0.7)" fontSize={14} fontFamily="monospace">ZREALIZOWANE</text>
            </g>
          </svg>
        </Box>

        {/* ── SIDEBAR ── */}
        <Box sx={{
          width: 290, flexShrink: 0, bgcolor: '#060e1a', borderRadius: 2,
          border: '1px solid #152535', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)',
        }}>
          <Box sx={{ px: 2, py: 1, bgcolor: '#050d18', borderBottom: '1px solid #1a3548', flexShrink: 0 }}>
            <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
              DISPATCH · CENTRUM DOWODZENIA
            </Typography>
          </Box>
          {renderSidebar()}
        </Box>
      </Box>
    </Box>
  );
};

export default QuestDispatcherMap;
