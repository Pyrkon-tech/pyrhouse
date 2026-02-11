import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useStorage } from './useStorage';
import { discordAuthService } from '../services/discordAuthService';

interface DiscordAuthState {
  isProcessing: boolean;
  error: string | null;
}

export const useDiscordAuth = () => {
  const [state, setState] = useState<DiscordAuthState>({
    isProcessing: false,
    error: null,
  });
  const navigate = useNavigate();
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
      setState({ isProcessing: true, error: null });

      try {
        // Zapisz token
        setToken(token);

        // Dekoduj i zapisz username
        try {
          const decoded: { username?: string } = jwtDecode(token);
          if (decoded?.username) {
            setUsername(decoded.username);
          }
        } catch (err) {
          console.error('Błąd dekodowania JWT:', err);
        }

        // Wyczyść state OAuth
        discordAuthService.clearState();

        // Redirect na home
        navigate('/home');
      } catch (error) {
        setState({
          isProcessing: false,
          error: 'Wystąpił błąd podczas przetwarzania tokena',
        });
      }
    },
    [navigate, setToken, setUsername]
  );

  return {
    isProcessing: state.isProcessing,
    error: state.error,
    initiateDiscordLogin,
    processTokenFromUrl,
  };
};
