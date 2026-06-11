import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Select, MenuItem, CircularProgress, TextField,
} from '@mui/material';
import { useServiceDeskComments } from '../../../../hooks/useServiceDeskComments';
import { useAuth } from '../../../../hooks/useAuth';
import { apiClient } from '../../../../services/apiClient';
import type { ServiceDeskRequest } from '../../../../types/servicedesk.types';
import { dt } from '../constants/dispatchTheme';

const STATUS_LABELS: Record<string, string> = {
  new: 'Nowe',
  in_progress: 'W trakcie',
  waiting: 'Zablokowane',
  resolved: 'Ukończone',
  closed: 'Anulowane',
};

/** Darker color variants readable on cream paper */
const STATUS_COLORS: Record<string, string> = {
  new: '#a85e00',
  in_progress: '#00798c',
  waiting: '#9c7400',
  resolved: '#2e7d32',
  closed: '#546e7a',
};

const PRIORITY_LABELS: Record<string, string> = { high: 'Wysoki', medium: 'Średni', low: 'Niski' };
const PRIORITY_COLORS: Record<string, string> = { high: '#b71c1c', medium: '#9c7400', low: '#2e7d32' };

interface DispatchSdModalProps {
  request: ServiceDeskRequest | null;
  onClose: () => void;
  onUpdated?: () => void;
}

const DispatchSdModal: React.FC<DispatchSdModalProps> = ({ request, onClose, onUpdated }) => {
  const { userRole } = useAuth();
  const { comments, loading: commentsLoading, addComment, adding: addingComment, refreshComments } = useServiceDeskComments(request?.id);
  const [commentValue, setCommentValue] = useState('');
  const [saving, setSaving] = useState(false);
  const commentsEndRef = React.useRef<HTMLDivElement>(null);

  const isMod = userRole === 'moderator' || userRole === 'admin' || userRole === 'dispatcher';
  const isEditable = request && request.status !== 'closed' && request.status !== 'resolved';

  React.useEffect(() => {
    if (request?.id) refreshComments();
    setCommentValue('');
  }, [request?.id, refreshComments]);

  React.useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleStatusChange = async (newStatus: string) => {
    if (!request) return;
    setSaving(true);
    try {
      await apiClient.put(`/service-desk/requests/${request.id}/status`, { status: newStatus });
      onUpdated?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentValue.trim()) return;
    await addComment(commentValue.trim());
    setCommentValue('');
  };

  if (!request) return null;

  const statusColor = STATUS_COLORS[request.status] ?? '#78909c';
  const priorityColor = PRIORITY_COLORS[request.priority] ?? '#aaa';

  return (
    <Dialog
      open={!!request}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: dt.paper.bg,
          borderRadius: 2,
          backgroundImage: 'none',
          boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
        },
      }}
    >
      {/* Solid teal title bar — game-style modal header */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 1.25, bgcolor: dt.action.teal }}>
          <Typography sx={{ color: dt.action.onTeal, fontFamily: 'monospace', fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>
            SERVICE DESK
          </Typography>
          {request.created_by && (
            <Typography sx={{ color: dt.action.onTeal, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {request.created_by}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Meta row */}
        <Box sx={{ display: 'flex', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ color: priorityColor, fontWeight: 700, fontSize: 12 }}>
            {PRIORITY_LABELS[request.priority] ?? request.priority}
          </Typography>
          <Typography sx={{ color: dt.paper.textMuted, fontSize: 12 }}>·</Typography>
          <Typography sx={{ color: statusColor, fontWeight: 700, fontSize: 12 }}>
            {STATUS_LABELS[request.status] ?? request.status}
          </Typography>
          {request.location && (
            <>
              <Typography sx={{ color: dt.paper.textMuted, fontSize: 12 }}>·</Typography>
              <Typography sx={{ color: dt.paper.textSecondary, fontSize: 12 }}>
                {request.location}
              </Typography>
            </>
          )}
        </Box>

        {/* Title */}
        <Typography sx={{ color: dt.paper.text, fontWeight: 700, fontSize: 16, lineHeight: 1.4, wordBreak: 'break-word' }}>
          {request.title}
        </Typography>

        {/* Description */}
        {request.description && (
          <Box>
            <Typography sx={{ color: dt.paper.textMuted, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, mb: 0.75 }}>
              OPIS
            </Typography>
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: dt.paper.bgAlt, border: `1px solid ${dt.paper.border}` }}>
              <Typography sx={{ color: dt.paper.text, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {request.description}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Status change — mod/admin only */}
        {isMod && isEditable && (
          <Box>
            <Typography sx={{ color: dt.paper.textMuted, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, mb: 0.75 }}>
              ZMIEŃ STATUS
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Select
                value={request.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                size="small"
                disabled={saving}
                sx={{
                  fontSize: 13, fontWeight: 700, color: statusColor,
                  bgcolor: dt.paper.bgInput,
                  '& .MuiSelect-icon': { color: dt.paper.textSecondary },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: dt.paper.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#a89674' },
                  minWidth: 160,
                }}
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <MenuItem key={val} value={val} sx={{ fontSize: 13 }}>{label}</MenuItem>
                ))}
              </Select>
              {saving && <CircularProgress size={16} sx={{ color: '#a85e00' }} />}
            </Box>
          </Box>
        )}

        {/* Comments */}
        <Box>
          <Typography sx={{ color: dt.paper.textMuted, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, mb: 0.75 }}>
            KOMENTARZE {comments.length > 0 && `(${comments.length})`}
          </Typography>
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 0.5,
            p: 1, borderRadius: 1, bgcolor: dt.paper.bgAlt, border: `1px solid ${dt.paper.border}`,
            minHeight: 60, maxHeight: 200, overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: dt.paper.border, borderRadius: 2 },
          }}>
            {commentsLoading ? (
              <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={18} sx={{ color: '#00798c' }} /></Box>
            ) : comments.length === 0 ? (
              <Typography sx={{ color: dt.paper.textMuted, fontSize: 12, textAlign: 'center', py: 1 }}>
                Brak komentarzy
              </Typography>
            ) : (
              comments.map((c, i) => (
                <Box key={c.id} sx={{
                  py: 0.75, px: 1, borderRadius: 0.5,
                  bgcolor: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.04)',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                    <Typography sx={{ color: '#00798c', fontSize: 12, fontWeight: 700 }}>
                      {c.user?.username ?? 'użytkownik'}
                    </Typography>
                    <Typography sx={{ color: dt.paper.textMuted, fontFamily: 'monospace', fontSize: 11 }}>
                      {new Date(c.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: dt.paper.text, fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {c.content}
                  </Typography>
                </Box>
              ))
            )}
            <div ref={commentsEndRef} />
          </Box>

          {/* Add comment */}
          <Box component="form" onSubmit={handleAddComment} sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField
              value={commentValue}
              onChange={e => setCommentValue(e.target.value)}
              placeholder="Dodaj komentarz..."
              size="small"
              fullWidth
              multiline
              maxRows={3}
              inputProps={{ maxLength: 1000 }}
              disabled={addingComment}
              sx={{
                '& .MuiInputBase-root': { bgcolor: dt.paper.bgInput, fontSize: 13, color: dt.paper.text },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: dt.paper.border },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#a89674' },
                '& .MuiInputBase-input::placeholder': { color: dt.paper.textMuted, opacity: 1 },
              }}
            />
            <Button
              type="submit"
              disabled={!commentValue.trim() || addingComment}
              sx={{
                bgcolor: dt.action.teal, color: dt.action.onTeal,
                fontFamily: 'monospace',
                fontSize: 12, fontWeight: 800, letterSpacing: 1,
                px: 2, flexShrink: 0, alignSelf: 'flex-end',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                '&:hover': { bgcolor: dt.action.tealHover },
                '&.Mui-disabled': { color: dt.paper.textMuted, bgcolor: dt.paper.bgAlt },
              }}
            >
              {addingComment ? <CircularProgress size={13} sx={{ color: dt.action.onTeal }} /> : 'WYŚLIJ'}
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${dt.paper.divider}` }}>
        <Button
          onClick={onClose}
          sx={{ color: dt.paper.textSecondary, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, textTransform: 'none', letterSpacing: 1 }}
        >
          ZAMKNIJ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DispatchSdModal;
