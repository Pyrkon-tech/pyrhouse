import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Collapse,
  IconButton,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getScheduleDetailAPI } from '../../../services/scheduleService';
import { ApiError } from '../../../services/apiClient';
import type { ScheduleDetail, ScheduleSlot, SlotType } from '../../../types/schedule.types';
import { parseAsLocal } from './utils';

// ---- Helpers ----------------------------------------------------------------

const SLOT_TYPE_COLOR: Record<SlotType, string> = {
  montage: '#42a5f5',
  festival: '#ff9800',
  demontage: '#ab47bc',
};

function slotTypeLabel(type: SlotType): string {
  return type === 'festival' ? 'Festiwal' : type === 'montage' ? 'Montaż' : 'Demontaż';
}

// Backend sends Polish local times with a misleading `Z` suffix — strip before
// formatting so the browser timezone doesn't shift the displayed time.
function formatTime(iso: string): string {
  return parseAsLocal(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDayHeader(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

type PhaseFilter = 'all' | SlotType;

const PHASE_OPTIONS: { value: PhaseFilter; label: string }[] = [
  { value: 'all', label: 'Wszystko' },
  { value: 'montage', label: 'Montaż' },
  { value: 'festival', label: 'Festiwal' },
  { value: 'demontage', label: 'Demontaż' },
];

// ---- Component --------------------------------------------------------------

/**
 * Read-only, mobile-friendly preview of the full duty schedule.
 *
 * Shown instead of the heavy editing calendar on small screens (see ScheduleViewGate).
 * No drag/drop, no slot/assignment mutations — just slots grouped by day with their
 * assigned volunteers. Self-fetches via GET /schedule.
 */
const MobileScheduleView: React.FC = () => {
  const [data, setData] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noActive, setNoActive] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    getScheduleDetailAPI()
      .then(setData)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) {
          setNoActive(true);
        } else {
          setError(e instanceof Error ? e.message : 'Nie udało się załadować grafiku.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredSlots = useMemo(() => {
    if (!data) return [];
    const slots = phaseFilter === 'all' ? data.slots : data.slots.filter((s) => s.type === phaseFilter);
    return [...slots].sort((a, b) => a.start.localeCompare(b.start));
  }, [data, phaseFilter]);

  // Group slots by start day
  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleSlot[]>();
    for (const slot of filteredSlots) {
      const key = slot.start.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return map;
  }, [filteredSlots]);

  const toggleDay = (dateKey: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  if (noActive) {
    return <Box sx={{ p: 2 }}><Alert severity="info">Brak aktywnego harmonogramu dyżurów.</Alert></Box>;
  }

  if (error) {
    return <Box sx={{ p: 2 }}><Alert severity="error">{error}</Alert></Box>;
  }

  if (!data) return null;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2, pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {data.name || 'Harmonogram dyżurów'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {data.slots.length} {data.slots.length === 1 ? 'slot' : 'slotów'} · {data.volunteers.length} wolontariuszy
        </Typography>
        <Chip
          label="Podgląd (tylko do odczytu)"
          size="small"
          variant="outlined"
          sx={{ mt: 1, fontSize: '0.65rem', height: 20, color: 'text.secondary' }}
        />
      </Box>

      {/* Phase filter */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
        {PHASE_OPTIONS.map((opt) => {
          const active = phaseFilter === opt.value;
          const color = opt.value !== 'all' ? SLOT_TYPE_COLOR[opt.value] : '#ff9800';
          return (
            <Chip
              key={opt.value}
              label={opt.label}
              size="small"
              onClick={() => setPhaseFilter(opt.value)}
              variant={active ? 'filled' : 'outlined'}
              sx={{
                fontWeight: active ? 700 : 400,
                fontSize: '0.72rem',
                ...(active
                  ? { bgcolor: `${color}26`, color, borderColor: color }
                  : { borderColor: `${color}55`, color: 'text.secondary' }),
              }}
            />
          );
        })}
      </Box>

      {/* Days */}
      {byDate.size === 0 ? (
        <Alert severity="info">Brak slotów dla wybranego filtra.</Alert>
      ) : (
        Array.from(byDate.entries()).map(([dateKey, daySlots]) => {
          const collapsed = collapsedDays.has(dateKey);
          return (
            <Box key={dateKey} sx={{ mb: 2.5 }}>
              <Box
                onClick={() => toggleDay(dateKey)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    fontSize: '0.68rem',
                    letterSpacing: 0.5,
                  }}
                >
                  {formatDayHeader(dateKey)} · {daySlots.length}
                </Typography>
                <IconButton size="small" sx={{ p: 0.25 }}>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 18,
                      transition: 'transform 0.2s',
                      transform: collapsed ? 'rotate(-90deg)' : 'none',
                    }}
                  />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 1, mt: 0.25 }} />

              <Collapse in={!collapsed}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {daySlots.map((slot) => {
                    const color = SLOT_TYPE_COLOR[slot.type];
                    const filled = slot.volunteers.length;
                    const understaffed = filled < slot.capacity;
                    return (
                      <Box
                        key={slot.id}
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: `${color}40`,
                          bgcolor: `${color}0d`,
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        {/* Slot header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: slot.volunteers.length ? 1 : 0 }}>
                          <AccessTimeIcon sx={{ fontSize: 16, color, flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                              {formatTime(slot.start)} – {formatTime(slot.end)}
                            </Typography>
                            {slot.label && (
                              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }} noWrap>
                                {slot.label}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                            <Chip
                              label={slotTypeLabel(slot.type)}
                              size="small"
                              sx={{ fontSize: '0.6rem', height: 18, bgcolor: `${color}20`, color }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                              <PersonIcon sx={{ fontSize: 13, color: understaffed ? '#f59e0b' : 'text.secondary' }} />
                              <Typography
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  color: understaffed ? '#f59e0b' : 'text.secondary',
                                }}
                              >
                                {filled}/{slot.capacity}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Assigned volunteers */}
                        {slot.volunteers.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {slot.volunteers.map((v) => (
                              <Chip
                                key={v.id}
                                label={v.nickname}
                                size="small"
                                sx={{
                                  fontSize: '0.68rem',
                                  height: 22,
                                  bgcolor: 'action.selected',
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default MobileScheduleView;
