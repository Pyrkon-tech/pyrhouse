import React from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  size?: 'small' | 'medium';
  /** Szerokość — np. 280, '100%'. Domyślnie flex: 1 */
  width?: number | string;
  disabled?: boolean;
}

/**
 * Pole wyszukiwania z ikoną lupy i przyciskiem czyszczenia.
 * Zastępuje powtarzane `<TextField label="Szukaj..." InputProps={{ startAdornment: <SearchIcon /> }}>`.
 *
 * @example
 * <SearchBar
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="Szukaj kategorii..."
 * />
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
  label = 'Szukaj',
  size = 'small',
  width,
  disabled,
}) => (
  <TextField
    value={value}
    onChange={(e) => onChange(e.target.value)}
    label={label}
    placeholder={placeholder}
    size={size}
    disabled={disabled}
    sx={{ flex: width ? undefined : 1, width }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        </InputAdornment>
      ),
      endAdornment: value ? (
        <InputAdornment position="end">
          <IconButton size="small" onClick={() => onChange('')} edge="end" aria-label="Wyczyść">
            <ClearIcon fontSize="small" />
          </IconButton>
        </InputAdornment>
      ) : undefined,
    }}
  />
);
