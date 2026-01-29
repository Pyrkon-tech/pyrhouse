/**
 * Centralny context dla powiadomień (toasts/snackbars)
 *
 * @example
 * // W komponencie
 * const { showSuccess, showError } = useNotification();
 *
 * const handleSave = async () => {
 *   try {
 *     await saveData();
 *     showSuccess('Zapisano pomyślnie');
 *   } catch (error) {
 *     showError(error.message);
 *   }
 * };
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';

// Typy
interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  autoHideDuration?: number;
}

interface NotificationContextType {
  /** Wyświetla powiadomienie sukcesu */
  showSuccess: (message: string, duration?: number) => void;
  /** Wyświetla powiadomienie błędu */
  showError: (message: string, duration?: number) => void;
  /** Wyświetla powiadomienie ostrzeżenia */
  showWarning: (message: string, duration?: number) => void;
  /** Wyświetla powiadomienie informacyjne */
  showInfo: (message: string, duration?: number) => void;
  /** Wyświetla custom powiadomienie */
  showNotification: (message: string, severity: AlertColor, duration?: number) => void;
  /** Zamyka aktywne powiadomienie */
  hideNotification: () => void;
}

// Context
const NotificationContext = createContext<NotificationContextType | null>(null);

// Transition component
function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

// Domyślne czasy wyświetlania (ms)
const DEFAULT_DURATIONS: Record<AlertColor, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

// Provider
interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = useCallback((
    message: string,
    severity: AlertColor,
    duration?: number
  ) => {
    setNotification({
      id: Date.now().toString(),
      message,
      severity,
      autoHideDuration: duration || DEFAULT_DURATIONS[severity],
    });
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showNotification(message, 'success', duration);
  }, [showNotification]);

  const showError = useCallback((message: string, duration?: number) => {
    showNotification(message, 'error', duration);
  }, [showNotification]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showNotification(message, 'warning', duration);
  }, [showNotification]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showNotification(message, 'info', duration);
  }, [showNotification]);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const handleClose = useCallback((
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    // Nie zamykaj przy kliknięciu poza snackbar
    if (reason === 'clickaway') {
      return;
    }
    hideNotification();
  }, [hideNotification]);

  const contextValue = useMemo(() => ({
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
    hideNotification,
  }), [showSuccess, showError, showWarning, showInfo, showNotification, hideNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <Snackbar
        key={notification?.id}
        open={!!notification}
        autoHideDuration={notification?.autoHideDuration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={SlideTransition}
      >
        {notification ? (
          <Alert
            onClose={handleClose}
            severity={notification.severity}
            variant="filled"
            elevation={6}
            sx={{
              width: '100%',
              minWidth: 300,
              '& .MuiAlert-message': {
                fontSize: '0.95rem',
              },
            }}
          >
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  );
};

/**
 * Hook do używania powiadomień
 *
 * @throws Error jeśli użyty poza NotificationProvider
 *
 * @example
 * const { showSuccess, showError } = useNotification();
 * showSuccess('Operacja zakończona sukcesem');
 * showError('Wystąpił błąd');
 */
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }

  return context;
};

export default NotificationContext;
