import React from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import LazyIcon from '../ui/LazyIcon';
import { designTokens } from '../../theme/designTokens';
import { Icons, NAV_MENU_ITEMS, AdminMenuItem } from './navigation';

interface SidebarNavProps {
  activeItem: string;
  showFullNav: boolean;
  isMobile: boolean;
  adminItems: AdminMenuItem[];
  onItemClick: (path: string) => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ activeItem, showFullNav, isMobile, adminItems, onItemClick }) => {
  const navItemSx = (isActive: boolean): object => ({
    borderRadius: '8px',
    mx: showFullNav ? 1 : 0.5,
    my: 0.15,
    py: 0.65,
    pl: showFullNav ? 1.5 : 0,
    pr: showFullNav ? 1.5 : 0,
    justifyContent: showFullNav ? 'flex-start' : 'center',
    minHeight: 40,
    background: isActive ? designTokens.gradients.primary : 'transparent',
    color: isActive ? '#ffffff' : 'text.primary',
    boxShadow: isActive ? designTokens.glow.orangeSubtle : 'none',
    '&:hover': {
      background: isActive
        ? designTokens.gradients.hero
        : (theme: { palette: { mode: string } }) => theme.palette.mode === 'dark'
          ? 'rgba(255, 152, 0, 0.12)'
          : 'rgba(255, 152, 0, 0.08)',
      transform: showFullNav ? 'translateX(4px)' : 'scale(1.08)',
      boxShadow: isActive ? designTokens.glow.orange : 'none',
    },
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    ...(showFullNav && {
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: isActive ? '4px' : '3px',
        height: isActive ? '80%' : '0%',
        background: isActive ? '#ffffff' : designTokens.colors.primary[500],
        borderRadius: '0 4px 4px 0',
        transition: 'all 0.25s ease-in-out',
        boxShadow: isActive ? '0 0 8px rgba(255, 255, 255, 0.5)' : 'none',
      },
    }),
  });

  const navIconSx = (isActive: boolean): object => ({
    color: isActive ? '#ffffff' : 'primary.main',
    minWidth: showFullNav ? '36px' : 0,
    justifyContent: 'center',
    transition: 'color 0.2s ease, min-width 0.2s ease',
    '& .MuiSvgIcon-root': {
      fontSize: '1.2rem',
      filter: isActive ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))' : 'none',
    },
  });

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      pt: isMobile ? '64px' : 0.5,
      overflowX: 'hidden',
    }}>
      <List sx={{ flexGrow: 1, px: 0 }}>
        {NAV_MENU_ITEMS.map((item, index) => (
          item.type === 'divider' ? (
            <Box key={`divider-${index}`}>
              <Divider sx={{ my: showFullNav ? 0.75 : 0.5, mx: showFullNav ? 1.5 : 0.75 }} />
              {showFullNav && (
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{
                    px: 2.5,
                    py: 0.4,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                  }}
                >
                  <LazyIcon>{item.icon}</LazyIcon>
                  {item.label}
                </Typography>
              )}
            </Box>
          ) : isMobile && item.path === '/dispatch' ? null : (
            <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
              <Tooltip title={!showFullNav ? item.label : ''} placement="right" arrow>
                <ListItemButton
                  component={RouterLink}
                  to={item.path!}
                  onClick={() => item.path && onItemClick(item.path)}
                  sx={navItemSx(activeItem === item.path)}
                >
                  <ListItemIcon sx={navIconSx(activeItem === item.path)}>
                    <LazyIcon>{item.icon}</LazyIcon>
                  </ListItemIcon>
                  {showFullNav && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: activeItem === item.path ? 600 : 400,
                        fontSize: '0.875rem',
                        letterSpacing: '0.01em',
                        noWrap: true,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        ))}
      </List>

      {adminItems.length > 0 && (
        <>
          <Divider sx={{ my: showFullNav ? 0.75 : 0.5, mx: showFullNav ? 1.5 : 0.75 }} />
          {showFullNav && (
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{
                px: 2.5,
                py: 0.4,
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <LazyIcon>
                <Icons.AdminPanelSettings sx={{ fontSize: '1rem' }} />
              </LazyIcon>
              Admin
            </Typography>
          )}
          <List sx={{ pb: 1 }}>
            {adminItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
                <Tooltip title={!showFullNav ? item.label : ''} placement="right" arrow>
                  <ListItemButton
                    component={RouterLink}
                    to={item.path}
                    onClick={() => onItemClick(item.path)}
                    sx={navItemSx(activeItem === item.path)}
                  >
                    <ListItemIcon sx={navIconSx(activeItem === item.path)}>
                      <LazyIcon>{item.icon}</LazyIcon>
                    </ListItemIcon>
                    {showFullNav && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: activeItem === item.path ? 600 : 400,
                          fontSize: '0.875rem',
                          letterSpacing: '0.01em',
                          noWrap: true,
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
};

export default SidebarNav;
