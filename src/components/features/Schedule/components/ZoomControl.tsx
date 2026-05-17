import React from 'react';
import { Box, Typography, Slider, Tooltip, IconButton, Divider } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { ZOOM_MIN, ZOOM_MAX, COL_W_MIN, COL_W_MAX } from '../constants';

interface ZoomControlProps {
  zoom: number;
  onZoomChange: (v: number) => void;
  colWidth: number;
  onColWidthChange: (v: number) => void;
}

const ZOOM_PRESETS = [
  { label: 'Mały', value: 30 },
  { label: 'Normalny', value: 60 },
  { label: 'Duży', value: 100 },
  { label: 'Max', value: 160 },
] as const;

const COL_PRESETS = [
  { label: 'Wąski', value: 180 },
  { label: 'Normalny', value: 260 },
  { label: 'Szeroki', value: 360 },
  { label: 'Max', value: 460 },
] as const;

const PresetButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <Box
    component="button"
    onClick={onClick}
    sx={{
      px: 0.75,
      py: 0.25,
      border: '1px solid',
      borderColor: active ? 'primary.main' : 'divider',
      borderRadius: 0.75,
      bgcolor: active ? 'rgba(255,152,0,0.12)' : 'transparent',
      color: active ? 'primary.main' : 'text.secondary',
      fontSize: '0.65rem',
      fontWeight: active ? 700 : 400,
      cursor: 'pointer',
      transition: 'all 0.15s',
      '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
    }}
  >
    {label}
  </Box>
);

const ZoomControl: React.FC<ZoomControlProps> = ({ zoom, onZoomChange, colWidth, onColWidthChange }) => {
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
        flexWrap: 'wrap',
      }}
    >
      {/* ---- Vertical zoom ---- */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {ZOOM_PRESETS.map((p) => (
          <PresetButton key={p.value} label={p.label} active={zoom === p.value} onClick={() => onZoomChange(p.value)} />
        ))}
      </Box>

      <Tooltip title="Odsuń (-)">
        <IconButton size="small" onClick={() => onZoomChange(zoom - 10)} sx={{ p: 0.25 }}>
          <ZoomOutIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Box sx={{ width: 100, mx: 0.5 }}>
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

      <Tooltip title="Przybliż (+)">
        <IconButton size="small" onClick={() => onZoomChange(zoom + 10)} sx={{ p: 0.25 }}>
          <ZoomInIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', fontFamily: 'monospace', minWidth: 40 }}>
        {zoom}px/h
      </Typography>

      {/* ---- Divider ---- */}
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* ---- Column width ---- */}
      <ViewColumnIcon sx={{ fontSize: 15, color: 'text.disabled' }} />

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {COL_PRESETS.map((p) => (
          <PresetButton key={p.value} label={p.label} active={colWidth === p.value} onClick={() => onColWidthChange(p.value)} />
        ))}
      </Box>

      <Box sx={{ width: 100, mx: 0.5 }}>
        <Slider
          value={colWidth}
          min={COL_W_MIN}
          max={COL_W_MAX}
          step={20}
          onChange={(_, v) => onColWidthChange(v as number)}
          size="small"
          sx={{
            color: 'rgba(66,165,245,0.8)',
            '& .MuiSlider-thumb': { width: 12, height: 12 },
            '& .MuiSlider-rail': { opacity: 0.3 },
          }}
        />
      </Box>

      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', fontFamily: 'monospace', minWidth: 44 }}>
        {colWidth}px/kol
      </Typography>
    </Box>
  );
};

export default ZoomControl;
