import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Button,
  CircularProgress,
  Paper,
  TextField,
  List,
  Autocomplete,
  Grid,
  Chip,
  Alert,
  styled,
  alpha,
  IconButton,
  InputAdornment,
  Tooltip
} from '@mui/material';
import {
  LocalShipping,
  Search,
  RocketLaunch,
  LocationOn,
  AccessTime,
  Inventory,
  ListAlt,
  AddTask,
  QrCodeScanner,
  KeyboardReturn
} from '@mui/icons-material';
import { useTransfers } from '../../hooks/useTransfers';
import { getApiUrl } from '../../config/api';
import { jwtDecode } from 'jwt-decode';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import BarcodeScanner from '../common/BarcodeScanner';
import { designTokens } from '../../theme/designTokens';

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
  status: 'in_stock' | 'available' | 'unavailable';
}

// Dodaj nowy styled component dla quest item
const QuestItem = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(4),
  marginBottom: theme.spacing(2),
  background: theme.palette.mode === 'dark' 
    ? `linear-gradient(135deg, ${alpha('#462f1d', 0.98)}, ${alpha('#2d1810', 0.95)})`
    : `linear-gradient(135deg, #f8e7cb, #ebd5b3)`,
  borderRadius: '8px',
  cursor: 'pointer',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 4px 12px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.4)'
    : '0 4px 12px rgba(139, 109, 76, 0.15), inset 0 0 30px rgba(139, 109, 76, 0.1)',
  transition: 'all 0.3s ease',
  border: theme.palette.mode === 'dark'
    ? '2px solid #8b6d4c'
    : '2px solid #c4a980',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 6px 16px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)'
      : '0 6px 16px rgba(139, 109, 76, 0.25), inset 0 0 30px rgba(139, 109, 76, 0.1)',
    '&::before': {
      opacity: 0.5,
    },
    '&::after': {
      boxShadow: theme.palette.mode === 'dark'
        ? 'inset 0 0 100px 100px rgba(255, 255, 255, 0.05)'
        : 'inset 0 0 100px 100px rgba(255, 255, 255, 0.07)',
    }
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(45deg, #ffd700, #b8860b, #8b6d4c)'
      : 'linear-gradient(45deg, #daa520, #cd853f, #b8860b)',
    borderRadius: '10px',
    opacity: 0.3,
    transition: 'opacity 0.3s ease',
    zIndex: -1,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: theme.palette.mode === 'dark'
      ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.15' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E")`
      : `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.15' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
    borderRadius: '6px',
    opacity: 0.5,
    pointerEvents: 'none',
    transition: 'box-shadow 0.3s ease',
  }
}));

const QuestTitle = styled(Typography)(({ theme }) => ({
  fontFamily: '"Cinzel", serif',
  fontWeight: 700,
  fontSize: '1.4rem',
  color: theme.palette.mode === 'dark' ? '#ffd700' : '#8b4513',
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  textShadow: theme.palette.mode === 'dark' 
    ? '2px 2px 2px rgba(0,0,0,0.8), 0 0 5px rgba(255, 215, 0, 0.3)'
    : '1px 1px 2px rgba(139, 69, 19, 0.3)',
  '& .MuiSvgIcon-root': {
    color: theme.palette.mode === 'dark' ? '#ffd700' : '#8b4513',
    filter: theme.palette.mode === 'dark' 
      ? 'drop-shadow(2px 2px 2px rgba(0,0,0,0.8))'
      : 'drop-shadow(1px 1px 1px rgba(139, 69, 19, 0.3))',
  }
}));

const QuestLocation = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: theme.palette.mode === 'dark' ? '#ffd700' : '#8b4513',
  marginBottom: theme.spacing(1),
  fontSize: '1rem',
  fontWeight: 500,
  textShadow: theme.palette.mode === 'dark' 
    ? '1px 1px 2px rgba(0,0,0,0.8)'
    : '1px 1px 1px rgba(139, 69, 19, 0.2)',
  '& .MuiSvgIcon-root': {
    color: theme.palette.mode === 'dark' ? '#ffd700' : '#8b4513',
    filter: theme.palette.mode === 'dark' 
      ? 'drop-shadow(1px 1px 1px rgba(0,0,0,0.8))'
      : 'drop-shadow(1px 1px 1px rgba(139, 69, 19, 0.2))',
  }
}));

const QuestDate = styled(Typography)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#d4af37' : '#8b4513',
  fontSize: '0.9rem',
  fontStyle: 'italic',
  fontWeight: 500,
  textShadow: theme.palette.mode === 'dark' 
    ? '1px 1px 1px rgba(0,0,0,0.8)'
    : '1px 1px 1px rgba(139, 69, 19, 0.2)',
}));

const QuestStatus = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark' ? '#4a3f2c' : '#daa520',
  color: theme.palette.mode === 'dark' ? '#ffd700' : '#ffffff',
  border: `1px solid ${theme.palette.mode === 'dark' ? '#ffd700' : '#b8860b'}`,
  fontWeight: 600,
  '& .MuiChip-label': {
    textShadow: theme.palette.mode === 'dark'
      ? '1px 1px 1px rgba(0,0,0,0.8)'
      : '1px 1px 1px rgba(139, 69, 19, 0.3)',
  },
}));

// Modern Search Container with glassmorphism
const SearchContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(4),
  marginBottom: theme.spacing(5),
  background: theme.palette.mode === 'dark'
    ? designTokens.glass.dark.background
    : designTokens.glass.light.backgroundStrong,
  backdropFilter: designTokens.glass.light.backdropBlur,
  WebkitBackdropFilter: designTokens.glass.light.backdropBlur,
  borderRadius: designTokens.borderRadius['2xl'],
  border: theme.palette.mode === 'dark'
    ? designTokens.glass.dark.border
    : `1px solid rgba(255, 152, 0, 0.15)`,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px rgba(255, 152, 0, 0.1)',
  overflow: 'hidden',
  // Subtle orange gradient overlay
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: designTokens.gradients.primary,
    opacity: 0.8,
  },
}));

// Modern Action Card
const ActionCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: theme.palette.mode === 'dark'
    ? designTokens.darkPalette.background.elevated
    : '#ffffff',
  borderRadius: designTokens.borderRadius.xl,
  border: theme.palette.mode === 'dark'
    ? `1px solid ${designTokens.darkPalette.border.subtle}`
    : '1px solid rgba(0, 0, 0, 0.06)',
  position: 'relative',
  overflow: 'hidden',
  // Orange accent line at top
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '40%',
    height: '3px',
    background: designTokens.gradients.primary,
    borderRadius: '0 0 4px 4px',
    opacity: 0,
    transition: 'all 0.3s ease',
  },
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: theme.palette.mode === 'dark'
      ? `0 12px 28px rgba(0, 0, 0, 0.4), ${designTokens.glow.orangeSubtle}`
      : `0 12px 28px rgba(255, 152, 0, 0.15), ${designTokens.glow.orangeSubtle}`,
    borderColor: theme.palette.mode === 'dark'
      ? designTokens.colors.primary[700]
      : designTokens.colors.primary[300],
    '&::before': {
      opacity: 1,
      width: '80%',
    },
  },
}));

// Action Icon Container
const ActionIconWrapper = styled(Box)(({ theme }) => ({
  width: 64,
  height: 64,
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  background: theme.palette.mode === 'dark'
    ? designTokens.gradients.primarySoft
    : 'rgba(255, 152, 0, 0.08)',
  transition: 'all 0.3s ease',
  '.MuiSvgIcon-root': {
    fontSize: 32,
    color: designTokens.colors.primary[500],
    transition: 'all 0.3s ease',
  },
  '&:hover': {
    background: designTokens.gradients.primary,
    boxShadow: designTokens.glow.orangeSubtle,
    '.MuiSvgIcon-root': {
      color: '#ffffff',
      transform: 'scale(1.1)',
    },
  },
}));

const HomePage: React.FC = () => {
  useTransfers();
  const navigate = useNavigate();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const [showScanner, setShowScanner] = useState(false);

  const [pyrcode, setPyrcode] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [userTransfers, setUserTransfers] = useState<any[]>([]);
  const [userTransfersLoading, setUserTransfersLoading] = useState(false);
  const [userTransfersError, setUserTransfersError] = useState<string | null>(null);
  const [pyrCodeSuggestions, setPyrCodeSuggestions] = useState<PyrCodeSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleBarcodeScan = async (scannedCode: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        getApiUrl(`/assets/pyrcode/${scannedCode.trim()}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 404) {
        showSnackbar('error', 'Nie znaleziono sprzętu o podanym kodzie.');
        return;
      }

      if (!response.ok) {
        throw new Error('Nie udało się pobrać szczegółów sprzętu.');
      }

      const data = await response.json();
      setShowScanner(false);
      navigate(`/equipment/${data.id}?type=${data.category.type || 'asset'}`);
    } catch (err: any) {
      showSnackbar('error', err.message || 'Wystąpił nieoczekiwany błąd.');
    }
  };

  const handleCloseScanner = useCallback(() => {
    setShowScanner(false);
  }, []);

  const scannerComponent = useMemo(() => {
    if (!showScanner) return null;
    return (
      <BarcodeScanner
        onClose={handleCloseScanner}
        onScan={handleBarcodeScan}
      />
    );
  }, [showScanner, handleCloseScanner, handleBarcodeScan]);

  // Fetch user transfers
  useEffect(() => {
    const fetchUserTransfers = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const decoded = jwtDecode(token) as any;
        const userId = decoded.userID;

        setUserTransfersLoading(true);
        setUserTransfersError(null);

        const response = await fetch(
          getApiUrl(`/transfers/users/${userId}?status=in_transit`),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Nie udało się pobrać transferów użytkownika');
        }

        const data = await response.json();
        setUserTransfers(data);
      } catch (err) {
        setUserTransfersError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
        setUserTransfers([]);
      } finally {
        setUserTransfersLoading(false);
      }
    };

    fetchUserTransfers();
  }, []);

  useEffect(() => {
    if (searchError) {
      showSnackbar('error', searchError);
    }
  }, [searchError]);

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
      const token = localStorage.getItem('token');
      const response = await fetch(
        getApiUrl(`/locations/1/search?q=${encodeURIComponent(value)}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Nie udało się wyszukać kodów PYR');
      }

      const suggestions = await response.json();
      setPyrCodeSuggestions(suggestions);
    } catch (error) {
      console.error('Błąd podczas wyszukiwania:', error);
      setPyrCodeSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearch = async () => {
    if (!pyrcode.trim()) {
      setSearchError('Proszę podać kod Pyrcode.');
      return;
    }

    try {
      setSearchError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(
        getApiUrl(`/assets/pyrcode/${pyrcode.trim()}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 404) {
        setSearchError('Nie znaleziono sprzętu o podanym kodzie Pyrcode.');
        return;
      }

      if (!response.ok) {
        throw new Error('Nie udało się pobrać szczegółów sprzętu.');
      }

      const data = await response.json();
      navigate(`/equipment/${data.id}?type=${data.category.type || 'asset'}`);
    } catch (err: any) {
      setSearchError(err.message || 'Wystąpił nieoczekiwany błąd.');
    }
  };

  const handleOptionSelected = (_event: any, value: PyrCodeSuggestion | string | null) => {
    if (!value || typeof value === 'string') {
      return;
    }

    // Przekieruj bezpośrednio do szczegółów sprzętu
    navigate(`/equipment/${value.id}?type=asset`);
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
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
      <Container maxWidth="xl" sx={{
        py: { xs: 3, sm: 4 },
        mt: { xs: 1, sm: 0 }
      }}>
        {/* Modern Search Section */}
        <SearchContainer>
          <Typography
            variant="h5"
            sx={{
              mb: 2,
              fontWeight: 600,
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Search sx={{ color: 'primary.main' }} />
            Wyszukaj sprzęt
          </Typography>

          <Box sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'stretch',
          }}>
            {/* Main Search Input */}
            <Autocomplete
              fullWidth
              freeSolo
              options={pyrCodeSuggestions}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : option.pyrcode
              }
              onChange={handleOptionSelected}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box
                    key={key}
                    component="li"
                    {...otherProps}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': {
                        background: (theme) => theme.palette.mode === 'dark'
                          ? 'rgba(255, 152, 0, 0.12)'
                          : 'rgba(255, 152, 0, 0.08)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: 'primary.main',
                          fontFamily: 'monospace',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {option.pyrcode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.category.label} • {option.location.name}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              loading={searchLoading}
              onInputChange={(_, newValue) => {
                setPyrcode(newValue);
                handlePyrCodeSearch(newValue);
              }}
              PaperComponent={({ children, ...props }) => (
                <Paper
                  {...props}
                  sx={{
                    mt: 1,
                    borderRadius: designTokens.borderRadius.lg,
                    border: (theme) => theme.palette.mode === 'dark'
                      ? `1px solid ${designTokens.darkPalette.border.default}`
                      : '1px solid rgba(255, 152, 0, 0.2)',
                    boxShadow: designTokens.shadows.xl,
                  }}
                >
                  {children}
                </Paper>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  variant="outlined"
                  placeholder="Wprowadź Pyrcode (np. PYR-001)..."
                  onKeyDown={handleKeyDown}
                  InputProps={{
                    ...params.InputProps,
                    sx: {
                      height: '56px',
                      pr: '14px !important',
                      backgroundColor: (theme) => theme.palette.mode === 'dark'
                        ? designTokens.darkPalette.background.paper
                        : '#ffffff',
                      borderRadius: designTokens.borderRadius.lg,
                      fontSize: '1.1rem',
                      fontFamily: 'monospace',
                      letterSpacing: '0.03em',
                      '& input': {
                        height: '56px',
                        padding: '0 14px !important',
                      },
                      '& input::placeholder': {
                        fontFamily: '"Roboto", sans-serif',
                        letterSpacing: 'normal',
                        opacity: 0.7,
                      },
                    },
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{
                          color: 'primary.main',
                          fontSize: 28,
                          ml: 0.5,
                        }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {searchLoading && (
                            <CircularProgress
                              color="primary"
                              size={24}
                            />
                          )}
                          {pyrcode && (
                            <Tooltip title="Szukaj (Enter)">
                              <IconButton
                                onClick={handleSearch}
                                sx={{
                                  color: 'primary.main',
                                  '&:hover': {
                                    background: 'rgba(255, 152, 0, 0.12)',
                                  },
                                }}
                              >
                                <KeyboardReturn />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: designTokens.borderRadius.lg,
                      '& fieldset': {
                        borderColor: (theme) => theme.palette.mode === 'dark'
                          ? designTokens.darkPalette.border.default
                          : 'rgba(255, 152, 0, 0.3)',
                        borderWidth: '2px',
                        borderRadius: designTokens.borderRadius.lg,
                      },
                      '&:hover fieldset': {
                        borderColor: designTokens.colors.primary[400],
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: designTokens.colors.primary[500],
                        boxShadow: '0 0 0 4px rgba(255, 152, 0, 0.15)',
                      },
                    },
                  }}
                />
              )}
            />

            {/* QR Scanner Button */}
            <Tooltip title="Skanuj kod QR">
              <Button
                variant="contained"
                onClick={() => setShowScanner(true)}
                sx={{
                  minWidth: { xs: '56px', sm: '140px' },
                  height: '56px',
                  borderRadius: designTokens.borderRadius.lg,
                  background: designTokens.gradients.primary,
                  boxShadow: designTokens.shadows.primary,
                  px: { xs: 0, sm: 3 },
                  '&:hover': {
                    background: designTokens.gradients.hero,
                    boxShadow: designTokens.glow.orange,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <QrCodeScanner sx={{ fontSize: 28 }} />
                <Typography
                  sx={{
                    ml: 1,
                    display: { xs: 'none', sm: 'block' },
                    fontWeight: 600,
                  }}
                >
                  Skanuj
                </Typography>
              </Button>
            </Tooltip>
          </Box>

          {/* Helper text */}
          <Typography
            variant="caption"
            sx={{
              mt: 1.5,
              display: 'block',
              color: 'text.secondary',
              opacity: 0.8,
            }}
          >
            Wpisz kod lub zeskanuj QR, aby szybko znaleźć sprzęt
          </Typography>
        </SearchContainer>

        {scannerComponent}

        {/* Szybkie akcje - Modern Design */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              mb: 3,
              fontWeight: 600,
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <RocketLaunch sx={{ color: 'primary.main' }} />
            Szybkie akcje
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={6} sm={6} md={3}>
              <ActionCard elevation={0} onClick={() => navigate('/transfers/create')}>
                <ActionIconWrapper>
                  <RocketLaunch />
                </ActionIconWrapper>
                <Typography
                  variant="h6"
                  align="center"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.95rem', sm: '1.1rem' },
                    color: 'text.primary',
                  }}
                >
                  Utwórz quest
                </Typography>
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    color: 'text.secondary',
                    mt: 0.5,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Nowa dostawa
                </Typography>
              </ActionCard>
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <ActionCard elevation={0} onClick={() => navigate('/add-item')}>
                <ActionIconWrapper>
                  <AddTask />
                </ActionIconWrapper>
                <Typography
                  variant="h6"
                  align="center"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.95rem', sm: '1.1rem' },
                    color: 'text.primary',
                  }}
                >
                  Dodaj sprzęt
                </Typography>
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    color: 'text.secondary',
                    mt: 0.5,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Nowy przedmiot
                </Typography>
              </ActionCard>
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <ActionCard elevation={0} onClick={() => navigate('/list')}>
                <ActionIconWrapper>
                  <Inventory />
                </ActionIconWrapper>
                <Typography
                  variant="h6"
                  align="center"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.95rem', sm: '1.1rem' },
                    color: 'text.primary',
                  }}
                >
                  Magazyn
                </Typography>
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    color: 'text.secondary',
                    mt: 0.5,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Zarządzaj sprzętem
                </Typography>
              </ActionCard>
            </Grid>

            <Grid item xs={6} sm={6} md={3}>
              <ActionCard elevation={0} onClick={() => navigate('/transfers')}>
                <ActionIconWrapper>
                  <ListAlt />
                </ActionIconWrapper>
                <Typography
                  variant="h6"
                  align="center"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.95rem', sm: '1.1rem' },
                    color: 'text.primary',
                  }}
                >
                  Questy
                </Typography>
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    color: 'text.secondary',
                    mt: 0.5,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Przeglądaj dostawy
                </Typography>
              </ActionCard>
            </Grid>
          </Grid>
        </Box>

        {/* Moje Questy - Modern Section */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <LocalShipping sx={{ color: 'primary.main' }} />
              Moje Questy
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate('/quests')}
              startIcon={<AccessTime />}
              sx={{
                borderRadius: designTokens.borderRadius.lg,
                textTransform: 'none',
                fontWeight: 600,
                borderWidth: '2px',
                '&:hover': {
                  borderWidth: '2px',
                  background: 'rgba(255, 152, 0, 0.08)',
                },
              }}
            >
              Tablica zadań
            </Button>
          </Box>

          {userTransfersLoading ? (
            <Box
              display="flex"
              justifyContent="center"
              p={4}
              sx={{
                background: (theme) => theme.palette.mode === 'dark'
                  ? designTokens.darkPalette.background.elevated
                  : 'rgba(255, 152, 0, 0.04)',
                borderRadius: designTokens.borderRadius.xl,
              }}
            >
              <CircularProgress color="primary" />
            </Box>
          ) : userTransfersError ? (
            <Alert
              severity="error"
              sx={{ borderRadius: designTokens.borderRadius.lg }}
            >
              {userTransfersError}
            </Alert>
          ) : userTransfers.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                background: (theme) => theme.palette.mode === 'dark'
                  ? designTokens.darkPalette.background.elevated
                  : 'rgba(255, 152, 0, 0.04)',
                borderRadius: designTokens.borderRadius.xl,
                border: (theme) => theme.palette.mode === 'dark'
                  ? `1px solid ${designTokens.darkPalette.border.subtle}`
                  : '1px solid rgba(255, 152, 0, 0.1)',
              }}
            >
              <LocalShipping
                sx={{
                  fontSize: 48,
                  color: 'text.secondary',
                  opacity: 0.5,
                  mb: 2,
                }}
              />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                Brak aktywnych questów
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Rozpocznij nową dostawę, aby zobaczyć ją tutaj
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/transfers/create')}
                startIcon={<RocketLaunch />}
                sx={{ borderRadius: designTokens.borderRadius.lg }}
              >
                Utwórz quest
              </Button>
            </Paper>
          ) : (
            <List sx={{ mt: 1 }}>
              {userTransfers.map((transfer) => (
                <QuestItem
                  key={transfer.ID}
                  onClick={() => navigate(`/transfers/${transfer.ID}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <QuestStatus label="W trakcie" />
                  <QuestTitle variant="h6">
                    <LocalShipping sx={{ color: 'inherit', fontSize: '1.2rem' }} />
                    Quest #{transfer.ID}
                  </QuestTitle>

                  <QuestLocation>
                    <LocationOn sx={{ fontSize: '1.1rem' }} />
                    Z: {transfer.FromLocationName}
                  </QuestLocation>

                  <QuestLocation>
                    <LocationOn sx={{ fontSize: '1.1rem' }} />
                    Do: {transfer.ToLocationName}
                  </QuestLocation>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <QuestDate>
                      Rozpoczęto: {new Date(transfer.TransferDate).toLocaleString('pl-PL')}
                    </QuestDate>
                  </Box>
                </QuestItem>
              ))}
            </List>
          )}
        </Box>


      </Container>
    </Box>
  );
};

export default HomePage;
