import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../config/api';

const REQUESTS_API = '/service-desk/requests';

export const useServiceDeskRequests = (status: string, search: string) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    fetch(getApiUrl(`${REQUESTS_API}?${params.toString()}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Błąd pobierania zgłoszeń');
        return res.json();
      })
      .then(data => {
        setRequests(data);
      })
      .catch(e => setError(e.message || 'Błąd pobierania zgłoszeń'))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Filtrowanie lokalne:
  const filteredRequests = search
    ? requests.filter((r: any) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        (r.location && r.location.toLowerCase().includes(search.toLowerCase()))
      )
    : requests;

  return { requests: filteredRequests, loading, error, refresh: fetchRequests };
}; 