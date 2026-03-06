import React, { useEffect, useState } from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { useAnimationPreference } from '../../hooks/useAnimationPreference';
import pyrkonLogo from '../../assets/images/p-logo.svg';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const glowPulse = keyframes`
  0%, 100% { filter: drop-shadow(0 0 4px #ff9800) drop-shadow(0 0 8px rgba(255,152,0,0.4)); }
  50%       { filter: drop-shadow(0 0 8px #ff9800) drop-shadow(0 0 16px rgba(255,152,0,0.6)); }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

const TOTAL_DURATION_MS = 2000;
const PROGRESS_DURATION_MS = 1400;
const FADE_OUT_DELAY_MS = 1700;

interface SystemInitAnimationProps {
  onComplete: () => void;
}

/**
 * Animacja inicjalizacji systemu — zastępuje "hyperjump" w LoginForm.
 * Wyświetla logo + pasek postępu + tekst "INICJALIZACJA SYSTEMU"
 * w kolorystyce Pyrkonu (orange + dark blue-black).
 *
 * Czas trwania: ~2s. Respektuje preferencje animacji użytkownika.
 */
const SystemInitAnimation: React.FC<SystemInitAnimationProps> = ({ onComplete }) => {
  const { prefersAnimations } = useAnimationPreference();
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!prefersAnimations) {
      onComplete();
      return;
    }

    // Symulacja postępu paska ładowania
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / PROGRESS_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressInterval);
      }
    }, 16); // ~60fps

    const fadeOutTimer = setTimeout(() => {
      setFadingOut(true);
    }, FADE_OUT_DELAY_MS);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, TOTAL_DURATION_MS);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [prefersAnimations, onComplete]);

  if (!prefersAnimations) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        bgcolor: '#0f0f23',
        animation: fadingOut ? `${fadeOut} 0.3s ease-out forwards` : 'none',
      }}
    >
      {/* Logo */}
      <Box
        component="img"
        src={pyrkonLogo}
        alt="PyrHouse"
        sx={{
          height: 72,
          width: 'auto',
          filter: 'invert(1)',
          animation: `${glowPulse} 1.5s ease-in-out infinite, ${fadeIn} 0.3s ease-out`,
        }}
      />

      {/* Tytuł */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: '#ff9800',
          letterSpacing: '0.08em',
          animation: `${fadeIn} 0.4s ease-out 0.1s both`,
        }}
      >
        PyrHouse
      </Typography>

      {/* Pasek postępu */}
      <Box
        sx={{
          width: { xs: 240, sm: 320 },
          animation: `${fadeIn} 0.4s ease-out 0.15s both`,
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 3,
            borderRadius: 2,
            bgcolor: 'rgba(255,152,0,0.15)',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#ff9800',
              boxShadow: '0 0 8px rgba(255,152,0,0.6)',
              borderRadius: 2,
            },
          }}
        />
      </Box>

      {/* Tekst statusu */}
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,152,0,0.6)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          animation: `${fadeIn} 0.4s ease-out 0.25s both`,
        }}
      >
        Inicjalizacja systemu...
      </Typography>
    </Box>
  );
};

export default SystemInitAnimation;
