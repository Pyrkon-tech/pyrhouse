import React, { useState } from 'react';
import { Box, Typography, Chip, Divider, IconButton, Tooltip, Select, MenuItem, FormControl, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Quest, QuestStatus } from '../../../../types/quest.types';
import type { ServiceDeskRequest } from '../../../../types/servicedesk.types';
import type { Location } from '../../../../types/location.types';
import type { Zone } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants/statusConfig';
import { getZoneMetrics, formatDate } from '../utils/matching';
import { ZONES } from '../constants/zones';

const SD_STATUS_COLORS: Record<string, string> = {
  new: '#ff9800',
  in_progress: '#00acc1',
  waiting: '#ffd54f',
  resolved: '#66bb6a',
  closed: '#546e7a',
};

const SD_STATUS_LABELS: Record<string, string> = {
  new: 'NOWE',
  in_progress: 'W TRAKCIE',
  waiting: 'CZEKA',
  resolved: 'OK',
  closed: 'ZAMKNIĘTE',
};

const ServiceDeskItem: React.FC<{ request: ServiceDeskRequest; onClick: () => void }> = ({ request, onClick }) => {
  const statusColor = SD_STATUS_COLORS[request.status] ?? '#546e7a';
  return (
    <Box
      onClick={onClick}
      sx={{
        px: 1, py: 0.75, borderRadius: 1, cursor: 'pointer',
        bgcolor: '#050d18', border: '1px solid #1a3548',
        borderLeft: `3px solid ${statusColor}`,
        transition: 'all 0.15s ease',
        '&:hover': { bgcolor: '#0a1a2a', borderColor: `${statusColor}66` },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, lineHeight: 1.3, flex: 1 }}>
          {request.title}
        </Typography>
        <Typography variant="caption" sx={{ color: statusColor, fontFamily: 'monospace', fontSize: 9, flexShrink: 0, opacity: 0.85 }}>
          {SD_STATUS_LABELS[request.status] ?? request.status}
        </Typography>
      </Box>
      {request.created_by && (
        <Typography variant="caption" sx={{ color: '#2a5a6a', fontFamily: 'monospace', fontSize: 10, display: 'block' }}>
          {request.created_by}
        </Typography>
      )}
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
}

const QuestItem: React.FC<{
  quest: Quest;
  onClick: () => void;
  onDispatch?: (quest: Quest) => void;
  onViewActiveQuest?: (quest: Quest) => void;
}> = ({ quest, onClick, onDispatch, onViewActiveQuest }) => {
  const locationLabel = quest.location_name ?? `${quest.destination.pavilion} · ${quest.destination.location}`;
  const handleClick = () => {
    if (quest.status === 'pending' && onDispatch) onDispatch(quest);
    else if (quest.status === 'in_progress' && onViewActiveQuest) onViewActiveQuest(quest);
    else onClick();
  };
  return (
    <Box
      onClick={handleClick}
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
      <Typography variant="caption" sx={{ color: '#7ec8e3', fontFamily: 'monospace', display: 'block', mt: 0.25, fontSize: 10 }}>
        {locationLabel} · {quest.items.length} poz.
      </Typography>
      {quest.budget_owner && (
        <Typography variant="caption" sx={{ color: '#90c4d8', fontFamily: 'monospace', display: 'block', fontSize: 9 }}>
          {quest.budget_owner}
        </Typography>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
        <Typography variant="caption" sx={{ color: '#a8d8ea', fontFamily: 'monospace', fontSize: 10 }}>
          {formatDate(quest.delivery_date)}{quest.pickup_time && ` · ${quest.pickup_time}`}
        </Typography>
        {quest.status === 'pending' && onDispatch && (
          <Box
            component="button"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDispatch(quest); }}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.25,
              px: 0.75, py: 0.25, border: '1px solid #ff980066',
              borderRadius: 0.5, bgcolor: 'rgba(255,152,0,0.1)',
              color: '#ff9800', fontFamily: 'monospace', fontSize: 9,
              fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: 'rgba(255,152,0,0.2)', borderColor: '#ff9800' },
            }}
          >
            DISPATCH
          </Box>
        )}
        {quest.status === 'in_progress' && onViewActiveQuest && (
          <Box
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.25,
              px: 0.75, py: 0.25, border: '1px solid #00acc166',
              borderRadius: 0.5, bgcolor: 'rgba(0,172,193,0.1)',
              color: '#00acc1', fontFamily: 'monospace', fontSize: 9,
              fontWeight: 700, letterSpacing: 0.5,
            }}
          >
            ▶ MISJA
          </Box>
        )}
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
}> = ({ zone, isUnmatched, quests, sdRequests, onClose, onNavigate, onDispatchQuest, onViewActiveQuest, onSdTicketClick, locations, onAssignQuestLocation }) => (
  <>
    <Box sx={{ p: 1.5, borderBottom: '1px solid #1a3548', bgcolor: '#050d18', flexShrink: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
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
              sx={{ height: 18, fontSize: 9, bgcolor: `${STATUS_COLORS[status]}1a`, color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}33` }}
            />
          );
        })}
      </Box>
    </Box>
    <Box sx={{ flex: 1, overflowY: 'auto', p: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {quests.length === 0
        ? <Typography sx={{ color: '#1a4a5a', fontFamily: 'monospace', textAlign: 'center', mt: 3, fontSize: 11 }}>Brak zamówień</Typography>
        : quests.map(q => (
          <Box key={q.id}>
            <QuestItem quest={q} onClick={() => onNavigate(q.id)} onDispatch={onDispatchQuest} onViewActiveQuest={onViewActiveQuest} />
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
          <Typography sx={{ color: '#00acc1', fontFamily: 'monospace', fontSize: 10, px: 0.5, letterSpacing: 1 }}>
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
}> = ({ questsByZone, sdByZone, onZoneSelect }) => {
  const activeZones = ZONES
    .filter(z =>
      (questsByZone[z.id] ?? []).length > 0 ||
      (sdByZone[z.id] ?? []).some(r => r.status === 'new'),
    )
    .sort((a, b) => a.label.replace('\n', ' ').localeCompare(b.label.replace('\n', ' '), 'pl', { numeric: true }));

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {activeZones.length === 0 ? (
        <Typography sx={{ color: '#1a3a4a', fontFamily: 'monospace', textAlign: 'center', fontSize: 10 }}>Brak aktywnych zamówień</Typography>
      ) : (
        <>
          <Typography sx={{ color: '#2a6a7a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>AKTYWNE PAWILONY:</Typography>
          {activeZones.map(z => {
            const m = getZoneMetrics(questsByZone[z.id] ?? []);
            const sdNew = (sdByZone[z.id] ?? []).filter(r => r.status === 'new').length;
            return (
              <Box key={z.id} onClick={() => onZoneSelect(z.id)}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', p: 0.75, borderRadius: 0.5, border: '1px solid #0f2a38', '&:hover': { bgcolor: '#0d1f2e', borderColor: '#2a4a5a' }, transition: 'all 0.15s' }}
              >
                <Typography sx={{ color: '#9ad0e0', fontFamily: 'monospace', fontSize: 11 }}>{z.id === 'other' ? z.label : `Paw. ${z.label.replace('\n', ' ')}`}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {m.pending > 0 && <Chip label={`⚡${m.pending}`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#ff980025', color: '#ff9800' }} />}
                  {m.inProgress > 0 && <Chip label={`▶${m.inProgress}`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#00acc125', color: '#00acc1' }} />}
                  {sdNew > 0 && <Chip label={`SD·${sdNew}`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#00acc125', color: '#00acc1' }} />}
                </Box>
              </Box>
            );
          })}
        </>
      )}
    </Box>
  );
};

const DispatchSidebar: React.FC<DispatchSidebarProps> = ({ selectedZoneId, questsByZone, sdByZone = {}, onZoneSelect, onDispatchQuest, onViewActiveQuest, onSdTicketOpen, bottomPanel, locations, onAssignQuestLocation, onCollapse }) => {
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
        <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, flex: 1 }}>
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
          />
        ) : (
          <ZoneSummary
            questsByZone={questsByZone}
            sdByZone={sdByZone}
            onZoneSelect={(id) => onZoneSelect(id)}
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
