import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Box,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
  Switch,
  Tooltip,
  TextField,
} from '@mui/material';
import { DataTable } from '../ui/DataTable';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../../services/apiClient';
import { useDialogState } from '../../hooks/useDialogState';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { Button } from '../ui/Button';
import { AppSnackbar, PageHeader, SearchBar, PageLoader, EmptyState } from '../ui';
import { jwtDecode } from 'jwt-decode';
const AddIcon = lazy(() => import('@mui/icons-material/Add'));
const PersonIcon = lazy(() => import('@mui/icons-material/Person'));
const AdminPanelSettingsIcon = lazy(() => import('@mui/icons-material/AdminPanelSettings'));
const SecurityIcon = lazy(() => import('@mui/icons-material/Security'));

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dialogs = useDialogState<any>();
  const [addLoading, setAddLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullname: '',
    role: 'user',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const [loadingIds, setLoadingIds] = useState<number[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any[]>('/users');
      setUsers(data);
    } catch (err: any) {
      showSnackbar('error', 'Błąd podczas pobierania użytkowników', err instanceof ApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddUserModal = () => {
    dialogs.openAdd();
    setNewUser({ username: '', password: '', fullname: '', role: 'user' });
  };

  const handleCloseAddUserModal = () => {
    dialogs.closeAdd();
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.fullname) {
      showSnackbar('warning', 'Wszystkie pola są wymagane do utworzenia użytkownika.');
      return;
    }

    setAddLoading(true);
    try {
      await apiClient.post('/users', newUser);
      dialogs.closeAdd();
      fetchUsers();
    } catch (err: any) {
      showSnackbar('error', 'Błąd podczas dodawania użytkownika', err instanceof ApiError ? err.message : String(err));
    } finally {
      setAddLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminPanelSettingsIcon fontSize="small" />;
      case 'moderator':
        return <SecurityIcon fontSize="small" />;
      default:
        return <PersonIcon fontSize="small" />;
    }
  };

  const getRoleColor = (role: string): 'error' | 'warning' | 'info' => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      default: return 'info';
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      (user.fullname ?? '').toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      (user.discord_username ?? '').toLowerCase().includes(query)
    );
  });

  const getCurrentUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const decoded = jwtDecode(token) as any;
      return decoded.userID;
    } catch {
      return null;
    }
  };

  const getCurrentUserRole = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const decoded = jwtDecode(token) as any;
      return decoded.role;
    } catch {
      return null;
    }
  };

  const isAdmin = getCurrentUserRole() === 'admin';
  const isModerator = getCurrentUserRole() === 'moderator';
  const currentUserId = getCurrentUserId();

  const handleToggleActive = async (user: any) => {
    if (!isAdmin && !isModerator) return;
    if (isModerator && user.role !== 'user') {
      showSnackbar('warning', 'Moderator może zmieniać status tylko użytkownikom z rolą "user"');
      return;
    }
    if (user.id === currentUserId) {
      showSnackbar('warning', 'Nie możesz dezaktywować własnego konta!');
      return;
    }
    setLoadingIds(ids => [...ids, user.id]);
    try {
      await apiClient.patch(`/users/${user.id}`, { active: !user.active });
      showSnackbar('success', `Użytkownik został ${user.active ? 'dezaktywowany' : 'aktywowany'}`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !user.active } : u));
    } catch (err: any) {
      showSnackbar('error', err instanceof ApiError ? err.message : 'Błąd podczas zmiany aktywności');
    } finally {
      setLoadingIds(ids => ids.filter(id => id !== user.id));
    }
  };

  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {filteredUsers.map((user) => (
        <Grid item xs={12} key={user.id}>
          <Card
            onClick={() => navigate(`/users/${user.id}`, { state: { from: '/users' } })}
            sx={{
              borderRadius: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 0.2s ease'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
                  ID: {user.id}
                </Typography>
                <Chip
                  icon={getRoleIcon(user.role)}
                  label={user.role}
                  color={getRoleColor(user.role)}
                  size="small"
                />
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Nazwa użytkownika / Pseudonim:</Typography>
                  <Typography variant="body2">{user.username}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Imię i nazwisko:</Typography>
                  <Typography variant="body2" sx={{ color: user.fullname ? 'text.primary' : 'text.disabled', fontStyle: user.fullname ? 'normal' : 'italic' }}>
                    {user.fullname || '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Discord:</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {(user.discord_username || user.auth_provider === 'discord') ? (
                      <Chip
                        label={user.discord_username || 'Połączono'}
                        size="small"
                        sx={{ bgcolor: 'rgba(88, 101, 242, 0.12)', color: '#5865F2', fontWeight: 500 }}
                      />
                    ) : (
                      <Chip label="Brak" size="small" variant="outlined" sx={{ color: 'text.disabled', borderColor: 'divider' }} />
                    )}
                    {user.auth_provider === 'discord' && !user.active && (
                      <Chip label="Ghost" size="small" sx={{ bgcolor: 'rgba(255, 152, 0, 0.12)', color: 'warning.dark', fontWeight: 600, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Aktywny:</Typography>
                  {isAdmin || isModerator ? (
                    <Switch
                      checked={user.active}
                      color={user.active ? 'primary' : 'default'}
                      disabled={user.id === currentUserId || loadingIds.includes(user.id)}
                      onClick={e => e.stopPropagation()}
                      onChange={() => handleToggleActive(user)}
                      inputProps={{ 'aria-label': 'toggle active' }}
                    />
                  ) : (
                    <Chip
                      label={user.active ? 'Aktywny' : 'Nieaktywny'}
                      color={user.active ? 'primary' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderTable = () => (
    <DataTable  size="medium">
      <TableHead>
        <TableRow>
          {["ID", "Ksywa", "Imię i Nazwisko", "Rola", "Discord", "Aktywny"].map((field) => (
            <TableCell key={field}>{field}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredUsers.map((user) => (
          <TableRow
            key={user.id}
            onClick={() => navigate(`/users/${user.id}`, { state: { from: '/users' } })}
            sx={{ cursor: 'pointer' }}
          >
            <TableCell sx={{ fontWeight: 500 }}>{user.id}</TableCell>
            <TableCell>{user.username}</TableCell>
            <TableCell sx={{ color: user.fullname ? 'text.primary' : 'text.disabled', fontStyle: user.fullname ? 'normal' : 'italic' }}>
              {user.fullname || '—'}
            </TableCell>
            <TableCell>
              <Chip
                icon={getRoleIcon(user.role)}
                label={user.role}
                color={getRoleColor(user.role)}
                size="small"
              />
            </TableCell>
            <TableCell>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                {(user.discord_username || user.auth_provider === 'discord') ? (
                  <Tooltip title={user.discord_username || 'Konto Discord'}>
                    <Chip
                      label={user.discord_username || 'Discord'}
                      size="small"
                      sx={{ bgcolor: 'rgba(88, 101, 242, 0.12)', color: '#5865F2', fontWeight: 500, maxWidth: 160 }}
                    />
                  </Tooltip>
                ) : (
                  <Chip label="Brak" size="small" variant="outlined" sx={{ color: 'text.disabled', borderColor: 'divider' }} />
                )}
                {user.auth_provider === 'discord' && !user.active && (
                  <Tooltip title="Ghost konto — do scalenia z istniejącym kontem">
                    <Chip label="Ghost" size="small" sx={{ bgcolor: 'rgba(255, 152, 0, 0.12)', color: 'warning.dark', fontWeight: 600, fontSize: '0.7rem' }} />
                  </Tooltip>
                )}
              </Box>
            </TableCell>
            <TableCell>
              {isAdmin || isModerator ? (
                <Tooltip title={user.active ? 'Aktywny' : 'Nieaktywny'}>
                  <span>
                    <Switch
                      checked={user.active}
                      color={user.active ? 'primary' : 'default'}
                      disabled={user.id === currentUserId || loadingIds.includes(user.id)}
                      onClick={e => e.stopPropagation()}
                      onChange={() => handleToggleActive(user)}
                      inputProps={{ 'aria-label': 'toggle active' }}
                    />
                  </span>
                </Tooltip>
              ) : (
                <Chip
                  label={user.active ? 'Aktywny' : 'Nieaktywny'}
                  color={user.active ? 'primary' : 'default'}
                  size="small"
                  variant="outlined"
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );

  return (
    <Box sx={{
      margin: '0 auto',
      padding: { xs: 2, sm: 3, md: 3 },
      maxWidth: '1400px',
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      <PageHeader
        title="Zarządzanie Użytkownikami"
        actions={
          <Button
            variant="primary"
            leftIcon={<Suspense fallback={null}><AddIcon /></Suspense>}
            onClick={handleOpenAddUserModal}
          >
            Dodaj Użytkownika
          </Button>
        }
      />

      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Szukaj użytkowników..."
          label="Szukaj użytkowników"
          width="100%"
        />
      </Box>

      {loading ? (
        <PageLoader message="Ładowanie użytkowników..." />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          message="Brak użytkowników"
          description={searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Dodaj nowego użytkownika'}
          action={searchQuery ? { label: 'Wyczyść wyszukiwanie', onClick: () => setSearchQuery('') } : undefined}
        />
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}

      <Dialog
        open={dialogs.addOpen}
        onClose={handleCloseAddUserModal}
        PaperProps={{ sx: { borderRadius: 2, minWidth: { xs: '90%', sm: 400 } } }}
      >
        <DialogTitle>Dodaj Nowego Użytkownika</DialogTitle>
        <DialogContent>
          <TextField
            label="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            label="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Full Name"
            value={newUser.fullname}
            onChange={(e) => setNewUser({ ...newUser, fullname: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="moderator">Moderator</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="ghost" onClick={handleCloseAddUserModal}>Anuluj</Button>
          <Button variant="primary" onClick={handleAddUser} loading={addLoading}>
            Dodaj
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

export default UserManagementPage;
