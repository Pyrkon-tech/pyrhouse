import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  TextField,
  IconButton,
  CircularProgress,
  Autocomplete,
  Tooltip,
  Typography,
} from '@mui/material';
import { Control, Controller, FieldArrayWithId } from 'react-hook-form';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { TransferFormValues, FormItem, FormStock, FormPyrCodeSuggestion } from './transferFormModel';

interface TransferItemsTableProps {
  control: Control<TransferFormValues>;
  fields: FieldArrayWithId<TransferFormValues, 'items', 'id'>[];
  items: FormItem[];
  stocks: FormStock[];
  lockedRows: Set<number>;
  pyrCodeSuggestions: FormPyrCodeSuggestion[];
  searchLoading: boolean;
  lastInputRef: React.RefObject<HTMLInputElement | null>;
  isPyrCodeSelected: (pyrcode: string) => boolean;
  onValidatePyrCode: (index: number, pyrcode: string) => void;
  onSearchPyrCode: (value: string) => void;
  onRemoveRow: (index: number) => void;
}

const TransferItemsTable: React.FC<TransferItemsTableProps> = ({
  control,
  fields,
  items,
  stocks,
  lockedRows,
  pyrCodeSuggestions,
  searchLoading,
  lastInputRef,
  isPyrCodeSelected,
  onValidatePyrCode,
  onSearchPyrCode,
  onRemoveRow,
}) => (
  <TableContainer
    component={Paper}
    sx={{
      mt: 2,
      overflow: 'auto',
      '&.MuiPaper-root': {
        boxShadow: 'none',
        transition: 'none',
        transform: 'none',
        '&:hover': {
          boxShadow: 'none',
          transform: 'none'
        }
      },
      '& .MuiTableRow-root': {
        '&:hover': {
          backgroundColor: 'transparent !important',
          cursor: 'default'
        },
        '&.Mui-selected, &.Mui-selected:hover': {
          backgroundColor: 'transparent !important'
        }
      },
      '& .MuiTableRow-head': {
        backgroundColor: (theme) => theme.palette.background.paper
      },
      '& .MuiTableCell-root': {
        padding: { xs: 1, sm: 2 },
        '&:first-of-type': {
          paddingLeft: { xs: 1, sm: 2 }
        },
        '&:last-of-type': {
          paddingRight: { xs: 1, sm: 2 }
        }
      },
      '& .MuiSelect-select': {
        minHeight: '32px !important',
        paddingTop: '4px !important',
        paddingBottom: '4px !important'
      }
    }}
  >
    <Table size="small" sx={{ minWidth: { xs: '650px', sm: 'auto' } }}>
      <TableHead>
        <TableRow>
          <TableCell width="20%">Typ</TableCell>
          <TableCell width="40%">ID / Kategoria</TableCell>
          <TableCell width="25%">Ilość/Typ</TableCell>
          <TableCell width="5%">Status</TableCell>
          <TableCell width="10%">Akcje</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {fields.map((item, index) => (
          <TableRow
            key={item.id}
            hover={false}
          >
            <TableCell>
              <Controller
                name={`items.${index}.type`}
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    size="small"
                    disabled={lockedRows.has(index)}
                    sx={{
                      width: '100%',
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        py: 1
                      },
                      borderRadius: 0.5
                    }}
                  >
                    <MenuItem value="pyr_code" sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 1
                    }}>
                      Pyr Code
                    </MenuItem>
                    <MenuItem value="stock" sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 1
                    }}>
                      Zasoby (Ilościowe)
                    </MenuItem>
                  </Select>
                )}
              />
            </TableCell>
            <TableCell>
              {items[index].type === 'pyr_code' && (
                <Controller
                  name={`items.${index}.pyrcode`}
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      key={index}
                      data-testid={`pyr-code-input-${index}`}
                      size="small"
                      options={pyrCodeSuggestions}
                      loading={searchLoading}
                      disabled={lockedRows.has(index)}
                      getOptionLabel={(option: FormPyrCodeSuggestion | string) =>
                        typeof option === 'string'
                          ? option
                          : `${option.pyrcode} - ${option.category.label}`
                      }
                      onChange={(_, newValue) => {
                        if (newValue && typeof newValue !== 'string') {
                          onValidatePyrCode(index, newValue.pyrcode);
                          field.onChange(newValue.pyrcode);
                        } else if (typeof newValue === 'string') {
                          field.onChange(newValue);
                        } else {
                          field.onChange('');
                        }
                      }}
                      onInputChange={(_, value) => {
                        onSearchPyrCode(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.target as HTMLInputElement;
                          // aria-activedescendant is set to a non-empty option ID only
                          // when the user highlighted an option via ArrowDown.
                          // In that case MUI's own handler (which runs after ours)
                          // will call onChange with the selected option — don't
                          // duplicate the validation here.
                          // Scanner flow: no arrow navigation → attribute is '' or null
                          // → validate the typed code directly.
                          if (!input.getAttribute('aria-activedescendant')) {
                            const inputValue = input.value;
                            if (inputValue && inputValue.length >= 2) {
                              onValidatePyrCode(index, inputValue);
                            }
                          }
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder="Wpisz kod PYR"
                          variant="outlined"
                          fullWidth
                          inputRef={index === fields.length - 1 ? lastInputRef : undefined}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <React.Fragment>
                                {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </React.Fragment>
                            ),
                          }}
                        />
                      )}
                      value={field.value}
                      filterOptions={(options) => options.filter(option => {
                        if (typeof option === 'string') return false;
                        return !isPyrCodeSelected(option.pyrcode);
                      })}
                      freeSolo
                      sx={{ width: '100%' }}
                    />
                  )}
                />
              )}
              {items[index].type === 'stock' && (
                <Controller
                  name={`items.${index}.id`}
                  control={control}
                  render={({ field }) => (
                    <Select {...field} size="small" fullWidth sx={{ width: '100%' }}>
                      <MenuItem value="" disabled>
                        Wybierz zasób
                      </MenuItem>
                      {stocks.map((stock) => (
                        <MenuItem key={stock.id} value={stock.id} disabled={stock.quantity === 0}>
                          {stock.category.label} ({stock.origin}) [Dostępne: {stock.quantity}]
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              )}
            </TableCell>
            <TableCell>
              {items[index].type === 'stock' && (
                <Controller
                  name={`items.${index}.quantity`}
                  control={control}
                  render={({ field }) => {
                    const selectedStock = stocks.find((stock) => String(stock.id) === String(items[index].id));
                    const maxQuantity = selectedStock?.quantity || 0;

                    return (
                      <Tooltip
                        title={
                          !/^[1-9][0-9]*$/.test(field.value?.toString())
                            ? 'Musi być liczbą większą od zera'
                            : Number(field.value) > maxQuantity
                            ? `Maksymalna ilość: ${maxQuantity}`
                            : ''
                        }
                        open={
                          (!!field.value) &&
                          (!/^[1-9][0-9]*$/.test(field.value?.toString()) || Number(field.value) > maxQuantity)
                        }
                        placement="top"
                        arrow
                        slotProps={{
                          tooltip: {
                            sx: {
                              fontSize: '1.05em',
                              bgcolor: 'error.main',
                              color: 'common.white',
                              fontWeight: 500,
                              px: 2,
                              py: 1,
                              borderRadius: 1,
                              maxWidth: 260,
                            }
                          },
                          arrow: {
                            sx: {
                              color: 'error.main'
                            }
                          }
                        }}
                      >
                        <TextField
                          {...field}
                          size="small"
                          type="number"
                          label="Ilość"
                          fullWidth
                          error={
                            !/^[1-9][0-9]*$/.test(field.value?.toString()) ||
                            Number(field.value) > maxQuantity
                          }
                          helperText=""
                          inputProps={{
                            min: 1,
                            max: maxQuantity,
                            inputMode: 'numeric',
                            pattern: '[0-9]*'
                          }}
                          InputProps={{
                            endAdornment:
                              (!/^[1-9][0-9]*$/.test(field.value?.toString()) || Number(field.value) > maxQuantity)
                                ? <ErrorIcon color="error" fontSize="small" />
                                : null
                          }}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                          }}
                        />
                      </Tooltip>
                    );
                  }}
                />
              )}
              {items[index].type === 'pyr_code' && items[index].status === 'success' && (
                <Typography variant="body2">
                  {items[index].category?.label || 'Brak kategorii'}
                </Typography>
              )}
            </TableCell>
            <TableCell>
              {items[index].status === 'success' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body2" color="success.main">Dostępny</Typography>
                </Box>
              )}
              {items[index].status === 'failure' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ErrorIcon color="error" />
                  <Typography variant="body2" color="error">Nie znaleziono</Typography>
                </Box>
              )}
            </TableCell>
            <TableCell>
              <IconButton onClick={() => onRemoveRow(index)}>
                <DeleteIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export default TransferItemsTable;
