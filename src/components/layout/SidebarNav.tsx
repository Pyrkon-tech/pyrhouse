import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink } from 'react-router-dom';
import LazyIcon from '../ui/LazyIcon';
import { designTokens } from '@pyrhouse/ui';
import {
  Icons,
  NEW_ACTIONS,
  NavItem,
  findAdminTab,
  getAdminTabs,
  getNavGroups,
  isNavItemActive,
} from './navigation';

interface SidebarNavProps {
  /** Current pathname */
  activeItem: string;
  showFullNav: boolean;
  isMobile: boolean;
  userRole: string | null;
  /** Counters for queue items (NavItem.badge) */
  badges: { shop?: number };
  onItemClick: (path: string) => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ activeItem, showFullNav, isMobile, userRole, badges, onItemClick }) => {
  const [newAnchor, setNewAnchor] = useState<HTMLElement | null>(null);
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

  const groupLabelSx = {
    color: 'text.secondary',
    px: 2.5,
    py: 0.4,
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  } as const;

  const renderItem = (item: NavItem, isActive: boolean, badge?: number) => {
    const tooltip = badge ? `${item.label} (${badge})` : item.label;
    return (
      <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
        <Tooltip title={!showFullNav ? tooltip : ''} placement="right" arrow>
          <ListItemButton
            component={RouterLink}
            to={item.path}
            onClick={() => onItemClick(item.path)}
            sx={navItemSx(isActive)}
          >
            <ListItemIcon sx={navIconSx(isActive)}>
              <Badge color="primary" variant="dot" invisible={showFullNav || !badge}>
                <LazyIcon>{item.icon}</LazyIcon>
              </Badge>
            </ListItemIcon>
            {showFullNav && (
              <ListItemText
                primary={item.label}
                secondary={item.tag}
                slotProps={{
                  primary: {
                    noWrap: true,
                    sx: { fontWeight: isActive ? 600 : 400, fontSize: '0.875rem', letterSpacing: '0.01em' },
                  },
                  secondary: {
                    noWrap: true,
                    sx: { fontSize: '0.68rem', color: isActive ? 'rgba(255,255,255,0.8)' : 'text.secondary' },
                  },
                }}
              />
            )}
            {showFullNav && !!badge && (
              <Chip
                label={badge}
                size="small"
                color="primary"
                aria-label={`${badge} do obsłużenia`}
                sx={{ height: 20, fontWeight: 700, ml: 1 }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const groups = getNavGroups(userRole);
  const adminTabs = getAdminTabs(userRole);
  const adminActive = !!findAdminTab(activeItem);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      pt: isMobile ? '64px' : 0.5,
      overflowX: 'hidden',
    }}>
      {/* Create actions live under one button instead of the list */}
      <Box sx={{ px: showFullNav ? 1.5 : 0.5, pt: 1, pb: 0.5, display: 'flex', justifyContent: 'center' }}>
        {showFullNav ? (
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={(e) => setNewAnchor(e.currentTarget)}
            aria-haspopup="menu"
          >
            Nowe
          </Button>
        ) : (
          <Tooltip title="Nowe" placement="right" arrow>
            <IconButton color="primary" onClick={(e) => setNewAnchor(e.currentTarget)} aria-label="Nowe" aria-haspopup="menu">
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
        <Menu
          anchorEl={newAnchor}
          open={!!newAnchor}
          onClose={() => setNewAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          {NEW_ACTIONS.map((a) => (
            <MenuItem
              key={a.path}
              component={RouterLink}
              to={a.path}
              onClick={() => {
                setNewAnchor(null);
                onItemClick(a.path);
              }}
            >
              <ListItemIcon>
                <LazyIcon>{a.icon}</LazyIcon>
              </ListItemIcon>
              {a.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <List sx={{ flexGrow: 1, px: 0, pt: 0 }}>
        {groups.map((group, gi) => (
          <Box key={group.label ?? `group-${gi}`}>
            {group.label && (
              <>
                <Divider sx={{ my: showFullNav ? 0.75 : 0.5, mx: showFullNav ? 1.5 : 0.75 }} />
                {showFullNav && <Typography variant="subtitle2" sx={groupLabelSx}>{group.label}</Typography>}
              </>
            )}
            {group.items
              .filter((item) => !(isMobile && item.hideOnMobile))
              .map((item) =>
                renderItem(item, isNavItemActive(item, activeItem), item.badge ? badges[item.badge] : undefined),
              )}
          </Box>
        ))}
      </List>

      {/* Rarely used: pinned to the bottom */}
      {adminTabs.length > 0 && (
        <>
          <Divider sx={{ my: showFullNav ? 0.75 : 0.5, mx: showFullNav ? 1.5 : 0.75 }} />
          <List sx={{ pb: 1 }}>
            {renderItem(
              { path: adminTabs[0].path, label: 'Administracja', icon: <Icons.AdminPanelSettings /> },
              adminActive,
            )}
          </List>
        </>
      )}
    </Box>
  );
};

export default SidebarNav;
