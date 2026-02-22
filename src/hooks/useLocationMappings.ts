import { useState, useCallback } from 'react';
import {
  getLocationMappingsAPI,
  createLocationMappingAPI,
  deleteLocationMappingAPI,
} from '../services/questService';
import { ApiError } from '../services/apiClient';
import type { LocationMapping, CreateLocationMappingPayload } from '../types/quest.types';

export const useLocationMappings = () => {
  const [mappings, setMappings] = useState<LocationMapping[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getLocationMappingsAPI();
      setMappings(response.mappings ?? []);
      setCount(response.count);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Błąd pobierania mapowań lokalizacji');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMapping = useCallback(async (payload: CreateLocationMappingPayload) => {
    const response = await createLocationMappingAPI(payload);
    setMappings(prev => [...prev, response.mapping]);
    setCount(prev => prev + 1);
    return response.mapping;
  }, []);

  const deleteMapping = useCallback(async (id: number) => {
    await deleteLocationMappingAPI(id);
    setMappings(prev => prev.filter(m => m.id !== id));
    setCount(prev => prev - 1);
  }, []);

  return {
    mappings,
    count,
    loading,
    error,
    fetchMappings,
    createMapping,
    deleteMapping,
  };
};
