import { useState, useCallback } from 'react';
import { getTransferPreviewAPI, createTransferFromQuestAPI } from '../services/questService';
import { ApiError } from '../services/apiClient';
import type {
  TransferPreview,
  CreateTransferFromQuestRequest,
  CreateTransferFromQuestResponse,
} from '../types/quest.types';

export const useTransferFromQuest = (questId: string | undefined) => {
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async (fromLocationId: number) => {
    if (!questId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getTransferPreviewAPI(questId, fromLocationId);
      setPreview(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Nie udało się pobrać podglądu transferu');
      }
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [questId]);

  const createTransfer = useCallback(async (
    req: CreateTransferFromQuestRequest
  ): Promise<CreateTransferFromQuestResponse> => {
    if (!questId) throw new Error('Brak ID questa');
    setCreating(true);
    setError(null);
    try {
      const result = await createTransferFromQuestAPI(questId, req);
      return result;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Quest ma już powiązany transfer');
        } else if (err.status === 422) {
          setError(`Nie można rozwiązać danych: ${err.message}`);
        } else {
          setError(err.message);
        }
      } else {
        setError('Nie udało się utworzyć transferu');
      }
      throw err;
    } finally {
      setCreating(false);
    }
  }, [questId]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return {
    preview,
    loading,
    creating,
    error,
    fetchPreview,
    createTransfer,
    clearPreview,
  };
};
