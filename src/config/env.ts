/**
 * Centralna konfiguracja zmiennych środowiskowych
 *
 * Zapewnia:
 * - Walidację wymaganych zmiennych
 * - Wartości domyślne
 * - Typowanie
 * - Ostrzeżenia w dev mode dla brakujących zmiennych
 *
 * @example
 * import { env } from '../config/env';
 *
 * const url = env.API_BASE_URL;
 * if (env.IS_PRODUCTION) { ... }
 */

type Environment = 'development' | 'production' | 'test';

/**
 * Pobiera zmienną środowiskową z opcjonalną wartością domyślną
 */
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key];

  if (value !== undefined && value !== '') {
    return value;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  // Ostrzeżenie tylko w development
  if (import.meta.env.DEV) {
    console.warn(`[env] Missing environment variable: ${key}`);
  }

  return '';
};

/**
 * Pobiera zmienną środowiskową jako number
 */
const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);

  if (isNaN(parsed)) {
    console.warn(`[env] Invalid number for ${key}: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }

  return parsed;
};

/**
 * Scentralizowana konfiguracja środowiska
 */
export const env = {
  // === API ===
  /** Bazowy URL API */
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8080'),

  /** Timeout dla requestów API (ms) */
  API_TIMEOUT: getEnvNumber('VITE_API_TIMEOUT', 30000),

  // === Discord ===
  /** Client ID aplikacji Discord OAuth2 */
  DISCORD_CLIENT_ID: getEnvVar('VITE_DISCORD_CLIENT_ID', ''),

  // === Google Maps ===
  /** Klucz API Google Maps */
  GOOGLE_MAPS_API_KEY: getEnvVar('VITE_GOOGLE_MAPS_API_KEY', ''),

  // === Organizer shop ===
  /** Organizer shop URL (e.g. https://shop.pyrhouse.space) — "Otwórz sklep" link; optional */
  SHOP_URL: import.meta.env.VITE_SHOP_URL ?? '',
  /** Google OAuth client ID (public) — the shop builds the Google login URL itself, with PKCE */
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',

  // === App ===
  /** Nazwa aplikacji */
  APP_NAME: getEnvVar('VITE_APP_NAME', 'PyrHouse'),

  /** Środowisko: development | production | test */
  ENVIRONMENT: getEnvVar('VITE_ENVIRONMENT', 'development') as Environment,

  // === Computed ===
  /** Czy środowisko produkcyjne */
  get IS_PRODUCTION(): boolean {
    return import.meta.env.PROD || this.ENVIRONMENT === 'production';
  },

  /** Czy środowisko deweloperskie */
  get IS_DEVELOPMENT(): boolean {
    return import.meta.env.DEV || this.ENVIRONMENT === 'development';
  },

  /** Czy środowisko testowe */
  get IS_TEST(): boolean {
    return this.ENVIRONMENT === 'test';
  },

  /** Czy Google Maps jest skonfigurowany */
  get HAS_GOOGLE_MAPS(): boolean {
    return !!this.GOOGLE_MAPS_API_KEY;
  },

  /** Czy Discord OAuth jest skonfigurowany */
  get HAS_DISCORD(): boolean {
    return !!this.DISCORD_CLIENT_ID;
  },
} as const;

export default env;
