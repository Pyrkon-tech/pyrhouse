import { useState, useCallback } from 'react';
import { apiClient, ApiError } from '../services/apiClient';

interface Stock {
  id: number;
  category: {
    id: number;
    label: string;
    type: string;
  };
  origin: string;
  quantity: number;
  location: {
    id: number;
    name: string;
  };
}

export const useStocks = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStocks = useCallback(async (locationId: string) => {
    setLoading(true);
    try {
      const data = await apiClient.get<Stock[] | null>(`/stocks?location_id=${locationId}`);
      setStocks(data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  return { stocks, loading, error, fetchStocks };
};
