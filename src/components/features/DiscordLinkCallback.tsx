import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Button,
  Alert,
  Container,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { discordAuthService } from '../../services/discordAuthService';
import { linkDiscordAPI } from '../../services/userService';
import { ApiError } from '../../services/apiClient';
import pyrkonLogo from '../../assets/images/p-logo.svg';

const DiscordLinkCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const hasProcessed = useRef(false);

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
    if (targetUserId) {
      navigate(`/users/${targetUserId}`);
    } else {
      navigate('/users');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.background.default} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            borderRadius: 1,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, #5865F2, ${theme.palette.primary.main})`,
            },
          }}
        >
          <Box
            component="img"
            src={pyrkonLogo}
            alt="Pyrkon Logo"
            sx={{
              height: '60px',
              width: 'auto',
              mb: 2,
              filter:
                theme.palette.mode === 'light'
                  ? 'invert(1) brightness(1.2)'
                  : 'none',
            }}
          />

          <Typography
            variant="h5"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(90deg, #5865F2, ${theme.palette.primary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Łączenie konta z Discord
          </Typography>

          {isProcessing && (
            <Box sx={{ mt: 3 }}>
              <CircularProgress sx={{ color: '#5865F2' }} size={48} />
              <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
                Trwa łączenie kont...
              </Typography>
            </Box>
          )}

          {success && (
            <Box sx={{ mt: 3 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 1 }} />
              <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
                Konto Discord zostało pomyślnie połączone!
              </Alert>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGoToProfile}
                sx={{ py: 1.5, px: 4, fontWeight: 600 }}
              >
                Przejdź do profilu
              </Button>
            </Box>
          )}

          {error && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {error}
              </Alert>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handleGoBack}
                  sx={{ py: 1.5, px: 3, fontWeight: 600 }}
                >
                  Wróć
                </Button>
                {targetUserId && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGoToProfile}
                    sx={{ py: 1.5, px: 3, fontWeight: 600 }}
                  >
                    Profil użytkownika
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default DiscordLinkCallback;
