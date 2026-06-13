import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Avatar,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import type { Quest } from '../../../../types/quest.types';
import { formatDate } from '../utils/matching';
import { dt } from '../constants/dispatchTheme';

const AVATAR_PALETTE = ['#ff9800', '#00acc1', '#66bb6a', '#00acc1', '#ef5350', '#ab47bc', '#42a5f5'];

const getInitials = (name: string | null, username: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return username.slice(0, 2).toUpperCase();
};

interface ActiveQuestModalProps {
  quest: Quest | null;
  onClose: () => void;
  onComplete: (quest: Quest) => Promise<void>;
}

const ActiveQuestModal: React.FC<ActiveQuestModalProps> = ({ quest, onClose, onComplete }) => {
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);

  if (!quest) return null;

  const totalItems = quest.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(quest);
      onClose();
    } finally {
      setCompleting(false);
    }
  };

  const handleNavigateToDetail = () => {
    onClose();
    navigate(`/quests/${quest.id}`);
  };

  return (
    <Dialog
      open={!!quest}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: dt.paper.bg,
            borderRadius: 2,
            backgroundImage: 'none',
            boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
          },
        }
      }}
    >
      {/* Solid teal title bar — game-style modal header */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 1.25, bgcolor: dt.action.teal }}>
          <Typography sx={{ color: dt.action.onTeal, fontFamily: 'monospace', fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>
            QUEST W REALIZACJI
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: dt.action.onTeal, borderRadius: '50%', mr: -1,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography sx={{ color: dt.paper.text, fontWeight: 700, fontSize: 17, mt: 1 }}>
          {quest.recipient}
        </Typography>

        {/* Quest meta */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ color: dt.paper.textSecondary, fontSize: 13 }}>
            {quest.location_name ?? `${quest.destination.pavilion} — ${quest.destination.location}`}
          </Typography>
          <Typography sx={{ color: dt.paper.textSecondary, fontFamily: 'monospace', fontSize: 12 }}>
            Termin: {formatDate(quest.delivery_date)}{quest.pickup_time && ` (${quest.pickup_time})`}
          </Typography>
          <Typography sx={{ color: dt.paper.textSecondary, fontFamily: 'monospace', fontSize: 12 }}>
            {totalItems} szt.
          </Typography>
          {quest.budget_owner && (
            <Typography sx={{ color: dt.paper.textSecondary, fontSize: 13 }}>
              Budżet: {quest.budget_owner}
            </Typography>
          )}
        </Box>

        {/* Items */}
        <Box>
          <Typography sx={{ color: dt.paper.textMuted, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, mb: 0.75 }}>
            POZYCJE ({quest.items.length})
          </Typography>
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 0.5,
            p: 1, borderRadius: 1, bgcolor: dt.paper.bgAlt, border: `1px solid ${dt.paper.border}`,
            maxHeight: 180, overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: dt.paper.border, borderRadius: 2 },
          }}>
            {quest.items.map((item, i) => (
              <Box key={i} sx={{
                py: 0.5, px: 1, borderRadius: 0.5,
                bgcolor: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.04)',
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                  <Typography sx={{ color: dt.paper.text, fontSize: 13 }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ color: '#a85e00', fontFamily: 'monospace', fontSize: 13, fontWeight: 800, minWidth: 32, textAlign: 'right', flexShrink: 0 }}>
                    ×{item.quantity}
                  </Typography>
                </Box>
                {item.notes && (
                  <Typography sx={{ color: dt.paper.textMuted, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.25 }}>
                    {item.notes}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Assigned volunteers */}
        {quest.assigned_volunteers.length > 0 && (
          <Box>
            <Typography sx={{ color: dt.paper.textMuted, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, mb: 0.75 }}>
              WOLONTARIUSZE ({quest.assigned_volunteers.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {quest.assigned_volunteers.map(v => (
                <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.5, borderRadius: 1, bgcolor: dt.paper.bgInput, border: `1px solid ${dt.paper.border}` }}>
                  <Avatar
                    sx={{ width: 22, height: 22, bgcolor: AVATAR_PALETTE[v.id % AVATAR_PALETTE.length], fontSize: 10, fontWeight: 700 }}
                  >
                    {getInitials(v.fullname, v.username)}
                  </Avatar>
                  <Typography sx={{ color: '#00798c', fontSize: 13, fontWeight: 700 }}>
                    {v.username}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${dt.paper.divider}`, gap: 1 }}>
        <Button
          onClick={handleNavigateToDetail}
          sx={{
            color: dt.paper.textSecondary, fontFamily: 'monospace', fontSize: 12,
            fontWeight: 700, textTransform: 'none', letterSpacing: 0.5, mr: 'auto',
            '&:hover': { color: '#a85e00' },
          }}
        >
          → SZCZEGÓŁY
        </Button>
        <Button
          variant="contained"
          disabled={completing}
          onClick={handleComplete}
          sx={{
            bgcolor: dt.action.green, color: dt.action.onGreen, fontFamily: 'monospace',
            fontWeight: 800, fontSize: 13, letterSpacing: 1,
            textTransform: 'none', px: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            '&:hover': { bgcolor: dt.action.greenHover },
            '&.Mui-disabled': { bgcolor: dt.paper.bgAlt, color: dt.paper.textMuted },
          }}
        >
          {completing ? '…' : '✓ DONE'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActiveQuestModal;
