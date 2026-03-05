import { apiClient } from './apiClient';
import type { Volunteer } from '../components/features/QuestDispatcherMap/types';
import { MOCK_VOLUNTEERS } from '../components/features/QuestDispatcherMap/constants/mockVolunteers';

/** Zmień na false gdy backend gotowy: GET /dispatch/volunteers */
const USE_MOCK = false;

export async function getVolunteersAPI(): Promise<Volunteer[]> {
  if (USE_MOCK) return Promise.resolve([...MOCK_VOLUNTEERS]);
  return apiClient.get<Volunteer[]>('/dispatch/volunteers');
}
