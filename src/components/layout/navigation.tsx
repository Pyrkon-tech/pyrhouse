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
};

export interface NavMenuItem {
  path?: string;
  label: string;
  icon: React.ReactNode;
  type?: 'divider';
}

export interface AdminMenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: string[];
}

export const NAV_MENU_ITEMS: NavMenuItem[] = [
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
    label: 'Transfery',
    icon: <Icons.LocalShipping sx={{ fontSize: '0.9rem' }} />
  },
  { path: '/transfers/create', label: 'Nowy transfer', icon: <Icons.RocketLaunch /> },
  { path: '/transfers', label: 'Transfery', icon: <Icons.ShoppingBasket /> },
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

const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { path: '/duty-schedule', label: 'Grafik', icon: <Icons.Event />, allowedRoles: ['admin', 'moderator'] },
  { path: '/categories', label: 'Kategorie', icon: <Icons.Category />, allowedRoles: ['admin', 'moderator', 'dispatcher'] },
  { path: '/origins', label: 'Pochodzenie', icon: <Icons.Source />, allowedRoles: ['admin', 'moderator', 'dispatcher'] },
  { path: '/budget', label: 'Budżet', icon: <Icons.Calculate />, allowedRoles: ['admin'] },
  { path: '/users', label: 'Użytkownicy', icon: <Icons.People />, allowedRoles: ['admin', 'moderator'] },
  { path: '/settings', label: 'Ustawienia', icon: <Icons.Settings />, allowedRoles: ['admin'] },
];

export const getAdminMenuItems = (userRole: string | null): AdminMenuItem[] =>
  ADMIN_MENU_ITEMS.filter((item) => userRole != null && item.allowedRoles.includes(userRole));
