import { Snackbar, Alert, Box, Typography, Slide, SlideProps } from '@mui/material';
import React from 'react';

interface AppSnackbarProps {
  open: boolean;
  type: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  onClose: () => void;
  autoHideDuration?: number | null;
}

const TITLES: Record<AppSnackbarProps['type'], string> = {
  success: 'Sukces',
  error: 'Błąd',
  warning: 'Uwaga',
};

function SlideLeft(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

export const AppSnackbar: React.FC<AppSnackbarProps> = ({
  open,
  type,
  message,
  details,
  onClose,
  autoHideDuration = 4000,
}) => (
  <Snackbar
    open={open}
    autoHideDuration={autoHideDuration}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    slots={{
      transition: SlideLeft
    }}
  >
    <Alert
      severity={type}
      variant="filled"
      elevation={8}
      onClose={onClose}
      sx={{
        minWidth: 300,
        maxWidth: 480,
        borderRadius: 2,
        '& .MuiAlert-message': { width: '100%' },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            lineHeight: 1.3
          }}>
          {TITLES[type]}
        </Typography>
        <Typography variant="body2" sx={{
          lineHeight: 1.4
        }}>
          {message}
        </Typography>
        {details && (
          <Typography variant="caption" sx={{ opacity: 0.85, mt: 0.25 }}>
            {details}
          </Typography>
        )}
      </Box>
    </Alert>
  </Snackbar>
);
