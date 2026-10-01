/**
 * The shop's build-time configuration (Vite env). Kept apart from the warehouse's config/env so the shop
 * bundle does not depend on warehouse code.
 */
export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  /** OAuth client for the shop's Google login (PKCE) */
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
} as const;
