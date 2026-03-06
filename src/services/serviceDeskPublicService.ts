import { apiClient } from './apiClient';

export interface PublicServiceDeskRequest {
  title: string;
  description: string;
  type: string;
  priority: string;
  created_by?: string;
  location?: string;
  location_id?: number;
}

export const sendPublicServiceDeskRequest = (data: PublicServiceDeskRequest) =>
  apiClient.post<unknown>('/service-desk/requests', data);

export const useSendPublicServiceDeskRequest = () => {
  const send = (data: PublicServiceDeskRequest) => sendPublicServiceDeskRequest(data);
  return { send };
};