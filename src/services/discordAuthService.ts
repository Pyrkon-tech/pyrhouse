import { env } from '../config/env';

const DISCORD_STATE_KEY = 'discord_oauth_state';

interface OAuthState {
  value: string;
  timestamp: number;
}

export const discordAuthService = {
  /**
   * Generuje kryptograficznie bezpieczny state dla CSRF protection
   */
  generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Zapisuje state do sessionStorage z timestamp
   */
  saveState(state: string): void {
    const stateData: OAuthState = {
      value: state,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(DISCORD_STATE_KEY, JSON.stringify(stateData));
  },

  /**
   * Czyści state z sessionStorage
   */
  clearState(): void {
    sessionStorage.removeItem(DISCORD_STATE_KEY);
  },

  /**
   * Inicjuje logowanie przez Discord
   * Generuje state, zapisuje go i przekierowuje do backendu
   * Backend następnie przekieruje do Discord, a po autoryzacji
   * wróci na frontend z tokenem w query params
   */
  initiateLogin(): void {
    const state = this.generateState();
    this.saveState(state);

    // Backend zwraca 307 redirect do Discord OAuth
    const url = `${env.API_BASE_URL}/auth/discord?state=${encodeURIComponent(state)}`;
    window.location.href = url;
  },
};
