import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { jwtDecode } from 'jwt-decode';
import { googleAuthService } from '../../services/googleAuthService';
import { linkGoogleAPI } from '../../services/userService';
import { apiClient, ApiError } from '../../services/apiClient';
import { useStorage } from '../../hooks/useStorage';
import { Button } from '../ui/Button';
import SystemInitAnimation from '../animations/SystemInitAnimation';

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUsername } = useStorage();
  const hasProcessed = useRef(false);
  const [animDone, setAnimDone] = useState(false);

  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [isLinkFlow, setIsLinkFlow] = useState(false);

  const code = searchParams.get('code');
  const urlError = searchParams.get('error');

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    if (urlError) {
      setError(`Google zwrócił błąd: ${decodeURIComponent(urlError)}`);
      setIsProcessing(false);
      return;
    }

    if (!code) {
      setError('Brak wymaganego parametru autoryzacji (code).');
      setIsProcessing(false);
      return;
    }

    const linkContext = googleAuthService.getLinkContext();

    if (linkContext) {
      // Link flow — łączenie konta z Google
      setIsLinkFlow(true);
      setTargetUserId(linkContext.userId);

      const performLinking = async () => {
        try {
          const redirectUri = `${window.location.origin}/auth/google/callback`;
          await linkGoogleAPI(linkContext.userId, { code, redirect_uri: redirectUri });
          setSuccess(true);
        } catch (err) {
          if (err instanceof ApiError) {
            switch (err.status) {
              case 400:
                setError('Nieprawidłowe dane żądania. Spróbuj ponownie.');
                break;
              case 403:
                setError(err.message?.includes('pyrkon.pl')
                  ? 'Dostęp tylko dla kont @pyrkon.pl.'
                  : 'Brak uprawnień do łączenia tego konta.');
                break;
              case 409:
                setError('To konto Google jest już połączone z innym użytkownikiem.');
                break;
              default:
                setError(err.message || 'Wystąpił błąd podczas łączenia kont.');
            }
          } else {
            setError('Błąd połączenia z serwerem. Spróbuj ponownie.');
          }
        } finally {
          googleAuthService.clearLinkContext();
          setIsProcessing(false);
        }
      };

      performLinking();
    } else {
      // Login flow — wymiana kodu na token
      const performLogin = async () => {
        try {
          const redirectUri = `${window.location.origin}/auth/google/callback`;
          const data = await apiClient.post<{ token: string }>('/auth/google/exchange', {
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
        } catch (err) {
          if (err instanceof ApiError) {
            switch (err.status) {
              case 403:
                setError(err.message?.includes('pyrkon.pl')
                  ? 'Dostęp tylko dla kont @pyrkon.pl.'
                  : err.message?.includes('inactive')
                  ? 'Konto jest nieaktywne. Skontaktuj się z administratorem.'
                  : 'Brak dostępu.');
                break;
              case 400:
                setError('Nieprawidłowy lub wygasły kod autoryzacyjny. Spróbuj ponownie.');
                break;
              default:
                setError(err.message || 'Błąd podczas logowania przez Google.');
            }
          } else {
            setError('Błąd połączenia z serwerem. Spróbuj ponownie.');
          }
          setIsProcessing(false);
        }
      };

      performLogin();
    }
  }, [code, urlError, setToken, setUsername]);

  const handleGoToProfile = () => {
    if (targetUserId) navigate(`/users/${targetUserId}`);
    else navigate('/users');
  };

  const handleBackToLogin = () => navigate('/login');

  if (!animDone) {
    return <SystemInitAnimation onComplete={() => setAnimDone(true)} />;
  }

  if (isProcessing && !error && !success) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: '#0f0f23',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: '#ff9800' }} />
        <Typography
          sx={{
            color: 'rgba(255,152,0,0.6)',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            fontSize: '0.7rem',
          }}
        >
          {isLinkFlow ? 'ŁĄCZENIE GOOGLE...' : 'WERYFIKACJA GOOGLE...'}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: '#0f0f23',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ p: 4, maxWidth: 440, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            {error}
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {isLinkFlow ? (
              <>
                <Button variant="outline" onClick={() => navigate(-1)}>Wróć</Button>
                {targetUserId && (
                  <Button variant="primary" onClick={handleGoToProfile}>Profil użytkownika</Button>
                )}
              </>
            ) : (
              <Button variant="primary" onClick={handleBackToLogin}>
                Powrót do logowania
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  if (success && isLinkFlow) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: '#0f0f23',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ p: 4, maxWidth: 440, textAlign: 'center' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 1 }} />
          <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
            Konto Google zostało pomyślnie połączone!
          </Alert>
          <Button variant="primary" onClick={handleGoToProfile}>
            Przejdź do profilu
          </Button>
        </Box>
      </Box>
    );
  }

  return null;
};

export default GoogleCallback;
