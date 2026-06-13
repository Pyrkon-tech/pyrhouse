import React, { useState, useMemo, useCallback } from 'react';
import { Popover, Box, TextField, Typography, LinearProgress } from '@mui/material';
import type { ScheduleVolunteer, ScheduleSlot } from '../../../../types/schedule.types';
import { avatarColor } from '../utils';

function slotsOverlap(a: ScheduleSlot, b: ScheduleSlot): boolean {
  const aStart = new Date(a.start).getTime();
  const aEnd = new Date(a.end).getTime();
  const bStart = new Date(b.start).getTime();
  const bEnd = new Date(b.end).getTime();
  return aStart < bEnd && bStart < aEnd;
}

interface QuickAssignPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  volunteers: ScheduleVolunteer[];
  /** The slot we're assigning to — used for conflict/availability checks */
  targetSlot?: ScheduleSlot | null;
  /** All schedule slots — used for overlap detection */
  allSlots?: ScheduleSlot[];
  onSelect: (volunteerId: number, nickname: string) => void;
  onClose: () => void;
}

type ConflictInfo = {
  hasOverlap: boolean;
  outsideAvailability: boolean;
  alreadyAssigned: boolean;
};

const QuickAssignPopover: React.FC<QuickAssignPopoverProps> = ({
  anchorEl,
  open,
  volunteers,
  targetSlot,
  allSlots,
  onSelect,
  onClose,
}) => {
  const [search, setSearch] = useState('');

  // Build conflict info for each volunteer
  const conflictMap = useMemo(() => {
    const map = new Map<number, ConflictInfo>();
    if (!targetSlot || !allSlots) return map;

    const targetStart = new Date(targetSlot.start).getTime();
    const targetEnd = new Date(targetSlot.end).getTime();

    for (const vol of volunteers) {
      // Already assigned to this slot?
      const alreadyAssigned = targetSlot.volunteers.some((sv) => sv.nickname === vol.nickname);

      // Overlapping assignments?
      let hasOverlap = false;
      if (!alreadyAssigned) {
        const volSlots = allSlots.filter(
          (s) => s.id !== targetSlot.id && s.volunteers.some((sv) => sv.nickname === vol.nickname),
        );
        hasOverlap = volSlots.some((s) => slotsOverlap(s, targetSlot));
      }

      // Outside availability?
      let outsideAvailability = false;
      if (vol.available_from || vol.available_to) {
        const availFrom = vol.available_from ? new Date(vol.available_from).getTime() : -Infinity;
        const availTo = vol.available_to ? new Date(vol.available_to).getTime() : Infinity;
        outsideAvailability = targetStart < availFrom || targetEnd > availTo;
      }

      if (alreadyAssigned || hasOverlap || outsideAvailability) {
        map.set(vol.id, { hasOverlap, outsideAvailability, alreadyAssigned });
      }
    }
    return map;
  }, [volunteers, targetSlot, allSlots]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q ? volunteers.filter((v) => v.nickname.toLowerCase().includes(q)) : volunteers;
    // Sort: no conflicts first, then by least assigned hours ratio
    return [...list].sort((a, b) => {
      const aConflict = conflictMap.has(a.id) ? 1 : 0;
      const bConflict = conflictMap.has(b.id) ? 1 : 0;
      if (aConflict !== bConflict) return aConflict - bConflict;
      return (
        a.assigned_hours / Math.max(1, a.target_hours) -
        b.assigned_hours / Math.max(1, b.target_hours)
      );
    });
  }, [volunteers, search, conflictMap]);

  const handleSelect = useCallback(
    (vol: ScheduleVolunteer) => {
      onSelect(vol.id, vol.nickname);
      onClose();
      setSearch('');
    },
    [onSelect, onClose],
  );

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={() => { onClose(); setSearch(''); }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 260,
            maxHeight: 320,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            mt: 0.5,
          },
        },
      }}
    >
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          autoFocus
          size="small"
          placeholder="Szukaj wolontariusza..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
          slotProps={{
            input: { sx: { fontSize: '0.75rem', height: 30 } }
          }}
        />
      </Box>
      <Box sx={{ overflowY: 'auto', maxHeight: 260 }}>
        {filtered.length === 0 ? (
          <Typography
            variant="caption"
            sx={{
              color: "text.disabled",
              display: 'block',
              p: 2,
              textAlign: 'center',
              fontSize: '0.7rem'
            }}>
            Brak wyników
          </Typography>
        ) : (
          filtered.map((vol) => {
            const ratio = vol.target_hours > 0
              ? Math.min(1, vol.assigned_hours / vol.target_hours)
              : 0;
            const overTarget = vol.assigned_hours > vol.target_hours;
            const conflict = conflictMap.get(vol.id);

            return (
              <Box
                key={vol.id}
                onClick={() => handleSelect(vol)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  transition: 'background-color 0.1s',
                  opacity: conflict?.alreadyAssigned ? 0.4 : 1,
                }}
              >
                {/* Avatar dot */}
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: avatarColor(vol.id),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {vol.nickname.slice(0, 1).toUpperCase()}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                      }}
                    >
                      {vol.nickname}
                    </Typography>
                  </Box>
                  {conflict && !conflict.alreadyAssigned && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontSize: '0.6rem',
                        lineHeight: 1.2,
                        color: conflict.outsideAvailability ? 'error.main' : 'warning.main',
                        fontWeight: 600,
                        mt: 0.125,
                      }}
                    >
                      {conflict.outsideAvailability ? '⚠ poza dostępnością' : '⚠ nakładający się dyżur'}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <LinearProgress
                      variant="determinate"
                      value={ratio * 100}
                      sx={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: overTarget ? 'error.main' : 'primary.main',
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: 9,
                        color: overTarget ? 'error.main' : 'text.disabled',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {vol.assigned_hours}/{vol.target_hours}h
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Popover>
  );
};

export default QuickAssignPopover;
