import React, { useState, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip, Collapse } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import CloseIcon from '@mui/icons-material/Close';

interface DevTimeSimulatorProps {
  simulatedTime: Date | undefined;
  onChange: (time: Date | undefined) => void;
}

const toInputValue = (d: Date) => {
  // Format: YYYY-MM-DDTHH:MM (local time, for datetime-local input)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DevTimeSimulator: React.FC<DevTimeSimulatorProps> = ({ simulatedTime, onChange }) => {
  const [expanded, setExpanded] = useState(false);

  const inputValue = simulatedTime ? toInputValue(simulatedTime) : toInputValue(new Date());

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    onChange(new Date(e.target.value));
  }, [onChange]);

  const handleJumpForward = useCallback(() => {
    const base = simulatedTime ?? new Date();
    onChange(new Date(base.getTime() + 2 * 60 * 60 * 1000));
  }, [simulatedTime, onChange]);

  const handleReset = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 0.5,
      }}
    >
      <Tooltip title={expanded ? '' : 'Symulator czasu (dev)'} placement="left">
        <IconButton
          onClick={() => setExpanded(v => !v)}
          size="small"
          sx={{
            bgcolor: simulatedTime ? '#ff980022' : '#0a1929',
            border: `1px solid ${simulatedTime ? '#ff9800' : '#152535'}`,
            color: simulatedTime ? '#ff9800' : '#3a7a8a',
            borderRadius: 1,
            p: 0.5,
            '&:hover': { bgcolor: '#ff980022', borderColor: '#ff9800', color: '#ff9800' },
            transition: 'all 0.15s',
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>

      <Collapse in={expanded} unmountOnExit>
        <Box
          sx={{
            bgcolor: '#0a1929',
            border: '1px solid #ff980055',
            borderRadius: 1.5,
            p: 1,
            mt: 0.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            minWidth: 220,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1.5 }}>
              DEV · SYMULATOR CZASU
            </Typography>
            <IconButton size="small" onClick={() => setExpanded(false)} sx={{ color: '#3a7a8a', p: 0.25 }}>
              <CloseIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Box>

          {simulatedTime && (
            <Typography sx={{ color: '#ffd54f', fontFamily: 'monospace', fontSize: 10 }}>
              ⚠ Symulowany czas aktywny
            </Typography>
          )}

          <input
            type="datetime-local"
            value={inputValue}
            onChange={handleInputChange}
            style={{
              background: '#060e1a',
              border: '1px solid #1a3548',
              borderRadius: 4,
              color: '#c8e8f5',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '4px 6px',
              width: '100%',
              boxSizing: 'border-box',
              colorScheme: 'dark',
            }}
          />

          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Tooltip title="+2 godziny">
              <Box
                onClick={handleJumpForward}
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  bgcolor: '#1a2535',
                  border: '1px solid #1a3548',
                  borderRadius: 1,
                  py: 0.5,
                  cursor: 'pointer',
                  '&:hover': { borderColor: '#ff9800', bgcolor: '#ff980011' },
                  transition: 'all 0.15s',
                }}
              >
                <AddIcon sx={{ fontSize: 12, color: '#ff9800' }} />
                <Typography sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontSize: 10 }}>+2h</Typography>
              </Box>
            </Tooltip>

            <Tooltip title="Reset do teraz">
              <Box
                onClick={handleReset}
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  bgcolor: '#1a2535',
                  border: '1px solid #1a3548',
                  borderRadius: 1,
                  py: 0.5,
                  cursor: 'pointer',
                  '&:hover': { borderColor: '#66bb6a', bgcolor: '#66bb6a11' },
                  transition: 'all 0.15s',
                }}
              >
                <RestoreIcon sx={{ fontSize: 12, color: '#66bb6a' }} />
                <Typography sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontSize: 10 }}>Reset</Typography>
              </Box>
            </Tooltip>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default DevTimeSimulator;
