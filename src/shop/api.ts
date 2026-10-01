/**
 * HTTP client of the organizer shop. Deliberately separate from the warehouse apiClient: the shop
 * token lives under its own key and a 401 leads to the shop login, never the warehouse one.
 */
import { env } from './env';
import type {
  ShopAccount,
  ShopConfig,
  ShopLocation,
  ShopOrder,
  ShopOrderInput,
  ShopProduct,
  ShopWindow,
} from '@pyrhouse/api';

export const SHOP_TOKEN_KEY = 'shop_token';

export class ShopApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = 'ShopApiError';
  }
}

let onUnauthorized: () => void = () => {};

/** Set by the auth provider: what to do when the token stops working. */
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(SHOP_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(SHOP_TOKEN_KEY, token);
    else localStorage.removeItem(SHOP_TOKEN_KEY);
  } catch {
    // Private mode without storage: the session simply won't survive a reload.
  }
};

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (auth && token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(env.API_BASE_URL + path, { ...init, headers });
  } catch {
    throw new ShopApiError('Brak połączenia z serwerem — sprawdź internet i spróbuj ponownie.', 0);
  }

  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized();
    throw new ShopApiError(
      (body?.error as string) || `Błąd serwera (${res.status})`,
      res.status,
      body?.code as string | undefined,
    );
  }
  return body as T;
}

/** Go sends empty slices as null. */
const list = async <T>(path: string) => ((await request<T[] | null>(path)) ?? []);
const order = (o: ShopOrder): ShopOrder => ({ ...o, items: o.items ?? [] });

export const shopApi = {
  login: (body: { code: string; redirect_uri: string; code_verifier: string; invite_token?: string }) =>
    request<{ token: string; account: ShopAccount }>('/shop/auth/google/exchange', { method: 'POST', body: JSON.stringify(body) }, false),
  me: () => request<ShopAccount>('/shop/me'),
  config: () => request<ShopConfig>('/shop/config'),
  catalog: () => list<ShopProduct>('/shop/catalog'),
  locations: () => list<ShopLocation>('/shop/locations'),
  windows: () => list<ShopWindow>('/shop/delivery-windows'),
  budgetOwners: () => list<string>('/shop/budget-owners'),
  orders: async () => (await list<ShopOrder>('/shop/orders')).map(order),
  order: async (id: number) => order(await request<ShopOrder>(`/shop/orders/${id}`)),
  submit: async (input: ShopOrderInput, idempotencyKey: string) =>
    order(await request<ShopOrder>('/shop/orders', { method: 'POST', body: JSON.stringify(input), headers: { 'Idempotency-Key': idempotencyKey } })),
  update: async (id: number, input: ShopOrderInput) =>
    order(await request<ShopOrder>(`/shop/orders/${id}`, { method: 'PUT', body: JSON.stringify(input) })),
  cancel: async (id: number, version: number) =>
    order(await request<ShopOrder>(`/shop/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ version }) })),
};
