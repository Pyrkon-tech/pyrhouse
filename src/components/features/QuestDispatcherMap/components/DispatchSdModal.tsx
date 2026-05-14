import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Select, MenuItem, CircularProgress, TextField,
} from '@mui/material';
import { useServiceDeskComments } from '../../../../hooks/useServiceDeskComments';
import { useAuth } from '../../../../hooks/useAuth';
import { apiClient } from '../../../../services/apiClient';
import type { ServiceDeskRequest } from '../../../../types/servicedesk.types';

const STATUS_LABELS: Record<string, string> = {
  new: 'Nowe',
  in_progress: 'W trakcie',
  waiting: 'Zablokowane',
  resolved: 'Ukończone',
  closed: 'Anulowane',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#ff9800',
  in_progress: '#00acc1',
  waiting: '#ffd54f',
  resolved: '#66bb6a',
  closed: '#78909c',
};

const PRIORITY_LABELS: Record<string, string> = { high: 'Wysoki', medium: 'Średni', low: 'Niski' };
const PRIORITY_COLORS: Record<string, string> = { high: '#ef5350', medium: '#ffd54f', low: '#66bb6a' };

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

  const isMod = userRole === 'moderator' || userRole === 'admin';
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
          bgcolor: '#0a1929',
          border: '1px solid #1a3548',
          borderRadius: 2,
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #152535' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: '#ff9800', fontFamily: 'monospace', fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
              SERVICE DESK
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
              <Typography sx={{ color: priorityColor, fontFamily: 'monospace', fontSize: 11 }}>
                {PRIORITY_LABELS[request.priority] ?? request.priority}
              </Typography>
              <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>·</Typography>
              <Typography sx={{ color: statusColor, fontFamily: 'monospace', fontSize: 11 }}>
                {STATUS_LABELS[request.status] ?? request.status}
              </Typography>
              {request.location && (
                <>
                  <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>·</Typography>
                  <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11 }}>
                    {request.location}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
          {request.created_by && (
            <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11, flexShrink: 0 }}>
              {request.created_by}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Title */}
        <Typography sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
          {request.title}
        </Typography>

        {/* Description */}
        {request.description && (
          <Box>
            <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, mb: 0.75 }}>
              OPIS
            </Typography>
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#07111e', border: '1px solid #1a3548' }}>
              <Typography sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {request.description}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Status change — mod/admin only */}
        {isMod && isEditable && (
          <Box>
            <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, mb: 0.75 }}>
              ZMIEŃ STATUS
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Select
                value={request.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                size="small"
                disabled={saving}
                sx={{
                  fontFamily: 'monospace', fontSize: 12, color: statusColor,
                  bgcolor: '#07111e',
                  '& .MuiSelect-icon': { color: '#3a7a8a' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1a3548' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2a5a6a' },
                  minWidth: 160,
                }}
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <MenuItem key={val} value={val} sx={{ fontFamily: 'monospace', fontSize: 12 }}>{label}</MenuItem>
                ))}
              </Select>
              {saving && <CircularProgress size={16} sx={{ color: '#ff9800' }} />}
            </Box>
          </Box>
        )}

        {/* Comments */}
        <Box>
          <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, mb: 0.75 }}>
            KOMENTARZE {comments.length > 0 && `(${comments.length})`}
          </Typography>
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 0.5,
            p: 1, borderRadius: 1, bgcolor: '#07111e', border: '1px solid #1a3548',
            minHeight: 60, maxHeight: 200, overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#1a3548', borderRadius: 2 },
          }}>
            {commentsLoading ? (
              <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={18} sx={{ color: '#00acc1' }} /></Box>
            ) : comments.length === 0 ? (
              <Typography sx={{ color: '#1a5a6a', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', py: 1 }}>
                Brak komentarzy
              </Typography>
            ) : (
              comments.map((c, i) => (
                <Box key={c.id} sx={{
                  py: 0.75, px: 1, borderRadius: 0.5,
                  bgcolor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                    <Typography sx={{ color: '#00acc1', fontFamily: 'monospace', fontSize: 10, fontWeight: 700 }}>
                      {c.user?.username ?? 'użytkownik'}
                    </Typography>
                    <Typography sx={{ color: '#2a5a6a', fontFamily: 'monospace', fontSize: 10 }}>
                      {new Date(c.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: '#c8e8f5', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5, wordBreak: 'break-word' }}>
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
                '& .MuiInputBase-root': { bgcolor: '#07111e', fontFamily: 'monospace', fontSize: 12, color: '#c8e8f5' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1a3548' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2a5a6a' },
                '& .MuiInputBase-input::placeholder': { color: '#1a5a6a', opacity: 1 },
              }}
            />
            <Button
              type="submit"
              disabled={!commentValue.trim() || addingComment}
              sx={{
                bgcolor: 'rgba(0,172,193,0.12)', color: '#00acc1',
                border: '1px solid #1a5a6a', fontFamily: 'monospace',
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
                px: 2, flexShrink: 0, alignSelf: 'flex-end',
                '&:hover': { bgcolor: 'rgba(0,172,193,0.22)', borderColor: '#00acc1' },
                '&.Mui-disabled': { color: '#1a3a4a', borderColor: '#0f2030', bgcolor: 'transparent' },
              }}
            >
              {addingComment ? <CircularProgress size={13} sx={{ color: '#00acc1' }} /> : 'WYŚLIJ'}
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #152535' }}>
        <Button
          onClick={onClose}
          sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontSize: 11, textTransform: 'none', letterSpacing: 1 }}
        >
          ZAMKNIJ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DispatchSdModal;
