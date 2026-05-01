import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { ValidationResult } from '../../../../types/schedule.types';
import { ISSUE_TYPE_LABEL } from '../constants';

interface ValidationPanelProps {
  validation: ValidationResult;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({ validation }) => {
  const [expanded, setExpanded] = useState(false);

  if (validation.valid) return null;

  return (
    <Box
      sx={{
        bgcolor: 'rgba(255,152,0,0.08)',
        border: '1px solid',
        borderColor: 'rgba(255,152,0,0.3)',
        borderRadius: 1,
        flexShrink: 0,
      }}
    >
      {/* Compact summary — always visible */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { bgcolor: 'rgba(255,152,0,0.04)' },
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', flex: 1 }}>
          {validation.issues.length} problem{validation.issues.length === 1 ? '' : validation.issues.length < 5 ? 'y' : 'ów'} w harmonogramie
        </Typography>
        <IconButton size="small" sx={{ p: 0.25 }}>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>

      {/* Expandable details */}
      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, pb: 1 }}>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {validation.issues.map((issue, i) => (
              <li key={`${issue.type}-${issue.slot_id ?? issue.slot ?? ''}-${issue.volunteer_id ?? ''}-${i}`}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                  <strong>{ISSUE_TYPE_LABEL[issue.type] ?? issue.type}</strong>
                  {issue.volunteer ? ` — ${issue.volunteer}` : ''}
                  {issue.assigned !== undefined && issue.target !== undefined ? ` (${issue.assigned}h/${issue.target}h)` : ''}
                  {issue.message ? ` — ${issue.message}` : ''}
                </Typography>
              </li>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default ValidationPanel;
