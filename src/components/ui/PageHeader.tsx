import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Przyciski / ikony po prawej stronie nagłówka */
  actions?: React.ReactNode;
}

/**
 * Responsywny nagłówek strony — tytuł po lewej, akcje po prawej.
 * Na mobile (xs) akcje przechodzą pod tytuł.
 *
 * Eliminuje ~10 linii powtarzanego `<Box sx={{ display:'flex', justifyContent:'space-between' }}>` w każdej stronie.
 *
 * @example
 * <PageHeader
 *   title="Zarządzanie Originami"
 *   actions={
 *     <>
 *       <IconButton onClick={refresh}><RefreshIcon /></IconButton>
 *       <Button variant="contained" onClick={openAdd}>Dodaj</Button>
 *     </>
 *   }
 * />
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: { xs: 'flex-start', sm: 'center' },
      justifyContent: 'space-between',
      flexDirection: { xs: 'column', sm: 'row' },
      gap: { xs: 1.5, sm: 0 },
      mb: 3,
      pb: 2,
      borderBottom: '1px solid',
      borderColor: 'divider',
    }}
  >
    <Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "primary.main",
          lineHeight: 1.2
        }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 0.25
          }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {actions && (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
        {actions}
      </Box>
    )}
  </Box>
);
