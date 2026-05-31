import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme, useMediaQuery } from '@mui/material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import styles from './Layout.styles';
import pyrkonLogo from '../../assets/images/p-logo.svg';
import { useThemeMode } from '../../theme/ThemeContext';
import { jwtDecode } from 'jwt-decode';
import { useTokenValidation } from '../../hooks/useTokenValidation';
import { useStorage } from '../../hooks/useStorage';
import { useAnimationPreference } from '../../hooks/useAnimationPreference';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import BreadcrumbsComponent from './BreadcrumbsComponent';
import LazyIcon from '../ui/LazyIcon';
import { designTokens } from '../../theme/designTokens';
// Lazy loading dla ikon
const Home = lazy(() => import('@mui/icons-material/Home'));
const AutoAwesome = lazy(() => import('@mui/icons-material/AutoAwesome'));
const RocketLaunch = lazy(() => import('@mui/icons-material/RocketLaunch'));
const Quiz = lazy(() => import('@mui/icons-material/Quiz'));
const Inventory2 = lazy(() => import('@mui/icons-material/Inventory2'));
const AddTask = lazy(() => import('@mui/icons-material/AddTask'));
const ConfirmationNumber = lazy(() => import('@mui/icons-material/ConfirmationNumber'));
const Warehouse = lazy(() => import('@mui/icons-material/Warehouse'));
const EditLocationAlt = lazy(() => import('@mui/icons-material/EditLocationAlt'));
const Category = lazy(() => import('@mui/icons-material/Category'));
const People = lazy(() => import('@mui/icons-material/People'));
const AdminPanelSettings = lazy(() => import('@mui/icons-material/AdminPanelSettings'));
const Person = lazy(() => import('@mui/icons-material/Person'));
const ExpandMore = lazy(() => import('@mui/icons-material/ExpandMore'));
const AccountCircle = lazy(() => import('@mui/icons-material/AccountCircle'));
const LightMode = lazy(() => import('@mui/icons-material/LightMode'));
const DarkMode = lazy(() => import('@mui/icons-material/DarkMode'));
const SettingsBrightness = lazy(() => import('@mui/icons-material/SettingsBrightness'));
const Animation = lazy(() => import('@mui/icons-material/Animation'));
const BlockTwoTone = lazy(() => import('@mui/icons-material/BlockTwoTone'));
const Logout = lazy(() => import('@mui/icons-material/Logout'));
const MedicalServices = lazy(() => import('@mui/icons-material/MedicalServices'));
const LocalShipping = lazy(() => import('@mui/icons-material/LocalShipping'));
const Help = lazy(() => import('@mui/icons-material/Help'));
const Event = lazy(() => import('@mui/icons-material/Event'));
const Source = lazy(() => import('@mui/icons-material/Source'));
const SettingsIcon = lazy(() => import('@mui/icons-material/Settings'));
const MapIcon = lazy(() => import('@mui/icons-material/Map'));
const Outbox = lazy(() => import('@mui/icons-material/Outbox'));
const AddBusiness = lazy(() => import('@mui/icons-material/AddBusiness'));
const ShoppingBasket = lazy(() => import('@mui/icons-material/ShoppingBasket'));
const CalculateIcon = lazy(() => import('@mui/icons-material/Calculate'));

interface JwtPayload {
  role: string;
  userID: number;
  exp: number;
}

// Stała określająca margines bezpieczeństwa w sekundach (5 minut)
const SAFETY_MARGIN = 5 * 60;
const DRAWER_WIDTH = 220;
const RAIL_WIDTH = 56;
const SIDEBAR_STATE_KEY = 'sidebar_open';

interface LayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  path?: string;
  label: string;
  icon: React.ReactNode;
  type?: 'divider';
}

const Icons = {
  Home,
  AutoAwesome,
  RocketLaunch,
  Quiz,
  Inventory2,
  AddTask,
  ConfirmationNumber,
  Warehouse,
  EditLocationAlt,
  Category,
  People,
  AdminPanelSettings,
  Menu: MenuIcon,
  Person,
  ExpandMore,
  AccountCircle,
  LightMode,
  DarkMode,
  SettingsBrightness,
  Animation,
  BlockTwoTone,
  Logout,
  MedicalServices,
  LocalShipping,
  Help,
  Event,
  Source,
  Settings: SettingsIcon,
  Map: MapIcon,
  Outbox,
  AddBusiness,
  ShoppingBasket,
  Calculate: CalculateIcon,
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTokenValid } = useTokenValidation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(() => {
    if (window.innerWidth <= 600) return false;
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { themeMode, setThemeMode } = useThemeMode();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeItem, setActiveItem] = useState<string>('');
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollTimer, setScrollTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const SCROLL_THRESHOLD = 50; // Minimalny próg przewijania w pikselach
  const SCROLL_DELAY = 150; // Opóźnienie w milisekundach (tylko dla chowania paska)
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);
  const { prefersAnimations, toggleAnimations, isSystemReducedMotion } = useAnimationPreference();
  const { getToken, removeToken, getUsername } = useStorage();
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

  const handleLogout = useCallback(() => {
    removeToken();
    navigate('/login');
  }, [navigate, removeToken]);

  // Walidacja tokenu
  useEffect(() => {
    const token = getToken();
    if (!token || !isTokenValid) {
      handleLogout();
      return;
    }

    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      
      // Dodajemy margines bezpieczeństwa - token jest uznawany za nieważny 5 minut przed faktycznym wygaśnięciem
      if (decodedToken.exp < currentTime + SAFETY_MARGIN) {
        handleLogout();
        return;
      }
      
      setUserRole(decodedToken.role);
      setUserId(decodedToken.userID);
    } catch (error) {
      console.error('Błąd dekodowania tokenu:', error);
      handleLogout();
    }
  }, [isTokenValid, handleLogout, getToken]);

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
    const path = location.pathname;
    setActiveItem(path);
  }, [location.pathname]);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
  };

  // Jeśli token jest nieważny, nie renderuj komponentu
  if (!isTokenValid) {
    handleLogout();
  }

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
    setMobileOpen(false);
  };

  const handleProfileClick = () => {
    handleUserMenuClose();
    if (userId) {
      navigate(`/users/${userId}`);
    }
  };

  // Funkcja sprawdzająca, czy użytkownik ma uprawnienia administratora
  const hasAdminAccess = () => {
    return userRole === 'admin' || userRole === 'moderator';
  };

  const handleMenuItemClick = (path: string): void => {
    setActiveItem(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const menuItems: MenuItem[] = [
    { path: '/home', label: 'Home', icon: <Icons.Home /> },
    {
      type: 'divider',
      label: 'Zamówienia',
      icon: <Icons.AutoAwesome sx={{ fontSize: '0.9rem' }} />
    },
    { path: '/dispatch', label: 'Mapa Dispatch', icon: <Icons.Map /> },
    { path: '/quests', label: 'Zapotrzebowanie', icon: <Icons.AddBusiness /> },
    { path: '/servicedesk', label: 'Service Desk', icon: <Icons.MedicalServices /> },
    {
      type: 'divider',
      label: 'Wydania',
      icon: <Icons.LocalShipping sx={{ fontSize: '0.9rem' }} />
    },
    { path: '/transfers/create', label: 'Nowe wydanie', icon: <Icons.RocketLaunch /> },
    { path: '/transfers', label: 'Wydania', icon: <Icons.ShoppingBasket /> },
    {
      type: 'divider',
      label: 'Magazyn',
      icon: <Icons.Inventory2 sx={{ fontSize: '0.9rem' }} />
    },
    { path: '/add-item', label: 'Dodaj sprzęt', icon: <Icons.AddTask /> },
    { path: '/list', label: 'Stan Magazynowy', icon: <Icons.Warehouse /> },
    { path: '/locations', label: 'Lokalizacje', icon: <Icons.EditLocationAlt /> },
    {
      type: 'divider',
      label: 'Po Pyrkonie',
      icon: <Icons.Outbox sx={{ fontSize: '0.9rem' }} />
    },
    { path: '/releases', label: 'Demontażkon', icon: <Icons.Outbox /> },
  ];

  const adminMenuItems = [
    { path: '/duty-schedule', label: 'Grafik', icon: <Icons.Event />, adminOnly: false },
    { path: '/categories', label: 'Kategorie', icon: <Icons.Category />, adminOnly: false },
    { path: '/origins', label: 'Pochodzenie', icon: <Icons.Source />, adminOnly: false },
    { path: '/budget', label: 'Budżet', icon: <Icons.Calculate />, adminOnly: true },
    { path: '/users', label: 'Użytkownicy', icon: <Icons.People />, adminOnly: false },
    { path: '/settings', label: 'Ustawienia', icon: <Icons.Settings />, adminOnly: true },
  ].filter(item => !item.adminOnly || userRole === 'admin');

  const showFullNav = open || isMobile;

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

  const drawer = (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      pt: isMobile ? '64px' : 0.5,
      overflowX: 'hidden',
    }}>
      <List sx={{ flexGrow: 1, px: 0 }}>
        {menuItems.map((item, index) => (
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
                  onClick={() => item.path && handleMenuItemClick(item.path)}
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

      {hasAdminAccess() && (
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
            {adminMenuItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
                <Tooltip title={!showFullNav ? item.label : ''} placement="right" arrow>
                  <ListItemButton
                    component={RouterLink}
                    to={item.path}
                    onClick={() => handleMenuItemClick(item.path)}
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
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 0.5,
                p: 0.5,
                borderRadius: '12px',
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.04)',
                border: theme.palette.mode === 'dark'
                  ? `1px solid ${designTokens.darkPalette.border.subtle}`
                  : '1px solid rgba(0, 0, 0, 0.08)',
              }}
            >
              <Tooltip title="Jasny motyw">
                <IconButton
                  size="small"
                  onClick={() => setThemeMode('light')}
                  sx={{
                    p: 0.75,
                    borderRadius: '8px',
                    background: themeMode === 'light'
                      ? designTokens.gradients.primary
                      : 'transparent',
                    color: themeMode === 'light' ? '#fff' : 'text.secondary',
                    boxShadow: themeMode === 'light' ? designTokens.glow.orangeSubtle : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: themeMode === 'light'
                        ? designTokens.gradients.hero
                        : 'rgba(255, 152, 0, 0.1)',
                    },
                  }}
                >
                  <LazyIcon>
                    <Icons.LightMode sx={{ fontSize: 20 }} />
                  </LazyIcon>
                </IconButton>
              </Tooltip>
              <Tooltip title="Motyw systemowy">
                <IconButton
                  size="small"
                  onClick={() => setThemeMode('system')}
                  sx={{
                    p: 0.75,
                    borderRadius: '8px',
                    background: themeMode === 'system'
                      ? designTokens.gradients.primary
                      : 'transparent',
                    color: themeMode === 'system' ? '#fff' : 'text.secondary',
                    boxShadow: themeMode === 'system' ? designTokens.glow.orangeSubtle : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: themeMode === 'system'
                        ? designTokens.gradients.hero
                        : 'rgba(255, 152, 0, 0.1)',
                    },
                  }}
                >
                  <LazyIcon>
                    <Icons.SettingsBrightness sx={{ fontSize: 20 }} />
                  </LazyIcon>
                </IconButton>
              </Tooltip>
              <Tooltip title="Ciemny motyw">
                <IconButton
                  size="small"
                  onClick={() => setThemeMode('dark')}
                  sx={{
                    p: 0.75,
                    borderRadius: '8px',
                    background: themeMode === 'dark'
                      ? designTokens.gradients.primary
                      : 'transparent',
                    color: themeMode === 'dark' ? '#fff' : 'text.secondary',
                    boxShadow: themeMode === 'dark' ? designTokens.glow.orangeSubtle : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: themeMode === 'dark'
                        ? designTokens.gradients.hero
                        : 'rgba(255, 152, 0, 0.1)',
                    },
                  }}
                >
                  <LazyIcon>
                    <Icons.DarkMode sx={{ fontSize: 20 }} />
                  </LazyIcon>
                </IconButton>
              </Tooltip>
            </Box>

            <Tooltip title="Menu użytkownika">
              <IconButton
                onClick={handleUserMenuOpen}
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
                    {userId ? (username || 'Użytkownik') : ''}
                  </Typography>
                  <LazyIcon>
                    <Icons.ExpandMore sx={{ fontSize: 20, color: 'primary.main' }} />
                  </LazyIcon>
                </Box>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
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
                      {userId ? (username || 'Użytkownik') : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {userRole === 'admin' ? 'Administrator' : userRole === 'moderator' ? 'Moderator' : userRole === 'dispatcher' ? 'Dyspozytor' : 'Użytkownik'}
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
                  onClick={() => { handleUserMenuClose(); navigate('/tutorial'); }}
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
                  onClick={() => { handleUserMenuClose(); navigate('/my-schedule'); }}
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
                    <Box sx={{
                      display: 'flex',
                      gap: 0.5,
                      p: 0.5,
                      borderRadius: '10px',
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.04)',
                      border: theme.palette.mode === 'dark'
                        ? `1px solid ${designTokens.darkPalette.border.subtle}`
                        : '1px solid rgba(0, 0, 0, 0.08)',
                    }}>
                      {([
                        { mode: 'light' as const, icon: <Icons.LightMode sx={{ fontSize: 18 }} />, label: 'Jasny' },
                        { mode: 'system' as const, icon: <Icons.SettingsBrightness sx={{ fontSize: 18 }} />, label: 'Systemowy' },
                        { mode: 'dark' as const, icon: <Icons.DarkMode sx={{ fontSize: 18 }} />, label: 'Ciemny' },
                      ]).map(({ mode, icon, label }) => (
                        <Tooltip key={mode} title={label}>
                          <IconButton
                            size="small"
                            onClick={() => setThemeMode(mode)}
                            sx={{
                              flex: 1,
                              p: 0.75,
                              borderRadius: '7px',
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
                            <LazyIcon>{icon}</LazyIcon>
                          </IconButton>
                        </Tooltip>
                      ))}
                    </Box>
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

                <MenuItem onClick={() => { handleUserMenuClose(); handleLogout(); }} sx={{
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
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          ...styles.mainContent,
          marginLeft: isMobile ? '0px' : `${open ? DRAWER_WIDTH : RAIL_WIDTH}px`,
          width: isMobile ? '100%' : `calc(100% - ${open ? DRAWER_WIDTH : RAIL_WIDTH}px)`,
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.6, 1), width 0.25s cubic-bezier(0.4, 0, 0.6, 1)',
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
