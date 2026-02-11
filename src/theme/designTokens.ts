import { Theme } from '@mui/material/styles';

// Design tokens - centralne wartości dla całej aplikacji
// WOW REDESIGN - Orange jako PRIMARY (Pyrkon branding)
export const designTokens = {
  // Kolory
  colors: {
    // Primary: Pyrkon Orange - główny kolor brandingu
    primary: {
      50: '#fff8f0',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#ff9800', // MAIN - Pyrkon Orange
      600: '#f57c00',
      700: '#ef6c00',
      800: '#e65100',
      900: '#bf360c',
    },
    // Secondary: Deep Burnt Orange - uzupełnienie primary
    secondary: {
      50: '#fbe9e7',
      100: '#ffccbc',
      200: '#ffab91',
      300: '#ff8a65',
      400: '#ff7043',
      500: '#d84315', // main - deep burnt orange
      600: '#bf360c',
      700: '#a63600',
      800: '#8d2f00',
      900: '#6e2400',
    },
    // Accent: Electric Teal - kontrast do orange
    accent: {
      50: '#e0f7fa',
      100: '#b2ebf2',
      200: '#80deea',
      300: '#4dd0e1',
      400: '#26c6da',
      500: '#00acc1', // main - electric teal
      600: '#0097a7',
      700: '#00838f',
      800: '#006064',
      900: '#004d40',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    success: {
      light: '#4caf50',
      main: '#2e7d32',
      dark: '#1b5e20',
    },
    warning: {
      light: '#ff9800',
      main: '#ed6c02',
      dark: '#e65100',
    },
    error: {
      light: '#ef5350',
      main: '#d32f2f',
      dark: '#c62828',
    },
    info: {
      light: '#42a5f5',
      main: '#1976d2',
      dark: '#1565c0',
    },
    // Quest theme - centralizacja kolorów quest board
    questTheme: {
      parchment: {
        light: '#FFF8E7',
        medium: '#E6CB99',
        dark: '#CFA865',
      },
      ink: {
        primary: '#54291E',
        secondary: '#8B4513',
      },
      gold: {
        light: '#ffd700',
        medium: '#DAA520',
        dark: '#b8860b',
      },
      urgent: {
        background: '#A4462D',
        gradient: 'linear-gradient(145deg, #E6A446, #A4462D)',
      },
    },
  },

  // Typografia
  typography: {
    fontFamily: {
      primary: '"Roboto", "Helvetica", "Arial", sans-serif',
      secondary: '"Cinzel", serif',
      mono: '"Roboto Mono", monospace',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },

  // Border radius (zwiększone dla nowoczesnego wyglądu 2024+)
  borderRadius: {
    none: '0',
    sm: '0.25rem',      // 4px
    base: '0.375rem',   // 6px
    md: '0.5rem',       // 8px
    lg: '0.625rem',     // 10px - buttons
    xl: '0.875rem',     // 14px - cards
    '2xl': '1.25rem',   // 20px - modals
    '3xl': '1.5rem',    // 24px
    full: '9999px',
  },

  // Shadows (nowoczesne, bardziej miękkie i diffused)
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    base: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.04)',
    xl: '0 16px 32px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)',
    '2xl': '0 24px 48px rgba(0, 0, 0, 0.16), 0 12px 24px rgba(0, 0, 0, 0.08)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
    // Kolorowe cienie - orange PRIMARY
    primary: '0 4px 14px rgba(255, 152, 0, 0.35)',
    primaryStrong: '0 8px 24px rgba(255, 152, 0, 0.4)',
    accent: '0 4px 14px rgba(0, 172, 193, 0.3)',
  },

  // Glassmorphism effects
  glass: {
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      backgroundStrong: 'rgba(255, 255, 255, 0.85)',
      backdropBlur: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderStrong: '1px solid rgba(255, 255, 255, 0.5)',
    },
    dark: {
      background: 'rgba(30, 30, 30, 0.7)',
      backgroundStrong: 'rgba(30, 30, 30, 0.85)',
      backdropBlur: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderStrong: '1px solid rgba(255, 255, 255, 0.15)',
    },
  },

  // Gradienty
  gradients: {
    // Primary orange gradients
    primary: 'linear-gradient(135deg, #ff9800 0%, #f57c00 50%, #e65100 100%)',
    primarySoft: 'linear-gradient(135deg, rgba(255,152,0,0.15) 0%, rgba(245,124,0,0.08) 100%)',
    primarySubtle: 'linear-gradient(135deg, rgba(255,152,0,0.08) 0%, rgba(245,124,0,0.03) 100%)',
    // Hero/feature gradients
    hero: 'linear-gradient(135deg, #ff9800 0%, #e65100 50%, #bf360c 100%)',
    heroRadial: 'radial-gradient(ellipse at top left, rgba(255,152,0,0.3) 0%, transparent 50%)',
    // Dark mode backgrounds
    dark: 'linear-gradient(180deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
    darkCard: 'linear-gradient(145deg, rgba(26, 26, 46, 0.9) 0%, rgba(22, 33, 62, 0.9) 100%)',
    darkSidebar: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)',
    // Accent gradient
    accent: 'linear-gradient(135deg, #00acc1 0%, #00838f 100%)',
    // Shimmer effect
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
  },

  // Glow effects
  glow: {
    orange: '0 0 20px rgba(255, 152, 0, 0.4), 0 0 40px rgba(255, 152, 0, 0.2)',
    orangeStrong: '0 0 30px rgba(255, 152, 0, 0.6), 0 0 60px rgba(255, 152, 0, 0.3)',
    orangeSubtle: '0 0 10px rgba(255, 152, 0, 0.25)',
    orangePulse: '0 0 0 0 rgba(255, 152, 0, 0.4)',
    teal: '0 0 20px rgba(0, 172, 193, 0.4), 0 0 40px rgba(0, 172, 193, 0.2)',
    white: '0 0 20px rgba(255, 255, 255, 0.3)',
  },

  // Dark mode specific palette
  darkPalette: {
    background: {
      default: '#0f0f23',     // Deep dark blue-black
      paper: '#1a1a2e',       // Slightly lighter
      elevated: '#16213e',    // Cards, elevated surfaces
      overlay: 'rgba(15, 15, 35, 0.8)',
    },
    surface: {
      primary: '#1a1a2e',
      secondary: '#16213e',
      tertiary: '#1e2a4a',
    },
    primaryTint: 'rgba(255, 152, 0, 0.08)',
    primaryGlow: 'rgba(255, 152, 0, 0.15)',
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(255, 255, 255, 0.15)',
    },
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    base: '250ms ease-in-out',
    slow: '350ms ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Breakpoints
  breakpoints: {
    xs: '0px',
    sm: '600px',
    md: '900px',
    lg: '1200px',
    xl: '1536px',
  },

  // Z-index
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
};

// Helper functions
export const getDesignToken = (path: string) => {
  const keys = path.split('.');
  let value: any = designTokens;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Design token not found: ${path}`);
      return undefined;
    }
  }
  
  return value;
};

// Theme-aware design tokens
export const createThemeTokens = (theme: Theme) => ({
  ...designTokens,
  colors: {
    ...designTokens.colors,
    background: {
      default: theme.palette.background.default,
      paper: theme.palette.background.paper,
      elevated: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: theme.palette.text.primary,
      secondary: theme.palette.text.secondary,
      disabled: theme.palette.text.disabled,
    },
    border: {
      light: theme.palette.divider,
      medium: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      strong: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
    },
  },
});