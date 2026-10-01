import React from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { Link as RouterLink } from 'react-router-dom';
import { findAdminTab, getAdminTabs } from './navigation';

interface AdminTabsProps {
  pathname: string;
  userRole: string | null;
}

/**
 * Header of the "Administracja" section (menu variant B, D28): one menu entry, the admin pages as tabs.
 * Rendered by Layout above every page of the section, so the pages themselves stay unchanged.
 */
const AdminTabs: React.FC<AdminTabsProps> = ({ pathname, userRole }) => {
  const tabs = getAdminTabs(userRole);
  const active = findAdminTab(pathname);
  if (!active || tabs.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AdminPanelSettingsIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
          Administracja
        </Typography>
      </Box>
      <Tabs
        value={tabs.some((t) => t.path === active.path) ? active.path : false}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Sekcja Administracja"
        sx={{ flexGrow: 1, minHeight: 48 }}
      >
        {tabs.map((t) => (
          <Tab key={t.path} value={t.path} label={t.label} component={RouterLink} to={t.path} sx={{ minHeight: 48 }} />
        ))}
      </Tabs>
    </Box>
  );
};

export default AdminTabs;
