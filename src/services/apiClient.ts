/**
 * Centralny klient API dla PyrHouse
 *
 * Zapewnia:
 * - Automatyczne dodawanie tokenu autoryzacji
 * - Obsługę timeout z AbortController
 * - Jednolite error handling
 * - Typowane odpowiedzi
 */

import { env } from '../config/env';
import { TOKEN_KEY } from '../hooks/useStorage';

/**
 * Klasa błędu API z dodatkowymi informacjami
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Sprawdza czy błąd to brak autoryzacji
   */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Sprawdza czy błąd to brak uprawnień
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Sprawdza czy błąd to timeout
   */
  isTimeout(): boolean {
    return this.status === 408;
  }
}

interface RequestConfig extends Omit<RequestInit, 'body'> {
  timeout?: number;
  skipAuth?: boolean;
}

/**
 * Centralny klient API
 */
class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = env.API_BASE_URL, defaultTimeout: number = env.API_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Pobiera nagłówki autoryzacji
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Mapuje kod HTTP na czytelny komunikat błędu
   */
  private getErrorMessage(status: number, serverMessage?: string): string {
    if (serverMessage) return serverMessage;

    switch (status) {
      case 400:
        return 'Nieprawidłowe dane żądania';
      case 401:
        return 'Sesja wygasła. Zaloguj się ponownie';
      case 403:
        return 'Brak uprawnień do tej operacji';
      case 404:
        return 'Nie znaleziono zasobu';
      case 409:
        return 'Konflikt danych';
      case 422:
        return 'Błąd walidacji danych';
      case 429:
        return 'Zbyt wiele żądań. Spróbuj później';
      case 500:
        return 'Błąd serwera. Spróbuj później';
      case 502:
      case 503:
      case 504:
        return 'Serwer niedostępny. Spróbuj później';
      default:
        return 'Wystąpił nieoczekiwany błąd';
    }
  }

  /**
   * Wykonuje request do API
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig & { body?: unknown } = {}
  ): Promise<T> {
    const { timeout = this.defaultTimeout, skipAuth = false, body, ...fetchConfig } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(skipAuth ? {} : this.getAuthHeaders()),
        ...fetchConfig.headers,
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchConfig,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignoruj błędy parsowania JSON
        }

        const errorMessage = this.getErrorMessage(
          response.status,
          (errorData.error ?? errorData.message) as string | undefined
        );

        const { error: _e, message: _m, code, details: detailsField, ...rest } = errorData;
        const details: string | undefined =
          typeof detailsField === 'string'
            ? detailsField
            : detailsField !== undefined
              ? JSON.stringify(detailsField)
              : Object.keys(rest).length > 0
                ? JSON.stringify(rest)
                : undefined;

        if (response.status === 401 && !skipAuth) {
          localStorage.removeItem(TOKEN_KEY);
          window.location.href = '/login';
        }

        throw new ApiError(errorMessage, response.status, code as string | undefined, details);
      }

      // Obsługa pustych odpowiedzi (np. 204 No Content)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Przekroczono limit czasu żądania', 408);
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Błąd połączenia z serwerem',
        0
      );
    }
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * GET request zwracający surowy Blob (np. pliki CSV/PDF)
   */
  async getBlob(endpoint: string, config?: RequestConfig): Promise<Blob> {
    const { timeout = this.defaultTimeout, skipAuth = false, ...fetchConfig } = config ?? {};

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchConfig,
        method: 'GET',
        headers: {
          ...(skipAuth ? {} : this.getAuthHeaders()),
          ...fetchConfig.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ApiError(this.getErrorMessage(response.status), response.status);
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Przekroczono limit czasu żądania', 408);
      }
      throw new ApiError(error instanceof Error ? error.message : 'Błąd połączenia z serwerem', 0);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data,
    });
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data,
    });
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data,
    });
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE', body: data });
  }
}

/**
 * Instancja klienta API gotowa do użycia
 *
 * @example
 * // GET
 * const user = await apiClient.get<User>('/users/1');
 *
 * // POST
 * const transfer = await apiClient.post<Transfer>('/transfers', { from: 1, to: 2 });
 *
 * // Z custom timeout
 * const data = await apiClient.get<Data>('/slow-endpoint', { timeout: 60000 });
 *
 * // Bez autoryzacji (publiczne endpointy)
 * const publicData = await apiClient.get<Data>('/public', { skipAuth: true });
 */
export const apiClient = new ApiClient();

export default apiClient;
