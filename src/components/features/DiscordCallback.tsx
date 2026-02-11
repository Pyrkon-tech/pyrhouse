import React, { useEffect, useRef } from 'react';
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
import { useDiscordAuth } from '../../hooks/useDiscordAuth';
import pyrkonLogo from '../../assets/images/p-logo.svg';

const DiscordCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { isProcessing, error, processTokenFromUrl } = useDiscordAuth();
  const hasProcessed = useRef(false);

  // Backend przekierowuje z ?token=xxx lub ?error=xxx
  const token = searchParams.get('token');
  const urlError = searchParams.get('error');

  useEffect(() => {
    // Zapobiegaj podwójnemu wywołaniu (StrictMode)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    // Obsługa błędu z backendu
    if (urlError) {
      return;
    }

    // Obsługa tokena z backendu
    if (token) {
      processTokenFromUrl(token);
      return;
    }

    // Brak token i error - coś poszło nie tak
  }, [token, urlError, processTokenFromUrl]);

  const handleBackToLogin = () => {
    navigate('/login');
  };

  // Wyświetl błąd z URL
  const displayError = urlError
    ? decodeURIComponent(urlError)
    : error;

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
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
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
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Logowanie przez Discord
          </Typography>

          {isProcessing && !displayError && (
            <Box sx={{ mt: 3 }}>
              <CircularProgress color="primary" size={48} />
              <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
                Trwa autoryzacja...
              </Typography>
            </Box>
          )}

          {displayError && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {displayError}
              </Alert>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBackToLogin}
                sx={{
                  py: 1.5,
                  px: 4,
                  fontWeight: 600,
                }}
              >
                Powrót do logowania
              </Button>
            </Box>
          )}

          {!token && !urlError && !isProcessing && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                Brak wymaganych parametrów autoryzacji.
              </Alert>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBackToLogin}
              >
                Powrót do logowania
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default DiscordCallback;
