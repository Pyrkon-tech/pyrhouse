import { ComponentType, LazyExoticComponent } from 'react';

export type UserRole = 'admin' | 'moderator' | 'dispatcher';

export interface RouteConfig {
  path: string;
  component?: LazyExoticComponent<ComponentType<Record<string, never>>> | ComponentType<Record<string, never>>;
  title?: string;
  icon?: string;
  showInNav?: boolean;
  requiredRoles?: UserRole[];
  redirect?: string;
  children?: RouteConfig[];
}

export interface NavigationItem {
  path: string;
  title: string;
  icon: string;
  children?: NavigationItem[];
}

export interface BreadcrumbItem {
  path: string;
  title: string;
  isActive?: boolean;
} 