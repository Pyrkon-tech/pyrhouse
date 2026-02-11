import { createTheme, ThemeOptions, responsiveFontSizes, Components, Theme } from '@mui/material/styles';
import { designTokens } from './designTokens';

// Komponenty krytyczne - ładowane jako pierwsze
const createCriticalComponents = (mode: 'light' | 'dark'): Components<Omit<Theme, 'components'>> => ({
  MuiCssBaseline: {
    styleOverrides: {
      ':root': {
        colorScheme: mode,
      },
      body: {
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        fontFamily: designTokens.typography.fontFamily.primary,
        background: mode === 'dark'
          ? designTokens.gradients.dark
          : designTokens.colors.grey[50],
        minHeight: '100vh',
        transition: 'background 0.3s ease',
      },
      // Animacje globalne
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
      },
      '@keyframes glowPulse': {
        '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 152, 0, 0.4)' },
        '50%': { boxShadow: '0 0 20px 5px rgba(255, 152, 0, 0.2)' },
      },
      '@keyframes shimmer': {
        '0%': { backgroundPosition: '-200% 0' },
        '100%': { backgroundPosition: '200% 0' },
      },
      '@keyframes float': {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-5px)' },
      },
      '@keyframes fadeIn': {
        '0%': { opacity: 0, transform: 'translateY(10px)' },
        '100%': { opacity: 1, transform: 'translateY(0)' },
      },
      '@keyframes slideInRight': {
        '0%': { opacity: 0, transform: 'translateX(20px)' },
        '100%': { opacity: 1, transform: 'translateX(0)' },
      },
      '@keyframes scaleIn': {
        '0%': { opacity: 0, transform: 'scale(0.95)' },
        '100%': { opacity: 1, transform: 'scale(1)' },
      },
      // Scrollbar styling
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb': {
        background: mode === 'dark'
          ? 'rgba(255, 152, 0, 0.3)'
          : 'rgba(255, 152, 0, 0.4)',
        borderRadius: '4px',
        '&:hover': {
          background: mode === 'dark'
            ? 'rgba(255, 152, 0, 0.5)'
            : 'rgba(255, 152, 0, 0.6)',
        },
      },
    }
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.lg,
        fontWeight: designTokens.typography.fontWeight.semiBold,
        textTransform: 'none',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '10px 24px',
        position: 'relative' as const,
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: designTokens.shadows.md,
        },
        '&:active': {
          transform: 'translateY(0) scale(0.98)',
        },
        '&:disabled': {
          transform: 'none',
        },
        // Orange focus ring dla accessibility
        '&:focus-visible': {
          outline: `3px solid ${designTokens.colors.primary[300]}`,
          outlineOffset: '2px',
        },
      },
      // Contained Primary - orange z glow
      containedPrimary: {
        background: designTokens.gradients.primary,
        boxShadow: designTokens.shadows.primary,
        '&:hover': {
          background: designTokens.gradients.hero,
          boxShadow: designTokens.glow.orange,
          transform: 'translateY(-2px) scale(1.02)',
        },
      },
      // Contained Secondary
      containedSecondary: {
        '&:hover': {
          boxShadow: '0 4px 14px rgba(216, 67, 21, 0.35)',
        },
      },
      // Outlined variant - orange border
      outlined: {
        borderWidth: '1.5px',
        '&:hover': {
          borderWidth: '1.5px',
          backgroundColor: 'rgba(255, 152, 0, 0.08)',
        },
      },
      outlinedPrimary: {
        borderColor: designTokens.colors.primary[500],
        '&:hover': {
          borderColor: designTokens.colors.primary[600],
          backgroundColor: 'rgba(255, 152, 0, 0.08)',
        },
      },
      // Text variant
      textPrimary: {
        '&:hover': {
          backgroundColor: 'rgba(255, 152, 0, 0.08)',
        },
      },
      // Size variants
      sizeLarge: {
        padding: '12px 32px',
        fontSize: designTokens.typography.fontSize.lg,
      },
      sizeSmall: {
        padding: '6px 16px',
        fontSize: designTokens.typography.fontSize.sm,
      },
    }
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.xl,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }
    }
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: designTokens.borderRadius.lg,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: designTokens.colors.primary[400],
            }
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
              borderColor: designTokens.colors.primary[500],
            },
            boxShadow: '0 0 0 4px rgba(255, 152, 0, 0.1)',
          }
        }
      }
    }
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.lg,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: designTokens.colors.primary[400],
        },
        '&.Mui-focused': {
          boxShadow: '0 0 0 4px rgba(255, 152, 0, 0.1)',
        },
      },
      notchedOutline: {
        borderWidth: '1.5px',
        transition: 'all 0.2s ease',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.xl,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: designTokens.shadows.base,
        border: '1px solid transparent',
        '&:hover': {
          boxShadow: designTokens.shadows.lg,
          transform: 'translateY(-4px)',
          borderColor: 'rgba(255, 152, 0, 0.2)',
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
        borderRadius: designTokens.borderRadius['2xl'],
        boxShadow: designTokens.shadows['2xl'],
      }
    }
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.lg,
      },
      standardSuccess: {
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        borderLeft: `4px solid ${designTokens.colors.success.main}`,
      },
      standardError: {
        backgroundColor: 'rgba(211, 47, 47, 0.1)',
        borderLeft: `4px solid ${designTokens.colors.error.main}`,
      },
      standardWarning: {
        backgroundColor: 'rgba(255, 152, 0, 0.15)',
        borderLeft: `4px solid ${designTokens.colors.primary[500]}`,  // Orange primary
      },
      standardInfo: {
        backgroundColor: 'rgba(0, 172, 193, 0.1)',  // Teal accent
        borderLeft: `4px solid ${designTokens.colors.accent[500]}`,
      },
    },
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
  },
  // AppBar - zawsze prostokątny, bez zaokrągleń
  MuiAppBar: {
    styleOverrides: {
      root: {
        borderRadius: 0,
        '&.MuiPaper-root': {
          borderRadius: 0,
        },
      },
    },
  },
});

// Table styles z zebra striping i hover - mode-aware z orange theme
// WCAG AA contrast ratios: 4.5:1 for normal text, 3:1 for large text
const createTableComponents = (mode: 'light' | 'dark'): Components<Omit<Theme, 'components'>> => ({
  MuiTableRow: {
    styleOverrides: {
      root: {
        // Zebra striping - subtle alternating backgrounds
        '&:nth-of-type(odd):not(.MuiTableRow-head)': {
          backgroundColor: mode === 'dark'
            ? 'rgba(255, 255, 255, 0.025)'
            : 'rgba(255, 152, 0, 0.03)',
        },
        // Hover state - more prominent orange tint
        '&:hover:not(.MuiTableRow-head)': {
          backgroundColor: mode === 'dark'
            ? 'rgba(255, 152, 0, 0.15)'
            : 'rgba(255, 152, 0, 0.1)',
          // Subtle left border accent on hover
          boxShadow: mode === 'dark'
            ? `inset 3px 0 0 ${designTokens.colors.primary[500]}`
            : `inset 3px 0 0 ${designTokens.colors.primary[400]}`,
        },
        // Selected state
        '&.Mui-selected': {
          backgroundColor: mode === 'dark'
            ? 'rgba(255, 152, 0, 0.2)'
            : 'rgba(255, 152, 0, 0.12)',
          '&:hover': {
            backgroundColor: mode === 'dark'
              ? 'rgba(255, 152, 0, 0.25)'
              : 'rgba(255, 152, 0, 0.15)',
          },
        },
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: mode === 'dark'
          ? `1px solid ${designTokens.darkPalette.border.default}`
          : '1px solid rgba(0, 0, 0, 0.08)',
        padding: '14px 16px',
        fontSize: designTokens.typography.fontSize.sm,
        // Ensure good text contrast
        color: mode === 'dark'
          ? 'rgba(255, 255, 255, 0.9)'
          : designTokens.colors.grey[800],
        // Text overflow handling
        '&.MuiTableCell-body': {
          maxWidth: '300px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      },
      head: {
        fontWeight: designTokens.typography.fontWeight.semiBold,
        fontSize: designTokens.typography.fontSize.xs,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        // Header background - dark in both modes for consistency and readability
        backgroundColor: mode === 'dark'
          ? designTokens.darkPalette.background.elevated
          : designTokens.colors.grey[800],
        // Strong bottom border with orange accent
        borderBottom: mode === 'dark'
          ? `2px solid ${designTokens.colors.primary[600]}`
          : `2px solid ${designTokens.colors.primary[500]}`,
        // Header text - high contrast (light text on dark background)
        color: mode === 'dark'
          ? designTokens.colors.primary[300]
          : '#ffffff',
        // Sticky header support
        position: 'sticky' as const,
        top: 0,
        zIndex: 2,
        // Subtle shadow for sticky effect
        boxShadow: mode === 'dark'
          ? '0 2px 4px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
      // Padding variants for different table densities
      sizeSmall: {
        padding: '8px 12px',
        fontSize: designTokens.typography.fontSize.xs,
      },
      sizeMedium: {
        padding: '14px 16px',
      },
    },
  },
  MuiTableContainer: {
    styleOverrides: {
      root: {
        borderRadius: designTokens.borderRadius.xl,
        overflow: 'hidden',
        // More prominent border
        border: mode === 'dark'
          ? `1px solid ${designTokens.darkPalette.border.default}`
          : `1px solid ${designTokens.colors.grey[200]}`,
        // Subtle shadow for depth
        boxShadow: mode === 'dark'
          ? '0 4px 16px rgba(0, 0, 0, 0.2)'
          : '0 2px 12px rgba(0, 0, 0, 0.06)',
        // Background for container
        backgroundColor: mode === 'dark'
          ? designTokens.darkPalette.background.paper
          : '#ffffff',
      },
    },
  },
  // Table head styling
  MuiTableHead: {
    styleOverrides: {
      root: {
        // Ensure header row doesn't get zebra stripe
        '& .MuiTableRow-root': {
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: 'transparent',
            boxShadow: 'none',
          },
        },
      },
    },
  },
  // Table body styling
  MuiTableBody: {
    styleOverrides: {
      root: {
        // Last row no border
        '& .MuiTableRow-root:last-child .MuiTableCell-root': {
          borderBottom: 'none',
        },
      },
    },
  },
  // Table pagination styling
  MuiTablePagination: {
    styleOverrides: {
      root: {
        borderTop: mode === 'dark'
          ? `1px solid ${designTokens.darkPalette.border.subtle}`
          : `1px solid ${designTokens.colors.grey[200]}`,
        backgroundColor: mode === 'dark'
          ? designTokens.darkPalette.background.elevated
          : designTokens.colors.grey[50],
      },
      selectLabel: {
        fontSize: designTokens.typography.fontSize.sm,
        color: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : designTokens.colors.grey[600],
      },
      displayedRows: {
        fontSize: designTokens.typography.fontSize.sm,
        color: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : designTokens.colors.grey[600],
      },
      select: {
        borderRadius: designTokens.borderRadius.md,
      },
      actions: {
        '& .MuiIconButton-root': {
          color: mode === 'dark' ? designTokens.colors.primary[400] : designTokens.colors.primary[600],
          '&:hover': {
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
          },
          '&.Mui-disabled': {
            color: mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
          },
        },
      },
    },
  },
  // Table sort label styling - matches dark header background in light mode
  MuiTableSortLabel: {
    styleOverrides: {
      root: {
        color: mode === 'dark'
          ? designTokens.colors.primary[300]
          : 'rgba(255, 255, 255, 0.9)',
        '&:hover': {
          color: mode === 'dark'
            ? designTokens.colors.primary[200]
            : designTokens.colors.primary[300],
        },
        '&.Mui-active': {
          color: mode === 'dark'
            ? designTokens.colors.primary[400]
            : designTokens.colors.primary[300],
          '& .MuiTableSortLabel-icon': {
            color: mode === 'dark'
              ? designTokens.colors.primary[400]
              : designTokens.colors.primary[300],
          },
        },
      },
      icon: {
        opacity: 0.5,
        transition: 'opacity 0.2s ease',
        color: mode === 'dark'
          ? designTokens.colors.primary[400]
          : 'rgba(255, 255, 255, 0.7)',
      },
    },
  },
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
    // Cinzel dla nagłówków - premium fantasy feel
    h1: {
      fontFamily: designTokens.typography.fontFamily.secondary, // Cinzel
      fontWeight: designTokens.typography.fontWeight.bold,
      fontSize: designTokens.typography.fontSize['4xl'],
      lineHeight: designTokens.typography.lineHeight.tight,
      letterSpacing: '0.02em',
    },
    h2: {
      fontFamily: designTokens.typography.fontFamily.secondary, // Cinzel
      fontWeight: designTokens.typography.fontWeight.semiBold,
      fontSize: designTokens.typography.fontSize['3xl'],
      lineHeight: designTokens.typography.lineHeight.tight,
      letterSpacing: '0.01em',
    },
    h3: {
      fontFamily: designTokens.typography.fontFamily.secondary, // Cinzel
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
      letterSpacing: '0.02em',
    },
    overline: {
      fontWeight: designTokens.typography.fontWeight.semiBold,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      fontSize: designTokens.typography.fontSize.xs,
    },
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
  const criticalComponents = createCriticalComponents(mode);
  const tableComponents = createTableComponents(mode);

  // Dark mode - premium deep blue-black experience
  const darkBackground = {
    default: designTokens.darkPalette.background.default,   // #0f0f23
    paper: designTokens.darkPalette.background.paper,       // #1a1a2e
  };

  // Light mode - clean and bright
  const lightBackground = {
    default: designTokens.colors.grey[50],
    paper: '#ffffff',
  };

  const theme = responsiveFontSizes(createTheme({
    ...baseTheme,
    palette: {
      ...baseTheme.palette,
      mode,
      background: mode === 'light' ? lightBackground : darkBackground,
      text: {
        primary: mode === 'light' ? designTokens.colors.grey[900] : 'rgba(255, 255, 255, 0.95)',
        secondary: mode === 'light' ? designTokens.colors.grey[600] : 'rgba(255, 255, 255, 0.7)',
        disabled: mode === 'light' ? designTokens.colors.grey[400] : 'rgba(255, 255, 255, 0.4)',
      },
      divider: mode === 'light'
        ? designTokens.colors.grey[200]
        : designTokens.darkPalette.border.default,
      action: {
        hover: mode === 'light'
          ? 'rgba(255, 152, 0, 0.08)'   // Orange tint on hover
          : 'rgba(255, 152, 0, 0.12)',
        selected: mode === 'light'
          ? 'rgba(255, 152, 0, 0.12)'
          : 'rgba(255, 152, 0, 0.2)',
        disabled: mode === 'light' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
        disabledBackground: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
        focus: 'rgba(255, 152, 0, 0.12)',
      },
    },
    components: {
      ...criticalComponents,
      ...tableComponents,
    },
  }));

  themeCache.set(cacheKey, theme);
  return theme;
};

export const lightTheme = createThemeWithMode('light');
export const darkTheme = createThemeWithMode('dark'); 