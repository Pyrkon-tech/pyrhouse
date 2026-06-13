import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: EmptyStateAction;
}

/**
 * Stan braku danych — centralny komponent zamiast ad-hoc boksów.
 *
 * @example
 * <EmptyState
 *   message="Brak kategorii"
 *   description="Dodaj pierwszą kategorię klikając przycisk powyżej"
 *   action={{ label: 'Wyczyść filtry', onClick: clearFilters }}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'Brak danych',
  description,
  icon,
  action,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 6,
      px: 3,
      textAlign: 'center',
      bgcolor: 'background.default',
      borderRadius: 2,
      border: '1px dashed',
      borderColor: 'divider',
    }}
  >
    <Box sx={{ color: 'text.disabled', mb: 1.5, '& svg': { fontSize: '2.5rem' } }}>
      {icon ?? <InboxIcon />}
    </Box>
    <Typography variant="h6" gutterBottom sx={{
      color: "text.secondary"
    }}>
      {message}
    </Typography>
    {description && (
      <Typography
        variant="body2"
        sx={{
          color: "text.disabled",
          mb: action ? 2.5 : 0
        }}>
        {description}
      </Typography>
    )}
    {action && (
      <Button variant="outlined" size="small" onClick={action.onClick} sx={{ mt: description ? 0 : 2 }}>
        {action.label}
      </Button>
    )}
  </Box>
);
