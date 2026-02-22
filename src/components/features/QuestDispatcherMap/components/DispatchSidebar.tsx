import React from 'react';
import { Box, Typography, Chip, Divider, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Quest, QuestStatus } from '../../../../types/quest.types';
import type { Zone } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants/statusConfig';
import { getZoneMetrics, formatDate } from '../utils/matching';
import { ZONES } from '../constants/zones';

interface DispatchSidebarProps {
  selectedZoneId: string | null;
  questsByZone: Record<string, Quest[]>;
  onZoneSelect: (id: string | null) => void;
  bottomPanel?: React.ReactNode;
}

const QuestItem: React.FC<{ quest: Quest; onClick: () => void }> = ({ quest, onClick }) => (
  <Box
    onClick={onClick}
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

const ZoneDetail: React.FC<{
  zone: Zone | null;
  isUnmatched: boolean;
  quests: Quest[];
  onClose: () => void;
  onNavigate: (id: string) => void;
}> = ({ zone, isUnmatched, quests, onClose, onNavigate }) => (
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
        : quests.map(q => <QuestItem key={q.id} quest={q} onClick={() => onNavigate(q.id)} />)}
    </Box>
  </>
);

const ZoneSummary: React.FC<{
  questsByZone: Record<string, Quest[]>;
  unmatchedCount: number;
  onZoneSelect: (id: string) => void;
}> = ({ questsByZone, unmatchedCount, onZoneSelect }) => {
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
              <Box key={z.id} onClick={() => onZoneSelect(z.id)}
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
      {unmatchedCount > 0 && (
        <>
          <Divider sx={{ borderColor: '#1a3548', my: 0.5 }} />
          <Box onClick={() => onZoneSelect('__unmatched')}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', p: 0.75, borderRadius: 0.5, border: '1px solid #3a2000', '&:hover': { bgcolor: '#1a0f00' } }}
          >
            <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontSize: 11 }}>⚠ Nieprzypisane</Typography>
            <Chip label={unmatchedCount} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#ff980025', color: '#ff9800' }} />
          </Box>
        </>
      )}
    </Box>
  );
};

const DispatchSidebar: React.FC<DispatchSidebarProps> = ({ selectedZoneId, questsByZone, onZoneSelect, bottomPanel }) => {
  const navigate = useNavigate();
  const isUnmatched = selectedZoneId === '__unmatched';
  const selectedZone = ZONES.find(z => z.id === selectedZoneId) ?? null;
  const selectedQuests = selectedZoneId ? (questsByZone[selectedZoneId] ?? []) : [];
  const unmatchedQuests = questsByZone['__unmatched'] ?? [];
  const showDetail = selectedZoneId && (selectedZone || isUnmatched);

  return (
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
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {showDetail ? (
          <ZoneDetail
            zone={selectedZone}
            isUnmatched={isUnmatched}
            quests={selectedQuests}
            onClose={() => onZoneSelect(null)}
            onNavigate={(id) => navigate(`/quests/${id}`)}
          />
        ) : (
          <ZoneSummary
            questsByZone={questsByZone}
            unmatchedCount={unmatchedQuests.length}
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
