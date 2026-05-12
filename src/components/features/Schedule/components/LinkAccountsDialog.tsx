import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Autocomplete, TextField,
  CircularProgress, Chip,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import type { ScheduleVolunteer } from '../../../../types/schedule.types';
import type { UserListItem } from '../../../../types/user.types';
import { getUsersAPI } from '../../../../services/userService';
import { updateVolunteerAPI } from '../../../../services/scheduleService';
import { useNotification } from '../../../../context/NotificationContext';

interface LinkAccountsDialogProps {
  open: boolean;
  onClose: () => void;
  volunteers: ScheduleVolunteer[];
  onVolunteerUpdated: (volunteerId: number, userId: number | null) => void;
}

const LinkAccountsDialog: React.FC<LinkAccountsDialogProps> = ({
  open, onClose, volunteers, onVolunteerUpdated,
}) => {
  const { showSuccess, showError } = useNotification();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState<number | null>(null); // volunteerId being saved

  useEffect(() => {
    if (!open) return;
    setLoadingUsers(true);
    getUsersAPI()
      .then((data) => setUsers(data.filter((u) => u.active)))
      .catch(() => showError('Nie udało się pobrać listy użytkowników'))
      .finally(() => setLoadingUsers(false));
  }, [open, showError]);

  const handleLink = async (vol: ScheduleVolunteer, user: UserListItem | null) => {
    setSaving(vol.id);
    try {
      await updateVolunteerAPI(vol.id, { user_id: user?.id ?? null });
      onVolunteerUpdated(vol.id, user?.id ?? null);
      showSuccess(user ? `Powiązano ${vol.nickname} → ${user.username}` : `Odłączono konto od ${vol.nickname}`);
    } catch {
      showError('Nie udało się zapisać powiązania');
    } finally {
      setSaving(null);
    }
  };

  const userOptions = users;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
        Powiąż wolontariuszy z kontami systemowymi
      </DialogTitle>
      <DialogContent>
        {loadingUsers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
            {volunteers.length === 0 && (
              <Typography variant="body2" color="text.secondary">Brak wolontariuszy w harmonogramie.</Typography>
            )}
            {volunteers.map((vol) => {
              const linkedUser = users.find((u) => u.id === vol.user_id);
              const isSaving = saving === vol.id;

              return (
                <Box
                  key={vol.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {/* Volunteer name */}
                  <Box sx={{ minWidth: 120, flexShrink: 0 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{vol.nickname}</Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                      {vol.assigned_hours}h / {vol.target_hours}h
                    </Typography>
                  </Box>

                  {/* Link icon */}
                  <Box sx={{ color: vol.user_id ? 'success.main' : 'text.disabled', flexShrink: 0 }}>
                    {vol.user_id ? <LinkIcon sx={{ fontSize: 16 }} /> : <LinkOffIcon sx={{ fontSize: 16 }} />}
                  </Box>

                  {/* User picker */}
                  <Autocomplete
                    size="small"
                    options={userOptions}
                    value={linkedUser ?? null}
                    onChange={(_, newVal) => handleLink(vol, newVal)}
                    getOptionLabel={(u) => u.fullname ? `${u.username} (${u.fullname})` : u.username}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    loading={isSaving}
                    disabled={isSaving}
                    sx={{ flex: 1 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Brak powiązania"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: isSaving
                            ? <CircularProgress size={14} color="inherit" />
                            : params.InputProps.endAdornment,
                        }}
                        sx={{ '& .MuiInputBase-root': { fontSize: '0.78rem' } }}
                      />
                    )}
                    renderOption={(props, u) => (
                      <li {...props} key={u.id}>
                        <Box>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.username}</Typography>
                          {u.fullname && (
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{u.fullname}</Typography>
                          )}
                        </Box>
                        {u.discord_username && (
                          <Chip label={u.discord_username} size="small" sx={{ ml: 'auto', fontSize: '0.6rem', height: 18 }} />
                        )}
                      </li>
                    )}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={onClose}>Zamknij</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LinkAccountsDialog;
