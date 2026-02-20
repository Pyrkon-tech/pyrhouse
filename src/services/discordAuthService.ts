import { env } from '../config/env';

const DISCORD_STATE_KEY = 'discord_oauth_state';
const DISCORD_LINK_KEY = 'discord_link_context';

interface OAuthState {
  value: string;
  timestamp: number;
}

interface LinkContext {
  userId: number;
  state: string;
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

  // =========================================================================
  // Discord Account Linking (łączenie kont)
  // =========================================================================

  /**
   * Zapisuje kontekst linkowania do sessionStorage
   */
  saveLinkContext(userId: number, state: string): void {
    const context: LinkContext = {
      userId,
      state,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(DISCORD_LINK_KEY, JSON.stringify(context));
  },

  /**
   * Pobiera kontekst linkowania z sessionStorage
   * Zwraca null jeśli brak lub wygasł (15 min)
   */
  getLinkContext(): LinkContext | null {
    const raw = sessionStorage.getItem(DISCORD_LINK_KEY);
    if (!raw) return null;

    try {
      const context: LinkContext = JSON.parse(raw);
      const MAX_AGE_MS = 15 * 60 * 1000;
      if (Date.now() - context.timestamp > MAX_AGE_MS) {
        this.clearLinkContext();
        return null;
      }
      return context;
    } catch {
      this.clearLinkContext();
      return null;
    }
  },

  /**
   * Czyści kontekst linkowania
   */
  clearLinkContext(): void {
    sessionStorage.removeItem(DISCORD_LINK_KEY);
  },

  /**
   * Inicjuje flow łączenia konta z Discord
   * Przekierowuje do Discord OAuth z odpowiednim redirect_uri
   * Po autoryzacji Discord przekieruje na /auth/discord/link-callback z code+state
   */
  initiateLinking(userId: number): void {
    if (!env.DISCORD_CLIENT_ID) {
      throw new Error('VITE_DISCORD_CLIENT_ID nie jest skonfigurowany');
    }

    const state = this.generateState();
    this.saveLinkContext(userId, state);

    const redirectUri = `${window.location.origin}/auth/discord/link-callback`;
    const params = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify',
      state,
    });

    window.location.href = `https://discord.com/oauth2/authorize?${params.toString()}`;
  },
};
