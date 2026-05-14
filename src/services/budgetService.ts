import { apiClient } from './apiClient';
import type { BudgetSummary, PriceListItem, UpsertPriceRequest } from '../types/budget.types';

export const getBudgetAPI = (budgetOwner?: string, vat?: boolean) => {
  const params = new URLSearchParams();
  if (budgetOwner) params.set('budget_owner', budgetOwner);
  if (vat) params.set('vat', 'true');
  const qs = params.toString();
  return apiClient.get<BudgetSummary>(`/equipment-requests/budget${qs ? `?${qs}` : ''}`);
};

export const getBudgetPersonsAPI = () =>
  apiClient.get<{ persons: string[] }>('/equipment-requests/budget/persons');

export const getSuppliersAPI = () =>
  apiClient.get<{ suppliers: string[] }>('/equipment-requests/suppliers');

export const getPricesAPI = () =>
  apiClient.get<{ prices: PriceListItem[] }>('/equipment-requests/prices');

export const upsertPriceAPI = (payload: UpsertPriceRequest) =>
  apiClient.put<PriceListItem>('/equipment-requests/prices', payload);

export const deletePriceAPI = (itemName: string, supplier: string) => {
  const params = new URLSearchParams({ item_name: itemName, supplier });
  return apiClient.delete<void>(`/equipment-requests/prices?${params}`);
};

export const syncPricesAPI = () =>
  apiClient.post<{ message: string; updated: number }>('/equipment-requests/prices/sync');
