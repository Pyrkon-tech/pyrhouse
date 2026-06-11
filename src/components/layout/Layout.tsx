import React, { useState, useEffect, Suspense } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme, useMediaQuery } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Layout.styles';
import pyrkonLogo from '../../assets/images/p-logo.svg';
import { useAuth } from '../../hooks/useAuth';
import { useStorage } from '../../hooks/useStorage';
import BreadcrumbsComponent from './BreadcrumbsComponent';
import { designTokens } from '../../theme/designTokens';
import { getAdminMenuItems } from './navigation';
import SidebarNav from './SidebarNav';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const DRAWER_WIDTH = 220;
const RAIL_WIDTH = 56;
const SIDEBAR_STATE_KEY = 'sidebar_open';
const SCROLL_THRESHOLD = 50; // Minimalny próg przewijania w pikselach
const SCROLL_DELAY = 150; // Opóźnienie w milisekundach (tylko dla chowania paska)

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDispatch = location.pathname === '/dispatch';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(() => {
    if (window.innerWidth <= 600) return false;
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string>('');
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollTimer, setScrollTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Auth state comes from AuthContext; redirect on invalid token is PrivateRoute's job
  const { userRole, userId, handleLogout } = useAuth();
  const { getUsername } = useStorage();
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isMobile ? '0px' : `${open ? DRAWER_WIDTH : RAIL_WIDTH}px`
    );
    if (!isMobile) {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(open));
    }
  }, [open, isMobile]);

  useEffect(() => {
    const storedUsername = getUsername();
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, [getUsername]);

  // Obsługa resize i scroll
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 600;
      setOpen(!mobile);
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Sprawdź, czy przekroczono próg przewijania
      if (Math.abs(currentScrollY - lastScrollY) < SCROLL_THRESHOLD) {
        return;
      }

      // Przewijanie w górę - natychmiastowa reakcja
      if (currentScrollY < lastScrollY) {
        setScrollDirection('up');
        setLastScrollY(currentScrollY);
        return;
      }

      // Przewijanie w dół - opóźniona reakcja
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }

      const newTimer = setTimeout(() => {
        setScrollDirection('down');
        setLastScrollY(currentScrollY);
      }, SCROLL_DELAY);

      setScrollTimer(newTimer);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
    };
  }, [lastScrollY, scrollTimer]);

  // Ustaw aktywny element na podstawie aktualnej ścieżki
  useEffect(() => {
    setActiveItem(location.pathname);
  }, [location.pathname]);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
  };

  const handleMenuItemClick = (path: string): void => {
    setActiveItem(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const adminMenuItems = getAdminMenuItems(userRole);
  const showFullNav = open || isMobile;

  const virtualParents: Record<string, string[]> = {
    reservations: ['add-item', 'reservations'],
  };

  const generateBreadcrumbs = () => {
    const raw = window.location.pathname.split('/').filter((x) => x);
    if (raw.length === 1 && ['home', 'dispatch'].includes(raw[0])) return null;
    const pathnames = raw.length === 1 && virtualParents[raw[0]] ? virtualParents[raw[0]] : raw;
    return <BreadcrumbsComponent pathnames={pathnames} />;
  };

  return (
    <Box sx={styles.root}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          ...styles.appBar,
          transform: isMobile && scrollDirection === 'down' && window.scrollY > 100 ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.3s ease-in-out',
          visibility: 'visible',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <Suspense fallback={null}>
              <MenuIcon />
            </Suspense>
          </IconButton>

          <Box
            onClick={() => navigate('/home')}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <Box
              component="img"
              src={pyrkonLogo}
              alt="Pyrkon Logo"
              sx={{
                height: '42px',
                width: 'auto',
                mr: 0.5,
                mt: -0.5,
                filter: theme.palette.mode === 'light'
                  ? 'drop-shadow(0px 0px 4px rgba(255, 152, 0, 0.4))'
                  : 'drop-shadow(0px 0px 6px rgba(255, 152, 0, 0.5))',
                '&:hover': {
                  filter: theme.palette.mode === 'light'
                    ? 'drop-shadow(0px 0px 8px rgba(255, 152, 0, 0.6)) drop-shadow(0px 0px 16px rgba(255, 152, 0, 0.3))'
                    : 'drop-shadow(0px 0px 10px rgba(255, 152, 0, 0.7)) drop-shadow(0px 0px 20px rgba(255, 152, 0, 0.4))',
                  transform: 'scale(1.08)',
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontFamily: designTokens.typography.fontFamily.secondary,
                fontWeight: 600,
                letterSpacing: '0.05em',
                background: theme.palette.mode === 'dark'
                  ? designTokens.gradients.primary
                  : 'inherit',
                WebkitBackgroundClip: theme.palette.mode === 'dark' ? 'text' : 'unset',
                WebkitTextFillColor: theme.palette.mode === 'dark' ? 'transparent' : 'inherit',
                '&:hover': { opacity: 0.9 },
              }}
            >
              yrhouse
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Theme Toggle - minimalistyczny z ikonami, ukryty na mobile */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <ThemeToggle variant="toolbar" />
            </Box>

            <UserMenu
              username={username}
              userRole={userRole}
              userId={userId}
              onLogout={handleLogout}
              onMenuClose={() => setMobileOpen(false)}
            />
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: 'block',
          '& .MuiDrawer-paper': {
            width: isMobile ? '100%' : open ? DRAWER_WIDTH : RAIL_WIDTH,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.6, 1)',
            marginTop: isMobile ? 0 : '64px',
            height: isMobile ? '100%' : 'calc(100% - 64px)',
            background: theme.palette.mode === 'dark'
              ? designTokens.gradients.darkSidebar
              : 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
            borderRight: theme.palette.mode === 'dark'
              ? `1px solid ${designTokens.darkPalette.border.subtle}`
              : '1px solid rgba(0, 0, 0, 0.06)',
          },
        }}
      >
        <SidebarNav
          activeItem={activeItem}
          showFullNav={showFullNav}
          isMobile={isMobile}
          adminItems={adminMenuItems}
          onItemClick={handleMenuItemClick}
        />
      </Drawer>

      <Box
        component="main"
        sx={{
          ...styles.mainContent,
          marginLeft: isMobile ? '0px' : `${open ? DRAWER_WIDTH : RAIL_WIDTH}px`,
          width: isMobile ? '100%' : `calc(100% - ${open ? DRAWER_WIDTH : RAIL_WIDTH}px)`,
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.6, 1), width 0.25s cubic-bezier(0.4, 0, 0.6, 1)',
          ...(isDispatch && { bgcolor: '#060e1a' }),
        }}
      >
        <Suspense fallback={<div>Ładowanie...</div>}>
          {generateBreadcrumbs()}
          {children}
        </Suspense>
      </Box>
    </Box>
  );
};

export default Layout;
