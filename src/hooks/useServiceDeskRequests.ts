import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import type { ServiceDeskRequest } from '../types/servicedesk.types';

const REQUESTS_API = '/service-desk/requests';

export const useServiceDeskRequests = (status: string, search: string) => {
  const [requests, setRequests] = useState<ServiceDeskRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    apiClient
      .get<ServiceDeskRequest[]>(`${REQUESTS_API}?${params.toString()}`)
      .then(setRequests)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Błąd pobierania zgłoszeń')
      )
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Filtrowanie lokalne:
  const filteredRequests = search
    ? requests.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        (r.location && r.location.toLowerCase().includes(search.toLowerCase()))
      )
    : requests;

  return { requests: filteredRequests, loading, error, refresh: fetchRequests };
};
