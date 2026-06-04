import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Container,
  Typography,
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
  Button,
  IconButton,
  CircularProgress,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Tooltip,
} from '@mui/material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useLocations } from '../../../../hooks/useLocations';
import { useStocks } from '../../../../hooks/useStocks';
import { validatePyrCodeAPI, createTransferAPI, searchPyrCodesAPI } from '../../../../services/transferService';
import { createTransferFromQuestAPI } from '../../../../services/questService';
import type { CreateTransferFromQuestRequest } from '../../../../types/quest.types';
import { getUsersAPI } from '../../../../services/userService';
import { AppSnackbar } from '../../../ui/AppSnackbar';
import { useSnackbarMessage } from '../../../../hooks/useSnackbarMessage';

import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AddIcon from '@mui/icons-material/Add';
import LocationOn from '@mui/icons-material/LocationOn';
import Person from '@mui/icons-material/Person';
import Inventory from '@mui/icons-material/Inventory';
import Close from '@mui/icons-material/Close';
import Check from '@mui/icons-material/Check';
import RefreshIcon from '@mui/icons-material/Refresh';

interface User {
  id: number;
  username: string;
  fullname: string | null;
}

interface PyrCodeSuggestion {
  id: number;
  pyrcode: string;
  serial: string;
  location: {
    id: number;
    name: string;
  };
  category: {
    id: number;
    label: string;
  };
  status: 'available' | 'unavailable' | 'in_transit';
}

type ValidationStatus = 'success' | 'failure' | '';

interface Stock {
  id: number;
  category: {
    id: number;
    label: string;
    type: string;
  };
  origin: string;
  quantity: number;
  location: {
    id: number;
    name: string;
  };
}

interface FormItem {
  type: 'pyr_code' | 'stock';
  id: string;
  pyrcode: string;
  quantity: number;
  status: ValidationStatus;
  category?: {
    label: string;
  };
}

interface TransferFormValues {
  fromLocation: number;
  toLocation: string;
  items: FormItem[];
  users: User[];
}

export interface TransferFormCoreProps {
  questId?: string;
  /** Pre-fills toLocation when quest has a resolved location_id */
  questLocationId?: number | null;
  onSuccess?: (transferId?: number) => void;
  onCancel?: () => void;
  /** Inkrementowany gdy SSE wykryje stocks_changed — triggery re-fetch stocków */
  stocksRefreshTrigger?: number;
  /** IDs wolontariuszy wybranych w DispatchModal — pre-fill pola "Uczestnicy transferu" */
  initialVolunteerIds?: number[];
}

const TransferFormCore: React.FC<TransferFormCoreProps> = ({ questId, questLocationId, onSuccess, onCancel, stocksRefreshTrigger, initialVolunteerIds }) => {
  const { control, handleSubmit, setValue, watch, reset } = useForm<TransferFormValues>({
    defaultValues: {
      fromLocation: 1,
      toLocation: questLocationId != null ? String(questLocationId) : '',
      items: [{ type: 'pyr_code', id: '', pyrcode: '', quantity: 0, status: '' }],
      users: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [loading, setLoading] = useState(false);
  const [pyrCodeSuggestions, setPyrCodeSuggestions] = useState<PyrCodeSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [lockedRows, setLockedRows] = useState<Set<number>>(new Set());
  const [isValidationInProgress, setIsValidationInProgress] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const formDataRef = useRef<TransferFormValues | null>(null);
  const lastInputRef = useRef<HTMLInputElement>(null);
  const [lastFieldId, setLastFieldId] = useState<string | null>(null);

  const fromLocation = watch('fromLocation');
  const items = watch('items');

  const { locations: rawLocations, refetch: refetchLocations } = useLocations();
  const locations = React.useMemo(
    () => [...rawLocations].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    [rawLocations]
  );
  const { stocks, fetchStocks } = useStocks();

  const itemSummary = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of items) {
      if (item.type === 'pyr_code' && item.status === 'success' && item.category?.label) {
        totals.set(item.category.label, (totals.get(item.category.label) || 0) + 1);
      } else if (item.type === 'stock' && item.id) {
        const stock = stocks.find(s => s.id === Number(item.id));
        if (stock && Number(item.quantity) > 0) {
          totals.set(stock.category.label, (totals.get(stock.category.label) || 0) + Number(item.quantity));
        }
      }
    }
    return [...totals.entries()];
  }, [items, stocks]);

  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  useEffect(() => {
    refetchLocations();
  }, [refetchLocations]);

  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const data = await getUsersAPI();
        setUsers(data);
        if (initialVolunteerIds?.length) {
          const preselected = data.filter((u) => initialVolunteerIds.includes(u.id));
          if (preselected.length) setValue('users', preselected);
        }
      } catch (error: any) {
        showSnackbar('error', error.message || 'Wystąpił błąd podczas pobierania użytkowników');
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const isPyrCodeSelected = (pyrcode: string): boolean => {
    return items.some(item =>
      item.type === 'pyr_code' &&
      item.pyrcode === pyrcode
    );
  };

  useEffect(() => {
    if (fromLocation) {
      fetchStocks(fromLocation.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLocation, stocksRefreshTrigger]);

  useEffect(() => {
    const handleFocus = () => {
      const inputs = document.querySelectorAll('.MuiAutocomplete-input');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
    };

    if (fields.length > 0 && fields[fields.length - 1].id !== lastFieldId) {
      setLastFieldId(fields[fields.length - 1].id);
      setTimeout(handleFocus, 100);
    }
  }, [fields, lastFieldId]);

  const handleValidatePyrCode = async (index: number, pyrcode: string) => {
    if (isValidationInProgress) {
      return;
    }

    if (isPyrCodeSelected(pyrcode)) {
      setValue(`items.${index}.status`, 'failure' as ValidationStatus);
      return;
    }

    try {
      setIsValidationInProgress(true);
      setValue(`items.${index}.pyrcode`, pyrcode);
      const response = await validatePyrCodeAPI(pyrcode);

      if (index >= items.length) {
        return;
      }

      setValue(`items.${index}.id`, String(response.id));
      setValue(`items.${index}.status`, 'success' as ValidationStatus);
      setValue(`items.${index}.category`, response.category);

      setLockedRows(prev => new Set([...prev, index]));

      if (index === items.length - 1) {
        append({ type: 'pyr_code', id: '', pyrcode: '', quantity: 0, status: '' });

        setTimeout(() => {
          const inputs = document.querySelectorAll('.MuiAutocomplete-input');
          const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
          if (lastInput) {
            lastInput.focus();
          }
        }, 500);
      }
    } catch (err: any) {
      setValue(`items.${index}.status`, 'failure' as ValidationStatus);
    } finally {
      setIsValidationInProgress(false);
    }
  };

  const handlePyrCodeSearch = async (value: string) => {
    if (!/^[a-zA-Z0-9-]*$/.test(value)) {
      return;
    }

    if (value.length < 2) {
      setPyrCodeSuggestions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const suggestions = await searchPyrCodesAPI(value, fromLocation);

      // Filtruj już wybrane kody PYR
      const filteredSuggestions = suggestions.filter(
        (suggestion: PyrCodeSuggestion) => !isPyrCodeSelected(suggestion.pyrcode)
      );

      setPyrCodeSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Błąd podczas wyszukiwania:', error);
      setPyrCodeSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const getErrorMessage = (error: string): string => {
    const errorMessages: { [key: string]: string } = {
      'Invalid transfer data': 'Nieprawidłowe dane transferu',
      'Unauthorized access': 'Brak autoryzacji',
      'Access forbidden': 'Dostęp zabroniony',
      'Resource not found': 'Nie znaleziono zasobu',
      'Server error occurred': 'Wystąpił błąd serwera',
      'Request timeout': 'Przekroczono limit czasu żądania',
      'An unexpected error occurred': 'Wystąpił nieoczekiwany błąd',
      'Transfer from and to location cannot be the same': 'Lokalizacja źródłowa i docelowa nie mogą być takie same',
    };

    return errorMessages[error] || 'Wystąpił błąd podczas przetwarzania transferu';
  };

  const handleFormSubmit = (formData: TransferFormValues) => {
    formDataRef.current = formData;
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!formDataRef.current) return;

    if (!formDataRef.current.toLocation) {
      showSnackbar('error', 'Wybierz lokalizację docelową');
      return;
    }

    if (Number(formDataRef.current.fromLocation) === Number(formDataRef.current.toLocation)) {
      showSnackbar('error', 'Lokalizacja źródłowa i docelowa nie mogą być takie same');
      return;
    }

    // Sprawdzanie dostępności ilości dla każdego przedmiotu magazynowego
    const stockValidationErrors = formDataRef.current.items
      .filter((item) => item.type === 'stock' && item.id)
      .map((item) => {
        const selectedStock = stocks.find((stock) => stock.id === Number(item.id));
        if (!selectedStock) {
          return 'Nie znaleziono wybranego przedmiotu magazynowego';
        }
        if (Number(item.quantity) > selectedStock.quantity) {
          return `Dla przedmiotu "${selectedStock.category.label}" maksymalna dostępna ilość to: ${selectedStock.quantity}`;
        }
        if (Number(item.quantity) <= 0) {
          return `Dla przedmiotu "${selectedStock.category.label}" ilość musi być większa niż 0`;
        }
        return null;
      })
      .filter(Boolean);

    if (stockValidationErrors.length > 0) {
      showSnackbar('error', stockValidationErrors[0] || 'Wystąpił błąd podczas walidacji przedmiotów magazynowych');
      return;
    }

    setLoading(true);

    try {
      const assets = formDataRef.current.items
        .filter((item) => item.type === 'pyr_code' && item.status === 'success')
        .map((item) => ({ id: Number(item.id) }));

      const stocks = formDataRef.current.items
        .filter((item) => item.type === 'stock')
        .map((item) => ({ id: Number(item.id), quantity: Number(item.quantity) }));

      const users = formDataRef.current.users.map((user) => ({ id: user.id }));

      const payload: {
        from_location_id: number;
        location_id: number;
        assets?: typeof assets;
        stocks?: typeof stocks;
        users?: typeof users;
      } = {
        from_location_id: Number(formDataRef.current.fromLocation),
        location_id: Number(formDataRef.current.toLocation),
      };

      if (assets.length > 0) payload.assets = assets;
      if (stocks.length > 0) payload.stocks = stocks;
      if (users.length > 0) payload.users = users;

      if (!assets.length && !stocks.length) {
        showSnackbar('error', 'Dodaj co najmniej jeden zasób lub pozycję magazynową');
        return;
      }

      if (questId) {
        // Quest mode: link transfer to quest via quest-specific endpoint
        const questPayload: CreateTransferFromQuestRequest = {
          from_location_id: Number(formDataRef.current.fromLocation),
          to_location_id: Number(formDataRef.current.toLocation),
          stock_items: stocks.length > 0 ? stocks : undefined,
          assets: assets.length > 0 ? assets : undefined,
          users: users.length > 0 ? users : undefined,
        };
        const result = await createTransferFromQuestAPI(questId, questPayload);
        showSnackbar('success', `Transfer #${result.transfer_id} dla zamówienia został utworzony!`);
        setTimeout(() => {
          onSuccess?.(result.transfer_id);
        }, 500);
      } else {
        const response = await createTransferAPI(payload);
        showSnackbar('success', 'Transfer został utworzony pomyślnie!');
        setTimeout(() => {
          onSuccess?.(response.id);
        }, 500);
      }
      reset();
    } catch (error: any) {
      showSnackbar('error', getErrorMessage(error.message));
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleRemoveRow = (index: number) => {
    // Najpierw usuwamy wiersz
    remove(index);

    // Resetujemy stan zablokowanych wierszy
    setLockedRows(prev => {
      const newLockedRows = new Set<number>();
      prev.forEach(lockedIndex => {
        if (lockedIndex < index) {
          newLockedRows.add(lockedIndex);
        } else if (lockedIndex > index) {
          newLockedRows.add(lockedIndex - 1);
        }
      });
      return newLockedRows;
    });

    // Sprawdzamy, czy wszystkie wiersze są puste lub czy nie ma wierszy
    const hasEmptyRow = fields.some((_, idx) =>
      !items[idx]?.id && !items[idx]?.pyrcode && !items[idx]?.quantity
    );

    // Jeśli nie ma pustego wiersza, dodajemy nowy
    if (!hasEmptyRow) {
      append({ type: 'pyr_code', id: '', pyrcode: '', quantity: 0, status: '' });
    }
  };

  const handleAddRow = () => {
    append({
      type: stocks.length > 0 ? 'stock' : 'pyr_code',
      id: '',
      pyrcode: '',
      quantity: 1,
      status: '' as ValidationStatus
    });
  };

  return (
    <Box>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Typography variant="h5" gutterBottom>
          Nowa dostawa
        </Typography>

        {itemSummary.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5, p: 1.25, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
              W koszyku:
            </Typography>
            {itemSummary.map(([label, qty]) => (
              <Chip key={label} label={`${label} ×${qty}`} size="small" color="primary" variant="outlined" />
            ))}
          </Box>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            mt: 1
          }}>
            <Controller
              name="fromLocation"
              control={control}
              defaultValue={1}
              render={({ field }) => (
                <Select
                  {...field}
                  size="small"
                  displayEmpty
                  fullWidth
                  value={locations.length > 0 ? field.value : ''}
                >
                  <MenuItem value="" disabled>
                    Wybierz lokalizację źródłową
                  </MenuItem>
                  {locations.map((location: any) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />

            <Controller
              name="toLocation"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <Select
                  {...field}
                  size="small"
                  displayEmpty
                  fullWidth
                  value={locations.length > 0 ? field.value : ''}
                >
                  <MenuItem value="" disabled>
                    Wybierz lokalizację docelową
                  </MenuItem>
                  {locations.map((location: any) => (
                    <MenuItem
                      key={location.id}
                      value={location.id}
                      disabled={location.id === fromLocation}
                      sx={location.id === fromLocation ? {
                        opacity: 0.5,
                        '&:hover': {
                          cursor: 'not-allowed'
                        }
                      } : {}}
                    >
                      {location.name}
                      {location.id === fromLocation && " (lokalizacja źródłowa)"}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
            <Tooltip title="Odśwież listę zasobów">
              <span>
                <IconButton
                  size="small"
                  disabled={!fromLocation}
                  onClick={() => fetchStocks(fromLocation.toString())}
                  sx={{ alignSelf: 'center', flexShrink: 0 }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Controller
              name="users"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  multiple
                  size="small"
                  options={users}
                  loading={usersLoading}
                  value={value}
                  onChange={(_, newValue) => onChange(newValue)}
                  getOptionLabel={(option) => `${option.username}`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Uczestnicy transferu"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {usersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...chipProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          size="small"
                          label={`${option.username}`}
                          {...chipProps}
                          sx={{ maxWidth: { xs: '150px', sm: 'none' } }}
                        />
                      );
                    })
                  }
                />
              )}
            />
          </Box>

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
                              getOptionLabel={(option: PyrCodeSuggestion | string) =>
                                typeof option === 'string'
                                  ? option
                                  : `${option.pyrcode} - ${option.category.label}`
                              }
                              onChange={(_, newValue) => {
                                if (newValue && typeof newValue !== 'string') {
                                  handleValidatePyrCode(index, newValue.pyrcode);
                                  field.onChange(newValue.pyrcode);
                                } else if (typeof newValue === 'string') {
                                  field.onChange(newValue);
                                } else {
                                  field.onChange('');
                                }
                              }}
                              onInputChange={(_, value) => {
                                handlePyrCodeSearch(value);
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
                                      handleValidatePyrCode(index, inputValue);
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
                              {stocks.map((stock: Stock) => (
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
                            const selectedStock = stocks.find((stock: any) => stock.id === items[index].id);
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
                      <IconButton onClick={() => handleRemoveRow(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{
            mt: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1
          }}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={handleAddRow}
              fullWidth={false}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Dodaj Wiersz
            </Button>

            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={!fromLocation || items.length === 0 || loading}
              fullWidth={false}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                ml: { xs: 0, sm: 2 }
              }}
            >
              {loading ? <CircularProgress size={20} /> : 'Rozpocznij quest'}
            </Button>

            {onCancel && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={onCancel}
                fullWidth={false}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Anuluj
              </Button>
            )}
          </Box>
        </form>

        <Dialog
          open={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 1,
              p: 0.5
            }
          }}
        >
          <DialogTitle
            component="div"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              py: 1
            }}
          >
            <Typography variant="h6">
              Potwierdź szczegóły questa
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ mt: 1 }}>
            {formDataRef.current && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Lokalizacje */}
                <Box sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'background.paper'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle1">Lokalizacje</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box flex={1}>
                      <Typography variant="body2" color="text.secondary">Z lokalizacji</Typography>
                      <Typography>{locations.find(l => l.id === formDataRef.current?.fromLocation)?.name}</Typography>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="body2" color="text.secondary">Do lokalizacji</Typography>
                      <Typography>{locations.find(l => l.id === parseInt(formDataRef.current?.toLocation?.toString() || ''))?.name}</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Uczestnicy */}
                {formDataRef.current.users && formDataRef.current.users.length > 0 && (
                  <Box sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'background.paper'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Person sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="subtitle1">Uczestnicy questa</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {formDataRef.current.users.map((user) => (
                        <Chip
                          key={user.id}
                          label={user.username}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Elementy */}
                <Box sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'background.paper'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Inventory sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle1">Elementy do transferu</Typography>
                  </Box>
                  <List disablePadding>
                    {formDataRef.current.items
                      .filter(item => item.type === 'pyr_code' ? item.status === 'success' : Boolean(item.id))
                      .map((item, index) => (
                        <ListItem
                          key={index}
                          sx={{
                            py: 0.5,
                            borderBottom: index !== formDataRef.current!.items.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider'
                          }}
                        >
                          <ListItemText
                            primary={item.type === 'pyr_code'
                              ? item.pyrcode
                              : stocks.find(s => s.id === parseInt(item.id))?.category.label}
                            secondary={
                              <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                                <Chip
                                  size="small"
                                  label={item.type === 'pyr_code' ? 'Sprzęt' : `${item.quantity} szt.`}
                                  color={item.type === 'pyr_code' ? 'primary' : 'default'}
                                  variant="outlined"
                                />
                                {item.category?.label && (
                                  <Chip
                                    size="small"
                                    label={item.category.label}
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                  </List>
                </Box>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 1,
            gap: 1
          }}>
            <Button
              onClick={() => setShowConfirmation(false)}
              variant="outlined"
              startIcon={<Close />}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Check />}
            >
              {loading ? 'Tworzenie...' : 'Rozpocznij transfer'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default TransferFormCore;
