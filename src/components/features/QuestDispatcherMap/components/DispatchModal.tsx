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
} from '@mui/material';
import type { Quest } from '../../../../types/quest.types';
import type { Zone, Volunteer, DispatchAssignment } from '../types';
import { formatDate } from '../utils/matching';
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

  // Reset selection when modal opens with new quest
  const questId = quest?.id;
  useEffect(() => {
    setSelectedIds([]);
  }, [questId]);

  const availableVolunteers = useMemo(
    () => volunteers.filter(v => v.status !== 'offline'),
    [volunteers],
  );

  const toggleVolunteer = (id: number) => {
    const v = volunteers.find(vol => vol.id === id);
    if (v?.status === 'on_mission') return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDispatch = () => {
    if (!quest || !zone) return;
    // Map selected volunteer IDs → system user IDs (drop unlinked volunteers with user_id=null)
    const userIds = selectedIds
      .map(vid => volunteers.find(v => v.id === vid)?.user_id ?? null)
      .filter((uid): uid is number => uid !== null);
    onDispatch({
      quest_id: quest.id,
      zone_id: zone.id,
      user_ids: userIds,
    });
  };

  if (!quest) return null;

  const totalItems = quest.items.reduce((sum, item) => sum + item.quantity, 0);

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
        {/* Quest info row: destination + date */}
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
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                py: 0.5, px: 1, borderRadius: 0.5,
                bgcolor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              }}>
                <Typography sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontSize: 12 }}>
                  {item.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                  {/* TODO Notes should be in new line below position name  */}
                  {item.notes && (
                    <Typography sx={{ color: '#2a5a6a', fontFamily: 'monospace', fontSize: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.notes}
                    </Typography>
                  )}
                  <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                    x{item.quantity}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Volunteer selection — horizontal */}
        <Box>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, mb: 0.75 }}>
            PRZYPISZ WOLONTARIUSZY
          </Typography>

          <Box sx={{
            display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#1a3548', borderRadius: 2 },
          }}>
            {availableVolunteers.map(v => {
              const isBusy = v.status === 'on_mission';
              const isChecked = selectedIds.includes(v.id);
              const avatarBg = AVATAR_PALETTE[v.id % AVATAR_PALETTE.length];
              const displayName = v.discord_username || v.username;

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
                  {/* Avatar fills the card */}
                  {v.is_unlinked ? (
                    <Box sx={{
                      width: '100%', height: '100%',
                      filter: isBusy ? 'brightness(0.4)' : 'none',
                      transition: 'filter 0.15s ease',
                    }}>
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

                  {/* BUSY banner */}
                  {isBusy && (
                    <Box sx={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      bgcolor: 'rgba(33,100,180,0.85)', py: 0.25, textAlign: 'center',
                    }}>
                      <Typography sx={{ color: '#fff', fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: 1.5 }}>
                        BUSY
                      </Typography>
                    </Box>
                  )}

                  {/* Selected checkmark */}
                  {isChecked && (
                    <Box sx={{
                      position: 'absolute', top: 2, right: 2,
                      width: 18, height: 18, borderRadius: '50%',
                      bgcolor: '#00acc1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography sx={{ color: '#000', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>
                        ✓
                      </Typography>
                    </Box>
                  )}

                  {/* Name overlay */}
                  <Box sx={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    bgcolor: isChecked ? 'rgba(0,20,40,0.88)' : 'rgba(0,0,0,0.75)',
                    px: 0.5, py: 0.5,
                  }}>
                    <Typography sx={{
                      color: isBusy ? '#607080' : isChecked ? '#fff' : '#e0f4ff',
                      fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                      textAlign: 'center', lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
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
          </Box>

          {availableVolunteers.length === 0 && (
            <Typography sx={{ color: '#1a5a6a', fontFamily: 'monospace', textAlign: 'center', fontSize: 11, py: 2 }}>
              Brak dostępnych wolontariuszy
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
          disabled={selectedIds.length === 0}
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
          DISPATCH ({selectedIds.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DispatchModal;
