import React from 'react';
import { Box, Chip, Link, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import StorefrontIcon from '@mui/icons-material/Storefront';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { env } from '../../../config/env';

export type ShopAdminTab = 'orders' | 'summary' | 'products' | 'access' | 'settings';

const TABS: { key: ShopAdminTab; label: string; path: string }[] = [
  { key: 'orders', label: 'Zamówienia', path: '/shop-admin/orders' },
  { key: 'summary', label: 'Podsumowanie', path: '/shop-admin/summary' },
  { key: 'products', label: 'Produkty', path: '/shop-admin/products' },
  { key: 'access', label: 'Dostępy', path: '/shop-admin/access' },
  { key: 'settings', label: 'Terminy i ustawienia', path: '/shop-admin/settings' },
];

interface ShopAdminTabsProps {
  active: ShopAdminTab;
  /** Submitted orders waiting for a decision, shown on the Zamówienia tab */
  pending?: number;
}

/**
 * Section header of the warehouse "Sklep" pages (mockup ShopAdminTabs, menu variant B / D28):
 * one menu entry, subpages as tabs, each tab its own route.
 */
const ShopAdminTabs: React.FC<ShopAdminTabsProps> = ({ active, pending }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      mb: 3,
      borderBottom: 1,
      borderColor: 'divider',
      flexWrap: { xs: 'wrap', md: 'nowrap' },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <StorefrontIcon color="primary" fontSize="small" />
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Sklep
      </Typography>
    </Box>
    <Tabs
      value={active}
      variant="scrollable"
      scrollButtons="auto"
      aria-label="Sekcja Sklep"
      sx={{ flexGrow: 1, minHeight: 48 }}
    >
      {TABS.map((t) => (
        <Tab
          key={t.key}
          value={t.key}
          component={RouterLink}
          to={t.path}
          sx={{ minHeight: 48 }}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {t.label}
              {t.key === 'orders' && !!pending && (
                <Chip label={pending} size="small" color="primary" sx={{ height: 20, fontWeight: 700 }} />
              )}
            </Box>
          }
        />
      ))}
    </Tabs>
    {env.SHOP_URL && (
      <Link
        href={env.SHOP_URL}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13, color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        Otwórz sklep <OpenInNewIcon sx={{ fontSize: 14 }} />
      </Link>
    )}
  </Box>
);

export default ShopAdminTabs;
