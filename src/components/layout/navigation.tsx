import React, { lazy } from 'react';
import MenuIcon from '@mui/icons-material/Menu';

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
const Storefront = lazy(() => import('@mui/icons-material/Storefront'));

export const Icons = {
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
  Storefront,
};

export type Role = 'user' | 'dispatcher' | 'moderator' | 'admin';

/**
 * Warehouse menu, variant B (docs/shop/PLAN.md, D28): short groups, queues with counters, actions under one
 * "Nowe" button, administration as one entry with tabs. Roles must match `requiredRoles` in routes.ts.
 */
export interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  /** Visible only to these roles (omitted = everyone) */
  allowedRoles?: Role[];
  /** Highlight the item for every path under these prefixes */
  activePrefixes?: string[];
  /** Counter source shown next to the label */
  badge?: 'shop';
  /** Small hint after the label */
  tag?: string;
  hideOnMobile?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { items: [{ path: '/home', label: 'Home', icon: <Icons.Home /> }] },
  {
    label: 'Operacje',
    items: [
      { path: '/dispatch', label: 'Dispatch', icon: <Icons.Map />, hideOnMobile: true },
      { path: '/quests', label: 'Zapotrzebowania', icon: <Icons.AddBusiness />, activePrefixes: ['/quests'] },
      { path: '/servicedesk', label: 'Service Desk', icon: <Icons.MedicalServices />, activePrefixes: ['/servicedesk'] },
      { path: '/transfers', label: 'Transfery', icon: <Icons.ShoppingBasket />, activePrefixes: ['/transfers'] },
      { path: '/duty-schedule', label: 'Grafik', icon: <Icons.Event />, allowedRoles: ['admin', 'moderator'] },
      { path: '/releases', label: 'Demontażkon', icon: <Icons.Outbox />, activePrefixes: ['/releases'], tag: 'po Pyrkonie' },
    ],
  },
  {
    label: 'Magazyn',
    items: [
      { path: '/list', label: 'Sprzęt', icon: <Icons.Warehouse />, activePrefixes: ['/list', '/equipment'] },
      { path: '/locations', label: 'Lokalizacje', icon: <Icons.EditLocationAlt />, activePrefixes: ['/locations'] },
      {
        path: '/shop-admin/orders',
        label: 'Sklep',
        icon: <Icons.Storefront />,
        allowedRoles: ['admin', 'moderator'],
        activePrefixes: ['/shop-admin'],
        badge: 'shop',
      },
    ],
  },
];

/** "Nowe" button: the frequent create actions, kept out of the list */
export const NEW_ACTIONS: { path: string; label: string; icon: React.ReactNode }[] = [
  { path: '/transfers/create', label: 'Transfer', icon: <Icons.RocketLaunch /> },
  { path: '/add-item', label: 'Sprzęt', icon: <Icons.AddTask /> },
  { path: '/servicedesk/request', label: 'Zgłoszenie', icon: <Icons.MedicalServices /> },
];

/** Tabs of the single "Administracja" entry; each tab keeps its own route and roles */
export const ADMIN_TABS: { path: string; label: string; allowedRoles: Role[] }[] = [
  { path: '/categories', label: 'Kategorie', allowedRoles: ['admin', 'moderator', 'dispatcher'] },
  { path: '/origins', label: 'Pochodzenie', allowedRoles: ['admin', 'moderator', 'dispatcher'] },
  { path: '/budget', label: 'Budżet', allowedRoles: ['admin'] },
  { path: '/users', label: 'Użytkownicy', allowedRoles: ['admin', 'moderator'] },
  { path: '/settings', label: 'Ustawienia', allowedRoles: ['admin'] },
];

const allowed = (roles: Role[] | undefined, userRole: string | null): boolean =>
  !roles || (userRole != null && (roles as string[]).includes(userRole));

export const getNavGroups = (userRole: string | null): NavGroup[] =>
  NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allowed(i.allowedRoles, userRole)) })).filter(
    (g) => g.items.length > 0,
  );

export const getAdminTabs = (userRole: string | null) => ADMIN_TABS.filter((t) => allowed(t.allowedRoles, userRole));

/** The admin tab whose section the path belongs to (e.g. /users/42 → Użytkownicy) */
export const findAdminTab = (pathname: string) =>
  ADMIN_TABS.find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`));

export const isNavItemActive = (item: NavItem, pathname: string): boolean =>
  item.activePrefixes
    ? item.activePrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    : pathname === item.path;
