import React from 'react';
import { Box, Typography, Slider, Tooltip, IconButton } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { ZOOM_MIN, ZOOM_MAX } from '../constants';

interface ZoomControlProps {
  zoom: number;
  onZoomChange: (v: number) => void;
}

const PRESETS = [
  { label: 'Mały', value: 30 },
  { label: 'Normalny', value: 60 },
  { label: 'Duży', value: 100 },
  { label: 'Max', value: 160 },
] as const;

const ZoomControl: React.FC<ZoomControlProps> = ({ zoom, onZoomChange }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        flexShrink: 0,
      }}
    >
      {/* Presets */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {PRESETS.map((p) => (
          <Box
            key={p.value}
            component="button"
            onClick={() => onZoomChange(p.value)}
            sx={{
              px: 0.75,
              py: 0.25,
              border: '1px solid',
              borderColor: zoom === p.value ? 'primary.main' : 'divider',
              borderRadius: 0.75,
              bgcolor: zoom === p.value ? 'rgba(255,152,0,0.12)' : 'transparent',
              color: zoom === p.value ? 'primary.main' : 'text.secondary',
              fontSize: '0.65rem',
              fontWeight: zoom === p.value ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            {p.label}
          </Box>
        ))}
      </Box>

      {/* Zoom out button */}
      <Tooltip title="Odsuń (-)">
        <IconButton size="small" onClick={() => onZoomChange(zoom - 10)} sx={{ p: 0.25 }}>
          <ZoomOutIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      {/* Slider */}
      <Box sx={{ width: 120, mx: 0.5 }}>
        <Slider
          value={zoom}
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={5}
          onChange={(_, v) => onZoomChange(v as number)}
          size="small"
          sx={{
            color: 'primary.main',
            '& .MuiSlider-thumb': { width: 12, height: 12 },
            '& .MuiSlider-rail': { opacity: 0.3 },
          }}
        />
      </Box>

      {/* Zoom in button */}
      <Tooltip title="Przybliż (+)">
        <IconButton size="small" onClick={() => onZoomChange(zoom + 10)} sx={{ p: 0.25 }}>
          <ZoomInIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', fontFamily: 'monospace', minWidth: 40 }}>
        {zoom}px/h
      </Typography>
    </Box>
  );
};

export default ZoomControl;
