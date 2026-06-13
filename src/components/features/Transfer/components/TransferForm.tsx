import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useForm, useFieldArray, useFormContext, Controller } from 'react-hook-form';
import { styled } from '@mui/material/styles';
import { 
  Box, 
  TextField, 
  Button, 
  CircularProgress, 
  Alert, 
  Typography, 
  IconButton, 
  Grid, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Autocomplete,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { searchPyrCodesAPI } from '../../../../services/transferService';
import { TransferFormData } from '../../../../types/transfer.types';
import { Location } from '../../../../types/location.types';

const LocationPicker = lazy(() => import('../../../common/LocationPicker'));

interface User {
  id: number;
  username: string;
  fullname: string;
}

interface Stock {
  id: number;
  category: {
    label: string;
  };
  quantity: number;
}

interface TransferFormProps {
  onSubmit: (formData: TransferFormData) => void;
  onCancel: () => void;
  locations: Location[];
  stocks: Stock[];
  loading: boolean;
  error?: string;
  users: User[];
  usersLoading: boolean;
}

const StyledForm = styled('form')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

const FormSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
}));

const SectionHeader = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const StyledButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const DialogButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
}));

const ItemsList = styled(List)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const TransferForm: React.FC<TransferFormProps> = ({
  onSubmit,
  onCancel,
  locations,
  loading,
  error,
  users,
  usersLoading,
}) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TransferFormData>({
    defaultValues: {
      fromLocation: locations.length > 0 ? locations[0].id : 0,
      toLocation: '',
      items: [{ type: 'pyr_code', id: '', pyrcode: '', quantity: 1, status: '' }],
      users: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: useFormContext().control,
    name: 'items',
  });

  const [showConfirmation, setShowConfirmation] = useState(false);
  const formDataRef = useRef<TransferFormData | null>(null);

  const fromLocation = watch('fromLocation');

  const rowAddedRef = useRef(false);

  const handlePyrCodeSearch = async (value: string) => {
    if (!/^[a-zA-Z0-9-]*$/.test(value)) {
      return;
    }

    if (value.length < 2) {
      return;
    }

    try {
      await searchPyrCodesAPI(value, fromLocation);
    } catch (error) {
      console.error('Błąd podczas wyszukiwania kodów PYR:', error);
    }
  };

  const handleAddItem = useCallback(() => {
    append({ type: 'pyr_code', id: '', pyrcode: '', quantity: 0, status: '' });
    rowAddedRef.current = true;
  }, [append]);

  useEffect(() => {
    if (rowAddedRef.current && fields.length > 0) {
      const timer = setTimeout(() => {
        const inputs = document.querySelectorAll('input[data-pyr-input]');
        const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
        if (lastInput) {
          lastInput.focus();
          lastInput.select();
        }
        rowAddedRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fields.length]);

  const handleFormSubmit = (data: TransferFormData) => {
    formDataRef.current = data;
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = () => {
    if (formDataRef.current) {
      onSubmit(formDataRef.current);
      setShowConfirmation(false);
    }
  };

  return (
    <>
      <StyledForm onSubmit={handleSubmit(handleFormSubmit)}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormSection>
          <SectionHeader variant="h6">
            Wybierz lokalizację
          </SectionHeader>
          <Suspense fallback={<CircularProgress />}>
            <Controller
              name="fromLocation"
              control={control}
              render={({ field }) => (
                <LocationPicker
                  onLocationSelect={(location) => {
                    const locationId = locations.find(l => 
                      l.lat === location.lat && 
                      l.lng === location.lng
                    )?.id;
                    if (locationId) {
                      field.onChange(locationId);
                    }
                  }}
                  initialLocation={locations.find(l => l.id === fromLocation) ? {
                    lat: locations.find(l => l.id === fromLocation)?.lat || 0,
                    lng: locations.find(l => l.id === fromLocation)?.lng || 0
                  } : undefined}
                />
              )}
            />
          </Suspense>
        </FormSection>

        <FormSection>
          <SectionHeader variant="h6">
            Szczegóły transferu
          </SectionHeader>
          <Controller
            name="toLocation"
            control={control}
            defaultValue=""
            rules={{ required: 'To location is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="To Location"
                fullWidth
                error={!!errors.toLocation}
                helperText={errors.toLocation?.message}
              />
            )}
          />
        </FormSection>

        <FormSection>
          <SectionHeader variant="h6">
            Elementy do transferu
          </SectionHeader>
          {fields.map((field, index) => (
            <Box key={field.id} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Controller
                name={`items.${index}.pyrcode`}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <TextField
                    data-pyr-input
                    label="Wpisz kod PYR"
                    value={value}
                    onChange={(e) => {
                      onChange(e);
                      handlePyrCodeSearch(e.target.value);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    error={!!errors.items?.[index]?.pyrcode}
                    helperText={errors.items?.[index]?.pyrcode?.message}
                  />
                )}
              />
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity"
                  {...control.register(`items.${index}.quantity` as const, { 
                    required: true,
                    min: 1
                  })}
                  error={!!errors.items?.[index]?.quantity}
                />
              </Grid>
              <Grid item xs={1}>
                <IconButton 
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Box>
          ))}
          <Button 
            onClick={handleAddItem}
            variant="outlined"
            sx={{ mt: 2 }}
          >
            Add Item
          </Button>
        </FormSection>

        <FormSection>
          <SectionHeader variant="h6">
            Uczestnicy transferu
          </SectionHeader>
          <Controller
            name="users"
            control={control}
            render={({ field: { onChange, value } }) => (
              <Autocomplete<User, true, false, false>
                multiple
                size="small"
                options={users}
                loading={usersLoading}
                value={value || []}
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
                  value.map((option, index) => (
                    <Chip
                      size="small"
                      label={`${option.username}`}
                      {...getTagProps({ index })}
                      sx={{ maxWidth: { xs: '150px', sm: 'none' } }}
                    />
                  ))
                }
              />
            )}
          />
        </FormSection>

        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={onCancel}
          >
            Anuluj
          </Button>
          <StyledButton
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
          >
            Zatwierdź transfer
          </StyledButton>
        </Box>
      </StyledForm>

      <Dialog 
        open={showConfirmation} 
        onClose={() => setShowConfirmation(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Potwierdź quest</DialogTitle>
        <DialogContent>
          {formDataRef.current && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Z lokalizacji: {locations.find(l => l.id === formDataRef.current?.fromLocation)?.name}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Do lokalizacji: {formDataRef.current.toLocation}
              </Typography>
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Elementy do transferu:
              </Typography>
              <ItemsList>
                {formDataRef.current.items.map((item, index) => (
                  <StyledListItem key={index}>
                    <ListItemText
                      primary={`${item.pyrcode} (${item.quantity} szt.)`}
                      secondary={item.category?.label}
                    />
                  </StyledListItem>
                ))}
              </ItemsList>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <DialogButton onClick={() => setShowConfirmation(false)}>
            Anuluj
          </DialogButton>
          <DialogButton 
            onClick={handleConfirmSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Potwierdź quest'}
          </DialogButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TransferForm; 