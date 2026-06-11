import { useState, useCallback } from 'react';
import type { Volunteer } from '../components/features/QuestDispatcherMap/types';
import { getVolunteersAPI } from '../services/volunteerService';

export const useVolunteers = () => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVolunteersAPI();
      setVolunteers(data);
    } catch (e) {
      setError((e instanceof Error ? e.message : '') || 'Błąd pobierania wolontariuszy');
    } finally {
      setLoading(false);
    }
  }, []);

  return { volunteers, setVolunteers, loading, error, fetchVolunteers };
};
