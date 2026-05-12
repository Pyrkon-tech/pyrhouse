import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Chip, CircularProgress, Alert, Divider } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { getMyVolunteerScheduleAPI } from '../../../services/scheduleService';
import type { MyScheduleResponse, MyScheduleSlot, SlotType } from '../../../types/schedule.types';
import { ApiError } from '../../../services/apiClient';

// ---- ICS generation ---------------------------------------------------------

/** Merge consecutive slots (end of slot[n] === start of slot[n+1]) into calendar blocks */
function mergeConsecutiveSlots(slots: MyScheduleSlot[]): MyScheduleSlot[][] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const blocks: MyScheduleSlot[][] = [];
  let current: MyScheduleSlot[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1];
    if (new Date(prev.end_time).getTime() === new Date(sorted[i].start_time).getTime()) {
      current.push(sorted[i]);
    } else {
      blocks.push(current);
      current = [sorted[i]];
    }
  }
  blocks.push(current);
  return blocks;
}

function icsDate(iso: string): string {
  return iso.replace(/[-:]/g, '').replace('.000', '').replace('Z', 'Z').slice(0, 16) + 'Z';
}

function generateICS(nickname: string, blocks: MyScheduleSlot[][]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PyrHouse//MySchedule//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  blocks.forEach((block, idx) => {
    const start = block[0].start_time;
    const end = block[block.length - 1].end_time;
    const totalHours = block.reduce((s, sl) => s + sl.credit_hours, 0);
    const label = block.map((sl) => sl.label ?? slotTypeLabel(sl.slot_type)).join(' + ');
    const summary = `Dyżur Pyrkon — ${nickname} (${totalHours}h)`;
    const description = label;

    lines.push(
      'BEGIN:VEVENT',
      `UID:pyrhouse-${idx}-${start}@pyrhouse`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Helpers ----------------------------------------------------------------

const SLOT_TYPE_COLOR: Record<SlotType, string> = {
  montage: '#42a5f5',
  festival: '#ff9800',
  demontage: '#ab47bc',
};

function slotTypeLabel(type: SlotType): string {
  return type === 'festival' ? 'Festiwal' : type === 'montage' ? 'Montaż' : 'Demontaż';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ---- Component --------------------------------------------------------------

const MySchedulePage: React.FC = () => {
  const [data, setData] = useState<MyScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyVolunteerScheduleAPI()
      .then(setData)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          setError('Nie jesteś przypisany do harmonogramu dyżurów. Skontaktuj się z organizatorem.');
        } else if (e instanceof ApiError && e.status === 403) {
          setError('Brak dostępu — Twoje konto nie jest powiązane z wolontariuszem w harmonogramie.');
        } else {
          setError('Nie udało się załadować grafiku.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Box sx={{ p: 3 }}><Alert severity="info">{error}</Alert></Box>;
  }

  if (!data) return null;

  const { volunteer, slots } = data;
  const sortedSlots = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const blocks = mergeConsecutiveSlots(slots);

  // Group slots by date for display
  const byDate = new Map<string, MyScheduleSlot[]>();
  for (const slot of sortedSlots) {
    const dateKey = slot.start_time.slice(0, 10);
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(slot);
  }

  const handleDownloadICS = () => {
    const ics = generateICS(volunteer.nickname, blocks);
    downloadICS(ics, `grafik-pyrkon-${volunteer.nickname}.ics`);
  };

  const hoursColor = volunteer.assigned_hours >= volunteer.target_hours ? '#10b981'
    : volunteer.assigned_hours > 0 ? '#ff9800' : '#616161';

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            Mój grafik dyżurów
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {volunteer.nickname}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <Chip
            label={`${volunteer.assigned_hours}h / ${volunteer.target_hours}h`}
            size="small"
            sx={{ fontWeight: 700, color: hoursColor, borderColor: hoursColor, bgcolor: `${hoursColor}18` }}
            variant="outlined"
          />
          {slots.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<CalendarTodayIcon sx={{ fontSize: 14 }} />}
              onClick={handleDownloadICS}
              sx={{ fontSize: '0.72rem' }}
            >
              Dodaj do kalendarza
            </Button>
          )}
        </Box>
      </Box>

      {/* Slots by day */}
      {slots.length === 0 ? (
        <Alert severity="info">Nie masz jeszcze żadnych przypisanych dyżurów.</Alert>
      ) : (
        Array.from(byDate.entries()).map(([dateKey, daySlots]) => (
          <Box key={dateKey} sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}
            >
              {formatDate(daySlots[0].start_time)}
            </Typography>
            <Divider sx={{ mb: 1, mt: 0.25 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {daySlots.map((slot) => {
                const color = SLOT_TYPE_COLOR[slot.slot_type];
                const isConsecutivePrev = sortedSlots.find(
                  (s) => s.end_time === slot.start_time
                );
                return (
                  <Box
                    key={slot.assignment_id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.25,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: `${color}40`,
                      bgcolor: `${color}0d`,
                      borderLeft: `3px solid ${color}`,
                      ...(isConsecutivePrev && {
                        borderTopLeftRadius: 0,
                        mt: '-1px',
                      }),
                    }}
                  >
                    <AccessTimeIcon sx={{ fontSize: 16, color, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                      </Typography>
                      {slot.label && (
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                          {slot.label}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip
                        label={slotTypeLabel(slot.slot_type)}
                        size="small"
                        sx={{ fontSize: '0.6rem', height: 18, bgcolor: `${color}20`, color }}
                      />
                      <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                        {slot.credit_hours}h
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
};

export default MySchedulePage;
