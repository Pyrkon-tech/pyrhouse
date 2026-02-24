import React from 'react';
import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  CircularProgress,
  Typography,
} from '@mui/material';
import type { TableProps } from '@mui/material';

interface DataTableProps {
  children: React.ReactNode;
  /** Domyślnie "small" — zwarta tabela. "medium" dla większych wierszy. */
  size?: TableProps['size'];
}

/**
 * Standardowy wrapper tabeli.
 *
 * Nie zawiera żadnych sx — całe stylowanie pochodzi z theme.ts (createTableComponents):
 * zaokrąglone rogi, ciemnoszary header z pomarańczowym akcentem, hover z left-border,
 * zebra striping, shadow.
 *
 * Używaj zamiast bezpośredniego <TableContainer component={Paper} sx={...}>.
 * Razem z DataTableLoadingRow i DataTableEmptyRow zapewnia spójny UX w całej aplikacji.
 *
 * @example
 * <DataTable>
 *   <TableHead>
 *     <TableRow><TableCell>Kolumna</TableCell></TableRow>
 *   </TableHead>
 *   <TableBody>
 *     {loading ? (
 *       <DataTableLoadingRow colSpan={3} />
 *     ) : items.length === 0 ? (
 *       <DataTableEmptyRow colSpan={3} />
 *     ) : (
 *       items.map(item => <TableRow key={item.id}>...</TableRow>)
 *     )}
 *   </TableBody>
 * </DataTable>
 */
export const DataTable: React.FC<DataTableProps> = ({ children, size = 'small' }) => (
  <TableContainer>
    <Table size={size}>
      {children}
    </Table>
  </TableContainer>
);

interface DataTableLoadingRowProps {
  /** Liczba kolumn do scalenia — musi odpowiadać liczbie <TableCell> w headerze */
  colSpan: number;
}

/** Wiersz ładowania — wyświetl w <TableBody> gdy dane są pobierane */
export const DataTableLoadingRow: React.FC<DataTableLoadingRowProps> = ({ colSpan }) => (
  <TableRow>
    <TableCell colSpan={colSpan} align="center" sx={{ py: 4, border: 'none' }}>
      <CircularProgress size={32} />
    </TableCell>
  </TableRow>
);

interface DataTableEmptyRowProps {
  colSpan: number;
  message?: string;
}

/** Wiersz braku danych — wyświetl w <TableBody> gdy tablica jest pusta */
export const DataTableEmptyRow: React.FC<DataTableEmptyRowProps> = ({
  colSpan,
  message = 'Brak danych',
}) => (
  <TableRow>
    <TableCell colSpan={colSpan} align="center" sx={{ py: 4, border: 'none' }}>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </TableCell>
  </TableRow>
);
