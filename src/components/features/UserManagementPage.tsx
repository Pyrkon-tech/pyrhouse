import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Typography,
  CircularProgress,
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../config/api';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { AppSnackbar } from '../ui/AppSnackbar';
import { jwtDecode } from 'jwt-decode';
const AddIcon = lazy(() => import('@mui/icons-material/Add'));
const PersonIcon = lazy(() => import('@mui/icons-material/Person'));
const AdminPanelSettingsIcon = lazy(() => import('@mui/icons-material/AdminPanelSettings'));
const SecurityIcon = lazy(() => import('@mui/icons-material/Security'));
const SearchIcon = lazy(() => import('@mui/icons-material/Search'));

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullname: '',
    role: 'user', // Default role
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
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/users'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      showSnackbar('error', 'Wystąpił błąd', err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddUserModal = () => {
    setAddUserModalOpen(true);
    setNewUser({ username: '', password: '', fullname: '', role: 'user' });
  };

  const handleCloseAddUserModal = () => {
    setAddUserModalOpen(false);
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.fullname) {
      setError('Wszystkie pola są wymagane do utworzenia użytkownika.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(JSON.stringify(errorResponse, null, 2));
      }

      const data = await response.json();
      console.log(data.message); // Success message
      setAddUserModalOpen(false);
      fetchUsers(); // Refresh the user list
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      showSnackbar('error', 'Wystąpił błąd', err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
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
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/users/${user.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!response.ok) throw new Error('Nie udało się zmienić statusu aktywności');
      showSnackbar('success', `Użytkownik został ${user.active ? 'dezaktywowany' : 'aktywowany'}`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !user.active } : u));
    } catch (err: any) {
      showSnackbar('error', err.message || 'Błąd podczas zmiany aktywności');
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
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'action.hover',
              },
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
                      disabled={!isAdmin && !isModerator || user.id === currentUserId || loadingIds.includes(user.id)}
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
    <TableContainer 
      component={Paper} 
      sx={{ 
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'primary.light' }}>
            {["ID", "Ksywa", "Imię i Nazwisko", "Rola", "Discord", "Aktywny"].map((field) => (
              <TableCell 
                key={field} 
                sx={{ 
                  fontWeight: 600,
                  color: 'primary.contrastText',
                  py: 2
                }}
              >
                {field}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow 
              key={user.id}
              onClick={() => navigate(`/users/${user.id}`, { state: { from: '/users' } })}
              sx={{ 
                cursor: 'pointer', 
                '&:hover': { 
                  bgcolor: 'action.hover',
                },
                transition: 'background-color 0.2s ease'
              }}
            >
              <TableCell>
                <Typography component="div" sx={{ fontWeight: 500 }}>
                  {user.id}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography component="div">
                  {user.username}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography component="div" sx={{ color: user.fullname ? 'text.primary' : 'text.disabled', fontStyle: user.fullname ? 'normal' : 'italic' }}>
                  {user.fullname || '—'}
                </Typography>
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
                        disabled={!isAdmin && !isModerator || user.id === currentUserId || loadingIds.includes(user.id)}
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
      </Table>
    </TableContainer>
  );

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
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
    <Box sx={{ 
      margin: '0 auto', 
      padding: { xs: 2, sm: 3, md: 3 },
      maxWidth: '1400px',
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        marginBottom: 3,
        gap: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 2
      }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            color: 'primary.main',
            mb: { xs: 1, sm: 0 }
          }}
        >
          Zarządzanie Użytkownikami
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Suspense fallback={null}><AddIcon /></Suspense>}
          onClick={handleOpenAddUserModal}
          sx={{
            borderRadius: 1,
            px: 3
          }}
        >
          Dodaj Użytkownika
        </Button>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        gap: 2, 
        marginBottom: 3,
        backgroundColor: 'background.default',
        p: 2,
        borderRadius: 1
      }}>
        <TextField
          label="Szukaj użytkowników"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          InputProps={{
            sx: { 
              borderRadius: 1,
              height: '36px',
              '& input': {
                height: '36px',
                padding: '0 12px',
              }
            },
            startAdornment: (
              <Suspense fallback={null}><SearchIcon sx={{ color: 'text.secondary', mr: 1 }} /></Suspense>
            )
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 5,
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">
            Ładowanie użytkowników...
          </Typography>
        </Box>
      ) : filteredUsers.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          p: 5,
          backgroundColor: 'background.default',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider'
        }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Brak użytkowników
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Dodaj nowego użytkownika'}
          </Typography>
          {searchQuery && (
            <Button 
              variant="outlined" 
              onClick={() => setSearchQuery('')}
              sx={{ 
                borderRadius: 1,
                px: 3
              }}
            >
              Wyczyść wyszukiwanie
            </Button>
          )}
        </Box>
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}

      <Dialog 
        open={addUserModalOpen} 
        onClose={handleCloseAddUserModal}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: { xs: '90%', sm: 400 }
          }
        }}
      >
        <DialogTitle>
          Dodaj Nowego Użytkownika
        </DialogTitle>
        <DialogContent>
          {error && (
            <AppSnackbar
              open={snackbar.open}
              type={snackbar.type}
              message={snackbar.message}
              details={snackbar.details}
              onClose={closeSnackbar}
              autoHideDuration={snackbar.autoHideDuration}
            />
          )}

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
          <Button 
            onClick={handleCloseAddUserModal}
            sx={{ borderRadius: 1 }}
          >
            Anuluj
          </Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained" 
            color="primary"
            disabled={loading}
            sx={{ borderRadius: 1 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Dodaj'}
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
