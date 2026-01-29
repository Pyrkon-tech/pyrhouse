import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';
import { designTokens, createThemeTokens } from '../theme/designTokens';
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
    
    // Quest-specific styles
    questCard: {
      position: 'relative' as const,
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(139, 69, 19, 0.1), rgba(160, 82, 45, 0.1))'
        : 'linear-gradient(135deg, rgba(255, 248, 220, 0.8), rgba(255, 235, 205, 0.8))',
      border: `2px solid ${theme.palette.mode === 'dark' ? '#8B4513' : '#DAA520'}`,
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
      color: theme.palette.mode === 'dark' ? '#ffd700' : '#8b4513',
      marginBottom: tokens.spacing.lg,
      textShadow: theme.palette.mode === 'dark' 
        ? '2px 2px 2px rgba(0,0,0,0.8), 0 0 5px rgba(255, 215, 0, 0.3)'
        : '1px 1px 2px rgba(139, 69, 19, 0.3)',
    },
    
    // Service desk styles
    serviceDeskCard: {
      background: theme.palette.mode === 'dark' 
        ? 'rgba(32,32,40,0.98)' 
        : 'rgba(255,255,255,0.98)',
      backdropFilter: 'blur(10px)',
      borderRadius: tokens.borderRadius.xl,
      boxShadow: tokens.shadows['2xl'],
      padding: tokens.spacing.xl,
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