import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Avatar,
  Tooltip,
  Autocomplete,
  TextField,
  IconButton,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import type { Quest } from '../../../../types/quest.types';
import type { Zone, Volunteer, DispatchAssignment } from '../types';
import type { UserListItem } from '../../../../types/user.types';
import { formatDate } from '../utils/matching';
import { getUsersAPI } from '../../../../services/userService';
import UnknownAgentAvatar from './UnknownAgentAvatar';

const AVATAR_PALETTE = ['#ff9800', '#00acc1', '#66bb6a', '#ffd54f', '#ef5350', '#ab47bc', '#42a5f5'];

const getInitials = (name: string | null, username: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return username.slice(0, 2).toUpperCase();
};

interface DispatchModalProps {
  open: boolean;
  quest: Quest | null;
  zone: Zone | null;
  volunteers: Volunteer[];
  onClose: () => void;
  onDispatch: (assignment: DispatchAssignment) => void;
}

const DispatchModal: React.FC<DispatchModalProps> = ({ open, quest, zone, volunteers, onClose, onDispatch }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [manualUsers, setManualUsers] = useState<UserListItem[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [allUsers, setAllUsers] = useState<UserListItem[] | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [autocompleteValue, setAutocompleteValue] = useState<UserListItem | null>(null);

  const questId = quest?.id;
  useEffect(() => {
    setSelectedIds([]);
    setManualUsers([]);
    setShowUserSearch(false);
    setAutocompleteValue(null);
  }, [questId]);

  const availableVolunteers = useMemo(
    () => volunteers.filter(v => v.status !== 'offline'),
    [volunteers],
  );

  const onDutyUserIds = useMemo(
    () => new Set(volunteers.map(v => v.user_id).filter((id): id is number => id !== null)),
    [volunteers],
  );

  const toggleVolunteer = (id: number) => {
    const v = volunteers.find(vol => vol.id === id);
    if (v?.status === 'on_mission') return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleOpenUserSearch = async () => {
    setShowUserSearch(true);
    if (!allUsers) {
      setLoadingUsers(true);
      try {
        const users = await getUsersAPI();
        setAllUsers(users.filter(u => u.active));
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  const handleAddManualUser = (_: React.SyntheticEvent, user: UserListItem | null) => {
    if (!user) return;
    if (manualUsers.some(u => u.id === user.id)) return;
    setManualUsers(prev => [...prev, user]);
    setAutocompleteValue(null);
  };

  const handleRemoveManualUser = (userId: number) => {
    setManualUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleDispatch = () => {
    if (!quest || !zone) return;
    const dutyUserIds = selectedIds
      .map(vid => volunteers.find(v => v.id === vid)?.user_id ?? null)
      .filter((uid): uid is number => uid !== null);
    const allUserIds = [...new Set([...dutyUserIds, ...manualUsers.map(u => u.id)])];
    onDispatch({
      quest_id: quest.id,
      zone_id: zone.id,
      user_ids: allUserIds,
    });
  };

  const userPickerOptions = useMemo(() => {
    if (!allUsers) return [];
    const addedIds = new Set(manualUsers.map(u => u.id));
    return allUsers.filter(u => !onDutyUserIds.has(u.id) && !addedIds.has(u.id));
  }, [allUsers, onDutyUserIds, manualUsers]);

  if (!quest) return null;

  const totalItems = quest.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalSelected = selectedIds.length + manualUsers.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0a1929',
          border: '1px solid #1a3548',
          borderRadius: 2,
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #152535' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>
              DISPATCH MISSION
            </Typography>
            {zone && (
              <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11, mt: 0.25 }}>
                Pawilon {zone.label.replace('\n', ' ')}
              </Typography>
            )}
          </Box>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>
            {quest.recipient}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Quest info row */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>
            {quest.location_name ?? `${quest.destination.pavilion} — ${quest.destination.location}`}
          </Typography>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>
            Termin: {formatDate(quest.delivery_date)}{quest.pickup_time && ` (${quest.pickup_time})`}
          </Typography>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>
            {totalItems} szt.
          </Typography>
        </Box>

        {/* Items list */}
        <Box>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, mb: 0.75 }}>
            POZYCJE ({quest.items.length})
          </Typography>
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 0.5,
            p: 1, borderRadius: 1, bgcolor: '#07111e', border: '1px solid #1a3548',
            maxHeight: 160, overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#1a3548', borderRadius: 2 },
          }}>
            {quest.items.map((item, i) => (
              <Box key={i} sx={{
                py: 0.5, px: 1, borderRadius: 0.5,
                bgcolor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                  <Typography sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontSize: 12 }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, minWidth: 32, textAlign: 'right', flexShrink: 0 }}>
                    x{item.quantity}
                  </Typography>
                </Box>
                {item.notes && (
                  <Typography sx={{ color: '#2a5a6a', fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.25 }}>
                    {item.notes}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Volunteer selection */}
        <Box>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, mb: 0.75 }}>
            PRZYPISZ WOLONTARIUSZY
          </Typography>

          <Box sx={{
            display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#1a3548', borderRadius: 2 },
          }}>
            {/* On-duty volunteer cards */}
            {availableVolunteers.map(v => {
              const isBusy = v.status === 'on_mission';
              const isChecked = selectedIds.includes(v.id);
              const avatarBg = AVATAR_PALETTE[v.id % AVATAR_PALETTE.length];
              const displayName = v.username;

              const card = (
                <Box
                  key={v.id}
                  onClick={() => toggleVolunteer(v.id)}
                  sx={{
                    position: 'relative',
                    width: 72,
                    height: 72,
                    flexShrink: 0,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    border: `2px solid ${isChecked ? '#00acc1' : '#1a3548'}`,
                    boxShadow: isChecked ? '0 0 14px rgba(0,172,193,0.5)' : 'none',
                    transition: 'all 0.15s ease',
                    '&:hover': !isBusy ? { borderColor: isChecked ? '#00acc1' : '#2a4a60' } : {},
                  }}
                >
                  {v.is_unlinked ? (
                    <Box sx={{ width: '100%', height: '100%', filter: isBusy ? 'brightness(0.4)' : 'none', transition: 'filter 0.15s ease' }}>
                      <UnknownAgentAvatar />
                    </Box>
                  ) : (
                    <Avatar
                      variant="square"
                      src={v.avatar_url || undefined}
                      sx={{
                        width: '100%', height: '100%', borderRadius: 0,
                        bgcolor: v.avatar_url ? 'transparent' : avatarBg,
                        fontSize: 22, fontFamily: 'monospace', fontWeight: 700,
                        filter: isBusy ? 'grayscale(0.7) brightness(0.5)' : 'none',
                        transition: 'filter 0.15s ease',
                      }}
                    >
                      {!v.avatar_url && getInitials(v.fullname, v.username)}
                    </Avatar>
                  )}
                  {isBusy && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bgcolor: 'rgba(33,100,180,0.85)', py: 0.25, textAlign: 'center' }}>
                      <Typography sx={{ color: '#fff', fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: 1.5 }}>
                        BUSY
                      </Typography>
                    </Box>
                  )}
                  {isChecked && (
                    <Box sx={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', bgcolor: '#00acc1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ color: '#000', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</Typography>
                    </Box>
                  )}
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: isChecked ? 'rgba(0,20,40,0.88)' : 'rgba(0,0,0,0.75)', px: 0.5, py: 0.5 }}>
                    <Typography sx={{ color: isBusy ? '#607080' : isChecked ? '#fff' : '#e0f4ff', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </Typography>
                  </Box>
                </Box>
              );

              return isBusy ? (
                <Tooltip key={v.id} title={`Na misji: ${v.current_mission}`} placement="top" arrow>
                  {card}
                </Tooltip>
              ) : (
                <React.Fragment key={v.id}>{card}</React.Fragment>
              );
            })}

            {/* Manually added user cards (purple border) */}
            {manualUsers.map(u => {
              const avatarBg = AVATAR_PALETTE[u.id % AVATAR_PALETTE.length];
              const displayName = u.username;
              return (
                <Box
                  key={`manual-${u.id}`}
                  sx={{
                    position: 'relative',
                    width: 72,
                    height: 72,
                    flexShrink: 0,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    border: '2px solid #ab47bc',
                    boxShadow: '0 0 10px rgba(171,71,188,0.35)',
                  }}
                >
                  <Avatar
                    variant="square"
                    sx={{ width: '100%', height: '100%', borderRadius: 0, bgcolor: avatarBg, fontSize: 22, fontFamily: 'monospace', fontWeight: 700 }}
                  >
                    {getInitials(u.fullname, u.username)}
                  </Avatar>
                  <Box
                    onClick={() => handleRemoveManualUser(u.id)}
                    sx={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { bgcolor: '#ef5350' } }}
                  >
                    <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>×</Typography>
                  </Box>
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(20,0,30,0.88)', px: 0.5, py: 0.5 }}>
                    <Typography sx={{ color: '#e0cfff', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </Typography>
                  </Box>
                </Box>
              );
            })}

            {/* Add from list button */}
            <Tooltip title="Dodaj z listy użytkowników" placement="top" arrow>
              <Box
                onClick={handleOpenUserSearch}
                sx={{
                  width: 72, height: 72, flexShrink: 0,
                  borderRadius: 1.5,
                  border: '2px dashed #1a3548',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#2a5a6a',
                  transition: 'all 0.15s ease',
                  '&:hover': { borderColor: '#ab47bc', color: '#ab47bc', bgcolor: 'rgba(171,71,188,0.07)' },
                }}
              >
                {loadingUsers
                  ? <CircularProgress size={22} sx={{ color: '#ab47bc' }} />
                  : <AddIcon sx={{ fontSize: 28 }} />
                }
              </Box>
            </Tooltip>
          </Box>

          {/* User search autocomplete */}
          {showUserSearch && (
            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Autocomplete
                options={userPickerOptions}
                getOptionLabel={u => {
                  const parts = [u.username];
                  if (u.fullname) parts.push(u.fullname);
                  if (u.discord_username) parts.push(`@${u.discord_username}`);
                  return parts.join(' · ');
                }}
                value={autocompleteValue}
                onChange={handleAddManualUser}
                loading={loadingUsers}
                size="small"
                fullWidth
                noOptionsText="Brak wyników"
                loadingText="Ładowanie..."
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Szukaj po nazwie lub pseudonimie..."
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: '#07111e', fontFamily: 'monospace', fontSize: 12, color: '#c8e8f5' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1a3548' },
                      '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ab47bc' },
                      '& .MuiInputBase-input::placeholder': { color: '#1a5a6a', opacity: 1 },
                      '& .MuiAutocomplete-endAdornment .MuiIconButton-root': { color: '#3a7a8a' },
                    }}
                  />
                )}
                ListboxProps={{
                  sx: {
                    bgcolor: '#07111e',
                    border: '1px solid #1a3548',
                    '& .MuiAutocomplete-option': {
                      fontFamily: 'monospace', fontSize: 12, color: '#c8e8f5',
                      '&:hover': { bgcolor: 'rgba(171,71,188,0.12)' },
                      '&[aria-selected="true"]': { bgcolor: 'rgba(171,71,188,0.2)' },
                    },
                  },
                }}
                sx={{ flex: 1 }}
              />
              <IconButton
                onClick={() => setShowUserSearch(false)}
                size="small"
                sx={{ color: '#3a7a8a', '&:hover': { color: '#ef5350' } }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          )}

          {availableVolunteers.length === 0 && manualUsers.length === 0 && !showUserSearch && (
            <Typography sx={{ color: '#1a5a6a', fontFamily: 'monospace', textAlign: 'center', fontSize: 11, py: 2 }}>
              Brak dostępnych wolontariuszy — użyj + by dodać z listy
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #152535' }}>
        <Button
          onClick={onClose}
          sx={{
            color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11,
            textTransform: 'none', letterSpacing: 1,
          }}
        >
          ANULUJ
        </Button>
        <Button
          variant="contained"
          disabled={false}
          onClick={handleDispatch}
          sx={{
            bgcolor: '#ff9800',
            color: '#000',
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: 'none',
            px: 3,
            '&:hover': { bgcolor: '#ffa726' },
            '&.Mui-disabled': { bgcolor: '#333', color: '#666' },
          }}
        >
          DISPATCH ({totalSelected})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DispatchModal;
