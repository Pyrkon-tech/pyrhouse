/**
 * Google login for the shop: authorization code flow with PKCE (RFC 7636) and state.
 * The backend refuses an exchange without code_verifier, so a Google code cannot be exchanged
 * from anyone else's browser — nobody can take over another person's invite (docs/shop/PLAN.md).
 */
import { env } from '../config/env';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const PENDING_KEY = 'shop_login_pending';
const INVITE_KEY = 'shop_invite_token';

interface PendingLogin {
  state: string;
  verifier: string;
  startedAt: number;
}

export const callbackUrl = () => `${window.location.origin}/auth/google/callback`;

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomString = (bytes = 32) => base64url(crypto.getRandomValues(new Uint8Array(bytes)));

export const codeChallenge = async (verifier: string) =>
  base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));

/** Invite from a /invite/<token> link, kept for the login that follows. */
export const saveInvite = (token: string) => sessionStorage.setItem(INVITE_KEY, token);
export const getInvite = () => sessionStorage.getItem(INVITE_KEY);
export const clearInvite = () => sessionStorage.removeItem(INVITE_KEY);

/** Redirects to Google. */
export const startLogin = async () => {
  if (!env.GOOGLE_CLIENT_ID) throw new Error('Brak konfiguracji logowania (VITE_GOOGLE_CLIENT_ID).');
  const pending: PendingLogin = { state: randomString(16), verifier: randomString(48), startedAt: Date.now() };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(),
    response_type: 'code',
    scope: 'openid email profile',
    state: pending.state,
    code_challenge: await codeChallenge(pending.verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  window.location.assign(`${GOOGLE_AUTH_URL}?${params}`);
};

/**
 * Checks the callback's state against the login this browser started and returns the verifier.
 * One use only: the pending login is cleared either way.
 */
export const takePendingVerifier = (state: string | null): string | null => {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  if (!raw || !state) return null;
  try {
    const pending = JSON.parse(raw) as PendingLogin;
    const fresh = Date.now() - pending.startedAt < 15 * 60 * 1000;
    return pending.state === state && fresh ? pending.verifier : null;
  } catch {
    return null;
  }
};
