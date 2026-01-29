/**
 * Serwis API dla użytkowników
 */

import { apiClient } from './apiClient';
import type { User, LoginResponse, RegisterResponse } from '../types/user.types';

// ============================================================================
// Auth (publiczne endpointy)
// ============================================================================

/**
 * Logowanie użytkownika
 */
export const loginUser = (username: string, password: string) =>
  apiClient.post<LoginResponse>('/users/login', { username, password }, { skipAuth: true });

/**
 * Rejestracja użytkownika
 */
export const registerUser = (username: string, password: string, fullname: string) =>
  apiClient.post<RegisterResponse>(
    '/users/register',
    { username, password, fullname },
    { skipAuth: true }
  );

// ============================================================================
// User Management (wymagają autoryzacji)
// ============================================================================

/**
 * Pobiera listę wszystkich użytkowników
 */
export const getUsersAPI = () => apiClient.get<User[]>('/users');

/**
 * Pobiera pojedynczego użytkownika
 */
export const getUserAPI = (userId: number) => apiClient.get<User>(`/users/${userId}`);

/**
 * Dodaje punkty użytkownikowi
 */
export const addUserPointsAPI = (userId: number, points: number) =>
  apiClient.post<User>(`/users/${userId}/points`, { points });
