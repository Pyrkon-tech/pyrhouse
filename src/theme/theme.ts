import { createTheme, ThemeOptions, responsiveFontSizes, Components, Theme } from '@mui/material/styles';
import { designTokens } from './designTokens';

// Komponenty krytyczne - ładowane jako pierwsze
const createCriticalComponents = (): Components<Omit<Theme, 'components'>> => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        fontFamily: designTokens.typography.fontFamily.primary,
      },
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
      },
    }
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.lg,
        fontWeight: designTokens.typography.fontWeight.semiBold,
        textTransform: 'none',
        transition: designTokens.transitions.base,
        '&:hover': {
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'translateY(0)',
        },
        '&:disabled': {
          transform: 'none',
        },
      }
    }
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.lg,
        transition: designTokens.transitions.base,
      }
    }
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: designTokens.borderRadius.lg,
          transition: designTokens.transitions.base,
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: designTokens.colors.primary[500],
            }
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
              borderColor: designTokens.colors.primary[500],
            }
          }
        }
      }
    }
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.lg,
        transition: designTokens.transitions.base,
        boxShadow: designTokens.shadows.sm,
        '&:hover': {
          boxShadow: designTokens.shadows.md,
        }
      }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.full,
        fontWeight: designTokens.typography.fontWeight.medium,
        transition: designTokens.transitions.base,
      }
    }
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.md,
        transition: designTokens.transitions.base,
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        }
      }
    }
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: designTokens.borderRadius.xl,
        boxShadow: designTokens.shadows['2xl'],
      }
    }
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: designTokens.borderRadius.md,
        fontSize: designTokens.typography.fontSize.sm,
        boxShadow: designTokens.shadows.lg,
      }
    }
  },
  MuiSnackbar: {
    styleOverrides: {
      root: {
        '& .MuiSnackbarContent-root': {
          borderRadius: designTokens.borderRadius.lg,
        }
      }
    }
  }
});

// Podstawowy motyw
const createBaseTheme = (): ThemeOptions => ({
  palette: {
    primary: {
      main: designTokens.colors.primary[500],
      light: designTokens.colors.primary[400],
      dark: designTokens.colors.primary[600],
      contrastText: '#ffffff',
    },
    secondary: {
      main: designTokens.colors.secondary[500],
      light: designTokens.colors.secondary[400],
      dark: designTokens.colors.secondary[600],
      contrastText: '#ffffff',
    },
    success: {
      main: designTokens.colors.success.main,
      light: designTokens.colors.success.light,
      dark: designTokens.colors.success.dark,
    },
    warning: {
      main: designTokens.colors.warning.main,
      light: designTokens.colors.warning.light,
      dark: designTokens.colors.warning.dark,
    },
    error: {
      main: designTokens.colors.error.main,
      light: designTokens.colors.error.light,
      dark: designTokens.colors.error.dark,
    },
    info: {
      main: designTokens.colors.info.main,
      light: designTokens.colors.info.light,
      dark: designTokens.colors.info.dark,
    },
  },
  typography: {
    fontFamily: designTokens.typography.fontFamily.primary,
    h1: { 
      fontWeight: designTokens.typography.fontWeight.bold,
      fontSize: designTokens.typography.fontSize['4xl'],
      lineHeight: designTokens.typography.lineHeight.tight,
    },
    h2: { 
      fontWeight: designTokens.typography.fontWeight.semiBold,
      fontSize: designTokens.typography.fontSize['3xl'],
      lineHeight: designTokens.typography.lineHeight.tight,
    },
    h3: { 
      fontWeight: designTokens.typography.fontWeight.semiBold,
      fontSize: designTokens.typography.fontSize['2xl'],
      lineHeight: designTokens.typography.lineHeight.tight,
    },
    h4: { 
      fontWeight: designTokens.typography.fontWeight.semiBold,
      fontSize: designTokens.typography.fontSize.xl,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
    h5: { 
      fontWeight: designTokens.typography.fontWeight.medium,
      fontSize: designTokens.typography.fontSize.lg,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
    h6: { 
      fontWeight: designTokens.typography.fontWeight.medium,
      fontSize: designTokens.typography.fontSize.base,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
    body1: {
      fontSize: designTokens.typography.fontSize.base,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
    body2: {
      fontSize: designTokens.typography.fontSize.sm,
      lineHeight: designTokens.typography.lineHeight.normal,
    },
    button: { 
      textTransform: 'none',
      fontWeight: designTokens.typography.fontWeight.semiBold,
    }
  },
  shape: {
    borderRadius: parseInt(designTokens.borderRadius.lg),
  },
  spacing: (factor: number) => `${factor * 8}px`,
  breakpoints: {
    values: {
      xs: parseInt(designTokens.breakpoints.xs),
      sm: parseInt(designTokens.breakpoints.sm),
      md: parseInt(designTokens.breakpoints.md),
      lg: parseInt(designTokens.breakpoints.lg),
      xl: parseInt(designTokens.breakpoints.xl),
    }
  },
  shadows: [
    'none',
    designTokens.shadows.sm,
    designTokens.shadows.base,
    designTokens.shadows.md,
    designTokens.shadows.lg,
    designTokens.shadows.xl,
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
    designTokens.shadows['2xl'],
  ],
  transitions: {
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },
});

// Cache dla motywów
const themeCache = new Map();

export const createThemeWithMode = (mode: 'light' | 'dark') => {
  const cacheKey = mode;
  if (themeCache.has(cacheKey)) {
    return themeCache.get(cacheKey);
  }

  const baseTheme = createBaseTheme();
  const criticalComponents = createCriticalComponents();

  const theme = responsiveFontSizes(createTheme({
    ...baseTheme,
    palette: {
      ...baseTheme.palette,
      mode,
      background: {
        default: mode === 'light' ? designTokens.colors.grey[50] : designTokens.colors.grey[900],
        paper: mode === 'light' ? '#ffffff' : designTokens.colors.grey[800],
      },
      text: {
        primary: mode === 'light' ? designTokens.colors.grey[900] : '#ffffff',
        secondary: mode === 'light' ? designTokens.colors.grey[600] : designTokens.colors.grey[400],
        disabled: mode === 'light' ? designTokens.colors.grey[400] : designTokens.colors.grey[600],
      },
      divider: mode === 'light' ? designTokens.colors.grey[200] : designTokens.colors.grey[700],
      action: {
        hover: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
        selected: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.16)',
        disabled: mode === 'light' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
        disabledBackground: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
      },
    },
    components: criticalComponents,
  }));

  themeCache.set(cacheKey, theme);
  return theme;
};

export const lightTheme = createThemeWithMode('light');
export const darkTheme = createThemeWithMode('dark'); 