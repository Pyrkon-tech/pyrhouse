import { useState, useEffect, useCallback } from 'react';
import { getCategoryMappingsAPI, deleteCategoryMappingAPI } from '../services/questService';
import { ApiError } from '../services/apiClient';
import type { CategoryMapping } from '../types/quest.types';

/**
 * Hook do zarządzania mapowaniami kategorii (lista + usuwanie).
 */
export const useCategoryMappings = () => {
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null); // ID aktualnie usuwanego
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCategoryMappingsAPI();
      setMappings(data.mappings);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const deleteMapping = async (id: number) => {
    try {
      setDeleting(id);
      setError(null);
      await deleteCategoryMappingAPI(id);
      setMappings((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Mapowanie już zostało usunięte');
        fetchMappings(); // resync
      } else {
        setError('Błąd podczas usuwania mapowania');
      }
    } finally {
      setDeleting(null);
    }
  };

  return { mappings, loading, deleting, error, deleteMapping, refresh: fetchMappings };
};
