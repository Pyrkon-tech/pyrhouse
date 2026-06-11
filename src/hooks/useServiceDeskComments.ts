import { useState, useCallback } from 'react';
import { apiClient, ApiError } from '../services/apiClient';

export interface ServiceDeskComment {
  id: number;
  content: string;
  user_id: number;
  created_at: string;
  user?: { id: number; username: string };
}

export const useServiceDeskComments = (requestId: string | number | undefined) => {
  const [comments, setComments] = useState<ServiceDeskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ServiceDeskComment[]>(`/service-desk/requests/${requestId}/comments`);
      setComments(Array.isArray(data) ? data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Błąd pobierania komentarzy');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const addComment = useCallback(async (content: string) => {
    if (!requestId) return;
    setAdding(true);
    setAddError(null);
    try {
      await apiClient.post(`/service-desk/requests/${requestId}/comments`, { content });
      // Optymistycznie: fetchujemy całą listę po dodaniu
      await fetchComments();
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : 'Błąd dodawania komentarza');
    } finally {
      setAdding(false);
    }
  }, [requestId, fetchComments]);

  return {
    comments,
    loading,
    error,
    addComment,
    adding,
    addError,
    refreshComments: fetchComments,
  };
};
