import { useState, useEffect } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import type { ServiceDeskRequestTypeInfo } from '../types/servicedesk.types';

const TYPES_API = '/service-desk/request-types';

export const useServiceDeskTypes = () => {
  const [types, setTypes] = useState<Record<string, ServiceDeskRequestTypeInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem('serviceDeskTypes');
    if (cached) {
      setTypes(JSON.parse(cached));
      return;
    }
    setLoading(true);
    apiClient
      .get<ServiceDeskRequestTypeInfo[]>(TYPES_API)
      .then((data) => {
        const map: Record<string, ServiceDeskRequestTypeInfo> = {};
        data.forEach((t) => { map[t.id] = t; });
        setTypes(map);
        sessionStorage.setItem('serviceDeskTypes', JSON.stringify(map));
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Błąd pobierania typów zgłoszeń')
      )
      .finally(() => setLoading(false));
  }, []);
  return { types, loading, error };
};
