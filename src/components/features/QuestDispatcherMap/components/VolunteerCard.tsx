import React from 'react';
import { Box, Avatar, Typography, Tooltip } from '@mui/material';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import type { Volunteer, VolunteerStatus } from '../types';
import UnknownAgentAvatar from './UnknownAgentAvatar';

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
  const displayName = volunteer.username;
  const isBusy = volunteer.status === 'on_mission';
  const isUnlinked = volunteer.is_unlinked === true;
  const avatarBg = AVATAR_PALETTE[volunteer.id % AVATAR_PALETTE.length];
  const cardW = compact ? 72 : 90;
  const cardH = compact ? 108 : 130;

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
          width: cardW,
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
            width: cardW,
            height: cardH,
            borderRadius: 1.5,
            overflow: 'hidden',
            bgcolor: selected ? 'rgba(0,172,193,0.10)' : '#07111e',
            border: `2px solid ${selected ? '#00acc1' : isBusy && onClick ? '#00acc144' : '#1a3548'}`,
            boxShadow: selected ? '0 0 12px rgba(0,172,193,0.45)' : 'none',
            transition: 'all 0.2s ease',
            '&:hover': onClick ? {
              borderColor: selected ? '#00acc1' : isBusy ? '#00acc1' : '#2a4a60',
              boxShadow: isBusy ? '0 0 10px rgba(0,172,193,0.3)' : 'none',
            } : {},
          }}
        >
          {/* Avatar fills the card */}
          {isUnlinked ? (
            <Box sx={{
              width: '100%', height: '100%',
              filter: isBusy ? 'brightness(0.4)' : 'none',
              transition: 'filter 0.2s ease',
            }}>
              <UnknownAgentAvatar />
            </Box>
          ) : (
            <Avatar
              variant="square"
              src={volunteer.avatar_url || undefined}
              sx={{
                width: '100%',
                height: '100%',
                borderRadius: 0,
                bgcolor: volunteer.avatar_url ? 'transparent' : avatarBg,
                fontSize: compact ? 26 : 32,
                fontFamily: 'monospace',
                fontWeight: 700,
                filter: isBusy ? 'grayscale(0.7) brightness(0.5)' : 'none',
                transition: 'filter 0.2s ease',
              }}
            >
              {!volunteer.avatar_url && getInitials(volunteer.fullname, volunteer.username)}
            </Avatar>
          )}

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

          {/* Unlinked badge — top-right corner */}
          {isUnlinked && (
            <Tooltip title="Brak konta systemowego" placement="top">
              <Box
                sx={{
                  position: 'absolute',
                  top: isBusy ? 18 : 3,
                  right: 3,
                  bgcolor: 'rgba(6,14,26,0.85)',
                  borderRadius: '50%',
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #3a5a6a',
                }}
              >
                <LinkOffIcon sx={{ fontSize: 10, color: '#3a7a8a' }} />
              </Box>
            </Tooltip>
          )}

          {/* Name overlay — bottom of card */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: selected ? 'rgba(0,20,40,0.88)' : 'rgba(0,0,0,0.75)',
              px: 0.5,
              py: 0.5,
            }}
          >
            <Typography
              sx={{
                color: isBusy ? '#607080' : selected ? '#fff' : '#e0f4ff',
                fontFamily: 'monospace',
                fontSize: compact ? 10 : 11,
                fontWeight: 700,
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
