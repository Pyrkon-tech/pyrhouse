/**
 * Konfiguracja i helpery dla komunikacji z API
 */

/**
 * Bazowy URL API
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Domyślny timeout dla requestów (ms)
 */
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

/**
 * Buduje pełny URL do endpointu API
 *
 * @example
 * getApiUrl('/users') // => 'http://localhost:8080/users'
 * getApiUrl('/users/1') // => 'http://localhost:8080/users/1'
 */
export const getApiUrl = (path: string): string => `${API_BASE_URL}${path}`;

/**
 * Pobiera nagłówki autoryzacji z tokenem JWT
 *
 * @example
 * const headers = getAuthHeaders();
 * // { 'Content-Type': 'application/json', 'Authorization': 'Bearer xxx' }
 */
export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Tworzy AbortController z automatycznym timeout
 *
 * @example
 * const { controller, clear } = createAbortController(5000);
 * try {
 *   const response = await fetch(url, { signal: controller.signal });
 *   clear(); // Anuluj timeout po udanym request
 * } catch (error) {
 *   clear();
 *   throw error;
 * }
 */
export const createAbortController = (timeout = API_TIMEOUT): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
  clear: () => void;
} => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return {
    controller,
    timeoutId,
    clear: () => clearTimeout(timeoutId),
  };
};

/**
 * Sprawdza czy token JWT istnieje w localStorage
 */
export const hasAuthToken = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * Mapuje kod HTTP na komunikat błędu (po polsku)
 */
export const getHttpErrorMessage = (status: number, serverMessage?: string): string => {
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
};
