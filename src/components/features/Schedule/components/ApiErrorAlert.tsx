import React, { useState, lazy, Suspense } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import type { ApiErrorState } from '../types';
import { extractDetailItems } from '../utils';

const ErrorOutlineIcon = lazy(() => import('@mui/icons-material/ErrorOutlined'));

const ApiErrorAlert: React.FC<{
  error: ApiErrorState;
  onDismiss: () => void;
}> = ({ error, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  const detailItems = extractDetailItems(error.details);

  return (
    <Alert
      severity="error"
      onClose={onDismiss}
      icon={<Suspense fallback={null}><ErrorOutlineIcon /></Suspense>}
      sx={{ mb: 2, '& .MuiAlert-message': { flex: 1, minWidth: 0 } }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          lineHeight: 1.4
        }}>
        {error.operation}: {error.message}
      </Typography>
      {error.status > 0 && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            mt: 0.25
          }}>
          HTTP {error.status}
        </Typography>
      )}
      {detailItems.length > 0 && (
        <>
          <Button
            size="small"
            onClick={() => setExpanded((v) => !v)}
            sx={{ mt: 0.5, p: 0, minWidth: 0, textTransform: 'none', fontSize: '0.72rem' }}
          >
            {expanded ? 'Ukryj szczegóły' : `Pokaż szczegóły (${detailItems.length})`}
          </Button>
          {expanded && (
            <Box
              component="ul"
              sx={{ m: 0, mt: 0.5, pl: 2, maxHeight: 200, overflowY: 'auto', bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1, py: 0.5 }}
            >
              {detailItems.map((item, i) => (
                <li key={i}>
                  <Typography variant="caption" sx={{ fontSize: '0.72rem', lineHeight: 1.6 }}>
                    {item.row !== undefined && <strong>Wiersz {item.row}: </strong>}
                    {item.column && <strong>[{item.column}] </strong>}
                    {item.field && <strong>{item.field}: </strong>}
                    {item.message}
                  </Typography>
                </li>
              ))}
            </Box>
          )}
        </>
      )}
    </Alert>
  );
};

export default ApiErrorAlert;
