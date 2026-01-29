import React from 'react';
import { Paper, PaperProps, styled } from '@mui/material';
import { designTokens } from '../../../theme/designTokens';

export interface CardProps extends PaperProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const StyledCard = styled(Paper, {
  shouldForwardProp: (prop) => !['variant', 'padding', 'hover'].includes(prop as string),
})<CardProps>(({ theme, variant = 'default', padding = 'md', hover = false }) => {
  const tokens = designTokens;
  
  const baseStyles = {
    borderRadius: tokens.borderRadius.lg,
    transition: tokens.transitions.base,
    overflow: 'hidden' as const,
  };

  const paddingStyles = {
    none: { padding: 0 },
    sm: { padding: tokens.spacing.md },
    md: { padding: tokens.spacing.lg },
    lg: { padding: tokens.spacing.xl },
  };

  const variantStyles = {
    default: {
      backgroundColor: theme.palette.background.paper,
      boxShadow: tokens.shadows.sm,
      border: `1px solid ${theme.palette.divider}`,
    },
    elevated: {
      backgroundColor: theme.palette.background.paper,
      boxShadow: tokens.shadows.lg,
      border: 'none',
    },
    outlined: {
      backgroundColor: 'transparent',
      boxShadow: 'none',
      border: `2px solid ${theme.palette.divider}`,
    },
    interactive: {
      backgroundColor: theme.palette.background.paper,
      boxShadow: tokens.shadows.md,
      border: `1px solid ${theme.palette.divider}`,
      cursor: 'pointer',
      '&:hover': hover ? {
        transform: 'translateY(-2px)',
        boxShadow: tokens.shadows.xl,
      } : {},
    },
  };

  return {
    ...baseStyles,
    ...paddingStyles[padding],
    ...variantStyles[variant],
  };
});

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  ...props
}) => {
  return (
    <StyledCard
      variant={variant}
      padding={padding}
      hover={hover}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

export default Card; 