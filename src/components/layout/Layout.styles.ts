import { SxProps, Theme } from "@mui/material";
import { designTokens } from '../../theme/designTokens';

// Helper do tworzenia stylów zależnych od trybu
const getGlassStyles = (mode: 'light' | 'dark') => ({
  background: mode === 'dark'
    ? designTokens.glass.dark.background
    : designTokens.glass.light.backgroundStrong,
  backdropFilter: designTokens.glass.light.backdropBlur,
  WebkitBackdropFilter: designTokens.glass.light.backdropBlur, // Safari
  borderBottom: mode === 'dark'
    ? `1px solid ${designTokens.darkPalette.border.default}`
    : '1px solid rgba(255, 152, 0, 0.1)',
});

const styles: {
  root: SxProps<Theme>;
  navigation: SxProps<Theme>;
  mainContent: SxProps<Theme>;
  appBar: SxProps<Theme>;
} = {
  root: {
    display: 'flex',
    minHeight: '100vh',
  },
  navigation: {
    // Style są teraz aplikowane bezpośrednio w Layout.tsx
    // dla lepszej kontroli nad pozycjonowaniem i responsywnością
  },
  mainContent: {
    width: '100%',
    marginTop: '64px',
    padding: '24px',
    transition: 'margin 0.3s ease-in-out, width 0.3s ease-in-out',
    boxSizing: 'border-box',
    '@media (max-width: 600px)': {
      marginTop: '56px',
      padding: '16px',
      '& > *': {
        maxWidth: '100%',
        boxSizing: 'border-box'
      }
    }
  },
  appBar: {
    zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
    transition: 'all 0.3s ease-in-out',
    // Prostokątny AppBar - bez zaokrągleń
    borderRadius: 0,
    // Ciemny AppBar w obu trybach dla lepszej widoczności
    background: designTokens.darkPalette.background.paper, // #1a1a2e - zawsze ciemny
    backdropFilter: designTokens.glass.dark.backdropBlur,
    WebkitBackdropFilter: designTokens.glass.dark.backdropBlur,
    borderBottom: `1px solid ${designTokens.darkPalette.border.default}`,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    color: '#ffffff', // Biały tekst
    // Orange glow line at bottom
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: designTokens.gradients.primary,
      opacity: 0.8,
    },
    '@media (max-width: 600px)': {
      top: 0,
    },
    // Nadpisanie stylów MUI Paper
    '&.MuiPaper-root': {
      borderRadius: 0,
    },
  }
};

// Export helper for glass styles
export const glassStyles = getGlassStyles;

export default styles;
