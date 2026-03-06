import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface PageLoaderProps {
  message?: string;
  size?: number;
  /** Gdy true — zajmuje całą stronę (position: fixed). Domyślnie inline. */
  fullPage?: boolean;
}

/**
 * Centralny spinner ładowania strony.
 * Zastępuje ~8 linii `<Box sx={{ display:'flex', justifyContent:'center' }}><CircularProgress /></Box>`
 * powtarzanych w każdej stronie.
 *
 * @example
 * {loading && <PageLoader message="Ładowanie kategorii..." />}
 *
 * // Tryb pełnoekranowy:
 * {loading && <PageLoader fullPage />}
 */
export const PageLoader: React.FC<PageLoaderProps> = ({
  message,
  size = 40,
  fullPage = false,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      ...(fullPage
        ? {
            position: 'fixed',
            inset: 0,
            bgcolor: 'background.default',
            zIndex: 'modal',
          }
        : { py: 6 }),
    }}
  >
    <CircularProgress size={size} />
    {message && (
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    )}
  </Box>
);
