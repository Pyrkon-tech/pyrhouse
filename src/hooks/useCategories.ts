import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../config/api';

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

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async (forceRefresh = false) => {
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

      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/assets/categories'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();

      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/assets/categories'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(category),
      });
      if (!response.ok) throw new Error('Failed to create category');
      const data = await response.json();
      // Inwalidacja cache'u żeby inne komponenty dostały świeże dane
      localStorage.removeItem(CACHE_KEY);
      setCategories(prev => [...prev, data]);
      notifyCategoriesChanged();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateCategory = async (id: number, category: Partial<Category>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/assets/categories/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(category),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 400) {
          throw new Error(errorData.error || 'Nieprawidłowe dane kategorii');
        }
        
        if (response.status === 409) {
          throw new Error('Nie można zmodyfikować kategorii, ponieważ istnieją już przedmioty z tą kategorią');
        }
        
        if (response.status === 500) {
          throw new Error('Wystąpił błąd serwera podczas aktualizacji kategorii');
        }
        
        throw new Error(errorData.error || 'Nie udało się zaktualizować kategorii');
      }

      const data = await response.json();
      // Inwalidacja cache'u
      localStorage.removeItem(CACHE_KEY);
      // Aktualizacja stanu lokalnego
      setCategories(prev => prev.map(cat => cat.id === id ? data : cat));
      // Powiadom inne komponenty o zmianie
      notifyCategoriesChanged();
      return data;
    } catch (err) {
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
  }, []);

  // Powiadom inne komponenty o zmianie kategorii
  const notifyCategoriesChanged = useCallback(() => {
    window.dispatchEvent(new Event(CATEGORIES_CHANGED_EVENT));
  }, []);

  const addCategory = async (payload: AddCategoryPayload) => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        getApiUrl('/assets/categories'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.error || 'Failed to add category');
      }

      const newCategory: Category = await response.json();
      // Inwalidacja cache'u żeby inne komponenty dostały świeże dane
      localStorage.removeItem(CACHE_KEY);
      setCategories((prev) => [...prev, newCategory]);
      notifyCategoriesChanged();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: number) => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        getApiUrl(`/assets/categories/${id}`),
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        let errorMessage = 'Nie udało się usunąć kategorii.';
        let errorDetails = '';
        let errorResponse;
        try {
          errorResponse = await response.json();
        } catch (e) {}
        if (response.status === 409) {
          errorMessage = 'Nie można usunąć kategorii, ponieważ jest już powiązana ze sprzętem.';
          if (errorResponse?.details) {
            errorDetails = errorResponse.details;
          }
        } else if (response.status === 500) {
          errorMessage = 'Wystąpił błąd serwera podczas usuwania kategorii.';
        } else if (errorResponse?.error) {
          errorMessage = errorResponse.error;
        }
        // Zwracamy obiekt z message i details (jeśli są)
        throw { message: errorMessage, details: errorDetails };
      }

      // Inwalidacja cache'u
      localStorage.removeItem(CACHE_KEY);
      setCategories((prev) => prev.filter((category) => category.id !== id));
      notifyCategoriesChanged();
    } catch (err: any) {
      // Obsługa obiektu błędu z message i details
      if (err && typeof err === 'object' && 'message' in err) {
        setError(err.message + (err.details ? `\n${err.details}` : ''));
      } else {
        setError(err.message || 'Wystąpił nieoczekiwany błąd podczas usuwania kategorii.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { categories, loading, error, addCategory, deleteCategory, createCategory, updateCategory, refreshCategories: fetchCategories, setError };
};
