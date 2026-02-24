import { getApiUrl } from '../config/api';
import { useStorage } from '../hooks/useStorage';

export interface PublicServiceDeskRequest {
  title: string;
  description: string;
  type: string;
  priority: string;
  created_by?: string;
  location?: string;
  location_id?: number;
}

export const sendPublicServiceDeskRequest = async (data: PublicServiceDeskRequest, token?: string) => {
  const response = await fetch(getApiUrl('/service-desk/requests'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Nie udało się wysłać zgłoszenia');
  }
  return response.json();
};

export const useSendPublicServiceDeskRequest = () => {
  const { getToken } = useStorage();
  const send = async (data: PublicServiceDeskRequest) => {
    const token = getToken();
    return sendPublicServiceDeskRequest(data, token || undefined);
  };
  return { send };
}; 