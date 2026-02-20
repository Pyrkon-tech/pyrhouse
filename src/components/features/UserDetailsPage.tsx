// @ts-nocheck
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  Avatar,
  Chip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  SelectChangeEvent,
  CardHeader,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import { jwtDecode } from 'jwt-decode';
import { getApiUrl } from '../../config/api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Schedule,
  CheckCircle,
  Cancel,
  LocalShipping,
  LocationOn,
} from '@mui/icons-material';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { addUserPointsAPI } from '../../services/userService';

interface Transfer {
  ID: number;
  FromLocationID: number;
  FromLocationName: string;
  ToLocationID: number;
  ToLocationName: string;
  TransferDate: string;
  Status: 'in_transit' | 'completed' | 'cancelled';
}

const ArrowBackIcon = lazy(() => import('@mui/icons-material/ArrowBack'));
const EditIcon = lazy(() => import('@mui/icons-material/Edit'));
const PersonIcon = lazy(() => import('@mui/icons-material/Person'));
const CalendarTodayIcon = lazy(() => import('@mui/icons-material/CalendarToday'));
const AccessTimeIcon = lazy(() => import('@mui/icons-material/AccessTime'));
const BadgeIcon = lazy(() => import('@mui/icons-material/Badge'));
const EmailIcon = lazy(() => import('@mui/icons-material/Email'));
const StarIcon = lazy(() => import('@mui/icons-material/Star'));
const LockIcon = lazy(() => import('@mui/icons-material/Lock'));

const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const canGoBack = location.state?.from === '/users';
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<any>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [isPointsDialogOpen, setIsPointsDialogOpen] = useState(false);
  const [pointsValue, setPointsValue] = useState('');
  const [isPointsLoading, setIsPointsLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(getApiUrl(`/users/${id}`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Nie udało się pobrać danych użytkownika');
        }

        const data = await response.json();
        setUser(data);
        setEditedUser(data);
      } catch (err: any) {
        showSnackbar('error', 'Błąd podczas ładowania danych użytkownika', err.message || 'Wystąpił nieoczekiwany błąd');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

  useEffect(() => {
    const fetchTransfers = async () => {
      if (!id) return;
      
      setTransfersLoading(true);
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Brak tokenu autoryzacji');
        }

        const status = tabValue === 0 ? 'in_transit' : 'completed';
                      
        const response = await fetch(
          getApiUrl(`/transfers/users/${id}?status=${status}`),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 400 || response.status === 401) {
            showSnackbar('error', 'Nie udało się pobrać transferów. Spróbuj odświeżyć stronę.', 'Nie udało się pobrać transferów. Spróbuj odświeżyć stronę.');
            setTransfers([]);
            return;
          }
          throw new Error('Nie udało się pobrać transferów');
        }

        const data = await response.json();
        setTransfers(data);
      } catch (err) {
        showSnackbar('error', 'Błąd podczas pobierania transferów', err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
        setTransfers([]);
      } finally {
        setTransfersLoading(false);
      }
    };

    fetchTransfers();
  }, [id, tabValue]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'moderator':
        return 'warning';
      default:
        return 'info';
    }
  };

  const isAdmin = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const decoded = jwtDecode(token) as any;
      return decoded.role === 'admin';
    } catch {
      return false;
    }
  };

  const canChangePassword = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const decoded = jwtDecode(token) as any;
      return Number(decoded.userID) === Number(id) || decoded.role === 'admin';
    } catch {
      return false;
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedUser(user);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedUser((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setEditedUser((prev: any) => ({ ...prev, [name]: value }));
  };

  // Zwraca tylko te pola, które zostały zmienione względem oryginału
  const getChangedFields = (original: any, edited: any) => {
    const diff: any = {};
    Object.keys(edited).forEach((key) => {
      if (edited[key] !== original[key]) {
        diff[key] = edited[key];
      }
    });
    return diff;
  };

  const handleUpdateUser = async () => {
    setIsUpdating(true);
    try {
      const changedFields = getChangedFields(user, editedUser);
      if (Object.keys(changedFields).length === 0) {
        showSnackbar('info', 'Nie wprowadzono żadnych zmian.');
        setIsUpdating(false);
        setIsEditing(false);
        return;
      }
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/users/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(changedFields),
      });

      if (!response.ok) {
        throw new Error('Nie udało się zaktualizować danych użytkownika');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setIsEditing(false);
      showSnackbar('success', 'Dane użytkownika zostały zaktualizowane pomyślnie!');
    } catch (err: any) {
      showSnackbar('error', 'Nie udało się zaktualizować danych użytkownika', err.message || 'Wystąpił nieoczekiwany błąd');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordDialogOpen = () => {
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordDialogClose = () => {
    setIsPasswordDialogOpen(false);
    setPasswordData({ newPassword: '', confirmPassword: '' });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showSnackbar('error', 'Hasła nie są identyczne', 'Hasła nie są identyczne');
      return;
    }

    setIsPasswordUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/users/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: passwordData.newPassword }),
      });

      if (!response.ok) {
        throw new Error('Nie udało się zmienić hasła');
      }

      handlePasswordDialogClose();
      showSnackbar('success', 'Hasło zostało zmienione pomyślnie!', 'Hasło zostało zmienione pomyślnie!');
    } catch (err: any) {
      showSnackbar('error', 'Nie udało się zmienić hasła', err.message || 'Wystąpił nieoczekiwany błąd');
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const getCurrentUser = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      return jwtDecode(token) as any;
    } catch {
      return null;
    }
  };

  const canEdit = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return Number(currentUser.userID) === Number(id);
  };

  const canEditRole = () => {
    const currentUser = getCurrentUser();
    return currentUser && currentUser.role === 'admin';
  };

  const handleOpenPointsDialog = () => {
    setPointsValue('');
    setIsPointsDialogOpen(true);
  };
  const handleClosePointsDialog = () => {
    setIsPointsDialogOpen(false);
    setPointsValue('');
  };
  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPointsValue(e.target.value.replace(/[^-0-9]/g, ''));
  };
  const handleSubmitPoints = async () => {
    if (!pointsValue || isNaN(Number(pointsValue))) {
      showSnackbar('error', 'Podaj poprawną liczbę punktów');
      return;
    }
    setIsPointsLoading(true);
    try {
      const result = await addUserPointsAPI(Number(id), Number(pointsValue));
      setUser((prev: any) => ({ ...prev, points: result.points }));
      showSnackbar('success', `Punkty zostały zaktualizowane. Aktualny stan: ${result.points}`);
      handleClosePointsDialog();
    } catch (err: any) {
      showSnackbar('error', err.message || 'Błąd podczas aktualizacji punktów');
    } finally {
      setIsPointsLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Użytkownik nie został znaleziony
        </Typography>
        <AppSnackbar
          open={snackbar.open}
          type={snackbar.type}
          message={snackbar.message}
          details={snackbar.details}
          onClose={closeSnackbar}
          autoHideDuration={snackbar.autoHideDuration}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 2,
        mb: 3 
      }}>
        {canGoBack && (
          <Suspense fallback={null}>
            <ArrowBackIcon />
          </Suspense>
        )}
        <Typography variant="h5" component="h1" sx={{ fontWeight: 'medium' }}>
          Profil użytkownika
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Karta profilu */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              <Avatar 
                sx={{ 
                  width: 120, 
                  height: 120, 
                  mb: 2,
                  bgcolor: theme.palette.primary.main,
                  fontSize: '3rem'
                }}
              >
                {user.fullname ? user.fullname.charAt(0).toUpperCase() : <Suspense fallback={null}><PersonIcon /></Suspense>}
              </Avatar>
              
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {user.fullname}
              </Typography>
              
              <Chip 
                label={user.role.toUpperCase()} 
                color={getRoleColor(user.role)} 
                sx={{ mb: 2 }}
                icon={<Suspense fallback={null}><BadgeIcon sx={{ ml: 1 }} /></Suspense>}
              />
              
              <Divider sx={{ width: '100%', my: 1 }} />
              
              <Box sx={{ width: '100%' }}>           
                {/* Wyświetl punkty tylko dla administratorów */}
                {isAdmin() && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', gap: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.2}}>
                    <Suspense fallback={null}>
                      <StarIcon />
                    </Suspense>
                    <Typography variant="body1" fontWeight="bold">
                      EXP: {user.points || 0}
                    </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleOpenPointsDialog}
                      sx={{ ml: 2, borderRadius: 1 }}
                    >
                      Ustaw XP
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Szczegółowe informacje */}
        <Grid item xs={12} md={8}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Szczegółowe informacje
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                  {canEdit() && (
                    <Tooltip title="Edytuj dane użytkownika">
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={handleEditClick}
                        disabled={isEditing}
                        sx={{ minWidth: 120 }}
                      >
                        Edytuj
                      </Button>
                    </Tooltip>
                  )}
                  {canChangePassword() && (
                    <Tooltip title="Zmień swoje hasło">
                      <Button
                        variant="outlined"
                        startIcon={<LockIcon />}
                        onClick={handlePasswordDialogOpen}
                        sx={{ minWidth: 120 }}
                      >
                        Zmień hasło
                      </Button>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              {isEditing ? (
                <Box component="form" sx={{ mt: 2 }}>
                  <TextField
                    label="Imię i nazwisko"
                    name="fullname"
                    value={editedUser.fullname}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Nazwa użytkownika / Pseudonim"
                    name="username"
                    value={editedUser.username}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="role-label">Rola</InputLabel>
                    <Select
                      labelId="role-label"
                      name="role"
                      value={editedUser.role}
                      onChange={handleSelectChange}
                      label="Rola"
                      disabled={!canEditRole()}
                    >
                      <MenuItem value="user">Użytkownik</MenuItem>
                      <MenuItem value="moderator">Moderator</MenuItem>
                      <MenuItem value="admin">Administrator</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
                    <Button variant="outlined" onClick={handleCancelEdit}>
                      Anuluj
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleUpdateUser}
                      disabled={isUpdating}
                    >
                      {isUpdating ? <CircularProgress size={24} /> : 'Zapisz'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Imię i nazwisko
                      </Typography>
                      <Typography variant="body1">{user.fullname}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Nazwa użytkownika
                      </Typography>
                      <Typography variant="body1">{user.username}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Rola
                      </Typography>
                      <Chip label={user.role.toUpperCase()} color={getRoleColor(user.role)} size="small" />
                    </Grid>
                    {user.lastLogin && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Ostatnie logowanie
                        </Typography>
                        <Typography variant="body1">
                          {new Date(user.lastLogin).toLocaleString('pl-PL')}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Transfery w trakcie" />
          <Tab label="Historia transferów" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {tabValue === 0 && (
            <Card>
              <CardHeader
                title="Transfery w trakcie"
                subheader="Lista aktualnych transferów"
              />
              <CardContent>
                {transfersLoading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : transfers.length === 0 ? (
                  <Alert severity="info">
                    Brak transferów w trakcie
                  </Alert>
                ) : (
                  <List sx={{ p: 0 }}>
                    {transfers.map((transfer) => {
                      try {
                        const formattedDate = format(new Date(transfer.TransferDate), 'PPpp', { locale: pl });
                        return (
                          <ListItem 
                            key={transfer.ID}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 2,
                              p: 0,
                              '&:last-child': { mb: 0 }
                            }}
                          >
                            <ListItemButton 
                              onClick={() => navigate(`/transfers/${transfer.ID}`)}
                              sx={{
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: { xs: 'flex-start', sm: 'center' },
                                p: 2
                              }}
                            >
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                width: '100%',
                                mb: { xs: 1, sm: 0 }
                              }}>
                                <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                                  <LocalShipping />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                      Transfer #{transfer.ID}
                                    </Typography>
                                  }
                                  sx={{ m: 0 }}
                                />
                                <Chip
                                  label={
                                    transfer.Status === 'in_transit' ? 'Oczekujący' :
                                    transfer.Status === 'completed' ? 'Potwierdzony' : 'Anulowany'
                                  }
                                  color={
                                    transfer.Status === 'in_transit' ? 'warning' :
                                    transfer.Status === 'completed' ? 'success' : 'error'
                                  }
                                  size="small"
                                  sx={{ ml: { xs: 'auto', sm: 2 } }}
                                />
                              </Box>
                              
                              <Box sx={{ 
                                width: '100%', 
                                mt: { xs: 1, sm: 0 },
                                pl: { xs: 0, sm: 7 }
                              }}>
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                  <LocationOn fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    Z: {transfer.FromLocationName}
                                  </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                  <LocationOn fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    Do: {transfer.ToLocationName}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Utworzono: {formattedDate}
                                </Typography>
                              </Box>
                            </ListItemButton>
                          </ListItem>
                        );
                      } catch (err) {
                        console.error('Błąd podczas formatowania daty:', err);
                        return null;
                      }
                    })}
                  </List>
                )}
              </CardContent>
            </Card>
          )}
          {tabValue === 1 && (
            <Card>
              <CardHeader
                title="Historia transferów"
                subheader="Lista wszystkich transferów"
              />
              <CardContent>
                {transfersLoading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : transfers.length === 0 ? (
                  <Alert severity="info">
                    Brak transferów w historii
                  </Alert>
                ) : (
                  <List sx={{ p: 0 }}>
                    {transfers.map((transfer) => {
                      try {
                        const formattedDate = format(new Date(transfer.TransferDate), 'PPpp', { locale: pl });
                        return (
                          <ListItem 
                            key={transfer.ID}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 2,
                              p: 0,
                              '&:last-child': { mb: 0 }
                            }}
                          >
                            <ListItemButton 
                              onClick={() => navigate(`/transfers/${transfer.ID}`)}
                              sx={{
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: { xs: 'flex-start', sm: 'center' },
                                p: 2
                              }}
                            >
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                width: '100%',
                                mb: { xs: 1, sm: 0 }
                              }}>
                                <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                                  <LocalShipping />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                      Transfer #{transfer.ID}
                                    </Typography>
                                  }
                                  sx={{ m: 0 }}
                                />
                                <Chip
                                  label={
                                    transfer.Status === 'in_transit' ? 'Oczekujący' :
                                    transfer.Status === 'completed' ? 'Potwierdzony' : 'Anulowany'
                                  }
                                  color={
                                    transfer.Status === 'in_transit' ? 'warning' :
                                    transfer.Status === 'completed' ? 'success' : 'error'
                                  }
                                  size="small"
                                  sx={{ ml: { xs: 'auto', sm: 2 } }}
                                />
                              </Box>
                              
                              <Box sx={{ 
                                width: '100%', 
                                mt: { xs: 1, sm: 0 },
                                pl: { xs: 0, sm: 7 }
                              }}>
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                  <LocationOn fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    Z: {transfer.FromLocationName}
                                  </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                  <LocationOn fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    Do: {transfer.ToLocationName}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Utworzono: {formattedDate}
                                </Typography>
                              </Box>
                            </ListItemButton>
                          </ListItem>
                        );
                      } catch (err) {
                        console.error('Błąd podczas formatowania daty:', err);
                        return null;
                      }
                    })}
                  </List>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      <Dialog open={isPasswordDialogOpen} onClose={handlePasswordDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>Zmień hasło</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Wprowadź nowe hasło. Upewnij się, że jest silne i nieudostępniane innym osobom.
          </Typography>
          <TextField
            autoFocus
            label="Nowe hasło"
            name="newPassword"
            type="password"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            margin="normal"
            required
            fullWidth
            onKeyDown={e => { if (e.key === 'Enter') handlePasswordUpdate(); if (e.key === 'Escape') handlePasswordDialogClose(); }}
            inputProps={{ minLength: 6 }}
            disabled={isPasswordUpdating}
          />
          <TextField
            label="Potwierdź nowe hasło"
            name="confirmPassword"
            type="password"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            margin="normal"
            required
            fullWidth
            onKeyDown={e => { if (e.key === 'Enter') handlePasswordUpdate(); if (e.key === 'Escape') handlePasswordDialogClose(); }}
            inputProps={{ minLength: 6 }}
            disabled={isPasswordUpdating}
          />
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 1, p: 2 }}>
          <Button onClick={handlePasswordDialogClose} disabled={isPasswordUpdating} fullWidth={true}>
            Anuluj
          </Button>
          <Button
            onClick={handlePasswordUpdate}
            variant="contained"
            color="primary"
            disabled={isPasswordUpdating}
            fullWidth={true}
          >
            {isPasswordUpdating ? <CircularProgress size={24} /> : 'Zmień hasło'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isPointsDialogOpen} onClose={handleClosePointsDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Zarządzaj punktami użytkownika</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Podaj liczbę punktów do dodania lub odjęcia.
          </Typography>
          <TextField
            autoFocus
            label="Liczba punktów"
            type="number"
            value={pointsValue}
            onChange={handlePointsChange}
            fullWidth
            inputProps={{ step: 1 }}
            disabled={isPointsLoading}
          />
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            -100 oznacza odjęcie 100 punktów a 100 oznacza dodanie 100 punktów.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePointsDialog} disabled={isPointsLoading}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmitPoints}
            variant="contained"
            color="primary"
            disabled={isPointsLoading}
          >
            {isPointsLoading ? <CircularProgress size={20} /> : 'Zatwierdź'}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />
    </Box>
  );
};

export default UserDetailsPage; 