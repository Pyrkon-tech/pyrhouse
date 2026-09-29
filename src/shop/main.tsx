import React from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createThemeWithMode } from '../theme/theme';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import ShopApp from './ShopApp';

// The shop uses the PyrHouse dark design (mockups), with no light/dark switch.
const theme = createThemeWithMode('dark');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <ShopApp />
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>,
);
