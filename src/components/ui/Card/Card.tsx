import React from 'react';
import { Paper, PaperProps, styled } from '@mui/material';
import { designTokens } from '../../../theme/designTokens';

// Custom types to avoid conflict with PaperProps variant
type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<PaperProps, 'variant'> {
  variant?: CardVariant;
  padding?: CardPadding;
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

  const paddingStyles: Record<CardPadding, object> = {
    none: { padding: 0 },
    sm: { padding: tokens.spacing.md },
    md: { padding: tokens.spacing.lg },
    lg: { padding: tokens.spacing.xl },
  };

  const variantStyles: Record<CardVariant, object> = {
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

  const v = variant as CardVariant;
  const p = padding as CardPadding;

  return {
    ...baseStyles,
    ...paddingStyles[p],
    ...variantStyles[v],
  };
});

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  ...props
}) => {
  // Use type assertion to bypass PaperProps variant conflict
  const cardProps = { variant, padding, hover, ...props } as unknown as PaperProps & CardProps;
  return (
    <StyledCard {...cardProps}>
      {children}
    </StyledCard>
  );
};

export default Card; 