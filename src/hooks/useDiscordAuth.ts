import { useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useStorage } from './useStorage';
import { discordAuthService } from '../services/discordAuthService';
import { apiClient } from '../services/apiClient';

interface DiscordAuthState {
  isProcessing: boolean;
  error: string | null;
}

export const useDiscordAuth = () => {
  const [state, setState] = useState<DiscordAuthState>({
    isProcessing: false,
    error: null,
  });
  const { setToken, setUsername } = useStorage();

  /**
   * Inicjuje logowanie przez Discord
   * Generuje state CSRF i przekierowuje do backendu
   */
  const initiateDiscordLogin = useCallback(() => {
    discordAuthService.initiateLogin();
  }, []);

  /**
   * Przetwarza token otrzymany z URL (po redirectcie z backendu)
   * Zapisuje token, dekoduje username i przekierowuje na /home
   */
  const processTokenFromUrl = useCallback(
    (token: string) => {
      console.log('[Discord Auth] Processing token from URL');
      console.log('[Discord Auth] Token preview:', token.substring(0, 50) + '...');

      setState({ isProcessing: true, error: null });

      try {
        // Zapisz token
        setToken(token);
        console.log('[Discord Auth] Token saved to localStorage');
        console.log('[Discord Auth] Verify localStorage:', localStorage.getItem('token')?.substring(0, 50) + '...');

        // Dekoduj i zapisz username
        try {
          const decoded: { username?: string } = jwtDecode(token);
          console.log('[Discord Auth] Decoded JWT:', decoded);
          if (decoded?.username) {
            setUsername(decoded.username);
          }
        } catch (err) {
          console.error('[Discord Auth] Błąd dekodowania JWT:', err);
        }

        // Wyczyść state OAuth
        discordAuthService.clearState();

        // Redirect na home - używamy window.location zamiast navigate()
        // żeby wymusić pełne przeładowanie strony i uniknąć race condition
        console.log('[Discord Auth] Redirecting to /home (full page reload)');
        window.location.href = '/home';
      } catch (error) {
        console.error('[Discord Auth] Error:', error);
        setState({
          isProcessing: false,
          error: 'Wystąpił błąd podczas przetwarzania tokena',
        });
      }
    },
    [setToken, setUsername]
  );

  /**
   * Obsługuje callback z Discorda — nowy flow bez pośrednictwa backendu.
   * 1. Sprawdza CSRF state
   * 2. Wymienia code na JWT przez POST /auth/discord/exchange
   * 3. Zapisuje token i przekierowuje na /home
   */
  const processCodeCallback = useCallback(
    async (code: string, receivedState: string) => {
      setState({ isProcessing: true, error: null });

      if (!discordAuthService.validateAndClearState(receivedState)) {
        setState({ isProcessing: false, error: 'Nieprawidłowy state OAuth — możliwy atak CSRF. Spróbuj zalogować się ponownie.' });
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/auth/discord/callback`;
        const data = await apiClient.post<{ token: string }>('/auth/discord/exchange', {
          code,
          redirect_uri: redirectUri,
        });

        setToken(data.token);

        try {
          const decoded: { username?: string } = jwtDecode(data.token);
          if (decoded?.username) setUsername(decoded.username);
        } catch {
          // JWT decode failure nie blokuje logowania
        }

        window.location.href = '/home';
      } catch (error: any) {
        setState({
          isProcessing: false,
          error: error.message || 'Błąd podczas wymiany kodu autoryzacyjnego',
        });
      }
    },
    [setToken, setUsername],
  );

  return {
    isProcessing: state.isProcessing,
    error: state.error,
    initiateDiscordLogin,
    processTokenFromUrl,
    processCodeCallback,
  };
};
