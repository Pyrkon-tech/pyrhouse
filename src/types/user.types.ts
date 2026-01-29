/**
 * Typy związane z użytkownikami
 */

/**
 * Role użytkowników
 */
export type UserRole = 'user' | 'admin' | 'moderator';

/**
 * Podstawowy interfejs użytkownika
 */
export interface User {
  id: number;
  username: string;
  fullname: string;
  role: UserRole;
  points?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Użytkownik w kontekście transferu
 */
export interface TransferUser {
  id: number;
  username: string;
  fullname: string;
}

/**
 * Payload do rejestracji
 */
export interface RegisterPayload {
  username: string;
  password: string;
  fullname: string;
}

/**
 * Payload do logowania
 */
export interface LoginPayload {
  username: string;
  password: string;
}

/**
 * Odpowiedź z logowania
 */
export interface LoginResponse {
  token: string;
  user: User;
}

/**
 * Odpowiedź z rejestracji
 */
export interface RegisterResponse {
  message: string;
  user: User;
}

/**
 * Payload do aktualizacji punktów
 */
export interface UpdateUserPointsPayload {
  points: number;
}

/**
 * Zdekodowany token JWT
 */
export interface JwtPayload {
  role: UserRole;
  exp: number;
  userID: number;
  iat?: number;
}

/**
 * Stan autoryzacji
 */
export interface AuthState {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: number | null;
}
