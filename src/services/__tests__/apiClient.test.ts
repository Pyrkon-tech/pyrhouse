import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, ApiError } from '../apiClient';

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('request building', () => {
    it('sends Authorization header when a token is stored', async () => {
      localStorage.setItem('token', 'jwt-123');
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await apiClient.get('/users');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('/users');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
    });

    it('omits Authorization header with skipAuth', async () => {
      localStorage.setItem('token', 'jwt-123');
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await apiClient.get('/public', { skipAuth: true });

      const [, init] = fetchMock.mock.calls[0];
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    });

    it('serializes POST body as JSON', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

      await apiClient.post('/transfers', { from: 1, to: 2 });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({ from: 1, to: 2 });
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('returns parsed JSON', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 7, name: 'X' }));

      const data = await apiClient.get<{ id: number; name: string }>('/items/7');

      expect(data).toEqual({ id: 7, name: 'X' });
    });

    it('returns empty object for non-JSON responses (204)', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      const data = await apiClient.delete('/items/7');

      expect(data).toEqual({});
    });
  });

  describe('error handling', () => {
    it('throws ApiError with server-provided message', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'Kategoria zajęta' }, 409));

      const promise = apiClient.post('/categories', {});
      await expect(promise).rejects.toBeInstanceOf(ApiError);
      await expect(promise).rejects.toMatchObject({ status: 409, message: 'Kategoria zajęta' });
    });

    it('falls back to a Polish default message per status', async () => {
      fetchMock.mockResolvedValue(new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } }));

      await expect(apiClient.get('/missing')).rejects.toMatchObject({
        status: 404,
        message: 'Nie znaleziono zasobu',
      });
    });

    it('maps network failure to ApiError with status 0', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(apiClient.get('/x')).rejects.toMatchObject({ status: 0 });
    });

    it('maps timeout to ApiError 408', async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementation((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
          );
        })
      );

      const promise = apiClient.get('/slow', { timeout: 50 });
      const assertion = expect(promise).rejects.toMatchObject({ status: 408 });
      await vi.advanceTimersByTimeAsync(60);
      await assertion;
    });

    it('clears the token on 401 (authenticated request)', async () => {
      localStorage.setItem('token', 'expired');
      fetchMock.mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401));
      // jsdom does not implement navigation — replace location for this test
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, href: '' },
        writable: true,
      });

      await expect(apiClient.get('/secure')).rejects.toMatchObject({ status: 401 });
      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.href).toBe('/login');

      Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    });

    it('does not clear the token on 401 with skipAuth (login failure)', async () => {
      localStorage.setItem('token', 'still-valid');
      fetchMock.mockResolvedValue(jsonResponse({ error: 'bad credentials' }, 401));

      await expect(apiClient.post('/auth', {}, { skipAuth: true })).rejects.toMatchObject({ status: 401 });
      expect(localStorage.getItem('token')).toBe('still-valid');
    });

    it('exposes status helpers', () => {
      expect(new ApiError('x', 401).isUnauthorized()).toBe(true);
      expect(new ApiError('x', 403).isForbidden()).toBe(true);
      expect(new ApiError('x', 408).isTimeout()).toBe(true);
      expect(new ApiError('x', 500).isUnauthorized()).toBe(false);
    });
  });

  describe('getBlob', () => {
    it('returns the response blob with auth header', async () => {
      localStorage.setItem('token', 'jwt-123');
      fetchMock.mockResolvedValue(new Response('a,b,c', { status: 200 }));

      const blob = await apiClient.getBlob('/assets/report');

      expect(await blob.text()).toBe('a,b,c');
      const [, init] = fetchMock.mock.calls[0];
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
    });

    it('throws ApiError on failed download', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

      await expect(apiClient.getBlob('/assets/report')).rejects.toMatchObject({ status: 500 });
    });
  });
});
