import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
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
  Menu,
  Checkbox,
  ListItemText,
  Divider as MenuDivider,
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
  Popover,
  Autocomplete,
} from '@mui/material';
import { DataTable } from '../ui/DataTable';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../../services/apiClient';
import { useDialogState } from '../../hooks/useDialogState';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { Button } from '../ui/Button';
import { AppSnackbar, PageHeader, SearchBar, PageLoader, EmptyState } from '../ui';
import { jwtDecode } from 'jwt-decode';
import { getVolunteersAPI, updateVolunteerAPI } from '../../services/scheduleService';
import type { ScheduleVolunteer } from '../../types/schedule.types';
const AddIcon = lazy(() => import('@mui/icons-material/Add'));
const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const LinkIcon = lazy(() => import('@mui/icons-material/Link'));
const PersonIcon = lazy(() => import('@mui/icons-material/Person'));
const AdminPanelSettingsIcon = lazy(() => import('@mui/icons-material/AdminPanelSettings'));
const SecurityIcon = lazy(() => import('@mui/icons-material/Security'));
const SupportAgentIcon = lazy(() => import('@mui/icons-material/SupportAgent'));
const FilterListIcon = lazy(() => import('@mui/icons-material/FilterList'));

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
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [roleMenuAnchor, setRoleMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeMenuAnchor, setActiveMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [volunteers, setVolunteers] = useState<ScheduleVolunteer[]>([]);
  const [linkPopover, setLinkPopover] = useState<{ anchorEl: HTMLElement; user: any } | null>(null);
  const [linkSavingId, setLinkSavingId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any[]>('/users');
      setUsers(data);
    } catch (err: any) {
      showSnackbar('error', 'Błąd podczas pobierania użytkowników', err instanceof ApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    // Volunteer linkage lives on the volunteer side (ScheduleVolunteer.user_id),
    // so the users list needs this extra fetch to know who is linked.
    getVolunteersAPI()
      .then(setVolunteers)
      .catch(() => { /* schedule module unavailable — column shows nothing to link */ });
  }, []);

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
      case 'dispatcher':
        return <SupportAgentIcon fontSize="small" />;
      default:
        return <PersonIcon fontSize="small" />;
    }
  };

  const getRoleColor = (role: string): 'error' | 'warning' | 'info' => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'dispatcher': return 'info';
      default: return 'info';
    }
  };

  const toggleRole = (role: string) => {
    setRoleFilter(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const hasActiveFilters = roleFilter.length > 0 || activeFilter !== 'all';

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || (
      user.username.toLowerCase().includes(query) ||
      (user.fullname ?? '').toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      (user.discord_username ?? '').toLowerCase().includes(query)
    );
    const matchesRole = roleFilter.length === 0 || roleFilter.includes(user.role);
    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && user.active) ||
      (activeFilter === 'inactive' && !user.active);
    return matchesSearch && matchesRole && matchesActive;
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
  const canManageVolunteers = isAdmin || isModerator;

  const volunteersByUserId = useMemo(() => {
    const map = new Map<number, ScheduleVolunteer>();
    volunteers.forEach((v) => {
      if (v.user_id != null) map.set(v.user_id, v);
    });
    return map;
  }, [volunteers]);

  const unlinkedVolunteers = useMemo(
    () => volunteers
      .filter((v) => v.user_id == null)
      .sort((a, b) => a.nickname.localeCompare(b.nickname, 'pl')),
    [volunteers]
  );

  const handleLinkVolunteer = async (volunteer: ScheduleVolunteer, user: any) => {
    setLinkSavingId(volunteer.id);
    try {
      await updateVolunteerAPI(volunteer.id, { user_id: user.id });
      setVolunteers(prev => prev.map(v => v.id === volunteer.id ? { ...v, user_id: user.id } : v));
      showSnackbar('success', `Powiązano wolontariusza ${volunteer.nickname} z kontem ${user.username}`);
    } catch (err: any) {
      showSnackbar('error', 'Nie udało się zapisać powiązania', err instanceof ApiError ? err.message : String(err));
    } finally {
      setLinkSavingId(null);
      setLinkPopover(null);
    }
  };

  const handleUnlinkVolunteer = async (volunteer: ScheduleVolunteer) => {
    setLinkSavingId(volunteer.id);
    try {
      await updateVolunteerAPI(volunteer.id, { user_id: null });
      setVolunteers(prev => prev.map(v => v.id === volunteer.id ? { ...v, user_id: null } : v));
      showSnackbar('success', `Odłączono wolontariusza ${volunteer.nickname}`);
    } catch (err: any) {
      showSnackbar('error', 'Nie udało się odłączyć powiązania', err instanceof ApiError ? err.message : String(err));
    } finally {
      setLinkSavingId(null);
    }
  };

  const renderVolunteerCell = (user: any) => {
    const volunteer = volunteersByUserId.get(user.id);
    if (volunteer) {
      return (
        <Tooltip title={`Powiązany wolontariusz: ${volunteer.nickname} (${volunteer.assigned_hours}h / ${volunteer.target_hours}h)`}>
          <Chip
            icon={<Suspense fallback={null}><CheckCircleIcon /></Suspense>}
            label={volunteer.nickname}
            size="small"
            color="success"
            variant="outlined"
            disabled={linkSavingId === volunteer.id}
            onDelete={canManageVolunteers ? () => handleUnlinkVolunteer(volunteer) : undefined}
            onClick={(e) => e.stopPropagation()}
            sx={{ maxWidth: 160 }}
          />
        </Tooltip>
      );
    }
    if (!canManageVolunteers) {
      return <Typography variant="body2" color="text.disabled">—</Typography>;
    }
    return (
      <Chip
        icon={<Suspense fallback={null}><LinkIcon /></Suspense>}
        label="Powiąż"
        size="small"
        variant="outlined"
        clickable
        sx={{ color: 'text.secondary', borderStyle: 'dashed' }}
        onClick={(e) => {
          e.stopPropagation();
          setLinkPopover({ anchorEl: e.currentTarget, user });
        }}
      />
    );
  };

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

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter([]);
    setActiveFilter('all');
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
                  <Typography variant="body2" color="text.secondary">Nazwa:</Typography>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <Typography variant="body2" color="text.secondary">Wolontariusz:</Typography>
                  {renderVolunteerCell(user)}
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
          <TableCell>ID</TableCell>
          <TableCell>Pseudonim</TableCell>
          <TableCell>Nazwa</TableCell>
          <TableCell
            onClick={(e) => setRoleMenuAnchor(e.currentTarget)}
            sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: roleFilter.length > 0 ? 'primary.main' : 'inherit' }}>
              Rola
              <Suspense fallback={null}>
                <FilterListIcon fontSize="small" sx={{ opacity: roleFilter.length > 0 ? 1 : 0.4 }} />
              </Suspense>
            </Box>
          </TableCell>
          <TableCell>Discord</TableCell>
          <TableCell>Wolontariusz</TableCell>
          <TableCell
            onClick={(e) => setActiveMenuAnchor(e.currentTarget)}
            sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: activeFilter !== 'all' ? 'primary.main' : 'inherit' }}>
              Aktywny
              <Suspense fallback={null}>
                <FilterListIcon fontSize="small" sx={{ opacity: activeFilter !== 'all' ? 1 : 0.4 }} />
              </Suspense>
            </Box>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredUsers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} align="center" sx={{ py: 6, border: 0 }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {searchQuery || hasActiveFilters ? 'Brak wyników dla wybranych filtrów' : 'Brak użytkowników'}
              </Typography>
              {(searchQuery || hasActiveFilters) && (
                <Button variant="ghost" onClick={clearFilters}>Wyczyść filtry</Button>
              )}
            </TableCell>
          </TableRow>
        ) : (
          filteredUsers.map((user) => (
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
              <TableCell onClick={(e) => e.stopPropagation()} sx={{ cursor: 'default' }}>
                {renderVolunteerCell(user)}
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
          ))
        )}
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

      <Box sx={{ mb: 1.5 }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Szukaj użytkowników..."
          label="Szukaj użytkowników"
          width="100%"
        />
      </Box>
      <Box sx={{ mb: 1.5, minHeight: 32, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {hasActiveFilters && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Filtry:</Typography>
        )}
        {roleFilter.map(role => (
          <Chip
            key={role}
            size="small"
            icon={getRoleIcon(role)}
            label={role}
            color={getRoleColor(role)}
            onDelete={() => toggleRole(role)}
          />
        ))}
        {activeFilter !== 'all' && (
          <Chip
            size="small"
            label={activeFilter === 'active' ? 'Aktywni' : 'Nieaktywni'}
            color={activeFilter === 'active' ? 'primary' : 'default'}
            variant="outlined"
            onDelete={() => setActiveFilter('all')}
          />
        )}
      </Box>

      {loading ? (
        <PageLoader message="Ładowanie użytkowników..." />
      ) : isMobile ? (
        filteredUsers.length === 0 ? (
          <EmptyState
            message="Brak użytkowników"
            description={searchQuery || hasActiveFilters ? 'Spróbuj zmienić kryteria filtrowania' : 'Dodaj nowego użytkownika'}
            action={searchQuery || hasActiveFilters ? { label: 'Wyczyść filtry', onClick: clearFilters } : undefined}
          />
        ) : renderMobileCards()
      ) : (
        renderTable()
      )}

      <Menu
        anchorEl={roleMenuAnchor}
        open={Boolean(roleMenuAnchor)}
        onClose={() => setRoleMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => { setRoleFilter([]); setRoleMenuAnchor(null); }}
          sx={{ color: roleFilter.length === 0 ? 'primary.main' : 'inherit', fontStyle: 'italic' }}
        >
          <Checkbox size="small" checked={roleFilter.length === 0} disableRipple sx={{ p: 0, mr: 1 }} />
          Wszystkie
        </MenuItem>
        <MenuDivider />
        {(['user', 'dispatcher', 'moderator', 'admin'] as const).map(role => (
          <MenuItem key={role} onClick={() => toggleRole(role)}>
            <Checkbox size="small" checked={roleFilter.includes(role)} disableRipple sx={{ p: 0, mr: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getRoleIcon(role)}
              <ListItemText primary={role} />
            </Box>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={activeMenuAnchor}
        open={Boolean(activeMenuAnchor)}
        onClose={() => setActiveMenuAnchor(null)}
      >
        <MenuItem selected={activeFilter === 'all'} onClick={() => { setActiveFilter('all'); setActiveMenuAnchor(null); }}>
          Wszyscy
        </MenuItem>
        <MenuItem selected={activeFilter === 'active'} onClick={() => { setActiveFilter('active'); setActiveMenuAnchor(null); }}>
          Aktywni
        </MenuItem>
        <MenuItem selected={activeFilter === 'inactive'} onClick={() => { setActiveFilter('inactive'); setActiveMenuAnchor(null); }}>
          Nieaktywni
        </MenuItem>
      </Menu>

      <Popover
        open={Boolean(linkPopover)}
        anchorEl={linkPopover?.anchorEl ?? null}
        onClose={() => setLinkPopover(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, width: 300, maxWidth: 'calc(100vw - 32px)' }} onClick={(e) => e.stopPropagation()}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Powiąż wolontariusza z kontem <strong>{linkPopover?.user.username}</strong>
          </Typography>
          <Autocomplete
            size="small"
            options={unlinkedVolunteers}
            getOptionLabel={(v) => v.nickname}
            noOptionsText="Brak niepowiązanych wolontariuszy"
            onChange={(_, vol) => {
              if (vol && linkPopover) handleLinkVolunteer(vol, linkPopover.user);
            }}
            disabled={linkSavingId !== null}
            openOnFocus
            renderInput={(params) => (
              <TextField {...params} autoFocus placeholder="Szukaj wolontariusza..." />
            )}
            renderOption={(props, vol) => (
              <li {...props} key={vol.id}>
                <Box>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{vol.nickname}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                    {vol.assigned_hours}h / {vol.target_hours}h{vol.city ? ` · ${vol.city}` : ''}
                  </Typography>
                </Box>
              </li>
            )}
          />
        </Box>
      </Popover>

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
            <MenuItem value="dispatcher">Dispatcher</MenuItem>
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
