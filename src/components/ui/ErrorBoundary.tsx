import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    const isChunkError = /Failed to fetch dynamically imported module|Expected a JavaScript-or-Wasm module script|Importing a module script failed/.test(error.message ?? '');
    if (isChunkError) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const isChunkError = /Failed to fetch dynamically imported module|Expected a JavaScript-or-Wasm module script|Importing a module script failed/.test(error.message ?? '');
    if (isChunkError && !sessionStorage.getItem('chunk_reload_attempted')) {
      sessionStorage.setItem('chunk_reload_attempted', '1');
      window.location.reload();
      return;
    }
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 400, textAlign: 'center' }}>
            <Typography variant="h5" color="primary" gutterBottom>
              Coś poszło nie tak :(
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Wystąpił błąd podczas ładowania tej części aplikacji.<br />Spróbuj odświeżyć stronę.
            </Typography>
            {this.state.error && (
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  display: 'block',
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  p: 1,
                  mb: 2,
                  maxHeight: 160,
                  overflow: 'auto',
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error.message}
                {this.state.error.stack ? `\n${this.state.error.stack.split('\n').slice(1, 4).join('\n')}` : ''}
              </Typography>
            )}
            <Button variant="contained" color="primary" onClick={this.handleReload}>
              Odśwież stronę
            </Button>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary; 