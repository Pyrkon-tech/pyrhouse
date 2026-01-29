/**
 * Podstawowe typy dla komunikacji z API
 */

/**
 * Standardowa odpowiedź API z danymi
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Odpowiedź API z paginacją
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Błąd zwracany przez API
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  code?: string;
  details?: string;
}

/**
 * Status operacji
 */
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Stan asynchronicznej operacji
 */
export interface AsyncState<T> {
  data: T | null;
  status: OperationStatus;
  error: string | null;
}

/**
 * Parametry sortowania
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Parametry paginacji
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sort?: SortParams;
}
