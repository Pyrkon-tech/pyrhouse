import { useState, useCallback } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import type { Location } from '../types/location.types';

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<Location[]>('/locations');
      setLocations(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nie udało się pobrać lokalizacji');
    } finally {
      setLoading(false);
    }
  }, []);

  return { locations, error, loading, refetch: fetchLocations };
};
