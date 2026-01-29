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

  // === Google Maps ===
  /** Klucz API Google Maps */
  GOOGLE_MAPS_API_KEY: getEnvVar('VITE_GOOGLE_MAPS_API_KEY', ''),

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
} as const;

/**
 * Waliduje wszystkie wymagane zmienne środowiskowe
 * Wywołaj na starcie aplikacji w development
 */
export const validateEnv = (): void => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Wymagane w production
  if (env.IS_PRODUCTION) {
    if (!env.API_BASE_URL || env.API_BASE_URL === 'http://localhost:8080') {
      errors.push('VITE_API_BASE_URL should be set in production');
    }
  }

  // Opcjonalne ostrzeżenia
  if (!env.GOOGLE_MAPS_API_KEY) {
    warnings.push('VITE_GOOGLE_MAPS_API_KEY is not set - map features will be disabled');
  }

  // Wyświetl ostrzeżenia
  if (warnings.length > 0 && env.IS_DEVELOPMENT) {
    console.warn('[env] Configuration warnings:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  // Rzuć błąd dla krytycznych problemów
  if (errors.length > 0) {
    console.error('[env] Configuration errors:');
    errors.forEach((e) => console.error(`  - ${e}`));

    if (env.IS_PRODUCTION) {
      throw new Error('Invalid environment configuration');
    }
  }
};

export default env;
