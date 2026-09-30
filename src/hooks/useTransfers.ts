import { useState, useCallback } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import type { TransferSummary } from '../types/transfer.types';

export const useTransfers = () => {
  const [transfers, setTransfers] = useState<TransferSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getList<TransferSummary>('/transfers');
      setTransfers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  return { transfers, loading, error, refreshTransfers: fetchTransfers };
};
