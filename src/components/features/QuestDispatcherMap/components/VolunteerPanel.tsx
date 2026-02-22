import React, { useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import type { Volunteer } from '../types';
import VolunteerCard from './VolunteerCard';

interface VolunteerPanelProps {
  volunteers: Volunteer[];
  selectedIds?: number[];
  onVolunteerClick?: (volunteer: Volunteer) => void;
}

const STATUS_ORDER: Record<string, number> = { available: 0, on_mission: 1, offline: 2 };

const VolunteerPanel: React.FC<VolunteerPanelProps> = ({ volunteers, selectedIds = [], onVolunteerClick }) => {
  const sorted = useMemo(
    () => [...volunteers].sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3)),
    [volunteers],
  );

  const availableCount = volunteers.filter(v => v.status === 'available').length;
  const onMissionCount = volunteers.filter(v => v.status === 'on_mission').length;

  return (
    <Box
      sx={{
        bgcolor: '#060e1a',
        border: '1px solid #152535',
        borderRadius: 2,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.75,
          borderBottom: '1px solid #152535',
          bgcolor: '#050d18',
        }}
      >
        <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
          WOLONTARIUSZE NA DYŻURZE
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Chip
            label={`${availableCount} dostępnych`}
            size="small"
            sx={{ height: 18, fontSize: 9, bgcolor: '#66bb6a1a', color: '#66bb6a', border: '1px solid #66bb6a33' }}
          />
          {onMissionCount > 0 && (
            <Chip
              label={`${onMissionCount} na misji`}
              size="small"
              sx={{ height: 18, fontSize: 9, bgcolor: '#ffd54f1a', color: '#ffd54f', border: '1px solid #ffd54f33' }}
            />
          )}
        </Box>
      </Box>

      {/* Scrollable card list */}
      {sorted.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography sx={{ color: '#1a5a6a', fontFamily: 'monospace', fontSize: 11 }}>
            Brak wolontariuszy na dyżurze
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 1,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-track': { bgcolor: '#0a1929' },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#1a3548',
              borderRadius: 3,
              '&:hover': { bgcolor: '#ff9800' },
            },
          }}
        >
          {sorted.map(v => (
            <VolunteerCard
              key={v.id}
              volunteer={v}
              selected={selectedIds.includes(v.id)}
              onClick={onVolunteerClick}
              compact
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default VolunteerPanel;
