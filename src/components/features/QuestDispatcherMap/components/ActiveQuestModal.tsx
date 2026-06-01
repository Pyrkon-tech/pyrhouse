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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ color: '#00acc1', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, letterSpacing: 1.5 }}>
              QUEST W REALIZACJI
            </Typography>
            <Typography sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontWeight: 700, fontSize: 16, mt: 0.25 }}>
              {quest.recipient}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: '#3a7a8a', borderRadius: '50%', mt: -0.5, mr: -1,
              '&:hover': { color: '#ff9800', bgcolor: 'rgba(255,152,0,0.08)' },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Quest meta */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>
            {quest.location_name ?? `${quest.destination.pavilion} — ${quest.destination.location}`}
          </Typography>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>
            Termin: {formatDate(quest.delivery_date)}{quest.pickup_time && ` (${quest.pickup_time})`}
          </Typography>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>
            {totalItems} szt.
          </Typography>
          {quest.budget_owner && (
            <Typography sx={{ color: '#9ad0e0', fontFamily: 'monospace', fontSize: 11 }}>
              Budżet: {quest.budget_owner}
            </Typography>
          )}
        </Box>

        {/* Items */}
        <Box>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, mb: 0.75 }}>
            POZYCJE ({quest.items.length})
          </Typography>
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 0.5,
            p: 1, borderRadius: 1, bgcolor: '#07111e', border: '1px solid #1a3548',
            maxHeight: 180, overflowY: 'auto',
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
                    ×{item.quantity}
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

        {/* Assigned volunteers */}
        {quest.assigned_volunteers.length > 0 && (
          <Box>
            <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, mb: 0.75 }}>
              WOLONTARIUSZE ({quest.assigned_volunteers.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {quest.assigned_volunteers.map(v => (
                <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.5, borderRadius: 1, bgcolor: '#07111e', border: '1px solid #00acc144' }}>
                  <Avatar
                    sx={{ width: 22, height: 22, bgcolor: AVATAR_PALETTE[v.id % AVATAR_PALETTE.length], fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}
                  >
                    {getInitials(v.fullname, v.username)}
                  </Avatar>
                  <Typography sx={{ color: '#00acc1', fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>
                    {v.username}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #152535', gap: 1 }}>
        <Button
          onClick={handleNavigateToDetail}
          sx={{
            color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10,
            textTransform: 'none', letterSpacing: 0.5, mr: 'auto',
            '&:hover': { color: '#ff9800' },
          }}
        >
          → SZCZEGÓŁY
        </Button>
        <Button
          variant="contained"
          disabled={completing}
          onClick={handleComplete}
          sx={{
            bgcolor: '#66bb6a', color: '#000', fontFamily: 'monospace',
            fontWeight: 700, fontSize: 12, letterSpacing: 1,
            textTransform: 'none', px: 3,
            '&:hover': { bgcolor: '#81c784' },
            '&.Mui-disabled': { bgcolor: '#333', color: '#666' },
          }}
        >
          {completing ? '…' : '✓ DONE'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActiveQuestModal;
