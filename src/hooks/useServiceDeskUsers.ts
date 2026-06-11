import { useState, useEffect } from 'react';
import { getUsersAPI } from '../services/userService';

type ServiceDeskUser = Awaited<ReturnType<typeof getUsersAPI>>[number];

export const useServiceDeskUsers = () => {
  const [users, setUsers] = useState<ServiceDeskUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await getUsersAPI();
        setUsers(data);
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : 'Błąd pobierania użytkowników');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return { users, loading, error };
};
