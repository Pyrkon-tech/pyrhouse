import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';

/**
 * Semantyczne warianty statusów używane w aplikacji.
 * Centralizuje mapowanie status → kolor + etykieta zamiast
 * powtarzanego `label={x === 'a' ? 'A' : 'B'} color={x === 'a' ? 'primary' : 'secondary'}`.
 */
export type StatusVariant =
  // Sprzęt / lokalizacja
  | 'available'
  | 'unavailable'
  | 'in_transit'
  // Typ kategorii
  | 'asset'
  | 'stock'
  // Aktywność
  | 'active'
  | 'inactive'
  // Role użytkownika
  | 'admin'
  | 'moderator'
  | 'dispatcher'
  | 'user'
  // Transfery / zgłoszenia
  | 'completed'
  | 'pending'
  | 'open'
  | 'closed'
  | 'in_progress'
  // Discord
  | 'ghost';

interface StatusConfig {
  label: string;
  color: ChipProps['color'];
}

const STATUS_MAP: Record<StatusVariant, StatusConfig> = {
  available:    { label: 'Dostępny',       color: 'success' },
  unavailable:  { label: 'Niedostępny',    color: 'error' },
  in_transit:   { label: 'W transycie',    color: 'warning' },
  asset:        { label: 'Sprzęt',         color: 'primary' },
  stock:        { label: 'Materiały',      color: 'secondary' },
  active:       { label: 'Aktywny',        color: 'success' },
  inactive:     { label: 'Nieaktywny',     color: 'default' },
  admin:        { label: 'Admin',          color: 'error' },
  moderator:    { label: 'Moderator',      color: 'warning' },
  dispatcher:   { label: 'Dyspozytor',     color: 'info' },
  user:         { label: 'Użytkownik',     color: 'default' },
  completed:    { label: 'Zakończony',     color: 'success' },
  pending:      { label: 'Oczekujący',     color: 'warning' },
  open:         { label: 'Otwarty',        color: 'info' },
  closed:       { label: 'Zamknięty',      color: 'default' },
  in_progress:  { label: 'W trakcie',      color: 'info' },
  ghost:        { label: 'Ghost',          color: 'default' },
};

interface StatusChipProps {
  status: StatusVariant;
  /** Nadpisanie etykiety — gdy backend zwraca inny string */
  label?: string;
  size?: ChipProps['size'];
  clickable?: boolean;
  onClick?: () => void;
  sx?: ChipProps['sx'];
}

/**
 * Chip ze spójną kolorystyką dla semantycznych statusów.
 *
 * @example
 * <StatusChip status="active" />
 * <StatusChip status="asset" />
 * <StatusChip status={origin.active ? 'active' : 'inactive'} clickable onClick={handleToggle} />
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  size = 'small',
  clickable,
  onClick,
  sx,
}) => {
  const config = STATUS_MAP[status] ?? { label: status, color: 'default' as const };
  return (
    <Chip
      label={label ?? config.label}
      color={config.color}
      size={size}
      clickable={clickable}
      onClick={onClick}
      sx={sx}
    />
  );
};
