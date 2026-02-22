import { useState, useCallback } from 'react';
import { Location } from '../types/location.types';
import { getApiUrl } from '../config/api';

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/locations'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Nie udało się pobrać lokalizacji');
      }
      const data = await response.json();
      setLocations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { locations, error, loading, refetch: fetchLocations };
};
