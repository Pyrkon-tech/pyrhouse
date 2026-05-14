/**
 * Typy związane z użytkownikami
 */

/**
 * Role użytkowników
 */
export type UserRole = 'user' | 'dispatcher' | 'moderator' | 'admin';

/**
 * Typ providera autoryzacji
 */
export type AuthProvider = 'discord' | 'google' | 'local' | null;

/**
 * Użytkownik na liście (GET /users)
 * Nie zawiera discord_id ani avatar_url
 */
export interface UserListItem {
  id: number;
  username: string;
  fullname: string | null;
  role: UserRole;
  points: number;
  active: boolean;
  discord_username: string | null;
  auth_provider: AuthProvider;
}

/**
 * Szczegóły użytkownika (GET /users/:id)
 * Zawiera pełne dane Discord
 */
export interface UserDetails {
  id: number;
  username: string;
  fullname: string | null;
  role: UserRole;
  points: number;
  active: boolean;
  discord_id: string | null;
  discord_username: string | null;
  avatar_url: string | null;
  google_id: string | null;
  google_email: string | null;
  auth_provider: AuthProvider;
}

/**
 * Podstawowy interfejs użytkownika (zachowany dla kompatybilności wstecznej)
 */
export interface User {
  id: number;
  username: string;
  fullname: string | null;
  role: UserRole;
  points?: number;
  created_at?: string;
  updated_at?: string;
  active?: boolean;
  discord_id?: string | null;
  discord_username?: string | null;
  avatar_url?: string | null;
  auth_provider?: AuthProvider;
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

/**
 * Payload do łączenia konta z Google (POST /users/:id/link-google)
 */
export interface LinkGooglePayload {
  code: string;
  redirect_uri: string;
}

/**
 * Odpowiedź po połączeniu z Google
 */
export interface LinkGoogleResponse {
  message: string;
}

/**
 * Payload do łączenia konta z Discord (POST /users/:id/link-discord)
 */
export interface LinkDiscordPayload {
  code: string;
  state: string;
}

/**
 * Odpowiedź po połączeniu z Discord
 */
export interface LinkDiscordResponse {
  message: string;
}

/**
 * Payload do scalania kont Discord (POST /users/:id/merge-discord)
 * source_user_id — ghost konto z Discorda, z którego przenosimy dane
 */
export interface MergeDiscordPayload {
  source_user_id: number;
}

/**
 * Odpowiedź po scaleniu kont
 * source_deleted: true — ghost konto usunięte
 * source_deleted: false — ghost konto miało powiązane dane, zostało dezaktywowane
 */
export interface MergeDiscordResponse {
  message: string;
  source_deleted: boolean;
}
