import React, { Suspense, lazy } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
} from '@mui/material';
import type { UserDetails } from '../../../types/user.types';
import { DiscordIcon, DISCORD_COLOR } from './brandIcons';
import { getRoleColor } from './roleColors';

const EditIcon = lazy(() => import('@mui/icons-material/Edit'));
const LockIcon = lazy(() => import('@mui/icons-material/Lock'));

interface UserInfoCardProps {
  user: UserDetails;
  editedUser: Partial<UserDetails>;
  isEditing: boolean;
  isUpdating: boolean;
  isAdmin: boolean;
  hasDiscord: boolean;
  canEdit: boolean;
  canChangePassword: boolean;
  canEditRole: boolean;
  onEditClick: () => void;
  onCancelEdit: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (e: SelectChangeEvent) => void;
  onUpdateUser: () => void;
  onOpenPasswordDialog: () => void;
}

const UserInfoCard: React.FC<UserInfoCardProps> = ({
  user,
  editedUser,
  isEditing,
  isUpdating,
  isAdmin,
  hasDiscord,
  canEdit,
  canChangePassword,
  canEditRole,
  onEditClick,
  onCancelEdit,
  onInputChange,
  onSelectChange,
  onUpdateUser,
  onOpenPasswordDialog,
}) => (
  <Card elevation={3} sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">Szczegółowe informacje</Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          {canEdit && (
            <Tooltip title="Edytuj dane użytkownika">
              <Button variant="outlined" startIcon={<Suspense fallback={null}><EditIcon /></Suspense>} onClick={onEditClick} disabled={isEditing} sx={{ minWidth: 120 }}>
                Edytuj
              </Button>
            </Tooltip>
          )}
          {canChangePassword && (
            <Tooltip title="Zmień hasło">
              <Button variant="outlined" startIcon={<Suspense fallback={null}><LockIcon /></Suspense>} onClick={onOpenPasswordDialog} sx={{ minWidth: 120 }}>
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
            onChange={onInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Nazwa użytkownika / Pseudonim"
            name="username"
            value={editedUser.username ?? ''}
            onChange={onInputChange}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="role-label">Rola</InputLabel>
            <Select
              labelId="role-label"
              name="role"
              value={editedUser.role ?? 'user'}
              onChange={onSelectChange}
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
            <Button variant="outlined" onClick={onCancelEdit}>Anuluj</Button>
            <Button variant="contained" color="primary" onClick={onUpdateUser} disabled={isUpdating}>
              {isUpdating ? <CircularProgress size={24} /> : 'Zapisz'}
            </Button>
          </Box>
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" sx={{
              color: "text.secondary"
            }}>Imię i nazwisko</Typography>
            <Typography
              variant="body1"
              sx={user.fullname ? {} : { color: 'text.disabled', fontStyle: 'italic' }}
            >
              {user.fullname || 'Nie ustawiono'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" sx={{
              color: "text.secondary"
            }}>Nazwa użytkownika</Typography>
            <Typography variant="body1">{user.username}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" sx={{
              color: "text.secondary"
            }}>Rola</Typography>
            <Chip label={user.role.toUpperCase()} color={getRoleColor(user.role)} size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" sx={{
              color: "text.secondary"
            }}>Status konta</Typography>
            <Chip label={user.active ? 'Aktywne' : 'Nieaktywne'} color={user.active ? 'success' : 'default'} size="small" variant="outlined" />
          </Grid>

          {/* Discord info w szczegółach */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" sx={{
              color: "text.secondary"
            }}>Discord</Typography>
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

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" sx={{
              color: "text.secondary"
            }}>Metoda logowania</Typography>
            <Typography variant="body1">
              {user.auth_provider === 'discord' ? 'Discord OAuth' : 'Hasło'}
            </Typography>
          </Grid>

          {isAdmin && user.discord_id && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" sx={{
                color: "text.secondary"
              }}>Discord ID</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {user.discord_id}
              </Typography>
            </Grid>
          )}
        </Grid>
      )}
    </CardContent>
  </Card>
);

export default UserInfoCard;
