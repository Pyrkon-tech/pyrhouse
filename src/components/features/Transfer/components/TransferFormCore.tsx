import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Autocomplete,
  Chip,
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

import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';

import TransferItemsTable from './TransferItemsTable';
import TransferConfirmDialog from './TransferConfirmDialog';
import {
  TransferFormValues,
  TransferFormUser,
  FormPyrCodeSuggestion,
  FormValidationStatus,
  getTransferErrorMessage,
} from './transferFormModel';

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
  const [pyrCodeSuggestions, setPyrCodeSuggestions] = useState<FormPyrCodeSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [lockedRows, setLockedRows] = useState<Set<number>>(new Set());
  const [isValidationInProgress, setIsValidationInProgress] = useState<boolean>(false);
  const [users, setUsers] = useState<TransferFormUser[]>([]);
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
      } catch (error) {
        showSnackbar('error', error instanceof Error && error.message ? error.message : 'Wystąpił błąd podczas pobierania użytkowników');
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
    // Intentionally mount-only: re-running on initialVolunteerIds/setValue changes
    // would overwrite manual edits to the users field with the dispatch preselection
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setValue(`items.${index}.status`, 'failure' as FormValidationStatus);
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
      setValue(`items.${index}.status`, 'success' as FormValidationStatus);
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
    } catch {
      setValue(`items.${index}.status`, 'failure' as FormValidationStatus);
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
        (suggestion) => !isPyrCodeSelected(suggestion.pyrcode)
      );

      setPyrCodeSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Błąd podczas wyszukiwania:', error);
      setPyrCodeSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
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

      const stockItems = formDataRef.current.items
        .filter((item) => item.type === 'stock')
        .map((item) => ({ id: Number(item.id), quantity: Number(item.quantity) }));

      const transferUsers = formDataRef.current.users.map((user) => ({ id: user.id }));

      const payload: {
        from_location_id: number;
        location_id: number;
        assets?: typeof assets;
        stocks?: typeof stockItems;
        users?: typeof transferUsers;
      } = {
        from_location_id: Number(formDataRef.current.fromLocation),
        location_id: Number(formDataRef.current.toLocation),
      };

      if (assets.length > 0) payload.assets = assets;
      if (stockItems.length > 0) payload.stocks = stockItems;
      if (transferUsers.length > 0) payload.users = transferUsers;

      if (!assets.length && !stockItems.length) {
        showSnackbar('error', 'Dodaj co najmniej jeden zasób lub pozycję magazynową');
        return;
      }

      if (questId) {
        // Quest mode: link transfer to quest via quest-specific endpoint
        const questPayload: CreateTransferFromQuestRequest = {
          from_location_id: Number(formDataRef.current.fromLocation),
          to_location_id: Number(formDataRef.current.toLocation),
          stock_items: stockItems.length > 0 ? stockItems : undefined,
          assets: assets.length > 0 ? assets : undefined,
          users: transferUsers.length > 0 ? transferUsers : undefined,
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
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      showSnackbar('error', getTransferErrorMessage(message));
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
      status: '' as FormValidationStatus
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
                  {locations.map((location) => (
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
                  {locations.map((location) => (
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

          <TransferItemsTable
            control={control}
            fields={fields}
            items={items}
            stocks={stocks}
            lockedRows={lockedRows}
            pyrCodeSuggestions={pyrCodeSuggestions}
            searchLoading={searchLoading}
            lastInputRef={lastInputRef}
            isPyrCodeSelected={isPyrCodeSelected}
            onValidatePyrCode={handleValidatePyrCode}
            onSearchPyrCode={handlePyrCodeSearch}
            onRemoveRow={handleRemoveRow}
          />

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

        <TransferConfirmDialog
          open={showConfirmation}
          loading={loading}
          formData={formDataRef.current}
          locations={locations}
          stocks={stocks}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirmSubmit}
        />
      </Container>
    </Box>
  );
};

export default TransferFormCore;
