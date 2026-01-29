import { ComponentType, LazyExoticComponent } from 'react';

export type UserRole = 'admin' | 'moderator';

export interface RouteConfig {
  path: string;
  component?: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
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