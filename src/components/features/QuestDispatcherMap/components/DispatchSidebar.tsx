import React, { useState } from 'react';
import { Box, Typography, Chip, Divider, IconButton, Tooltip, Select, MenuItem, FormControl, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Quest, QuestStatus } from '../../../../types/quest.types';
import type { ServiceDeskRequest } from '../../../../types/servicedesk.types';
import type { Location } from '../../../../types/location.types';
import type { Zone } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants/statusConfig';
import { getZoneMetrics, getQuestUrgency, getEffectiveDeadline, formatDate } from '../utils/matching';
import type { QuestUrgency } from '../utils/matching';
import { ZONES } from '../constants/zones';
import { DEFAULT_URGENCY_HOURS } from '../constants/thresholds';
import { dt, STATUS_BAR, URGENCY_ON_PAPER } from '../constants/dispatchTheme';

/** SD status bars on paper — darker variants readable on cream */
const SD_STATUS_BAR: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: '#ef9000', text: '#2b1a00', label: 'NOWE' },
  in_progress: { bg: '#0097ab', text: '#002b30', label: 'W TRAKCIE' },
  waiting: { bg: '#c9a227', text: '#2b2200', label: 'CZEKA' },
  resolved: { bg: '#5da861', text: '#11260f', label: 'OK' },
  closed: { bg: '#8d9aa3', text: '#1d2429', label: 'ZAMKNIĘTE' },
};

const ServiceDeskItem: React.FC<{ request: ServiceDeskRequest; onClick: () => void }> = ({ request, onClick }) => {
  const bar = SD_STATUS_BAR[request.status] ?? SD_STATUS_BAR.closed;
  return (
    <Box
      onClick={onClick}
      sx={{
        borderRadius: 1, cursor: 'pointer', overflow: 'hidden',
        bgcolor: dt.paper.bg, boxShadow: dt.paper.shadow,
        borderLeft: `4px solid ${bar.bg}`,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover': { boxShadow: dt.paper.shadowHover, transform: 'translateY(-1px)' },
      }}
    >
      <Box sx={{ px: 1, py: 0.75 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.75 }}>
          <Typography variant="caption" sx={{ color: dt.paper.text, fontWeight: 700, fontSize: 12, lineHeight: 1.35, flex: 1 }}>
            {request.title}
          </Typography>
          <Typography variant="caption" sx={{
            bgcolor: bar.bg, color: bar.text, fontWeight: 800, fontSize: 9,
            letterSpacing: 0.8, px: 0.6, py: 0.1, borderRadius: 0.5, flexShrink: 0,
          }}>
            {bar.label}
          </Typography>
        </Box>
        {request.created_by && (
          <Typography variant="caption" sx={{ color: dt.paper.textMuted, fontSize: 11, display: 'block', mt: 0.25 }}>
            {request.created_by}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

interface DispatchSidebarProps {
  selectedZoneId: string | null;
  questsByZone: Record<string, Quest[]>;
  sdByZone?: Record<string, ServiceDeskRequest[]>;
  onZoneSelect: (id: string | null) => void;
  onDispatchQuest?: (quest: Quest) => void;
  onViewActiveQuest?: (quest: Quest) => void;
  onSdTicketOpen?: (req: ServiceDeskRequest) => void;
  bottomPanel?: React.ReactNode;
  locations?: Location[];
  onAssignQuestLocation?: (questId: string, locationId: number) => Promise<void>;
  onCollapse?: () => void;
  urgencyHours?: number;
  /** Current timestamp (ms) — real or simulated; same timeline as the map */
  now?: number;
}

const QuestItem: React.FC<{
  quest: Quest;
  urgency: QuestUrgency;
  onClick: () => void;
  onDispatch?: (quest: Quest) => void;
  onViewActiveQuest?: (quest: Quest) => void;
}> = ({ quest, urgency, onClick, onDispatch, onViewActiveQuest }) => {
  const locationLabel = quest.location_name ?? `${quest.destination.pavilion} · ${quest.destination.location}`;
  const bar = urgency === 'overdue' ? STATUS_BAR.overdue : STATUS_BAR[quest.status];
  const dateColor = urgency === 'overdue' ? URGENCY_ON_PAPER.overdue
    : urgency === 'urgent' ? URGENCY_ON_PAPER.urgent
    : dt.paper.textMuted;
  const handleClick = () => {
    if (quest.status === 'pending' && onDispatch) onDispatch(quest);
    else if (quest.status === 'in_progress' && onViewActiveQuest) onViewActiveQuest(quest);
    else onClick();
  };
  return (
    <Box
      onClick={handleClick}
      sx={{
        borderRadius: 1, overflow: 'hidden', cursor: 'pointer',
        boxShadow: dt.paper.shadow,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover': { boxShadow: dt.paper.shadowHover, transform: 'translateY(-1px)' },
      }}
    >
      {/* Solid status bar — game-style card header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.25, py: 0.4, bgcolor: bar.bg }}>
        <Typography sx={{ color: bar.text, fontWeight: 800, fontSize: 10, letterSpacing: 1.2 }}>
          {bar.label}
        </Typography>
        {urgency === 'urgent' && (
          <Typography sx={{ color: bar.text, fontWeight: 800, fontSize: 10, letterSpacing: 0.5 }}>
            ⚡ PILNE
          </Typography>
        )}
      </Box>
      {/* Paper body */}
      <Box sx={{ bgcolor: dt.paper.bg, px: 1.25, py: 1 }}>
        <Typography sx={{ color: dt.paper.text, fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>
          {quest.recipient}
        </Typography>
        <Typography sx={{ color: dt.paper.textSecondary, fontSize: 12, mt: 0.25 }}>
          {locationLabel} · {quest.items.length} poz.
        </Typography>
        {quest.budget_owner && (
          <Typography sx={{ color: dt.paper.textMuted, fontSize: 11 }}>
            {quest.budget_owner}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75 }}>
          <Typography sx={{
            color: dateColor, fontFamily: 'monospace', fontSize: 11,
            fontWeight: urgency === 'overdue' || urgency === 'urgent' ? 700 : 400,
          }}>
            {formatDate(quest.delivery_date)}{quest.pickup_time && ` · ${quest.pickup_time}`}
          </Typography>
          {quest.status === 'pending' && onDispatch && (
            <Box
              component="button"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDispatch(quest); }}
              sx={{
                display: 'inline-flex', alignItems: 'center',
                px: 1.25, py: 0.5, border: 'none', borderRadius: 0.75,
                bgcolor: dt.action.orange, color: dt.action.onOrange,
                fontFamily: 'monospace', fontSize: 11, fontWeight: 800,
                cursor: 'pointer', letterSpacing: 1,
                boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: dt.action.orangeHover },
              }}
            >
              DISPATCH
            </Box>
          )}
          {quest.status === 'in_progress' && onViewActiveQuest && (
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center',
                px: 1.25, py: 0.5, borderRadius: 0.75,
                bgcolor: dt.action.teal, color: dt.action.onTeal,
                fontFamily: 'monospace', fontSize: 11, fontWeight: 800, letterSpacing: 1,
                boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
              }}
            >
              ▶ MISJA
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Inline location picker for quests with unresolved locations (shown in other zone).
 */
const InlineLocationAssign: React.FC<{
  quest: Quest;
  locations: Location[];
  onAssign: (locationId: number) => Promise<void>;
}> = ({ locations, onAssign }) => {
  const [selected, setSelected] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onAssign(selected as number);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mt: 0.75, display: 'flex', gap: 0.5, alignItems: 'center' }}>
      <FormControl size="small" sx={{ flex: 1 }}>
        <Select
          value={selected}
          onChange={(e) => setSelected(e.target.value as number | '')}
          displayEmpty
          sx={{
            fontSize: 10, fontFamily: 'monospace', color: '#9ad0e0',
            bgcolor: '#040c18', border: '1px solid #1a3548',
            '& .MuiSelect-icon': { color: '#3a7a8a' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
          }}
        >
          <MenuItem value="" disabled sx={{ fontSize: 10, fontFamily: 'monospace' }}>
            Przypisz lokalizację…
          </MenuItem>
          {locations.map(loc => (
            <MenuItem key={loc.id} value={loc.id} sx={{ fontSize: 10, fontFamily: 'monospace' }}>
              {loc.pavilion ? `[${loc.pavilion}] ` : ''}{loc.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        size="small"
        disabled={!selected || saving}
        onClick={handleAssign}
        sx={{
          minWidth: 0, px: 1, py: 0.5, fontSize: 9, fontFamily: 'monospace',
          fontWeight: 700, letterSpacing: 0.5, flexShrink: 0,
          bgcolor: selected ? 'rgba(255,152,0,0.15)' : 'transparent',
          color: '#ff9800', border: '1px solid #ff980044',
          '&:hover': { bgcolor: 'rgba(255,152,0,0.25)' },
          '&.Mui-disabled': { color: '#3a4a5a', borderColor: '#1a2a38' },
        }}
      >
        {saving ? '…' : 'OK'}
      </Button>
    </Box>
  );
};

const STATUS_ORDER: Record<QuestStatus, number> = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 };

const ZoneDetail: React.FC<{
  zone: Zone | null;
  isUnmatched: boolean;
  quests: Quest[];
  sdRequests: ServiceDeskRequest[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  onDispatchQuest?: (quest: Quest) => void;
  onViewActiveQuest?: (quest: Quest) => void;
  onSdTicketClick: (req: ServiceDeskRequest) => void;
  locations?: Location[];
  onAssignQuestLocation?: (questId: string, locationId: number) => Promise<void>;
  urgencyHours: number;
  now: number;
}> = ({ zone, isUnmatched, quests, sdRequests, onClose, onNavigate, onDispatchQuest, onViewActiveQuest, onSdTicketClick, locations, onAssignQuestLocation, urgencyHours, now }) => (
  <>
    <Box sx={{ p: 1.5, borderBottom: '1px solid #1a3548', bgcolor: '#050d18', flexShrink: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>
          {isUnmatched ? '⚠ Nieprzypisane' : `▶ Pawilon ${zone!.label.replace('\n', ' ')}`}
        </Typography>
        <Tooltip title="Zamknij">
          <IconButton size="small" onClick={onClose} sx={{ color: '#3a7a8a', '&:hover': { color: '#ff9800' } }}>
            <svg width={12} height={12} viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
            </svg>
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
        {(['pending', 'in_progress', 'completed', 'cancelled'] as QuestStatus[]).map(status => {
          const cnt = quests.filter(q => q.status === status).length;
          if (!cnt) return null;
          return (
            <Chip key={status} label={`${STATUS_LABELS[status]}: ${cnt}`} size="small"
              sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: STATUS_COLORS[status], color: '#10141a' }}
            />
          );
        })}
      </Box>
    </Box>
    <Box sx={{ flex: 1, overflowY: 'auto', p: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {quests.length === 0
        ? <Typography sx={{ color: dt.shell.textMuted, fontFamily: 'monospace', textAlign: 'center', mt: 3, fontSize: 12 }}>Brak zamówień</Typography>
        : [...quests]
          .sort((a, b) =>
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
            || getEffectiveDeadline(a.delivery_date) - getEffectiveDeadline(b.delivery_date),
          )
          .map(q => (
          <Box key={q.id}>
            <QuestItem
              quest={q}
              urgency={getQuestUrgency(q, urgencyHours, now)}
              onClick={() => onNavigate(q.id)}
              onDispatch={onDispatchQuest}
              onViewActiveQuest={onViewActiveQuest}
            />
            {isUnmatched && !q.location_resolved && locations && locations.length > 0 && onAssignQuestLocation && (
              <InlineLocationAssign
                quest={q}
                locations={locations}
                onAssign={(locationId) => onAssignQuestLocation(q.id, locationId)}
              />
            )}
          </Box>
        ))}
      {sdRequests.length > 0 && (
        <>
          <Divider sx={{ borderColor: '#1a3548', my: 0.5 }} />
          <Typography sx={{ color: '#00acc1', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, px: 0.5, letterSpacing: 1 }}>
            SERVICE DESK · {sdRequests.length}
          </Typography>
          {sdRequests.map(req => <ServiceDeskItem key={req.id} request={req} onClick={() => onSdTicketClick(req)} />)}
        </>
      )}
    </Box>
  </>
);

const ZoneSummary: React.FC<{
  questsByZone: Record<string, Quest[]>;
  sdByZone: Record<string, ServiceDeskRequest[]>;
  onZoneSelect: (id: string) => void;
  urgencyHours: number;
  now: number;
}> = ({ questsByZone, sdByZone, onZoneSelect, urgencyHours, now }) => {
  const activeZones = ZONES
    .filter(z =>
      (questsByZone[z.id] ?? []).length > 0 ||
      (sdByZone[z.id] ?? []).some(r => r.status === 'new'),
    )
    .sort((a, b) => a.label.replace('\n', ' ').localeCompare(b.label.replace('\n', ' '), 'pl', { numeric: true }));

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {activeZones.length === 0 ? (
        <Typography sx={{ color: dt.shell.textMuted, fontFamily: 'monospace', textAlign: 'center', fontSize: 11 }}>Brak aktywnych zamówień</Typography>
      ) : (
        <>
          <Typography sx={{ color: dt.shell.header, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>AKTYWNE PAWILONY:</Typography>
          {activeZones.map(z => {
            const m = getZoneMetrics(questsByZone[z.id] ?? [], urgencyHours, now);
            const sdNew = (sdByZone[z.id] ?? []).filter(r => r.status === 'new').length;
            return (
              <Box key={z.id} onClick={() => onZoneSelect(z.id)}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', px: 1, py: 0.75, borderRadius: 0.5, border: '1px solid #0f2a38', '&:hover': { bgcolor: '#0d1f2e', borderColor: '#2a4a5a' }, transition: 'all 0.15s' }}
              >
                <Typography sx={{ color: dt.shell.text, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{z.id === 'other' ? z.label : `Paw. ${z.label.replace('\n', ' ')}`}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {m.overdue > 0 && <Chip label={`! ${m.overdue}`} size="small" sx={{ height: 22, fontSize: 13, fontFamily: 'monospace', fontWeight: 800, bgcolor: '#d32f2f', color: '#fff', borderRadius: 0.75, '& .MuiChip-label': { px: 1 } }} />}
                  {m.pending - m.overdue > 0 && <Chip label={`⚡${m.pending - m.overdue}`} size="small" sx={{ height: 22, fontSize: 13, fontFamily: 'monospace', fontWeight: 800, bgcolor: '#ff9800', color: '#241500', borderRadius: 0.75, '& .MuiChip-label': { px: 1 } }} />}
                  {m.inProgress > 0 && <Chip label={`▶${m.inProgress}`} size="small" sx={{ height: 22, fontSize: 13, fontFamily: 'monospace', fontWeight: 800, bgcolor: '#00acc1', color: '#00262b', borderRadius: 0.75, '& .MuiChip-label': { px: 1 } }} />}
                  {sdNew > 0 && <Chip label={`SD ${sdNew}`} size="small" sx={{ height: 22, fontSize: 12, fontFamily: 'monospace', fontWeight: 800, bgcolor: '#00304a', color: '#00e5ff', border: '1px solid #00acc1', borderRadius: 0.75, '& .MuiChip-label': { px: 1 } }} />}
                </Box>
              </Box>
            );
          })}
        </>
      )}
    </Box>
  );
};

const DispatchSidebar: React.FC<DispatchSidebarProps> = ({ selectedZoneId, questsByZone, sdByZone = {}, onZoneSelect, onDispatchQuest, onViewActiveQuest, onSdTicketOpen, bottomPanel, locations, onAssignQuestLocation, onCollapse, urgencyHours = DEFAULT_URGENCY_HOURS, now = Date.now() }) => {
  const navigate = useNavigate();
  const selectedZone = ZONES.find(z => z.id === selectedZoneId) ?? null;
  const selectedQuests = selectedZoneId ? (questsByZone[selectedZoneId] ?? []) : [];
  const selectedSdRequests = selectedZoneId ? (sdByZone[selectedZoneId] ?? []) : [];
  const showDetail = selectedZoneId && selectedZone;

  return (
    <Box sx={{
      width: 290, flexShrink: 0, bgcolor: '#060e1a', borderRadius: 2,
      border: '1px solid #152535', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)',
    }}>
      <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#050d18', borderBottom: '1px solid #1a3548', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ color: dt.shell.header, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 2, flex: 1 }}>
          DISPATCH · CENTRUM DOWODZENIA
        </Typography>
        {onCollapse && (
          <Tooltip title="Zwiń panel">
            <IconButton size="small" onClick={onCollapse} sx={{ color: '#3a7a8a', p: 0.25, '&:hover': { color: '#ff9800' } }}>
              <svg width={12} height={12} viewBox="0 0 12 12">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {showDetail ? (
          <ZoneDetail
            zone={selectedZone}
            isUnmatched={false}
            quests={selectedQuests}
            sdRequests={selectedSdRequests}
            onClose={() => onZoneSelect(null)}
            onNavigate={(id) => navigate(`/quests/${id}`)}
            onDispatchQuest={onDispatchQuest}
            onViewActiveQuest={onViewActiveQuest}
            onSdTicketClick={(req) => onSdTicketOpen?.(req)}
            locations={locations}
            onAssignQuestLocation={onAssignQuestLocation}
            urgencyHours={urgencyHours}
            now={now}
          />
        ) : (
          <ZoneSummary
            questsByZone={questsByZone}
            sdByZone={sdByZone}
            onZoneSelect={(id) => onZoneSelect(id)}
            urgencyHours={urgencyHours}
            now={now}
          />
        )}
      </Box>
      {bottomPanel && (
        <Box sx={{ borderTop: '1px solid #1a3548', flexShrink: 0 }}>
          {bottomPanel}
        </Box>
      )}
    </Box>
  );
};

export default DispatchSidebar;
