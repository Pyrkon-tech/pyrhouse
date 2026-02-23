import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { SxProps, Theme } from '@mui/material';
import { useOrigins } from '../../hooks/useOrigins';
import type { Origin } from '../../types/origin.types';

interface OriginSelectProps {
  /** Pełna wartość originu, np. "probis" lub "personal-jan" */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  fullWidth?: boolean;
  /** Pokaż przycisk odświeżenia listy */
  showRefresh?: boolean;
  sx?: SxProps<Theme>;
}

/** Parsuje wartość "slug" lub "slug-suffix" na { slug, suffix } */
function parseOriginValue(value: string, origins: Origin[]): { slug: string; suffix: string } {
  if (!value) return { slug: '', suffix: '' };
  for (const origin of origins) {
    if (value === origin.slug) return { slug: origin.slug, suffix: '' };
    if (origin.allow_suffix && value.startsWith(origin.slug + '-')) {
      return { slug: origin.slug, suffix: value.slice(origin.slug.length + 1) };
    }
  }
  return { slug: value, suffix: '' };
}

/**
 * Reużywalny select pochodzenia sprzętu.
 * Pobiera listę originów z API (z cache 5 min).
 * Gdy wybrany origin ma allow_suffix=true, pokazuje dodatkowe pole tekstowe.
 * Wywołuje onChange z pełną wartością ("slug" lub "slug-suffix").
 */
export const OriginSelect: React.FC<OriginSelectProps> = ({
  value,
  onChange,
  label = 'Pochodzenie',
  required = false,
  fullWidth = true,
  showRefresh = false,
  sx,
}) => {
  const { origins, loading, refresh } = useOrigins();

  const { slug, suffix } = parseOriginValue(value, origins);
  const selectedOrigin = origins.find((o) => o.slug === slug);

  const handleSlugChange = (newSlug: string) => {
    const origin = origins.find((o) => o.slug === newSlug);
    if (origin?.allow_suffix && suffix) {
      onChange(`${newSlug}-${suffix}`);
    } else {
      onChange(newSlug);
    }
  };

  const handleSuffixChange = (newSuffix: string) => {
    const trimmed = newSuffix.trim();
    onChange(trimmed ? `${slug}-${trimmed}` : slug);
  };

  return (
    <Box sx={sx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControl fullWidth={fullWidth} required={required} disabled={loading}>
          <InputLabel>{label}</InputLabel>
          <Select
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            label={label}
          >
            {loading ? (
              <MenuItem disabled value="">
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Ładowanie...
              </MenuItem>
            ) : (
              origins.map((origin) => (
                <MenuItem key={origin.id} value={origin.slug}>
                  {origin.label}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        {showRefresh && (
          <Tooltip title="Odśwież listę">
            <span>
              <IconButton onClick={refresh} size="small" disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
      {selectedOrigin?.allow_suffix && (
        <TextField
          label="Doprecyzowanie"
          value={suffix}
          onChange={(e) => handleSuffixChange(e.target.value)}
          fullWidth={fullWidth}
          required={required}
          placeholder={`np. ${slug}-jan`}
          helperText="Wpisz nazwisko/identyfikator (po myślniku)"
          sx={{ mt: 1 }}
        />
      )}
    </Box>
  );
};
