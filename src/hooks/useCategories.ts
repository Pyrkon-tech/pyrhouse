import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../services/apiClient';

// Cache configuration
const CACHE_KEY = 'categories_cache';
const CACHE_EXPIRY = 60 * 1000; // 1 minute
const CATEGORIES_CHANGED_EVENT = 'categories_changed';

interface CacheData {
  data: Category[];
  timestamp: number;
}

// Define types for category and add category payload
interface Category {
  id: number;
  name?: string;
  label: string;
  type: 'asset' | 'stock';
  pyr_id?: string;
}

interface AddCategoryPayload {
  label: string;
  type: 'asset' | 'stock';
  name?: string;
  pyr_id?: string;
}

interface DeleteCategoryError {
  message: string;
  details?: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData) as CacheData;
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setCategories(data);
            setLoading(false);
            return;
          }
        }
      }

      const data = await apiClient.get<Category[]>('/assets/categories');

      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      setCategories(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Powiadom inne komponenty o zmianie kategorii
  const notifyCategoriesChanged = useCallback(() => {
    window.dispatchEvent(new Event(CATEGORIES_CHANGED_EVENT));
  }, []);

  const updateCategory = async (id: number, category: Partial<Category>) => {
    try {
      const data = await apiClient.patch<Category>(`/assets/categories/${id}`, category);
      // Inwalidacja cache'u
      localStorage.removeItem(CACHE_KEY);
      // Aktualizacja stanu lokalnego
      setCategories(prev => prev.map(cat => cat.id === id ? data : cat));
      // Powiadom inne komponenty o zmianie
      notifyCategoriesChanged();
      return data;
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.status === 409
          ? 'Nie można zmodyfikować kategorii, ponieważ istnieją już przedmioty z tą kategorią'
          : err.status === 500
            ? 'Wystąpił błąd serwera podczas aktualizacji kategorii'
            : err.message;
        setError(message);
        throw new Error(message);
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Nasłuchuj na zmiany kategorii z innych komponentów
  useEffect(() => {
    const handleCategoriesChanged = () => {
      fetchCategories(true); // Force refresh
    };

    window.addEventListener(CATEGORIES_CHANGED_EVENT, handleCategoriesChanged);
    fetchCategories();

    return () => {
      window.removeEventListener(CATEGORIES_CHANGED_EVENT, handleCategoriesChanged);
    };
  }, [fetchCategories]);

  const addCategory = async (payload: AddCategoryPayload) => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const newCategory = await apiClient.post<Category>('/assets/categories', payload);
      // Inwalidacja cache'u żeby inne komponenty dostały świeże dane
      localStorage.removeItem(CACHE_KEY);
      setCategories((prev) => [...prev, newCategory]);
      notifyCategoriesChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: number) => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      await apiClient.delete(`/assets/categories/${id}`);

      // Inwalidacja cache'u
      localStorage.removeItem(CACHE_KEY);
      setCategories((prev) => prev.filter((category) => category.id !== id));
      notifyCategoriesChanged();
    } catch (err) {
      let failure: DeleteCategoryError = { message: 'Nie udało się usunąć kategorii.' };
      if (err instanceof ApiError) {
        if (err.status === 409) {
          failure = {
            message: 'Nie można usunąć kategorii, ponieważ jest już powiązana ze sprzętem.',
            details: typeof err.details === 'string' ? err.details : undefined,
          };
        } else if (err.status === 500) {
          failure = { message: 'Wystąpił błąd serwera podczas usuwania kategorii.' };
        } else {
          failure = { message: err.message };
        }
      }
      setError(failure.message + (failure.details ? `\n${failure.details}` : ''));
      throw failure;
    } finally {
      setLoading(false);
    }
  };

  return { categories, loading, error, addCategory, deleteCategory, updateCategory, refreshCategories: fetchCategories, setError };
};
