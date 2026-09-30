import { apiClient } from './apiClient';
import type {
  CreateServiceDeskRequestPayload,
  ServiceDeskRequest,
} from '../types/servicedesk.types';

export type PublicServiceDeskRequest = CreateServiceDeskRequestPayload;

export const sendPublicServiceDeskRequest = (data: PublicServiceDeskRequest) =>
  apiClient.post<ServiceDeskRequest>('/service-desk/requests', data);

export const useSendPublicServiceDeskRequest = () => {
  const send = (data: PublicServiceDeskRequest) => sendPublicServiceDeskRequest(data);
  return { send };
};