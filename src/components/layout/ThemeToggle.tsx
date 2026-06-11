import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material';
import LazyIcon from '../ui/LazyIcon';
import { designTokens } from '../../theme/designTokens';
import { useThemeMode } from '../../theme/ThemeContext';
import { Icons } from './navigation';

interface ThemeToggleProps {
  /** 'toolbar' — desktop AppBar; 'menu' — compact full-width variant inside the user menu */
  variant?: 'toolbar' | 'menu';
}

const MODES = [
  { mode: 'light' as const, Icon: Icons.LightMode, label: 'Jasny motyw' },
  { mode: 'system' as const, Icon: Icons.SettingsBrightness, label: 'Motyw systemowy' },
  { mode: 'dark' as const, Icon: Icons.DarkMode, label: 'Ciemny motyw' },
];

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'toolbar' }) => {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const isMenu = variant === 'menu';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        p: 0.5,
        borderRadius: isMenu ? '10px' : '12px',
        background: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(0, 0, 0, 0.04)',
        border: theme.palette.mode === 'dark'
          ? `1px solid ${designTokens.darkPalette.border.subtle}`
          : '1px solid rgba(0, 0, 0, 0.08)',
      }}
    >
      {MODES.map(({ mode, Icon, label }) => (
        <Tooltip key={mode} title={label}>
          <IconButton
            size="small"
            onClick={() => setThemeMode(mode)}
            sx={{
              ...(isMenu && { flex: 1 }),
              p: 0.75,
              borderRadius: isMenu ? '7px' : '8px',
              background: themeMode === mode ? designTokens.gradients.primary : 'transparent',
              color: themeMode === mode ? '#fff' : 'text.secondary',
              boxShadow: themeMode === mode ? designTokens.glow.orangeSubtle : 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: themeMode === mode
                  ? designTokens.gradients.hero
                  : 'rgba(255, 152, 0, 0.1)',
              },
            }}
          >
            <LazyIcon>
              <Icon sx={{ fontSize: isMenu ? 18 : 20 }} />
            </LazyIcon>
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
};

export default ThemeToggle;
