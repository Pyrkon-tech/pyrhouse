import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
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
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { LocalShipping, LocationOn } from '@mui/icons-material';
import LinkIcon from '@mui/icons-material/Link';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import MergeIcon from '@mui/icons-material/MergeType';
import { getUserAPI, getUsersAPI, addUserPointsAPI, mergeDiscordAPI } from '../../services/userService';
import { apiClient, ApiError } from '../../services/apiClient';
import { discordAuthService } from '../../services/discordAuthService';
import { googleAuthService } from '../../services/googleAuthService';
import { env } from '../../config/env';
import type { UserDetails, UserListItem, JwtPayload } from '../../types/user.types';

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
const BadgeIcon = lazy(() => import('@mui/icons-material/Badge'));
const StarIcon = lazy(() => import('@mui/icons-material/Star'));
const LockIcon = lazy(() => import('@mui/icons-material/Lock'));

const DISCORD_COLOR = '#5865F2';

const DiscordIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    sx={{ width: size, height: size, fill: DISCORD_COLOR, flexShrink: 0 }}
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
  </Box>
);

const STATUS_LABELS: Record<Transfer['Status'], { label: string; color: 'warning' | 'success' | 'error' }> = {
  in_transit: { label: 'Oczekujący', color: 'warning' },
  completed: { label: 'Potwierdzony', color: 'success' },
  cancelled: { label: 'Anulowany', color: 'error' },
};

const TransfersList: React.FC<{
  transfers: Transfer[];
  loading: boolean;
  emptyMessage: string;
  onNavigate: (id: number) => void;
}> = ({ transfers, loading, emptyMessage, onNavigate }) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (transfers.length === 0) {
    return <Alert severity="info">{emptyMessage}</Alert>;
  }

  return (
    <List sx={{ p: 0 }}>
      {transfers.map((transfer) => {
        let formattedDate: string;
        try {
          formattedDate = format(new Date(transfer.TransferDate), 'PPpp', { locale: pl });
        } catch {
          formattedDate = transfer.TransferDate;
        }

        const status = STATUS_LABELS[transfer.Status];

        return (
          <ListItem
            key={transfer.ID}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 2,
              p: 0,
              '&:last-child': { mb: 0 },
            }}
          >
            <ListItemButton
              onClick={() => onNavigate(transfer.ID)}
              sx={{
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: { xs: 1, sm: 0 } }}>
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
                <Chip label={status.label} color={status.color} size="small" sx={{ ml: { xs: 'auto', sm: 2 } }} />
              </Box>
              <Box sx={{ width: '100%', mt: { xs: 1, sm: 0 }, pl: { xs: 0, sm: 7 } }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2">Z: {transfer.FromLocationName}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2">Do: {transfer.ToLocationName}</Typography>
                </Box>
                <Typography variant="caption" display="block" color="text.secondary">
                  Utworzono: {formattedDate}
                </Typography>
              </Box>
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};

const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const canGoBack = location.state?.from === '/users';

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<UserDetails>>({});
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

  const currentUser = useMemo<JwtPayload | null>(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const isModerator = currentUser?.role === 'moderator';
  const isOwner = currentUser ? Number(currentUser.userID) === Number(id) : false;
  const canEdit = isAdmin || isOwner;
  const canChangePassword = isAdmin || isOwner;
  const canEditRole = isAdmin;
  const hasDiscord = !!(user?.discord_id || user?.discord_username);
  const hasGoogle = !!(user?.google_id);

  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [ghostAccounts, setGhostAccounts] = useState<UserListItem[]>([]);
  const [ghostLoading, setGhostLoading] = useState(false);
  const [selectedGhostId, setSelectedGhostId] = useState<number | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) return;
      try {
        const data = await getUserAPI(Number(id));
        setUser(data);
        setEditedUser(data);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Wystąpił nieoczekiwany błąd';
        showSnackbar('error', 'Błąd podczas ładowania danych użytkownika', message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [id, showSnackbar]);

  useEffect(() => {
    const fetchTransfers = async () => {
      if (!id) return;
      setTransfersLoading(true);
      try {
        const status = tabValue === 0 ? 'in_transit' : 'completed';
        const data = await apiClient.get<Transfer[]>(`/transfers/users/${id}?status=${status}`);
        setTransfers(data);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 400 || err.status === 401)) {
          showSnackbar('error', 'Nie udało się pobrać transferów. Spróbuj odświeżyć stronę.');
        } else {
          const message = err instanceof Error ? err.message : 'Wystąpił nieznany błąd';
          showSnackbar('error', 'Błąd podczas pobierania transferów', message);
        }
        setTransfers([]);
      } finally {
        setTransfersLoading(false);
      }
    };
    fetchTransfers();
  }, [id, tabValue, showSnackbar]);

  const getRoleColor = (role: string): 'error' | 'warning' | 'info' => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'dispatcher': return 'info';
      default: return 'info';
    }
  };

  const handleEditClick = () => setIsEditing(true);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedUser(user ?? {});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateUser = async () => {
    if (!user) return;
    const changedFields: Record<string, unknown> = {};
    for (const key of Object.keys(editedUser) as (keyof UserDetails)[]) {
      if (editedUser[key] !== user[key]) {
        changedFields[key] = editedUser[key];
      }
    }
    if (Object.keys(changedFields).length === 0) {
      showSnackbar('warning', 'Nie wprowadzono żadnych zmian.');
      setIsEditing(false);
      return;
    }
    setIsUpdating(true);
    try {
      const updatedUser = await apiClient.patch<UserDetails>(`/users/${id}`, changedFields);
      setUser(updatedUser);
      setEditedUser(updatedUser);
      setIsEditing(false);
      showSnackbar('success', 'Dane użytkownika zostały zaktualizowane pomyślnie!');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Wystąpił nieoczekiwany błąd';
      showSnackbar('error', 'Nie udało się zaktualizować danych użytkownika', message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordDialogOpen = () => setIsPasswordDialogOpen(true);
  const handlePasswordDialogClose = () => {
    setIsPasswordDialogOpen(false);
    setPasswordData({ newPassword: '', confirmPassword: '' });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showSnackbar('error', 'Hasła nie są identyczne');
      return;
    }
    setIsPasswordUpdating(true);
    try {
      await apiClient.patch(`/users/${id}`, { password: passwordData.newPassword });
      handlePasswordDialogClose();
      showSnackbar('success', 'Hasło zostało zmienione pomyślnie!');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Wystąpił nieoczekiwany błąd';
      showSnackbar('error', 'Nie udało się zmienić hasła', message);
    } finally {
      setIsPasswordUpdating(false);
    }
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
      setUser(prev => prev ? { ...prev, points: result.points ?? prev.points } : prev);
      showSnackbar('success', `Punkty zostały zaktualizowane. Aktualny stan: ${result.points}`);
      handleClosePointsDialog();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Błąd podczas aktualizacji punktów';
      showSnackbar('error', message);
    } finally {
      setIsPointsLoading(false);
    }
  };

  const handleLinkDiscord = () => {
    if (!id) return;
    try {
      discordAuthService.initiateLinking(Number(id));
    } catch (err) {
      showSnackbar('error', err instanceof Error ? err.message : 'Nie udało się zainicjować łączenia z Discord');
    }
  };

  const handleLinkGoogle = () => {
    if (!id) return;
    googleAuthService.initiateLinking(Number(id));
  };

  const handleOpenMergeDialog = async () => {
    setIsMergeDialogOpen(true);
    setSelectedGhostId(null);
    setGhostLoading(true);
    try {
      const allUsers = await getUsersAPI();
      const ghosts = allUsers.filter(
        u => u.auth_provider === 'discord' && u.discord_username && u.id !== Number(id)
      );
      setGhostAccounts(ghosts);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Nie udało się pobrać listy użytkowników';
      showSnackbar('error', message);
    } finally {
      setGhostLoading(false);
    }
  };

  const handleCloseMergeDialog = () => {
    setIsMergeDialogOpen(false);
    setSelectedGhostId(null);
  };

  const handleMerge = async () => {
    if (!id || !selectedGhostId) return;
    setIsMerging(true);
    try {
      const result = await mergeDiscordAPI(Number(id), selectedGhostId);
      showSnackbar('success', result.message);
      handleCloseMergeDialog();
      const refreshed = await getUserAPI(Number(id));
      setUser(refreshed);
      setEditedUser(refreshed);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.status) {
          case 400:
            showSnackbar('error', 'Nieprawidłowe dane', err.message);
            break;
          case 403:
            showSnackbar('error', 'Brak uprawnień do scalania kont');
            break;
          case 404:
            showSnackbar('error', 'Nie znaleziono konta', err.message);
            break;
          case 409:
            showSnackbar('error', 'To konto już ma podłączony Discord');
            break;
          default:
            showSnackbar('error', err.message);
        }
      } else {
        showSnackbar('error', 'Wystąpił błąd podczas scalania kont');
      }
    } finally {
      setIsMerging(false);
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
        <Typography variant="h6" color="error">Użytkownik nie został znaleziony</Typography>
        <AppSnackbar open={snackbar.open} type={snackbar.type} message={snackbar.message} details={snackbar.details} onClose={closeSnackbar} autoHideDuration={snackbar.autoHideDuration} />
      </Box>
    );
  }

  const displayName = user.fullname || user.username;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {canGoBack && (
          <Suspense fallback={null}>
            <ArrowBackIcon sx={{ cursor: 'pointer' }} onClick={() => navigate('/users')} />
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
                src={user.avatar_url || undefined}
                sx={{ width: 120, height: 120, mb: 2, bgcolor: theme.palette.primary.main, fontSize: '3rem' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Avatar>

              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                {displayName}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip
                  label={user.role.toUpperCase()}
                  color={getRoleColor(user.role)}
                  icon={<Suspense fallback={null}><BadgeIcon sx={{ ml: 1 }} /></Suspense>}
                />
                {hasDiscord && (
                  <Chip
                    label="Discord"
                    size="small"
                    sx={{ bgcolor: `${DISCORD_COLOR}14`, color: DISCORD_COLOR, fontWeight: 600 }}
                    icon={<DiscordIcon size={14} />}
                  />
                )}
              </Box>

              <Divider sx={{ width: '100%', my: 1 }} />

              <Box sx={{ width: '100%' }}>
                {/* Punkty — admin only */}
                {isAdmin && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Suspense fallback={null}><StarIcon /></Suspense>
                      <Typography variant="body1" fontWeight="bold">
                        EXP: {user.points ?? 0}
                      </Typography>
                    </Box>
                    <Button variant="outlined" size="small" onClick={handleOpenPointsDialog} sx={{ borderRadius: 1 }}>
                      Ustaw XP
                    </Button>
                  </Box>
                )}

                {/* Discord — status + link */}
                <Box sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: hasDiscord ? DISCORD_COLOR : 'divider',
                  bgcolor: hasDiscord ? `${DISCORD_COLOR}08` : 'background.paper',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DiscordIcon />
                    <Typography variant="body2" fontWeight="bold" sx={{ color: DISCORD_COLOR }}>
                      Discord
                    </Typography>
                    <Chip
                      label={hasDiscord ? user.discord_username : 'Niepołączono'}
                      size="small"
                      sx={{
                        ml: 'auto',
                        ...(hasDiscord
                          ? { bgcolor: DISCORD_COLOR, color: '#fff' }
                          : {}),
                      }}
                      variant={hasDiscord ? 'filled' : 'outlined'}
                    />
                  </Box>

                  {!hasDiscord && (isAdmin || isModerator) && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                      {isAdmin && env.HAS_DISCORD && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<LinkIcon />}
                          onClick={handleLinkDiscord}
                          sx={{
                            borderColor: DISCORD_COLOR,
                            color: DISCORD_COLOR,
                            '&:hover': { borderColor: '#4752C4', bgcolor: `${DISCORD_COLOR}14` },
                          }}
                          fullWidth
                        >
                          Połącz z Discord
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<MergeIcon />}
                        onClick={handleOpenMergeDialog}
                        sx={{
                          borderColor: 'warning.main',
                          color: 'warning.dark',
                          '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' },
                        }}
                        fullWidth
                      >
                        Scal konta Discord
                      </Button>
                    </Box>
                  )}
                </Box>

                {/* Google — status + link */}
                {(hasGoogle || isOwner || isAdmin || isModerator) && (
                  <Box sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: hasGoogle ? '#4285F4' : 'divider',
                    bgcolor: hasGoogle ? 'rgba(66,133,244,0.05)' : 'background.paper',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, flexShrink: 0 }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </Box>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: '#4285F4' }}>
                        Google
                      </Typography>
                      <Chip
                        label={hasGoogle ? (user.google_email ?? 'Połączono') : 'Niepołączono'}
                        size="small"
                        sx={{
                          ml: 'auto',
                          ...(hasGoogle
                            ? { bgcolor: '#4285F4', color: '#fff' }
                            : {}),
                        }}
                        variant={hasGoogle ? 'filled' : 'outlined'}
                      />
                    </Box>

                    {!hasGoogle && isOwner && (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<LinkIcon />}
                          onClick={handleLinkGoogle}
                          sx={{
                            borderColor: '#4285F4',
                            color: '#4285F4',
                            '&:hover': { borderColor: '#1a73e8', bgcolor: 'rgba(66,133,244,0.08)' },
                          }}
                          fullWidth
                        >
                          Połącz z Google (@pyrkon.pl)
                        </Button>
                      </Box>
                    )}
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
                <Typography variant="h6">Szczegółowe informacje</Typography>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                  {canEdit && (
                    <Tooltip title="Edytuj dane użytkownika">
                      <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEditClick} disabled={isEditing} sx={{ minWidth: 120 }}>
                        Edytuj
                      </Button>
                    </Tooltip>
                  )}
                  {canChangePassword && (
                    <Tooltip title="Zmień hasło">
                      <Button variant="outlined" startIcon={<LockIcon />} onClick={handlePasswordDialogOpen} sx={{ minWidth: 120 }}>
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
                    value={editedUser.fullname ?? ''}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Nazwa użytkownika / Pseudonim"
                    name="username"
                    value={editedUser.username ?? ''}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="role-label">Rola</InputLabel>
                    <Select
                      labelId="role-label"
                      name="role"
                      value={editedUser.role ?? 'user'}
                      onChange={handleSelectChange}
                      label="Rola"
                      disabled={!canEditRole}
                    >
                      <MenuItem value="user">Użytkownik</MenuItem>
                      <MenuItem value="dispatcher">Dyspozytor</MenuItem>
                      <MenuItem value="moderator">Moderator</MenuItem>
                      <MenuItem value="admin">Administrator</MenuItem>
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
                    <Button variant="outlined" onClick={handleCancelEdit}>Anuluj</Button>
                    <Button variant="contained" color="primary" onClick={handleUpdateUser} disabled={isUpdating}>
                      {isUpdating ? <CircularProgress size={24} /> : 'Zapisz'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Imię i nazwisko</Typography>
                    <Typography
                      variant="body1"
                      sx={user.fullname ? {} : { color: 'text.disabled', fontStyle: 'italic' }}
                    >
                      {user.fullname || 'Nie ustawiono'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Nazwa użytkownika</Typography>
                    <Typography variant="body1">{user.username}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Rola</Typography>
                    <Chip label={user.role.toUpperCase()} color={getRoleColor(user.role)} size="small" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Status konta</Typography>
                    <Chip label={user.active ? 'Aktywne' : 'Nieaktywne'} color={user.active ? 'success' : 'default'} size="small" variant="outlined" />
                  </Grid>

                  {/* Discord info w szczegółach */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Discord</Typography>
                    {hasDiscord ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DiscordIcon size={16} />
                        <Typography variant="body1" sx={{ color: DISCORD_COLOR }}>
                          {user.discord_username || 'Połączono'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body1" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                        Niepołączono
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Metoda logowania</Typography>
                    <Typography variant="body1">
                      {user.auth_provider === 'discord' ? 'Discord OAuth' : 'Hasło'}
                    </Typography>
                  </Grid>

                  {isAdmin && user.discord_id && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">Discord ID</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {user.discord_id}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transfery */}
      <Box sx={{ mt: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Transfery w trakcie" />
          <Tab label="Historia transferów" />
        </Tabs>
        <Box sx={{ mt: 2 }}>
          <Card>
            <CardHeader
              title={tabValue === 0 ? 'Transfery w trakcie' : 'Historia transferów'}
              subheader={tabValue === 0 ? 'Lista aktualnych transferów' : 'Lista wszystkich transferów'}
            />
            <CardContent>
              <TransfersList
                transfers={transfers}
                loading={transfersLoading}
                emptyMessage={tabValue === 0 ? 'Brak transferów w trakcie' : 'Brak transferów w historii'}
                onNavigate={(transferId) => navigate(`/transfers/${transferId}`)}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog: hasło */}
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
          <Button onClick={handlePasswordDialogClose} disabled={isPasswordUpdating} fullWidth>Anuluj</Button>
          <Button onClick={handlePasswordUpdate} variant="contained" color="primary" disabled={isPasswordUpdating} fullWidth>
            {isPasswordUpdating ? <CircularProgress size={24} /> : 'Zmień hasło'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: punkty */}
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
          <Button onClick={handleClosePointsDialog} disabled={isPointsLoading}>Anuluj</Button>
          <Button onClick={handleSubmitPoints} variant="contained" color="primary" disabled={isPointsLoading}>
            {isPointsLoading ? <CircularProgress size={20} /> : 'Zatwierdź'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: scalanie kont Discord */}
      <Dialog open={isMergeDialogOpen} onClose={handleCloseMergeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Scal konta Discord</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Wybierz konto Discord (ghost), z którego chcesz przenieść dane na to konto.
            Ghost konto zostanie usunięte lub dezaktywowane.
          </Alert>

          {ghostLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : ghostAccounts.length === 0 ? (
            <Alert severity="warning">
              Nie znaleziono kont Discord do scalenia.
            </Alert>
          ) : (
            <List sx={{ p: 0 }}>
              {ghostAccounts.map((ghost) => (
                <ListItem
                  key={ghost.id}
                  sx={{
                    border: '1px solid',
                    borderColor: selectedGhostId === ghost.id ? DISCORD_COLOR : 'divider',
                    borderRadius: 1,
                    mb: 1,
                    p: 0,
                    bgcolor: selectedGhostId === ghost.id ? `${DISCORD_COLOR}08` : 'transparent',
                    '&:last-child': { mb: 0 },
                  }}
                >
                  <ListItemButton
                    onClick={() => setSelectedGhostId(ghost.id)}
                    selected={selectedGhostId === ghost.id}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {ghost.username}
                          </Typography>
                          {ghost.discord_username && (
                            <Chip
                              label={ghost.discord_username}
                              size="small"
                              sx={{ bgcolor: `${DISCORD_COLOR}14`, color: DISCORD_COLOR, fontWeight: 500 }}
                            />
                          )}
                          {!ghost.active && (
                            <Chip label="Ghost" size="small" sx={{ bgcolor: 'rgba(255, 152, 0, 0.12)', color: 'warning.dark', fontWeight: 600, fontSize: '0.7rem' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          ID: {ghost.id} {ghost.fullname ? `· ${ghost.fullname}` : ''}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          {selectedGhostId && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Discord z konta #{selectedGhostId} zostanie przeniesiony na to konto ({user?.username}).
              Konto źródłowe zostanie usunięte lub dezaktywowane.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseMergeDialog} disabled={isMerging}>
            Anuluj
          </Button>
          <Button
            onClick={handleMerge}
            variant="contained"
            color="warning"
            disabled={!selectedGhostId || isMerging}
            startIcon={isMerging ? <CircularProgress size={16} /> : <MergeIcon />}
          >
            {isMerging ? 'Scalanie...' : 'Scal konta'}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar open={snackbar.open} type={snackbar.type} message={snackbar.message} details={snackbar.details} onClose={closeSnackbar} autoHideDuration={snackbar.autoHideDuration} />
    </Box>
  );
};

export default UserDetailsPage;
