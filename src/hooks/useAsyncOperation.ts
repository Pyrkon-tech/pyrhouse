import { useState, useCallback } from 'react';
import { ApiError } from '../services/apiClient';

interface AsyncOperationState {
  loading: boolean;
  error: string | null;
}

/**
 * Wrapper dla operacji asynchronicznych z automatycznym zarządzaniem
 * stanem loading/error. Eliminuje powtarzające się try/catch/finally w 15+ stronach.
 *
 * @example
 * const { loading, error, execute, clearError } = useAsyncOperation();
 *
 * const handleCreate = () => execute(async () => {
 *   await createOriginAPI(form);
 *   refresh();
 *   showSnackbar('success', 'Dodano');
 * });
 */
export function useAsyncOperation() {
  const [state, setState] = useState<AsyncOperationState>({
    loading: false,
    error: null,
  });

  const execute = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    setState({ loading: true, error: null });
    try {
      const result = await operation();
      setState({ loading: false, error: null });
      return result;
    } catch (err: any) {
      const message =
        err instanceof ApiError
          ? err.message
          : err?.message || 'Wystąpił nieoczekiwany błąd';
      setState({ loading: false, error: message });
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    execute,
    clearError,
  };
}
