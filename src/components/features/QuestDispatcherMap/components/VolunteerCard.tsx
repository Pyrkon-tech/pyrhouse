import React from 'react';
import { Box, Avatar, Typography, Tooltip } from '@mui/material';
import type { Volunteer, VolunteerStatus } from '../types';

const STATUS_LABELS: Record<VolunteerStatus, string> = {
  available: 'Dostępny',
  on_mission: 'Na misji',
  offline: 'Offline',
};

const AVATAR_PALETTE = ['#ff9800', '#00acc1', '#66bb6a', '#ffd54f', '#ef5350', '#ab47bc', '#42a5f5'];

const getInitials = (name: string | null, username: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return username.slice(0, 2).toUpperCase();
};

interface VolunteerCardProps {
  volunteer: Volunteer;
  selected?: boolean;
  onClick?: (volunteer: Volunteer) => void;
  compact?: boolean;
}

const VolunteerCard: React.FC<VolunteerCardProps> = ({ volunteer, selected, onClick, compact }) => {
  const displayName = volunteer.discord_username || volunteer.username;
  const isBusy = volunteer.status === 'on_mission';
  const avatarBg = AVATAR_PALETTE[volunteer.id % AVATAR_PALETTE.length];
  const size = compact ? 64 : 80;

  const tooltipText = volunteer.status === 'on_mission' && volunteer.current_mission
    ? `Na misji: ${volunteer.current_mission}`
    : STATUS_LABELS[volunteer.status];

  return (
    <Tooltip title={tooltipText} placement="top" arrow>
      <Box
        onClick={() => onClick?.(volunteer)}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: size,
          flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          opacity: volunteer.status === 'offline' ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {/* Card: avatar + BUSY banner + name overlay */}
        <Box
          sx={{
            position: 'relative',
            width: size,
            height: size,
            borderRadius: 1.5,
            overflow: 'hidden',
            bgcolor: selected ? 'rgba(255,152,0,0.12)' : '#07111e',
            border: `2px solid ${selected ? '#ff9800' : '#1a3548'}`,
            boxShadow: selected ? '0 0 10px rgba(255,152,0,0.25)' : 'none',
            transition: 'all 0.2s ease',
            '&:hover': onClick ? {
              borderColor: selected ? '#ff9800' : '#2a4a60',
            } : {},
          }}
        >
          {/* Avatar fills the card */}
          <Avatar
            variant="square"
            src={volunteer.avatar_url || undefined}
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: 0,
              bgcolor: volunteer.avatar_url ? 'transparent' : avatarBg,
              fontSize: compact ? 20 : 26,
              fontFamily: 'monospace',
              fontWeight: 700,
              filter: isBusy ? 'grayscale(0.7) brightness(0.5)' : 'none',
              transition: 'filter 0.2s ease',
            }}
          >
            {!volunteer.avatar_url && getInitials(volunteer.fullname, volunteer.username)}
          </Avatar>

          {/* BUSY banner — top of card */}
          {isBusy && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bgcolor: 'rgba(33,100,180,0.85)',
                py: 0.25,
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: compact ? 8 : 9,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                }}
              >
                BUSY
              </Typography>
            </Box>
          )}

          {/* Name overlay — bottom of card */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0,0,0,0.7)',
              px: 0.5,
              py: 0.25,
            }}
          >
            <Typography
              sx={{
                color: isBusy ? '#607080' : '#c8e8f5',
                fontFamily: 'monospace',
                fontSize: compact ? 8 : 9,
                fontWeight: 600,
                textAlign: 'center',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </Typography>
          </Box>

        </Box>

        {/* Mission location below the card */}
        {isBusy && volunteer.current_mission && (
          <Typography
            sx={{
              color: '#42a5f5',
              fontFamily: 'monospace',
              fontSize: 8,
              textAlign: 'center',
              lineHeight: 1,
              mt: 0.25,
            }}
          >
            {volunteer.current_mission}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default React.memo(VolunteerCard);
