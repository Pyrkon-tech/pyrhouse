import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, styled } from '@mui/material';
import { designTokens } from '../../../theme/designTokens';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => !['variant', 'size', 'loading', 'leftIcon', 'rightIcon'].includes(prop as string),
})<ButtonProps>(({ theme, variant = 'primary', size = 'md' }) => {
  const tokens = designTokens;
  
  const baseStyles = {
    borderRadius: tokens.borderRadius.lg,
    fontWeight: tokens.typography.fontWeight.semiBold,
    textTransform: 'none' as const,
    transition: tokens.transitions.base,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    '&:hover': {
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&:disabled': {
      transform: 'none',
    },
  };

  const sizeStyles = {
    sm: {
      padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
      fontSize: tokens.typography.fontSize.sm,
      minHeight: '32px',
    },
    md: {
      padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
      fontSize: tokens.typography.fontSize.base,
      minHeight: '40px',
    },
    lg: {
      padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
      fontSize: tokens.typography.fontSize.lg,
      minHeight: '48px',
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: tokens.colors.primary[500],
      color: '#ffffff',
      boxShadow: tokens.shadows.md,
      '&:hover': {
        backgroundColor: tokens.colors.primary[600],
        boxShadow: tokens.shadows.lg,
      },
      '&:disabled': {
        backgroundColor: tokens.colors.grey[300],
        color: tokens.colors.grey[500],
        boxShadow: 'none',
      },
    },
    secondary: {
      backgroundColor: tokens.colors.secondary[500],
      color: '#ffffff',
      boxShadow: tokens.shadows.md,
      '&:hover': {
        backgroundColor: tokens.colors.secondary[600],
        boxShadow: tokens.shadows.lg,
      },
      '&:disabled': {
        backgroundColor: tokens.colors.grey[300],
        color: tokens.colors.grey[500],
        boxShadow: 'none',
      },
    },
    outline: {
      backgroundColor: 'transparent',
      color: tokens.colors.primary[500],
      border: `2px solid ${tokens.colors.primary[500]}`,
      '&:hover': {
        backgroundColor: tokens.colors.primary[50],
        borderColor: tokens.colors.primary[600],
      },
      '&:disabled': {
        borderColor: tokens.colors.grey[300],
        color: tokens.colors.grey[500],
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: tokens.colors.primary[500],
      '&:hover': {
        backgroundColor: tokens.colors.primary[50],
      },
      '&:disabled': {
        color: tokens.colors.grey[500],
      },
    },
    danger: {
      backgroundColor: tokens.colors.error.main,
      color: '#ffffff',
      boxShadow: tokens.shadows.md,
      '&:hover': {
        backgroundColor: tokens.colors.error.dark,
        boxShadow: tokens.shadows.lg,
      },
      '&:disabled': {
        backgroundColor: tokens.colors.grey[300],
        color: tokens.colors.grey[500],
        boxShadow: 'none',
      },
    },
  };

  return {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };
});

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '16px',
          height: '16px',
          border: '2px solid transparent',
          borderTop: '2px solid currentColor',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: designTokens.spacing.sm,
        opacity: loading ? 0 : 1,
      }}>
        {leftIcon && <span>{leftIcon}</span>}
        {children}
        {rightIcon && <span>{rightIcon}</span>}
      </div>
    </StyledButton>
  );
};

export default Button; 