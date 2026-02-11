import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Container, 
  useTheme, 
  Paper, 
  InputAdornment, 
  IconButton, 
  CircularProgress,
  Fade,
  Divider,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Person, 
  Lock, 
  Login as LoginIcon 
} from '@mui/icons-material';
import { getApiUrl } from '../../config/api';
import { useStorage } from '../../hooks/useStorage';
import { useAnimationPreference } from '../../hooks/useAnimationPreference';
import pyrkonLogo from '../../assets/images/p-logo.svg';
import { hyperJumpAnimation, starStreakAnimation } from '../../animations/keyframes';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { jwtDecode } from 'jwt-decode';
import { registerUser } from '../../services/userService';
import { useDiscordAuth } from '../../hooks/useDiscordAuth';

// Mapowanie komunikatów błędów na polskie tłumaczenia
const errorMessages: Record<string, string> = {
  'Invalid username or password': 'Niepoprawny login lub hasło',
  'User not found': 'Użytkownik nie znaleziony',
  'Invalid credentials': 'Niepoprawne dane logowania',
  'Authentication failed': 'Uwierzytelnianie nie powiodło się',
  'Server error': 'Błąd serwera',
  'Network error': 'Błąd sieci',
  'Unknown error': 'Nieznany błąd'
};

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isHyperJumping, setIsHyperJumping] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullname, setFullname] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const { setToken, setUsername: setStoredUsername } = useStorage();
  const { prefersAnimations, toggleAnimations, isSystemReducedMotion } = useAnimationPreference();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const { initiateDiscordLogin } = useDiscordAuth();

  // Automatyczne skupienie na polu username
  useEffect(() => {
    const usernameField = document.getElementById('username-field');
    if (usernameField) {
      usernameField.focus();
    }
  }, []);

  // Wykrywanie Caps Lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent | React.KeyboardEvent) => {
      if (e.getModifierState && e.getModifierState('CapsLock')) {
        showSnackbar('warning', 'Caps Lock jest włączony', 'Upewnij się, że Caps Lock jest wyłączony podczas logowania');
      }
    };

    const handleKeyUp = (e: KeyboardEvent | React.KeyboardEvent) => {
      if (e.getModifierState && !e.getModifierState('CapsLock')) {
        closeSnackbar();
      }
    };

    window.addEventListener('keydown', handleKeyDown as EventListener);
    window.addEventListener('keyup', handleKeyUp as EventListener);

    return () => {
      window.removeEventListener('keydown', handleKeyDown as EventListener);
      window.removeEventListener('keyup', handleKeyUp as EventListener);
    };
  }, []);

  // Funkcja do tłumaczenia komunikatów błędów
  const translateError = (errorMessage: string): string => {
    return errorMessages[errorMessage] || errorMessage;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(getApiUrl('/auth'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data: { token: string } = await response.json();
        setToken(data.token);
        // Dekoduj JWT i zapisz username do storage
        try {
          const decoded: any = jwtDecode(data.token);
          if (decoded && decoded.username) {
            setStoredUsername(decoded.username);
          }
        } catch (err) {
          // Jeśli nie uda się zdekodować, nie zapisuj username
          console.error('Błąd dekodowania JWT:', err);
        }
        if (prefersAnimations) {
          setIsHyperJumping(true);
          setTimeout(() => {
            navigate('/home');
          }, 2000);
        } else {
          navigate('/home');
        }
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Unknown error';
        showSnackbar('error', translateError(errorMessage), undefined, null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      showSnackbar('error', translateError('Network error'), undefined, null);
      setIsLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess(false);
    try {
      await registerUser(username, password, fullname);
      setRegisterSuccess(true);
      setIsRegistering(false);
      setFullname('');
      setUsername('');
      setPassword('');
      showSnackbar('success', 'Zarejestrowano pomyślnie. Możesz się teraz zalogować.');
    } catch (err: any) {
      setRegisterError(err.message || 'Wystąpił błąd');
      showSnackbar('error', err.message || 'Wystąpił błąd');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.background.default} 100%)`,
        perspective: '1000px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {isHyperJumping && prefersAnimations && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            backgroundColor: 'rgba(0,0,0,0.8)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '-100px',
              width: '10px',
              height: '2px',
              background: 'white',
              boxShadow: '0 0 10px #fff, 0 0 20px #fff',
              animation: `${starStreakAnimation} 0.5s linear infinite`,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '30%',
              left: '-100px',
              width: '8px',
              height: '2px',
              background: 'white',
              boxShadow: '0 0 10px #fff, 0 0 20px #fff',
              animation: `${starStreakAnimation} 0.7s linear infinite`,
            }
          }}
        />
      )}
      <Fade in={true} timeout={800}>
        <Container 
          maxWidth="sm"
          sx={{
            animation: isHyperJumping && prefersAnimations ? `${hyperJumpAnimation} 2s ease-in forwards` : 'none',
          }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 4,
              borderRadius: 1,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
              '&:hover': {
                transform: prefersAnimations ? 'translateY(-5px)' : 'none',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              },
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Box 
                component="img" 
                src={pyrkonLogo} 
                alt="Pyrkon Logo" 
                sx={{ 
                  height: '60px', 
                  width: 'auto', 
                  mb: 2,
                  transition: 'transform 0.3s ease',
                  filter: theme.palette.mode === 'light' 
                    ? 'invert(1) brightness(1.2) drop-shadow(0 0 2px rgba(255,255,255,0.3))'
                    : 'drop-shadow(0 0 2px rgba(0,0,0,0.3)) drop-shadow(0 0 4px rgba(0,0,0,0.2))',
                  '&:hover': {
                    transform: prefersAnimations ? 'scale(1.05)' : 'none',
                  }
                }} 
              />
              <Typography 
                variant="h4" 
                component="h1" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textAlign: 'center',
                }}
              >
                PyrHouse
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center">
                Zaloguj się, aby kontynuować
              </Typography>
            </Box>

            <form onSubmit={isRegistering ? handleRegister : handleSubmit}>
              {isRegistering && (
                <TextField
                  label="Imię (i nazwisko jeśli chcesz)"
                  variant="outlined"
                  fullWidth
                  value={fullname}
                  onChange={e => setFullname(e.target.value)}
                  required
                  sx={{ mb: 3, mt: 1 }}
                  inputProps={{ maxLength: 60, minLength: 2 }}
                  disabled={registerLoading}
                />
              )}
              <TextField
                id="username-field"
                label="Nazwa użytkownika"
                variant="outlined"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
                inputProps={{
                  autoComplete: 'username',
                  spellCheck: 'false',
                  maxLength: 32,
                  minLength: 3
                }}
                sx={{ mb: 3 }}
                disabled={isLoading || registerLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Hasło"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 3 }}
                inputProps={{ minLength: 4, maxLength: 64, autoComplete: 'current-password' }}
                disabled={isLoading || registerLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        disabled={isLoading || registerLoading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {isRegistering && registerError && (
                <Alert severity="error" sx={{ mb: 2 }}>{registerError}</Alert>
              )}
              {isRegistering && registerSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>Zarejestrowano pomyślnie! Możesz się teraz zalogować.</Alert>
              )}
              {!isRegistering && (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    fullWidth
                    disabled={isLoading}
                    sx={{ py: 1.5, borderRadius: 1, fontWeight: 600, fontSize: '1rem', textTransform: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', mb: 1 }}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                  >
                    {isLoading ? 'Logowanie...' : 'Zaloguj się'}
                  </Button>

                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      lub
                    </Typography>
                  </Divider>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={initiateDiscordLogin}
                    disabled={isLoading}
                    sx={{
                      py: 1.5,
                      borderRadius: 1,
                      fontWeight: 600,
                      fontSize: '1rem',
                      textTransform: 'none',
                      backgroundColor: '#5865F2',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(88, 101, 242, 0.3)',
                      '&:hover': {
                        backgroundColor: '#4752C4',
                      },
                    }}
                    startIcon={
                      <Box
                        component="svg"
                        viewBox="0 0 24 24"
                        sx={{ width: 24, height: 24, fill: 'currentColor' }}
                      >
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </Box>
                    }
                  >
                    Zaloguj przez Discord
                  </Button>
                </>
              )}
              {isRegistering && (
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  fullWidth
                  disabled={registerLoading}
                  sx={{ py: 1.5, borderRadius: 1, fontWeight: 600, fontSize: '1rem', textTransform: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', mb: 1 }}
                  startIcon={registerLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                >
                  {registerLoading ? 'Rejestracja...' : 'Zarejestruj się'}
                </Button>
              )}
            </form>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefersAnimations}
                    onChange={toggleAnimations}
                    color="primary"
                    disabled={isSystemReducedMotion}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Włącz animacje</Typography>
                    {isSystemReducedMotion && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Wyłączone zgodnie z ustawieniami systemowymi
                      </Typography>
                    )}
                  </Box>
                }
              />
            </Box>

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {isRegistering ? 'Masz już konto?' : 'Nie masz konta?'}{' '}
                <Button
                  variant="text"
                  color="primary"
                  sx={{ fontWeight: 600, textTransform: 'none', ml: 0.5, p: 0, minWidth: 0 }}
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setRegisterError('');
                    setRegisterSuccess(false);
                  }}
                  disableRipple
                >
                  {isRegistering ? 'Zaloguj się' : 'Zarejestruj się'}
                </Button>
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                © {new Date().getFullYear()} PyrHouse - System zarządzania sprzętem
              </Typography>
            </Box>

            <AppSnackbar
              open={snackbar.open}
              type={snackbar.type}
              message={snackbar.message}
              details={snackbar.details}
              onClose={closeSnackbar}
              autoHideDuration={snackbar.autoHideDuration}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            />
          </Paper>
        </Container>
      </Fade>
    </Box>
  );
};

export default LoginForm;
