import React, { useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { Link as RouterLink, NavLink, Outlet } from 'react-router-dom';
import logo from '../assets/images/p-logo.svg';
import { useShopSession } from './ShopSession';
import { useCart } from './Cart';
import CartDrawer from './CartDrawer';

const initials = (name: string) =>
  name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

const navSx = {
  height: 40,
  px: 1.75,
  borderRadius: '10px',
  color: 'text.secondary',
  fontWeight: 500,
  '&.active': { bgcolor: 'rgba(255,152,0,0.16)', color: 'primary.light' },
};

const ShopLayout: React.FC = () => {
  const { account, signOut } = useShopSession();
  const { count, setOpen } = useCart();
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('sm'));
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);
  const name = account?.display_name || account?.email || '';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#16213e', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: { xs: 1, sm: 3 }, minHeight: { xs: 64, sm: 72 } }}>
          <Box component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none' }}>
            <Box component="img" src={logo} alt="" sx={{ width: 36, height: 36 }} />
            {!narrow && (
              <Typography sx={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 19, color: '#fff' }}>
                PyrHouse · Sklep
              </Typography>
            )}
          </Box>
          <Box component="nav" aria-label="Sklep" sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
            <Button component={NavLink} to="/" end sx={navSx}>Katalog</Button>
            <Button component={NavLink} to="/orders" sx={navSx}>{narrow ? 'Zamówienia' : 'Moje zamówienia'}</Button>
          </Box>
          {narrow ? (
            <IconButton onClick={() => setOpen(true)} aria-label={`Koszyk, ${count} szt.`} sx={{ color: 'primary.main' }}>
              <Badge badgeContent={count} color="primary"><ShoppingCartOutlinedIcon /></Badge>
            </IconButton>
          ) : (
            <Button
              variant="contained"
              onClick={() => setOpen(true)}
              startIcon={<ShoppingCartOutlinedIcon />}
              aria-label={`Koszyk, ${count} szt.`}
              sx={{ height: 44, borderRadius: '10px' }}
            >
              Koszyk
              <Box component="span" sx={{ ml: 1, minWidth: 22, height: 22, px: 0.75, borderRadius: 999, bgcolor: '#1b1204', color: '#ffb74d', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {count}
              </Box>
            </Button>
          )}
          <IconButton onClick={(e) => setMenuEl(e.currentTarget)} aria-label="Konto" sx={{ p: 0.5 }}>
            <Avatar src={account?.avatar_url ?? undefined} sx={{ width: 34, height: 34, bgcolor: '#00838f', fontSize: 14 }}>
              {initials(name)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)}>
            <MenuItem disabled>
              <ListItemText primary={account?.display_name || '—'} secondary={account?.email} />
            </MenuItem>
            <MenuItem onClick={() => { setMenuEl(null); signOut(); }}>Wyloguj</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3.5 }, maxWidth: 1440, mx: 'auto' }}>
        <Outlet />
      </Box>
      <CartDrawer />
    </Box>
  );
};

export default ShopLayout;
