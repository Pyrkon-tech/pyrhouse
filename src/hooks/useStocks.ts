import { useState } from 'react';
import { getApiUrl } from '../config/api';

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

  const fetchStocks = async (locationId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/stocks?location_id=${locationId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch stocks');
      const data = await response.json();
      setStocks(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { stocks, loading, error, fetchStocks };
};
