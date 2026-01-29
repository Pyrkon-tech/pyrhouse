import { lazy } from 'react';
import { RouteConfig } from './types';

// Lazy loaded components
const Home = lazy(() => import('../components/features/Home'));
const List = lazy(() => import('../components/features/List'));
const AddItemPage = lazy(() => import('../components/features/AddItemPage'));
const TransferPage = lazy(() => import('../components/features/TransferPage'));
const UserManagementPage = lazy(() => import('../components/features/UserManagementPage'));
const UserDetailsPage = lazy(() => import('../components/features/UserDetailsPage'));
const CategoryManagementPage = lazy(() => import('../components/features/CategoryManagementPage'));
const TransfersListPage = lazy(() => import('../components/features/TransferListPage'));
const TransferDetailsPage = lazy(() => import('../components/features/TransferDetailsPage'));
const QuestBoardPage = lazy(() => import('../components/features/QuestBoardPage'));
const EquipmentDetails = lazy(() => import('../components/features/EquipmentDetails'));
const LocationsPage = lazy(() => import('../components/features/LocationsPage'));
const LocationDetailsPage = lazy(() => import('../components/features/LocationDetailsPage'));
const TutorialPage = lazy(() => import('../components/features/TutorialPage'));
const DutySchedulePage = lazy(() => import('../components/features/DutySchedulePage'));
const ServiceDeskPage = lazy(() => import('../components/features/ServiceDeskPage'));

// Public routes (nie wymagają autoryzacji)
export const publicRoutes: RouteConfig[] = [
  {
    path: '/login',
    component: lazy(() => import('../components/features/LoginForm')),
    title: 'Logowanie',
  },
  {
    path: '/servicedesk/request',
    component: lazy(() => import('../components/features/PublicServiceDeskForm')),
    title: 'Zgłoszenie serwisowe',
  },
];

// Protected routes (wymagają autoryzacji)
export const protectedRoutes: RouteConfig[] = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    component: Home,
    title: 'Strona główna',
    icon: 'Home',
    showInNav: true,
  },
  {
    path: '/list',
    component: List,
    title: 'Lista',
    icon: 'List',
    showInNav: true,
  },
  {
    path: '/add-item',
    component: AddItemPage,
    title: 'Dodaj przedmiot',
    icon: 'Add',
    showInNav: true,
  },
  {
    path: '/transfers/create',
    component: TransferPage,
    title: 'Utwórz transfer',
    icon: 'Transfer',
    showInNav: true,
  },
  {
    path: '/transfers',
    component: TransfersListPage,
    title: 'Lista transferów',
    icon: 'TransferList',
    showInNav: true,
  },
  {
    path: '/transfers/:id',
    component: TransferDetailsPage,
    title: 'Szczegóły transferu',
    showInNav: false,
  },
  {
    path: '/quests',
    component: QuestBoardPage,
    title: 'Tablica zadań',
    icon: 'Quest',
    showInNav: true,
  },
  {
    path: '/equipment/:id',
    component: EquipmentDetails,
    title: 'Szczegóły sprzętu',
    showInNav: false,
  },
  {
    path: '/locations',
    component: LocationsPage,
    title: 'Lokalizacje',
    icon: 'Location',
    showInNav: true,
  },
  {
    path: '/locations/:id',
    component: LocationDetailsPage,
    title: 'Szczegóły lokalizacji',
    showInNav: false,
  },
  {
    path: '/tutorial',
    component: TutorialPage,
    title: 'Tutorial',
    icon: 'Tutorial',
    showInNav: true,
  },
  {
    path: '/duty-schedule',
    component: DutySchedulePage,
    title: 'Harmonogram dyżurów',
    icon: 'Schedule',
    showInNav: true,
  },
  {
    path: '/servicedesk',
    component: ServiceDeskPage,
    title: 'Service Desk',
    icon: 'ServiceDesk',
    showInNav: true,
  },
];

// Admin routes (wymagają roli admin/moderator)
export const adminRoutes: RouteConfig[] = [
  {
    path: '/users',
    component: UserManagementPage,
    title: 'Zarządzanie użytkownikami',
    icon: 'Users',
    showInNav: true,
    requiredRoles: ['admin', 'moderator'],
  },
  {
    path: '/users/:id',
    component: UserDetailsPage,
    title: 'Szczegóły użytkownika',
    showInNav: false,
    requiredRoles: ['admin', 'moderator'],
  },
  {
    path: '/categories',
    component: CategoryManagementPage,
    title: 'Zarządzanie kategoriami',
    icon: 'Categories',
    showInNav: true,
    requiredRoles: ['admin', 'moderator'],
  },
];

// Wszystkie routes
export const allRoutes = [
  ...publicRoutes,
  ...protectedRoutes,
  ...adminRoutes,
];

// Helper functions
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return allRoutes.find(route => route.path === path);
};

export const getNavRoutes = (userRole?: string): RouteConfig[] => {
  return allRoutes.filter(route => {
    if (!route.showInNav) return false;
    if (route.requiredRoles && userRole) {
      return route.requiredRoles.includes(userRole as 'admin' | 'moderator');
    }
    return true;
  });
};

export const getRouteTitle = (path: string): string => {
  const route = getRouteByPath(path);
  return route?.title || 'Nieznana strona';
}; 