/**
 * Warehouse panel for the organizer shop — /admin/shop/* (moderator; settings admin).
 */

import { apiClient } from './apiClient';
import type {
  CreatedShopInvite,
  ShopAccount,
  ShopInvite,
  ShopOrder,
  ShopOrderDetail,
  ShopOrderPatch,
  ShopOrderStatus,
  ShopProduct,
  ShopProductInput,
  ShopSettings,
  ShopSummary,
  ShopSummaryGroup,
  ShopWindow,
  ShopWindowInput,
} from '@pyrhouse/api';

const BASE = '/admin/shop';

/** Go sends empty slices as null; nested arrays are not covered by getList. */
const normalizeOrder = <T extends ShopOrder>(o: T): T => ({ ...o, items: o.items ?? [] });

// Products
export const getShopProductsAPI = () => apiClient.getList<ShopProduct>(`${BASE}/products`);
export const createShopProductAPI = (payload: ShopProductInput) =>
  apiClient.post<ShopProduct>(`${BASE}/products`, payload);
export const updateShopProductAPI = (id: number, payload: ShopProductInput) =>
  apiClient.put<ShopProduct>(`${BASE}/products/${id}`, payload);

// Delivery and return windows
export const getShopWindowsAPI = () => apiClient.getList<ShopWindow>(`${BASE}/delivery-windows`);
export const createShopWindowAPI = (payload: ShopWindowInput) =>
  apiClient.post<ShopWindow>(`${BASE}/delivery-windows`, payload);
export const updateShopWindowAPI = (id: number, payload: ShopWindowInput) =>
  apiClient.put<ShopWindow>(`${BASE}/delivery-windows/${id}`, payload);
export const deleteShopWindowAPI = (id: number) => apiClient.delete<void>(`${BASE}/delivery-windows/${id}`);

// Orders
export const getShopOrdersAPI = async (status?: ShopOrderStatus) => {
  const orders = await apiClient.getList<ShopOrder>(`${BASE}/orders${status ? `?status=${status}` : ''}`);
  return orders.map(normalizeOrder);
};
export const getShopOrderAPI = async (id: number) => {
  const o = await apiClient.get<ShopOrderDetail>(`${BASE}/orders/${id}`);
  return { ...normalizeOrder(o), events: o.events ?? [] };
};
export const confirmShopOrderAPI = async (id: number, version: number) =>
  normalizeOrder(await apiClient.post<ShopOrder>(`${BASE}/orders/${id}/confirm`, { version }));
export const rejectShopOrderAPI = async (id: number, version: number, reason: string) =>
  normalizeOrder(await apiClient.post<ShopOrder>(`${BASE}/orders/${id}/reject`, { version, reason }));
export const patchShopOrderAPI = async (id: number, patch: ShopOrderPatch) =>
  normalizeOrder(await apiClient.patch<ShopOrder>(`${BASE}/orders/${id}`, patch));
export const getShopSummaryAPI = async (group: ShopSummaryGroup, confirmedOnly: boolean) => {
  const params = new URLSearchParams({ group });
  if (confirmedOnly) params.set('status', 'confirmed');
  const s = await apiClient.get<ShopSummary>(`${BASE}/orders/summary?${params}`);
  return { ...s, rows: s.rows ?? [] };
};

// Accounts and invites
export const getShopAccountsAPI = () => apiClient.getList<ShopAccount>(`${BASE}/accounts`);
export const allowlistShopAccountAPI = (email: string) =>
  apiClient.post<ShopAccount>(`${BASE}/accounts`, { email });
export const setShopAccountActiveAPI = (id: number, active: boolean) =>
  apiClient.patch<ShopAccount>(`${BASE}/accounts/${id}`, { active });
export const getShopInvitesAPI = () => apiClient.getList<ShopInvite>(`${BASE}/invites`);
export const createShopInviteAPI = (label: string) =>
  apiClient.post<CreatedShopInvite>(`${BASE}/invites`, { label });
export const revokeShopInviteAPI = (id: number) => apiClient.delete<void>(`${BASE}/invites/${id}`);

// Settings (admin)
export const getShopSettingsAPI = async () => {
  const s = await apiClient.get<ShopSettings>(`${BASE}/settings`);
  return { ...s, auto_domains: s.auto_domains ?? [] };
};
export const updateShopSettingsAPI = (settings: ShopSettings) =>
  apiClient.put<ShopSettings>(`${BASE}/settings`, settings);
