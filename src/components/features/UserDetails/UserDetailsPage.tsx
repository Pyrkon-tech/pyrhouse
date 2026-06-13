import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardHeader,
  SelectChangeEvent,
  Tabs,
  Tab,
} from '@mui/material';
import { jwtDecode } from 'jwt-decode';
import { AppSnackbar } from '../../ui/AppSnackbar';
import { useSnackbarMessage } from '../../../hooks/useSnackbarMessage';
import { getUserAPI, getUsersAPI, addUserPointsAPI, mergeDiscordAPI } from '../../../services/userService';
import { apiClient, ApiError } from '../../../services/apiClient';
import { discordAuthService } from '../../../services/discordAuthService';
import { googleAuthService } from '../../../services/googleAuthService';
import type { UserDetails, UserListItem, JwtPayload } from '../../../types/user.types';
import UserTransfersList, { UserTransfer } from './UserTransfersList';
import ProfileCard from './ProfileCard';
import UserInfoCard from './UserInfoCard';
import { PasswordDialog, PointsDialog, MergeDiscordDialog } from './dialogs';

const ArrowBackIcon = lazy(() => import('@mui/icons-material/ArrowBack'));

const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [transfers, setTransfers] = useState<UserTransfer[]>([]);
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
        const data = await apiClient.get<UserTransfer[]>(`/transfers/users/${id}?status=${status}`);
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

  const handleClosePointsDialog = () => {
    setIsPointsDialogOpen(false);
    setPointsValue('');
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
        <Grid item xs={12} md={4}>
          <ProfileCard
            user={user}
            isAdmin={isAdmin}
            isModerator={isModerator}
            isOwner={isOwner}
            hasDiscord={hasDiscord}
            hasGoogle={hasGoogle}
            onOpenPointsDialog={() => { setPointsValue(''); setIsPointsDialogOpen(true); }}
            onLinkDiscord={handleLinkDiscord}
            onLinkGoogle={handleLinkGoogle}
            onOpenMergeDialog={handleOpenMergeDialog}
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <UserInfoCard
            user={user}
            editedUser={editedUser}
            isEditing={isEditing}
            isUpdating={isUpdating}
            isAdmin={isAdmin}
            hasDiscord={hasDiscord}
            canEdit={canEdit}
            canChangePassword={canChangePassword}
            canEditRole={canEditRole}
            onEditClick={handleEditClick}
            onCancelEdit={handleCancelEdit}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onUpdateUser={handleUpdateUser}
            onOpenPasswordDialog={() => setIsPasswordDialogOpen(true)}
          />
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
              <UserTransfersList
                transfers={transfers}
                loading={transfersLoading}
                emptyMessage={tabValue === 0 ? 'Brak transferów w trakcie' : 'Brak transferów w historii'}
                onNavigate={(transferId) => navigate(`/transfers/${transferId}`)}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>
      <PasswordDialog
        open={isPasswordDialogOpen}
        updating={isPasswordUpdating}
        passwordData={passwordData}
        onChange={handlePasswordChange}
        onClose={handlePasswordDialogClose}
        onSubmit={handlePasswordUpdate}
      />
      <PointsDialog
        open={isPointsDialogOpen}
        loading={isPointsLoading}
        value={pointsValue}
        onChange={(e) => setPointsValue(e.target.value.replace(/[^-0-9]/g, ''))}
        onClose={handleClosePointsDialog}
        onSubmit={handleSubmitPoints}
      />
      <MergeDiscordDialog
        open={isMergeDialogOpen}
        merging={isMerging}
        ghostLoading={ghostLoading}
        ghostAccounts={ghostAccounts}
        selectedGhostId={selectedGhostId}
        targetUsername={user.username}
        onSelectGhost={setSelectedGhostId}
        onClose={handleCloseMergeDialog}
        onMerge={handleMerge}
      />
      <AppSnackbar open={snackbar.open} type={snackbar.type} message={snackbar.message} details={snackbar.details} onClose={closeSnackbar} autoHideDuration={snackbar.autoHideDuration} />
    </Box>
  );
};

export default UserDetailsPage;
