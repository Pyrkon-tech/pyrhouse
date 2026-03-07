import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useDiscordAuth } from '../../hooks/useDiscordAuth';
import { Button } from '../ui/Button';
import SystemInitAnimation from '../animations/SystemInitAnimation';

const DiscordCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isProcessing, error, processCodeCallback } = useDiscordAuth();
  const hasProcessed = useRef(false);
  const [animDone, setAnimDone] = useState(false);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const urlError = searchParams.get('error');

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    if (urlError) return;
    if (code && state) {
      processCodeCallback(code, state);
    }
  }, [code, state, urlError, processCodeCallback]);

  const handleBackToLogin = () => navigate('/login');

  const displayError = urlError ? decodeURIComponent(urlError) : error;
  const missingParams = !code && !urlError && !isProcessing;

  // Always show animation first — same experience as regular login
  if (!animDone) {
    return <SystemInitAnimation onComplete={() => setAnimDone(true)} />;
  }

  // Still waiting for backend after animation finished
  if (isProcessing && !displayError) {
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
          WERYFIKACJA DISCORD...
        </Typography>
      </Box>
    );
  }

  // Error or missing params
  if (displayError || missingParams) {
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
          <Alert severity={missingParams ? 'warning' : 'error'} sx={{ mb: 3, textAlign: 'left' }}>
            {missingParams ? 'Brak wymaganych parametrów autoryzacji.' : displayError}
          </Alert>
          <Button variant="primary" onClick={handleBackToLogin}>
            Powrót do logowania
          </Button>
        </Box>
      </Box>
    );
  }

  // Success — processCodeCallback handles redirect, nothing to render
  return null;
};

export default DiscordCallback;
