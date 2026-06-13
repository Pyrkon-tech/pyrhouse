import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import { discordAuthService } from '../../services/discordAuthService';
import { linkDiscordAPI } from '../../services/userService';
import { ApiError } from '../../services/apiClient';
import { Button } from '../ui/Button';
import SystemInitAnimation from '../animations/SystemInitAnimation';

const DiscordLinkCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  const [animDone, setAnimDone] = useState(false);

  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const urlError = searchParams.get('error');

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    if (urlError) {
      setError(`Discord zwrócił błąd: ${decodeURIComponent(urlError)}`);
      setIsProcessing(false);
      return;
    }

    if (!code || !state) {
      setError('Brak wymaganych parametrów autoryzacji (code/state).');
      setIsProcessing(false);
      return;
    }

    const linkContext = discordAuthService.getLinkContext();
    if (!linkContext) {
      setError('Sesja łączenia wygasła lub jest nieprawidłowa. Spróbuj ponownie.');
      setIsProcessing(false);
      return;
    }

    if (linkContext.state !== state) {
      setError('Nieprawidłowy parametr state (CSRF). Spróbuj ponownie.');
      discordAuthService.clearLinkContext();
      setIsProcessing(false);
      return;
    }

    setTargetUserId(linkContext.userId);

    const performLinking = async () => {
      try {
        await linkDiscordAPI(linkContext.userId, { code, state });
        setSuccess(true);
      } catch (err) {
        if (err instanceof ApiError) {
          switch (err.status) {
            case 400:
              setError('Nieprawidłowe dane żądania. Spróbuj ponownie.');
              break;
            case 403:
              setError('Brak uprawnień do łączenia tego konta.');
              break;
            case 409:
              setError('To konto Discord jest już połączone z innym użytkownikiem. Najpierw odłącz je od tamtego konta.');
              break;
            default:
              setError(err.message || 'Wystąpił błąd podczas łączenia kont.');
          }
        } else {
          setError('Błąd połączenia z serwerem. Spróbuj ponownie.');
        }
      } finally {
        discordAuthService.clearLinkContext();
        setIsProcessing(false);
      }
    };

    performLinking();
  }, [code, state, urlError]);

  const handleGoToProfile = () => {
    if (targetUserId) navigate(`/users/${targetUserId}`);
    else navigate('/users');
  };

  const handleGoBack = () => navigate(-1);

  // Always show animation first — same experience as regular login
  if (!animDone) {
    return <SystemInitAnimation onComplete={() => setAnimDone(true)} />;
  }

  // Still waiting for backend after animation finished
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
          ŁĄCZENIE DISCORD...
        </Typography>
      </Box>
    );
  }

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
        {success && (
          <>
            <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 1 }} />
            <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
              Konto Discord zostało pomyślnie połączone!
            </Alert>
            <Button variant="primary" onClick={handleGoToProfile}>
              Przejdź do profilu
            </Button>
          </>
        )}

        {error && (
          <>
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outline" onClick={handleGoBack}>Wróć</Button>
              {targetUserId && (
                <Button variant="primary" onClick={handleGoToProfile}>Profil użytkownika</Button>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default DiscordLinkCallback;
