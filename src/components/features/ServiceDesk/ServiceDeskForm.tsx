import React, { useState, useEffect } from 'react';
import { Box, Typography, MenuItem, Alert, CircularProgress, InputLabel } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useSendPublicServiceDeskRequest } from '../../../services/serviceDeskPublicService';
import { useLocations } from '../../../hooks/useLocations';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { StyledPaper, StyledTextField, StyledSelect, StyledButton, StyledFormControl } from './ServiceDeskForm.styles';
import type { Location } from '../../../types/location.types';

const REQUEST_TYPES = [
  { id: 'hardware_issue', name: 'Awaria sprzętu' },
  { id: 'replacement', name: 'Wymiana sprzętu' },
  { id: 'technical_problem', name: 'Problem techniczny' },
  { id: 'other', name: 'Inne' },
];

const PRIORITIES = [
  { id: 'high', name: 'Wysoki' },
  { id: 'medium', name: 'Średni' },
  { id: 'low', name: 'Niski' },
];

interface ServiceDeskFormProps {
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  hidePriority?: boolean;
}

const ServiceDeskForm: React.FC<ServiceDeskFormProps> = ({
  title = 'Zgłoś problem',
  subtitle,
  onSuccess,
  onError,
  className,
  hidePriority = false
}) => {
  const { send } = useSendPublicServiceDeskRequest();
  const { locations, refetch: fetchLocations } = useLocations();
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: '',
    priority: hidePriority ? 'high' : '',
    created_by: '',
  });
  const [locationInput, setLocationInput] = useState('');
  const [locationId, setLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<unknown>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value as string }));
  };

  const isLocationValid = locationId !== null || locationInput.trim().length > 1;

  const isValid =
    form.title.length > 3 &&
    form.type &&
    (hidePriority || form.priority) &&
    isLocationValid &&
    (!hidePriority || form.created_by.trim().length > 1);

  const buildLocationPayload = () => {
    if (locationId !== null) return { location_id: locationId };
    if (locationInput.trim().length > 1) return { location: locationInput.trim() };
    return {};
  };

  return (
    <>
      {success && hidePriority ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, py: 4 }}>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.98)',
            borderRadius: 4,
            px: { xs: 2, sm: 4 },
            py: { xs: 3, sm: 4 },
            boxShadow: 6,
            maxWidth: 360,
            width: '100%',
            textAlign: 'center',
            mb: 2,
          }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} sx={{ color: '#2e7d32', mb: 0.5 }}>
              Dziękujemy za zgłoszenie!
            </Typography>
            <Typography variant="body1" sx={{ color: '#333', mb: 3, maxWidth: 320, mx: 'auto' }}>
              Twoje zgłoszenie zostało przesłane do zespołu technicznego.
            </Typography>
            <StyledButton isPublic onClick={() => window.location.reload()}>
              Wyślij kolejne zgłoszenie
            </StyledButton>
          </Box>
        </Box>
      ) : (
        <StyledPaper isPublic={hidePriority} className={className}>
          <Box sx={{ mb: { xs: 0, sm: 1 } }}>
            <Typography variant="h5" fontWeight={700} color="primary.main">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{subtitle}</Typography>
            )}
          </Box>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            setSuccess(false);
            try {
              const base = {
                title: form.title,
                description: form.description.trim() ? form.description : 'brak opisu',
                type: form.type,
                ...buildLocationPayload(),
              };
              const data = hidePriority
                ? { ...base, priority: 'high', created_by: form.created_by.trim() }
                : { ...base, priority: form.priority };
              await send(data);
              setSuccess(true);
              setForm({ title: '', description: '', type: '', priority: hidePriority ? 'high' : '', created_by: '' });
              setLocationInput('');
              setLocationId(null);
              onSuccess?.();
            } catch (e) {
              const errorMessage = (e instanceof Error ? e.message : '') || 'Wystąpił błąd';
              setError(errorMessage);
              onError?.(errorMessage);
            } finally {
              setLoading(false);
            }
          }}>
            {hidePriority && (
              <StyledTextField
                isPublic
                label="Kto zgłasza? (Ksywka, imię...)"
                name="created_by"
                value={form.created_by}
                onChange={handleChange}
                fullWidth
                required
                margin="normal"
                inputProps={{ maxLength: 60, minLength: 2 }}
                error={!!form.created_by && form.created_by.length < 2}
              />
            )}
            <StyledTextField
              isPublic={hidePriority}
              label="Tytuł (co się stało?)"
              name="title"
              value={form.title}
              onChange={handleChange}
              fullWidth
              required
              margin="normal"
              inputProps={{ maxLength: 80 }}
            />
            <StyledTextField
              isPublic={hidePriority}
              label="Opis problemu (opcjonalnie)"
              name="description"
              value={form.description}
              onChange={handleChange}
              fullWidth
              margin="normal"
              multiline
              minRows={3}
              inputProps={{ maxLength: 500 }}
              placeholder="np. co dokładnie nie działa, dodatkowe szczegóły..."
            />
            <StyledFormControl isPublic={hidePriority} fullWidth margin="normal" required>
              <InputLabel id="type-label">{'Typ zgłoszenia'}</InputLabel>
              <StyledSelect
                isPublic={hidePriority}
                label="Typ zgłoszenia"
                labelId="type-label"
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                {REQUEST_TYPES.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </StyledSelect>
            </StyledFormControl>
            {!hidePriority && (
              <StyledFormControl isPublic={false} fullWidth margin="normal" required>
                <InputLabel id="priority-label">Priorytet</InputLabel>
                <StyledSelect
                  isPublic={false}
                  labelId="priority-label"
                  name="priority"
                  value={form.priority}
                  label="Priorytet"
                  onChange={handleChange}
                >
                  {PRIORITIES.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </StyledSelect>
              </StyledFormControl>
            )}
            <Autocomplete
              freeSolo
              options={locations}
              getOptionLabel={(option: Location | string) =>
                typeof option === 'string' ? option : option.name
              }
              inputValue={locationInput}
              onInputChange={(_, value, reason) => {
                setLocationInput(value);
                if (reason === 'input') setLocationId(null);
              }}
              onChange={(_, value) => {
                if (value && typeof value === 'object') {
                  setLocationId((value as Location).id);
                  setLocationInput((value as Location).name);
                } else {
                  setLocationId(null);
                }
              }}
              isOptionEqualToValue={(option, value) =>
                typeof option !== 'string' && typeof value !== 'string' && option.id === value.id
              }
              renderInput={(params) => (
                <StyledTextField
                  {...params}
                  isPublic={hidePriority}
                  label="Lokalizacja"
                  margin="normal"
                  required
                  placeholder="Wpisz lub wybierz z listy..."
                  inputProps={{
                    ...params.inputProps,
                    maxLength: 60,
                  }}
                  helperText={locationId !== null ? '✓ Wybrano z listy' : undefined}
                />
              )}
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {!hidePriority && success && <Alert severity="success" sx={{ mt: 2 }}>Zgłoszenie zostało wysłane!</Alert>}
            <StyledButton
              isPublic={hidePriority}
              type="submit"
              variant="contained"
              fullWidth
              disabled={!isValid || loading}
              endIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Wyślij zgłoszenie
            </StyledButton>
          </form>
        </StyledPaper>
      )}
    </>
  );
};

export default ServiceDeskForm;
