import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LazyIcon from '../ui/LazyIcon';
import { designTokens } from '../../theme/designTokens';
import { useAnimationPreference } from '../../hooks/useAnimationPreference';
import { Icons } from './navigation';
import ThemeToggle from './ThemeToggle';

interface UserMenuProps {
  username: string;
  userRole: string | null;
  userId: number | null;
  onLogout: () => void;
  /** Called whenever the menu closes (Layout closes the mobile drawer here) */
  onMenuClose?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  moderator: 'Moderator',
  dispatcher: 'Dyspozytor',
};

const UserMenu: React.FC<UserMenuProps> = ({ username, userRole, userId, onLogout, onMenuClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { prefersAnimations, toggleAnimations, isSystemReducedMotion } = useAnimationPreference();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);

  const handleClose = () => {
    setAnchorEl(null);
    onMenuClose?.();
  };

  const handleProfileClick = () => {
    handleClose();
    if (userId) {
      navigate(`/users/${userId}`);
    }
  };

  const displayName = userId ? (username || 'Użytkownik') : '';

  return (
    <>
      <Tooltip title="Menu użytkownika">
        <IconButton
          onClick={handleOpen}
          sx={{
            padding: '8px 12px',
            border: '1.5px solid',
            borderColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 152, 0, 0.3)'
              : 'rgba(255, 152, 0, 0.4)',
            borderRadius: '10px',
            background: theme.palette.mode === 'dark'
              ? 'rgba(255, 152, 0, 0.08)'
              : 'rgba(255, 152, 0, 0.05)',
            transition: 'all 0.25s ease',
            '&:hover': {
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 152, 0, 0.15)'
                : 'rgba(255, 152, 0, 0.12)',
              borderColor: designTokens.colors.primary[500],
              boxShadow: designTokens.glow.orangeSubtle,
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LazyIcon>
              <Icons.Person sx={{ color: 'primary.main' }} />
            </LazyIcon>
            <Typography
              variant="body2"
              sx={{
                display: { xs: 'none', sm: 'block' },
                fontWeight: 500,
                color: '#fff',
              }}
            >
              {displayName}
            </Typography>
            <LazyIcon>
              <Icons.ExpandMore sx={{ fontSize: 20, color: 'primary.main' }} />
            </LazyIcon>
          </Box>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 300,
            maxWidth: '100%',
            mt: 1.5,
            borderRadius: '12px',
            background: theme.palette.mode === 'dark'
              ? designTokens.darkPalette.background.elevated
              : '#ffffff',
            border: theme.palette.mode === 'dark'
              ? `1px solid ${designTokens.darkPalette.border.default}`
              : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: designTokens.shadows.xl,
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LazyIcon>
              <Icons.AccountCircle sx={{ fontSize: 40, color: 'primary.main' }} />
            </LazyIcon>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {ROLE_LABELS[userRole ?? ''] ?? 'Użytkownik'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 1 }}>
          <MenuItem onClick={handleProfileClick} sx={{
            borderRadius: 1,
            mb: 1,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            }
          }}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <LazyIcon>
                <Icons.AccountCircle />
              </LazyIcon>
            </ListItemIcon>
            <ListItemText
              primary="Mój profil"
              secondary="Zarządzaj swoim kontem"
              secondaryTypographyProps={{
                sx: { color: 'primary.contrastText', opacity: 0.8 }
              }}
            />
          </MenuItem>

          <MenuItem
            onClick={() => { handleClose(); navigate('/tutorial'); }}
            sx={{
              borderRadius: 1,
              mb: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              }
            }}
          >
            <ListItemIcon>
              <LazyIcon>
                <Icons.Help sx={{ color: 'primary.main' }} />
              </LazyIcon>
            </ListItemIcon>
            <ListItemText
              primary="Przewodnik po systemie"
              secondary="Poznaj podstawy obsługi aplikacji"
              secondaryTypographyProps={{
                sx: { color: 'text.secondary' }
              }}
            />
          </MenuItem>
          <MenuItem
            onClick={() => { handleClose(); navigate('/my-schedule'); }}
            sx={{ borderRadius: 1, mb: 1, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <ListItemIcon>
              <LazyIcon>
                <Icons.Event sx={{ color: 'primary.main' }} />
              </LazyIcon>
            </ListItemIcon>
            <ListItemText primary="Mój grafik" secondary="Twój harmonogram dyżurów" />
          </MenuItem>

          <Divider sx={{ my: 1 }} />

          <Typography variant="overline" sx={{ px: 1, color: 'text.secondary', display: 'block' }}>
            Ustawienia
          </Typography>

          {isMobile && (
            <Box sx={{ px: 1, py: 0.5, mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Motyw
              </Typography>
              <ThemeToggle variant="menu" />
            </Box>
          )}

          <MenuItem sx={{ borderRadius: 1 }}>
            <ListItemIcon>
              {prefersAnimations ? <LazyIcon><Icons.Animation /></LazyIcon> : <LazyIcon><Icons.BlockTwoTone /></LazyIcon>}
            </ListItemIcon>
            <ListItemText
              primary="Animacje interfejsu"
              secondary={isSystemReducedMotion ? "Wyłączone przez system" : ""}
            />
            <Switch
              edge="end"
              checked={prefersAnimations}
              onChange={toggleAnimations}
              disabled={isSystemReducedMotion}
            />
          </MenuItem>

          <Divider sx={{ my: 1 }} />

          <MenuItem onClick={() => { handleClose(); onLogout(); }} sx={{
            borderRadius: 1,
            color: 'error.main',
            '&:hover': {
              bgcolor: 'error.main',
              color: 'error.contrastText',
            }
          }}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <LazyIcon>
                <Icons.Logout />
              </LazyIcon>
            </ListItemIcon>
            <ListItemText primary="Wyloguj się" />
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
};

export default UserMenu;
