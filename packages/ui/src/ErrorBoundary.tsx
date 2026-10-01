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

  handleHome = () => {
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        // data-testid: the browser smoke test (e2e/smoke.mjs) detects a crash by it, not by the wording
        <Box
          data-testid="error-boundary"
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', p: 2 }}
        >
          <Paper elevation={3} sx={{ p: 4, maxWidth: 440, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 56, lineHeight: 1, mb: 1 }} aria-hidden="true">
              🐭🔧
            </Typography>
            <Typography variant="h5" color="primary" gutterBottom>
              Apka w przebudowie
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
              Techniczna nornica grzebie w kodzie i coś się jej rozsypało.
              <br />
              Odśwież stronę — jeśli wraca, daj znać działowi technicznemu.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: this.state.error ? 2 : 0 }}>
              <Button variant="contained" color="primary" onClick={this.handleReload}>
                Odśwież stronę
              </Button>
              <Button variant="outlined" onClick={this.handleHome}>
                Wróć na start
              </Button>
            </Box>
            {this.state.error && (
              <Box component="details" sx={{ textAlign: 'left' }}>
                <Typography component="summary" variant="caption" sx={{ color: 'text.secondary', cursor: 'pointer' }}>
                  Szczegóły dla nornicy
                </Typography>
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    p: 1,
                    mt: 1,
                    maxHeight: 160,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                  }}
                >
                  {this.state.error.message}
                  {this.state.error.stack ? `\n${this.state.error.stack.split('\n').slice(1, 4).join('\n')}` : ''}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary; 