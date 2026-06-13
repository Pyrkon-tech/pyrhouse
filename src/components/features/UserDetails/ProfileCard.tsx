import React, { Suspense, lazy } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Avatar,
  Chip,
  useTheme,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import MergeIcon from '@mui/icons-material/MergeType';
import { env } from '../../../config/env';
import type { UserDetails } from '../../../types/user.types';
import { DiscordIcon, GoogleIcon, DISCORD_COLOR, GOOGLE_COLOR } from './brandIcons';
import { getRoleColor } from './roleColors';

const BadgeIcon = lazy(() => import('@mui/icons-material/Badge'));
const StarIcon = lazy(() => import('@mui/icons-material/Star'));

interface ProfileCardProps {
  user: UserDetails;
  isAdmin: boolean;
  isModerator: boolean;
  isOwner: boolean;
  hasDiscord: boolean;
  hasGoogle: boolean;
  onOpenPointsDialog: () => void;
  onLinkDiscord: () => void;
  onLinkGoogle: () => void;
  onOpenMergeDialog: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  isAdmin,
  isModerator,
  isOwner,
  hasDiscord,
  hasGoogle,
  onOpenPointsDialog,
  onLinkDiscord,
  onLinkGoogle,
  onOpenMergeDialog,
}) => {
  const theme = useTheme();
  const displayName = user.fullname || user.username;

  return (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
        <Avatar
          src={user.avatar_url || undefined}
          sx={{ width: 120, height: 120, mb: 2, bgcolor: theme.palette.primary.main, fontSize: '3rem' }}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>

        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
          {displayName}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip
            label={user.role.toUpperCase()}
            color={getRoleColor(user.role)}
            icon={<Suspense fallback={null}><BadgeIcon sx={{ ml: 1 }} /></Suspense>}
          />
          {hasDiscord && (
            <Chip
              label="Discord"
              size="small"
              sx={{ bgcolor: `${DISCORD_COLOR}14`, color: DISCORD_COLOR, fontWeight: 600 }}
              icon={<DiscordIcon size={14} />}
            />
          )}
        </Box>

        <Divider sx={{ width: '100%', my: 1 }} />

        <Box sx={{ width: '100%' }}>
          {/* Punkty — admin only */}
          {isAdmin && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Suspense fallback={null}><StarIcon /></Suspense>
                <Typography variant="body1" sx={{
                  fontWeight: "bold"
                }}>
                  EXP: {user.points ?? 0}
                </Typography>
              </Box>
              <Button variant="outlined" size="small" onClick={onOpenPointsDialog} sx={{ borderRadius: 1 }}>
                Ustaw XP
              </Button>
            </Box>
          )}

          {/* Discord — status + link */}
          <Box sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1,
            border: '1px solid',
            borderColor: hasDiscord ? DISCORD_COLOR : 'divider',
            bgcolor: hasDiscord ? `${DISCORD_COLOR}08` : 'background.paper',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DiscordIcon />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: "bold",
                  color: DISCORD_COLOR
                }}>
                Discord
              </Typography>
              <Chip
                label={hasDiscord ? user.discord_username : 'Niepołączono'}
                size="small"
                sx={{
                  ml: 'auto',
                  ...(hasDiscord
                    ? { bgcolor: DISCORD_COLOR, color: '#fff' }
                    : {}),
                }}
                variant={hasDiscord ? 'filled' : 'outlined'}
              />
            </Box>

            {!hasDiscord && (isAdmin || isModerator) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                {isAdmin && env.HAS_DISCORD && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={onLinkDiscord}
                    sx={{
                      borderColor: DISCORD_COLOR,
                      color: DISCORD_COLOR,
                      '&:hover': { borderColor: '#4752C4', bgcolor: `${DISCORD_COLOR}14` },
                    }}
                    fullWidth
                  >
                    Połącz z Discord
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<MergeIcon />}
                  onClick={onOpenMergeDialog}
                  sx={{
                    borderColor: 'warning.main',
                    color: 'warning.dark',
                    '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' },
                  }}
                  fullWidth
                >
                  Scal konta Discord
                </Button>
              </Box>
            )}
          </Box>

          {/* Google — status + link */}
          {(hasGoogle || isOwner || isAdmin || isModerator) && (
            <Box sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1,
              border: '1px solid',
              borderColor: hasGoogle ? GOOGLE_COLOR : 'divider',
              bgcolor: hasGoogle ? 'rgba(66,133,244,0.05)' : 'background.paper',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GoogleIcon />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color: GOOGLE_COLOR
                  }}>
                  Google
                </Typography>
                <Chip
                  label={hasGoogle ? (user.google_email ?? 'Połączono') : 'Niepołączono'}
                  size="small"
                  sx={{
                    ml: 'auto',
                    ...(hasGoogle
                      ? { bgcolor: GOOGLE_COLOR, color: '#fff' }
                      : {}),
                  }}
                  variant={hasGoogle ? 'filled' : 'outlined'}
                />
              </Box>

              {!hasGoogle && isOwner && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={onLinkGoogle}
                    sx={{
                      borderColor: GOOGLE_COLOR,
                      color: GOOGLE_COLOR,
                      '&:hover': { borderColor: '#1a73e8', bgcolor: 'rgba(66,133,244,0.08)' },
                    }}
                    fullWidth
                  >
                    Połącz z Google (@pyrkon.pl)
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
