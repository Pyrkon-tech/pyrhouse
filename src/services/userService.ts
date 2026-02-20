/**
 * Serwis API dla użytkowników
 */

import { apiClient } from './apiClient';
import type {
  User,
  UserListItem,
  UserDetails,
  LoginResponse,
  RegisterResponse,
  LinkDiscordPayload,
  LinkDiscordResponse,
  MergeDiscordResponse,
} from '../types/user.types';

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
 * Pobiera listę wszystkich użytkowników (bez discord_id/avatar_url)
 */
export const getUsersAPI = () => apiClient.get<UserListItem[]>('/users');

/**
 * Pobiera szczegóły użytkownika (z pełnymi danymi Discord)
 */
export const getUserAPI = (userId: number) => apiClient.get<UserDetails>(`/users/${userId}`);

/**
 * Dodaje punkty użytkownikowi
 */
export const addUserPointsAPI = (userId: number, points: number) =>
  apiClient.post<User>(`/users/${userId}/points`, { points });

// ============================================================================
// Discord Integration
// ============================================================================

/**
 * Łączy konto użytkownika z Discord
 * Wymaga kodu autoryzacyjnego z Discord OAuth2
 *
 * Możliwe odpowiedzi:
 * - 200: Połączono pomyślnie
 * - 400: Brak code/state lub nieprawidłowe ID
 * - 403: Nie jesteś właścicielem konta ani adminem
 * - 409: Konto Discord jest już podłączone do innego usera
 * - 500: Błąd komunikacji z Discord API
 */
export const linkDiscordAPI = (userId: number, payload: LinkDiscordPayload) =>
  apiClient.post<LinkDiscordResponse>(`/users/${userId}/link-discord`, payload);

/**
 * Scala ghost konto Discord z kontem docelowym
 * Przenosi discord_id/username/avatar z source na target, usuwa lub dezaktywuje source
 *
 * Wymagana rola: moderator lub admin
 *
 * Możliwe odpowiedzi:
 * - 200: Sukces (source_deleted: true/false)
 * - 400: source == target / source bez Discorda / brak pola
 * - 403: Brak uprawnień
 * - 404: Target lub source nie istnieje
 * - 409: Target już ma podłączony Discord
 */
export const mergeDiscordAPI = (targetUserId: number, sourceUserId: number) =>
  apiClient.post<MergeDiscordResponse>(`/users/${targetUserId}/merge-discord`, {
    source_user_id: sourceUserId,
  });
