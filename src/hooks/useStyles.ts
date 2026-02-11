import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';
import { createThemeTokens, designTokens } from '../theme/designTokens';
import { SxProps, Theme } from '@mui/material';

export interface StyleConfig {
  [key: string]: SxProps<Theme>;
}

export const useStyles = () => {
  const theme = useTheme();
  const tokens = useMemo(() => createThemeTokens(theme), [theme]);

  const createStyles = (config: StyleConfig): StyleConfig => {
    return config;
  };

  const commonStyles = useMemo(() => ({
    // Layout styles
    container: {
      padding: tokens.spacing.lg,
      [theme.breakpoints.down('sm')]: {
        padding: tokens.spacing.md,
      },
    },
    
    // Card styles
    card: {
      borderRadius: tokens.borderRadius.lg,
      transition: tokens.transitions.base,
      padding: tokens.spacing.lg,
      boxShadow: tokens.shadows.sm,
      '&:hover': {
        boxShadow: tokens.shadows.md,
      },
    },
    
    // Button styles
    button: {
      borderRadius: tokens.borderRadius.lg,
      fontWeight: tokens.typography.fontWeight.semiBold,
      textTransform: 'none' as const,
      transition: tokens.transitions.base,
      '&:hover': {
        transform: 'translateY(-1px)',
      },
    },
    
    // Form styles
    formControl: {
      marginBottom: tokens.spacing.lg,
      '& .MuiOutlinedInput-root': {
        borderRadius: tokens.borderRadius.lg,
      },
    },
    
    // List styles
    list: {
      padding: tokens.spacing.md,
      '& .MuiListItem-root': {
        borderRadius: tokens.borderRadius.md,
        margin: `${tokens.spacing.sm} 0`,
        transition: tokens.transitions.base,
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
      },
    },
    
    // Header styles
    header: {
      marginBottom: tokens.spacing.xl,
      [theme.breakpoints.down('sm')]: {
        marginBottom: tokens.spacing.lg,
      },
    },
    
    // Section styles
    section: {
      marginBottom: tokens.spacing['2xl'],
      [theme.breakpoints.down('sm')]: {
        marginBottom: tokens.spacing.xl,
      },
    },
    
    // Animation styles
    fadeIn: {
      animation: 'fadeIn 0.3s ease-in',
    },
    
    slideUp: {
      animation: 'slideUp 0.3s ease-out',
    },
    
    // Responsive styles
    responsiveContainer: {
      [theme.breakpoints.down('sm')]: {
        padding: tokens.spacing.md,
      },
    },
    
    // Grid styles
    gridContainer: {
      margin: `-${tokens.spacing.md}`,
      '& > *': {
        padding: tokens.spacing.md,
      },
    },
    
    // Tooltip styles
    tooltip: {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      boxShadow: tokens.shadows.md,
      fontSize: tokens.typography.fontSize.sm,
      borderRadius: tokens.borderRadius.md,
    },
    
    // Dialog styles
    dialog: {
      '& .MuiDialog-paper': {
        borderRadius: tokens.borderRadius.xl,
        padding: tokens.spacing.lg,
      },
    },
    
    // Snackbar styles
    snackbar: {
      '& .MuiSnackbarContent-root': {
        borderRadius: tokens.borderRadius.lg,
      },
    },
    
    // Quest-specific styles (using centralized questTheme tokens)
    questCard: {
      position: 'relative' as const,
      background: theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, rgba(139, 69, 19, 0.1), rgba(160, 82, 45, 0.1))`
        : `linear-gradient(135deg, ${designTokens.colors.questTheme.parchment.light}cc, ${designTokens.colors.questTheme.parchment.medium}cc)`,
      border: `2px solid ${theme.palette.mode === 'dark'
        ? designTokens.colors.questTheme.ink.secondary
        : designTokens.colors.questTheme.gold.medium}`,
      borderRadius: tokens.borderRadius.lg,
      padding: tokens.spacing.lg,
      transition: tokens.transitions.base,
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: tokens.shadows.xl,
      },
    },

    questTitle: {
      fontFamily: tokens.typography.fontFamily.secondary,
      fontWeight: tokens.typography.fontWeight.bold,
      fontSize: tokens.typography.fontSize.xl,
      color: theme.palette.mode === 'dark'
        ? designTokens.colors.questTheme.gold.light
        : designTokens.colors.questTheme.ink.secondary,
      marginBottom: tokens.spacing.lg,
      textShadow: theme.palette.mode === 'dark'
        ? `2px 2px 2px rgba(0,0,0,0.8), 0 0 5px ${designTokens.colors.questTheme.gold.light}4d`
        : `1px 1px 2px ${designTokens.colors.questTheme.ink.secondary}4d`,
    },

    // Primary button styles (orange with glow)
    primaryButton: {
      background: designTokens.gradients.primary,
      color: '#ffffff',
      boxShadow: designTokens.shadows.primary,
      '&:hover': {
        background: designTokens.gradients.hero,
        boxShadow: designTokens.glow.orange,
        transform: 'translateY(-2px) scale(1.02)',
      },
    },

    // Accent button styles (teal accent)
    accentButton: {
      background: designTokens.gradients.accent,
      color: '#ffffff',
      boxShadow: designTokens.shadows.accent,
      '&:hover': {
        boxShadow: designTokens.glow.teal,
        transform: 'translateY(-2px)',
      },
    },

    // Glass card styles
    glassCard: {
      background: theme.palette.mode === 'dark'
        ? designTokens.glass.dark.background
        : designTokens.glass.light.background,
      backdropFilter: designTokens.glass.light.backdropBlur,
      WebkitBackdropFilter: designTokens.glass.light.backdropBlur,
      border: theme.palette.mode === 'dark'
        ? designTokens.glass.dark.border
        : designTokens.glass.light.border,
      borderRadius: tokens.borderRadius.xl,
    },

    // Featured card with orange border
    featuredCard: {
      border: `1px solid ${designTokens.colors.primary[500]}`,
      borderRadius: tokens.borderRadius.xl,
      transition: tokens.transitions.base,
      '&:hover': {
        boxShadow: designTokens.glow.orangeSubtle,
        borderColor: designTokens.colors.primary[400],
      },
    },

    // Table styles (complementing global theme table styles)
    tableContainer: {
      borderRadius: tokens.borderRadius.xl,
      overflow: 'hidden',
      boxShadow: theme.palette.mode === 'dark'
        ? '0 4px 16px rgba(0, 0, 0, 0.25)'
        : '0 2px 12px rgba(0, 0, 0, 0.08)',
      border: theme.palette.mode === 'dark'
        ? `1px solid ${designTokens.darkPalette.border.default}`
        : `1px solid ${designTokens.colors.grey[200]}`,
      backgroundColor: theme.palette.mode === 'dark'
        ? designTokens.darkPalette.background.paper
        : '#ffffff',
    },

    // Table with clickable rows
    tableClickable: {
      '& .MuiTableBody-root .MuiTableRow-root': {
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 152, 0, 0.15)'
            : 'rgba(255, 152, 0, 0.1)',
        },
      },
    },

    // Compact table variant
    tableCompact: {
      '& .MuiTableCell-root': {
        padding: '8px 12px',
        fontSize: designTokens.typography.fontSize.xs,
      },
      '& .MuiTableCell-head': {
        padding: '10px 12px',
      },
    },

    // Table with status column styling
    tableStatusCell: {
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },

    // Table action buttons cell
    tableActionsCell: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: tokens.spacing.xs,
      '& .MuiIconButton-root': {
        padding: '6px',
        color: theme.palette.mode === 'dark'
          ? designTokens.colors.primary[400]
          : designTokens.colors.primary[600],
        '&:hover': {
          backgroundColor: 'rgba(255, 152, 0, 0.12)',
        },
      },
    },

    // Empty table state
    tableEmpty: {
      textAlign: 'center' as const,
      padding: tokens.spacing['2xl'],
      color: theme.palette.text.secondary,
      '& .MuiSvgIcon-root': {
        fontSize: 48,
        opacity: 0.4,
        marginBottom: tokens.spacing.md,
        color: designTokens.colors.primary[400],
      },
    },

    // Table loading overlay
    tableLoading: {
      position: 'relative' as const,
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(15, 15, 35, 0.7)'
          : 'rgba(255, 255, 255, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      },
    },
    
    // Service desk styles
    serviceDeskCard: {
      background: theme.palette.mode === 'dark'
        ? designTokens.darkPalette.background.elevated
        : 'rgba(255,255,255,0.98)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: tokens.borderRadius.xl,
      boxShadow: tokens.shadows['2xl'],
      padding: tokens.spacing.xl,
      border: theme.palette.mode === 'dark'
        ? `1px solid ${designTokens.darkPalette.border.subtle}`
        : '1px solid rgba(0, 0, 0, 0.05)',
    },
    
    // Transfer styles
    transferForm: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: tokens.spacing.xl,
    },
    
    transferSection: {
      backgroundColor: theme.palette.background.paper,
      borderRadius: tokens.borderRadius.lg,
      padding: tokens.spacing.lg,
      boxShadow: tokens.shadows.sm,
    },
    
    // Loading styles
    loadingSkeleton: {
      borderRadius: tokens.borderRadius.md,
      animation: 'pulse 1.5s ease-in-out infinite',
    },
    
    // Error styles
    errorContainer: {
      textAlign: 'center' as const,
      padding: tokens.spacing.xl,
      color: theme.palette.error.main,
    },
    
    // Success styles
    successContainer: {
      textAlign: 'center' as const,
      padding: tokens.spacing.xl,
      color: theme.palette.success.main,
    },
  }), [theme, tokens]);

  return {
    createStyles,
    commonStyles,
    tokens,
    theme,
  };
};

export default useStyles; 