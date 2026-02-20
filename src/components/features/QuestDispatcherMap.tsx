import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Chip, Divider, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Quest, QuestStatus } from '../../types/quest.types';

// ─── Zone definition ────────────────────────────────────────────────────────

interface Zone {
  id: string;
  label: string;
  shortLabel?: string;
  aliases: string[];
  x: number;
  y: number;
  w: number;
  h: number;
}

// MTP Poznań — stylized tactical floor-plan
// Viewport: 760 × 420
const ZONES: Zone[] = [
  // ── North row ──────────────────────────────────────────────────────────
  {
    id: 'hala7', label: 'Hala 7', shortLabel: 'H7',
    aliases: ['hala 7', 'hall 7', 'pawilon 7', 'h7', '7'],
    x: 30, y: 38, w: 107, h: 92,
  },
  {
    id: 'hala6', label: 'Hala 6', shortLabel: 'H6',
    aliases: ['hala 6', 'hall 6', 'pawilon 6', 'h6', '6'],
    x: 145, y: 38, w: 107, h: 92,
  },
  {
    id: 'hala5', label: 'Hala 5', shortLabel: 'H5',
    aliases: ['hala 5', 'hall 5', 'pawilon 5', 'h5', '5'],
    x: 260, y: 38, w: 107, h: 92,
  },
  {
    id: 'hala4', label: 'Hala 4', shortLabel: 'H4',
    aliases: ['hala 4', 'hall 4', 'pawilon 4', 'h4', '4'],
    x: 448, y: 38, w: 107, h: 92,
  },
  {
    id: 'hala3', label: 'Hala 3', shortLabel: 'H3',
    aliases: ['hala 3', 'hall 3', 'pawilon 3', 'h3', '3', '3a', '3b', 'hala 3a', 'hala 3b'],
    x: 563, y: 38, w: 167, h: 92,
  },

  // ── Middle ─────────────────────────────────────────────────────────────
  {
    id: 'hala8', label: 'Hala 8', shortLabel: 'H8',
    aliases: ['hala 8', 'hall 8', 'pawilon 8', 'h8', '8'],
    x: 30, y: 155, w: 107, h: 100,
  },
  {
    id: 'arena', label: 'Arena', shortLabel: 'ARENA',
    aliases: ['arena', 'hala arena', 'arena mtp', 'główna scena', 'main stage'],
    x: 358, y: 148, w: 218, h: 110,
  },

  // ── South row ──────────────────────────────────────────────────────────
  {
    id: 'kongresowe', label: 'Kongresowe', shortLabel: 'KON',
    aliases: ['kongresowe', 'centrum kongresowe', 'ck', 'congress', 'aula', 'centrum'],
    x: 30, y: 282, w: 205, h: 90,
  },
  {
    id: 'biuro', label: 'Biuro / Inne', shortLabel: 'BIU',
    aliases: ['biuro', 'office', 'biuro programowe', 'biuro wolontariatu', 'inne', 'magazyn', 'zaplecze'],
    x: 248, y: 282, w: 162, h: 90,
  },
  {
    id: 'hala2', label: 'Hala 2', shortLabel: 'H2',
    aliases: ['hala 2', 'hall 2', 'pawilon 2', 'h2', '2'],
    x: 448, y: 282, w: 107, h: 90,
  },
  {
    id: 'hala1', label: 'Hala 1', shortLabel: 'H1',
    aliases: ['hala 1', 'hall 1', 'pawilon 1', 'h1', '1'],
    x: 563, y: 282, w: 167, h: 90,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<QuestStatus, string> = {
  pending:     '#ff9800',
  in_progress: '#ffd54f',
  completed:   '#66bb6a',
  cancelled:   '#ef5350',
};

const STATUS_LABELS: Record<QuestStatus, string> = {
  pending:     'Oczekujące',
  in_progress: 'W realizacji',
  completed:   'Zrealizowane',
  cancelled:   'Anulowane',
};

const matchZone = (pavilion: string): string | null => {
  const p = pavilion.toLowerCase().trim();
  // Exact alias match first
  for (const zone of ZONES) {
    if (zone.aliases.some(a => a === p)) return zone.id;
  }
  // Partial match
  for (const zone of ZONES) {
    if (zone.aliases.some(a => p.includes(a) || a.includes(p))) return zone.id;
  }
  // Number-only fallback: "5" → h5
  const numMatch = p.match(/\b(\d+)\b/);
  if (numMatch) {
    const num = numMatch[1];
    for (const zone of ZONES) {
      if (zone.aliases.includes(`h${num}`) || zone.aliases.includes(`hala ${num}`)) return zone.id;
    }
  }
  return null;
};

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('pl-PL'); } catch { return d; }
};

// ─── SVG helpers ─────────────────────────────────────────────────────────────

interface ZoneMetrics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

function getZoneMetrics(quests: Quest[]): ZoneMetrics {
  return {
    total:      quests.length,
    pending:    quests.filter(q => q.status === 'pending').length,
    inProgress: quests.filter(q => q.status === 'in_progress').length,
    completed:  quests.filter(q => q.status === 'completed').length,
  };
}

// Corner accent lines for tactical look
function CornerAccents({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const s = 10;
  const sw = 1.5;
  return (
    <>
      <line x1={x} y1={y + s} x2={x} y2={y} stroke={color} strokeWidth={sw} />
      <line x1={x} y1={y} x2={x + s} y2={y} stroke={color} strokeWidth={sw} />
      <line x1={x + w - s} y1={y} x2={x + w} y2={y} stroke={color} strokeWidth={sw} />
      <line x1={x + w} y1={y} x2={x + w} y2={y + s} stroke={color} strokeWidth={sw} />
      <line x1={x} y1={y + h - s} x2={x} y2={y + h} stroke={color} strokeWidth={sw} />
      <line x1={x} y1={y + h} x2={x + s} y2={y + h} stroke={color} strokeWidth={sw} />
      <line x1={x + w - s} y1={y + h} x2={x + w} y2={y + h} stroke={color} strokeWidth={sw} />
      <line x1={x + w} y1={y + h} x2={x + w} y2={y + h - s} stroke={color} strokeWidth={sw} />
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface QuestDispatcherMapProps {
  quests: Quest[];
}

const QuestDispatcherMap: React.FC<QuestDispatcherMapProps> = ({ quests }) => {
  const navigate = useNavigate();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Group quests by zone
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
  const selectedQuests: Quest[] =
    selectedZoneId ? (questsByZone[selectedZoneId] ?? []) : [];

  const handleZoneClick = useCallback((id: string) => {
    setSelectedZoneId(prev => prev === id ? null : id);
  }, []);

  // ── SVG Zone render ────────────────────────────────────────────────────
  const renderZone = (zone: Zone) => {
    const zoneQuests = questsByZone[zone.id] ?? [];
    const m = getZoneMetrics(zoneQuests);
    const isSelected = selectedZoneId === zone.id;
    const hasQuests = m.total > 0;
    const isUrgent = m.pending > 0;
    const isActive = m.inProgress > 0;

    const accentColor = isUrgent ? '#ff9800' : isActive ? '#ffd54f' : hasQuests ? '#66bb6a' : '#1c3e52';
    const fillColor = isSelected
      ? 'rgba(255,152,0,0.14)'
      : isUrgent ? 'rgba(255,152,0,0.07)'
      : isActive ? 'rgba(255,213,79,0.05)'
      : hasQuests ? 'rgba(102,187,106,0.05)'
      : 'rgba(8,20,34,0.95)';

    const { x, y, w, h } = zone;
    const cx = x + w / 2;
    const textY = y + h / 2 + (hasQuests ? -7 : 5);

    return (
      <g
        key={zone.id}
        onClick={() => handleZoneClick(zone.id)}
        style={{ cursor: 'pointer' }}
        role="button"
        aria-label={zone.label}
      >
        {/* Ambient glow for urgent zones */}
        {isUrgent && (
          <rect
            x={x - 5} y={y - 5} width={w + 10} height={h + 10}
            fill="none" stroke="#ff9800" strokeWidth={4} rx={7}
            opacity={0.18} style={{ filter: 'blur(5px)' }}
          />
        )}

        {/* Zone body */}
        <rect
          x={x} y={y} width={w} height={h}
          fill={fillColor}
          stroke={accentColor}
          strokeWidth={isSelected ? 2 : 1}
          rx={4}
          style={{ transition: 'fill 0.2s' }}
        />

        {/* Tactical corner accents */}
        <CornerAccents x={x} y={y} w={w} h={h} color={accentColor} />

        {/* Label */}
        <text
          x={cx} y={textY}
          textAnchor="middle"
          fill={hasQuests ? '#d0eaf5' : '#2a5a6a'}
          fontSize={hasQuests ? 12 : 11}
          fontFamily="'Courier New', Courier, monospace"
          fontWeight={hasQuests ? '700' : '400'}
          letterSpacing={0.5}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {zone.label}
        </text>

        {/* Quest status line */}
        {hasQuests && (
          <text
            x={cx} y={textY + 16}
            textAnchor="middle"
            fill={isUrgent ? '#ff9800' : isActive ? '#ffd54f' : '#66bb6a'}
            fontSize={10}
            fontFamily="'Courier New', Courier, monospace"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {isUrgent
              ? `⚡ ${m.pending} oczekuj.${m.inProgress > 0 ? ` · ▶ ${m.inProgress}` : ''}`
              : isActive
              ? `▶ ${m.inProgress} w realizacji`
              : `✓ ${m.completed}`}
          </text>
        )}

        {/* Pulsing dot — pending */}
        {m.pending > 0 && (
          <circle cx={x + w - 11} cy={y + 11} r={5} fill="#ff9800">
            <animate attributeName="r" values="4;7;4" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Steady dot — in progress only */}
        {m.inProgress > 0 && m.pending === 0 && (
          <circle cx={x + w - 11} cy={y + 11} r={4} fill="#ffd54f">
            <animate attributeName="opacity" values="1;0.5;1" dur="2.4s" repeatCount="indefinite" />
          </circle>
        )}
      </g>
    );
  };

  // ── Sidebar: quest list ────────────────────────────────────────────────
  const renderQuestItem = (quest: Quest) => (
    <Box
      key={quest.id}
      onClick={() => navigate(`/quests/${quest.id}`)}
      sx={{
        p: 1.5,
        borderRadius: 1,
        cursor: 'pointer',
        bgcolor: '#07111e',
        border: '1px solid #1a3548',
        borderLeft: `3px solid ${STATUS_COLORS[quest.status]}`,
        '&:hover': { bgcolor: '#0e1f31', borderColor: '#2a4a60' },
        transition: 'all 0.15s ease',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.3, fontSize: 12 }}
        >
          {quest.recipient}
        </Typography>
        <Chip
          label={STATUS_LABELS[quest.status]}
          size="small"
          sx={{
            height: 18, fontSize: 9, flexShrink: 0,
            bgcolor: `${STATUS_COLORS[quest.status]}22`,
            color: STATUS_COLORS[quest.status],
            border: `1px solid ${STATUS_COLORS[quest.status]}44`,
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: '#3a7a8a', fontFamily: 'monospace', display: 'block', mt: 0.25, fontSize: 10 }}>
        {quest.destination.location} · {quest.items.length} poz.
      </Typography>
      <Typography variant="caption" sx={{ color: '#204050', fontFamily: 'monospace', fontSize: 10 }}>
        {formatDate(quest.delivery_date)}
        {quest.pickup_time && ` · ${quest.pickup_time}`}
      </Typography>
    </Box>
  );

  const renderSidebar = () => {
    const isUnmatched = selectedZoneId === '__unmatched';
    const showDetail = selectedZoneId && (selectedZone || isUnmatched);

    if (showDetail) {
      return (
        <>
          {/* Zone header */}
          <Box sx={{ p: 1.5, borderBottom: '1px solid #1a3548', bgcolor: '#050d18', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                {isUnmatched ? '⚠ Nieprzypisane lokalizacje' : `▶ ${selectedZone!.label}`}
              </Typography>
              <Tooltip title="Zamknij panel">
                <IconButton size="small" onClick={() => setSelectedZoneId(null)} sx={{ color: '#3a7a8a', '&:hover': { color: '#ff9800' } }}>
                  <svg width={14} height={14} viewBox="0 0 14 14" fill="currentColor">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                </IconButton>
              </Tooltip>
            </Box>

            {/* Status pills */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
              {(['pending', 'in_progress', 'completed', 'cancelled'] as QuestStatus[]).map(status => {
                const cnt = selectedQuests.filter(q => q.status === status).length;
                if (!cnt) return null;
                return (
                  <Chip
                    key={status}
                    label={`${STATUS_LABELS[status]}: ${cnt}`}
                    size="small"
                    sx={{
                      height: 18, fontSize: 9,
                      bgcolor: `${STATUS_COLORS[status]}1a`,
                      color: STATUS_COLORS[status],
                      border: `1px solid ${STATUS_COLORS[status]}33`,
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Quest list */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {selectedQuests.length === 0
              ? (
                <Typography sx={{ color: '#1a4a5a', fontFamily: 'monospace', textAlign: 'center', mt: 3, fontSize: 11 }}>
                  Brak zamówień
                </Typography>
              )
              : selectedQuests.map(renderQuestItem)
            }
          </Box>
        </>
      );
    }

    // Default: overview panel
    const activeZones = ZONES.filter(z => (questsByZone[z.id] ?? []).length > 0);
    return (
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Instruction */}
        <Typography sx={{ color: '#1a5a6a', fontFamily: 'monospace', textAlign: 'center', fontSize: 11, mt: 2, letterSpacing: 1 }}>
          {'>>> WYBIERZ STREFĘ <<<'}
        </Typography>
        <Typography sx={{ color: '#0f3040', fontFamily: 'monospace', textAlign: 'center', fontSize: 10 }}>
          kliknij budynek na mapie
        </Typography>

        <Divider sx={{ borderColor: '#1a3548', my: 1 }} />

        {/* Active zones quick-list */}
        {activeZones.length === 0 ? (
          <Typography sx={{ color: '#1a3a4a', fontFamily: 'monospace', textAlign: 'center', fontSize: 10 }}>
            Brak aktywnych zamówień
          </Typography>
        ) : (
          <>
            <Typography sx={{ color: '#2a6a7a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>
              AKTYWNE STREFY:
            </Typography>
            {activeZones.map(z => {
              const m = getZoneMetrics(questsByZone[z.id] ?? []);
              return (
                <Box
                  key={z.id}
                  onClick={() => setSelectedZoneId(z.id)}
                  sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', p: 0.75, borderRadius: 0.5,
                    border: '1px solid #0f2a38',
                    '&:hover': { bgcolor: '#0d1f2e', borderColor: '#2a4a5a' },
                    transition: 'all 0.15s',
                  }}
                >
                  <Typography sx={{ color: '#9ad0e0', fontFamily: 'monospace', fontSize: 11 }}>
                    {z.label}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {m.pending > 0 && (
                      <Chip
                        label={`⚡ ${m.pending}`} size="small"
                        sx={{ height: 16, fontSize: 9, bgcolor: '#ff980025', color: '#ff9800' }}
                      />
                    )}
                    {m.inProgress > 0 && (
                      <Chip
                        label={`▶ ${m.inProgress}`} size="small"
                        sx={{ height: 16, fontSize: 9, bgcolor: '#ffd54f25', color: '#ffd54f' }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </>
        )}

        {/* Unmatched */}
        {unmatchedQuests.length > 0 && (
          <>
            <Divider sx={{ borderColor: '#1a3548', my: 0.5 }} />
            <Box
              onClick={() => setSelectedZoneId('__unmatched')}
              sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', p: 0.75, borderRadius: 0.5,
                border: '1px solid #3a2000',
                '&:hover': { bgcolor: '#1a0f00' },
              }}
            >
              <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontSize: 11 }}>
                ⚠ Nieprzypisane
              </Typography>
              <Chip
                label={unmatchedQuests.length} size="small"
                sx={{ height: 16, fontSize: 9, bgcolor: '#ff980025', color: '#ff9800' }}
              />
            </Box>
          </>
        )}
      </Box>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', gap: 2, minHeight: 500 }}>

      {/* ── MAP ── */}
      <Box
        sx={{
          flex: 1,
          bgcolor: '#060e1a',
          borderRadius: 2,
          border: '1px solid #152535',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
        }}
      >
        <svg
          viewBox="0 0 760 420"
          style={{ width: '100%', height: '100%', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ── Defs ── */}
          <defs>
            <filter id="mpt-glow-orange" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#ff9800" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="bg-grad" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#0a1828" />
              <stop offset="100%" stopColor="#060e1a" />
            </radialGradient>
          </defs>

          {/* Background */}
          <rect width="760" height="420" fill="url(#bg-grad)" />

          {/* Grid */}
          {Array.from({ length: 20 }, (_, i) => (
            <line key={`vg${i}`} x1={i * 40} y1={0} x2={i * 40} y2={420}
              stroke="#0c1e2e" strokeWidth={0.5} />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`hg${i}`} x1={0} y1={i * 40} x2={760} y2={i * 40}
              stroke="#0c1e2e" strokeWidth={0.5} />
          ))}

          {/* Road / connector between rows */}
          <rect x={25} y={138} width={322} height={9} fill="#05111e" rx={2} />
          <rect x={25} y={270} width={710} height={9} fill="#05111e" rx={2} />

          {/* Central connector path (Arena to north) */}
          <rect x={370} y={138} width={100} height={9} fill="#05111e" rx={2} />

          {/* Zones */}
          {ZONES.map(renderZone)}

          {/* Unmatched zone indicator */}
          {unmatchedQuests.length > 0 && (
            <g onClick={() => setSelectedZoneId('__unmatched')} style={{ cursor: 'pointer' }}>
              <rect x={610} y={382} width={132} height={30} fill="rgba(80,30,0,0.3)"
                stroke="#ff980055" strokeWidth={1} rx={3} />
              <text x={676} y={394} textAnchor="middle"
                fill="#ff9800" fontSize={9} fontFamily="monospace" letterSpacing={0.5}>
                ⚠ NIEPRZYPISANE
              </text>
              <text x={676} y={406} textAnchor="middle"
                fill="#ffa726" fontSize={10} fontFamily="monospace" fontWeight="bold">
                {unmatchedQuests.length} zam.
              </text>
            </g>
          )}

          {/* Watermark */}
          <text x={380} y={413} textAnchor="middle"
            fill="#0d2535" fontSize={9} fontFamily="monospace" letterSpacing={3}>
            MTP POZNAŃ · PYRKON DISPATCH
          </text>

          {/* North compass */}
          <text x={740} y={22} textAnchor="middle" fill="#1a4a5a" fontSize={10} fontFamily="monospace">N</text>
          <line x1={740} y1={24} x2={740} y2={34} stroke="#1a4a5a" strokeWidth={1} />
          <polygon points="740,14 736,26 740,23 744,26" fill="#1a4a5a" />

          {/* Legend */}
          <circle cx={34} cy={397} r={4} fill="#ff9800">
            <animate attributeName="r" values="3;5;3" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <text x={44} y={401} fill="#3a6a7a" fontSize={9} fontFamily="monospace">OCZEKUJĄCE</text>
          <circle cx={130} cy={397} r={4} fill="#ffd54f" />
          <text x={140} y={401} fill="#3a6a7a" fontSize={9} fontFamily="monospace">W REALIZACJI</text>
          <circle cx={232} cy={397} r={4} fill="#66bb6a" />
          <text x={242} y={401} fill="#3a6a7a" fontSize={9} fontFamily="monospace">ZREALIZOWANE</text>
        </svg>
      </Box>

      {/* ── SIDEBAR ── */}
      <Box
        sx={{
          width: 290,
          flexShrink: 0,
          bgcolor: '#060e1a',
          borderRadius: 2,
          border: '1px solid #152535',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Sidebar top bar */}
        <Box sx={{ px: 2, py: 1, bgcolor: '#050d18', borderBottom: '1px solid #1a3548', flexShrink: 0 }}>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
            DISPATCH · CENTRUM DOWODZENIA
          </Typography>
        </Box>

        {renderSidebar()}
      </Box>
    </Box>
  );
};

export default QuestDispatcherMap;
