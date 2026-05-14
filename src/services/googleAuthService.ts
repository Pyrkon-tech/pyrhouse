import { env } from '../config/env';

const GOOGLE_LINK_KEY = 'google_link_context';

interface LinkContext {
  userId: number;
  timestamp: number;
}

export const googleAuthService = {
  initiateLogin(): void {
    this.clearLinkContext();
    window.location.href = `${env.API_BASE_URL}/auth/google`;
  },

  saveLinkContext(userId: number): void {
    const context: LinkContext = { userId, timestamp: Date.now() };
    sessionStorage.setItem(GOOGLE_LINK_KEY, JSON.stringify(context));
  },

  getLinkContext(): LinkContext | null {
    const raw = sessionStorage.getItem(GOOGLE_LINK_KEY);
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

  clearLinkContext(): void {
    sessionStorage.removeItem(GOOGLE_LINK_KEY);
  },

  initiateLinking(userId: number): void {
    this.saveLinkContext(userId);
    window.location.href = `${env.API_BASE_URL}/auth/google`;
  },
};
