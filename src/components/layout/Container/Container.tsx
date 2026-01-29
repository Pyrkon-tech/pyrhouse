import React from 'react';
import { Box, BoxProps, styled } from '@mui/material';
import { designTokens } from '../../../theme/designTokens';

export interface ContainerProps extends BoxProps {
  variant?: 'default' | 'fluid' | 'narrow' | 'wide';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  maxWidth?: string | number;
}

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => !['variant', 'padding', 'maxWidth'].includes(prop as string),
})<ContainerProps>(({ theme, variant = 'default', padding = 'md' }) => {
  const tokens = designTokens;
  
  const baseStyles = {
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box' as const,
  };

  const paddingStyles = {
    none: { padding: 0 },
    sm: { 
      padding: tokens.spacing.md,
      [theme.breakpoints.down('sm')]: {
        padding: tokens.spacing.sm,
      },
    },
    md: { 
      padding: tokens.spacing.lg,
      [theme.breakpoints.down('sm')]: {
        padding: tokens.spacing.md,
      },
    },
    lg: { 
      padding: tokens.spacing.xl,
      [theme.breakpoints.down('sm')]: {
        padding: tokens.spacing.lg,
      },
    },
  };

  const variantStyles = {
    default: {
      maxWidth: '1200px',
      [theme.breakpoints.down('lg')]: {
        maxWidth: '100%',
      },
    },
    fluid: {
      maxWidth: '100%',
    },
    narrow: {
      maxWidth: '800px',
      [theme.breakpoints.down('md')]: {
        maxWidth: '100%',
      },
    },
    wide: {
      maxWidth: '1400px',
      [theme.breakpoints.down('xl')]: {
        maxWidth: '100%',
      },
    },
  };

  return {
    ...baseStyles,
    ...paddingStyles[padding],
    ...variantStyles[variant],
  };
});

export const Container: React.FC<ContainerProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  maxWidth,
  ...props
}) => {
  return (
    <StyledContainer
      variant={variant}
      padding={padding}
      sx={maxWidth ? { maxWidth } : undefined}
      {...props}
    >
      {children}
    </StyledContainer>
  );
};

export default Container; 