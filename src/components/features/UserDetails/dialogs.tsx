import React from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import MergeIcon from '@mui/icons-material/MergeType';
import type { UserListItem } from '../../../types/user.types';
import { DISCORD_COLOR } from './brandIcons';

// ---- Password dialog ---------------------------------------------------------

interface PasswordDialogProps {
  open: boolean;
  updating: boolean;
  passwordData: { newPassword: string; confirmPassword: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({ open, updating, passwordData, onChange, onClose, onSubmit }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Zmień hasło</DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Wprowadź nowe hasło. Upewnij się, że jest silne i nieudostępniane innym osobom.
      </Typography>
      <TextField
        autoFocus
        label="Nowe hasło"
        name="newPassword"
        type="password"
        value={passwordData.newPassword}
        onChange={onChange}
        margin="normal"
        required
        fullWidth
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onClose(); }}
        disabled={updating}
        slotProps={{
          htmlInput: { minLength: 6 }
        }}
      />
      <TextField
        label="Potwierdź nowe hasło"
        name="confirmPassword"
        type="password"
        value={passwordData.confirmPassword}
        onChange={onChange}
        margin="normal"
        required
        fullWidth
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onClose(); }}
        disabled={updating}
        slotProps={{
          htmlInput: { minLength: 6 }
        }}
      />
    </DialogContent>
    <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 1, p: 2 }}>
      <Button onClick={onClose} disabled={updating} fullWidth>Anuluj</Button>
      <Button onClick={onSubmit} variant="contained" color="primary" disabled={updating} fullWidth>
        {updating ? <CircularProgress size={24} /> : 'Zmień hasło'}
      </Button>
    </DialogActions>
  </Dialog>
);

// ---- Points dialog -----------------------------------------------------------

interface PointsDialogProps {
  open: boolean;
  loading: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const PointsDialog: React.FC<PointsDialogProps> = ({ open, loading, value, onChange, onClose, onSubmit }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Zarządzaj punktami użytkownika</DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Podaj liczbę punktów do dodania lub odjęcia.
      </Typography>
      <TextField
        autoFocus
        label="Liczba punktów"
        type="number"
        value={value}
        onChange={onChange}
        fullWidth
        disabled={loading}
        slotProps={{
          htmlInput: { step: 1 }
        }}
      />
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        -100 oznacza odjęcie 100 punktów a 100 oznacza dodanie 100 punktów.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>Anuluj</Button>
      <Button onClick={onSubmit} variant="contained" color="primary" disabled={loading}>
        {loading ? <CircularProgress size={20} /> : 'Zatwierdź'}
      </Button>
    </DialogActions>
  </Dialog>
);

// ---- Merge Discord dialog ----------------------------------------------------

interface MergeDiscordDialogProps {
  open: boolean;
  merging: boolean;
  ghostLoading: boolean;
  ghostAccounts: UserListItem[];
  selectedGhostId: number | null;
  targetUsername: string;
  onSelectGhost: (id: number) => void;
  onClose: () => void;
  onMerge: () => void;
}

export const MergeDiscordDialog: React.FC<MergeDiscordDialogProps> = ({
  open,
  merging,
  ghostLoading,
  ghostAccounts,
  selectedGhostId,
  targetUsername,
  onSelectGhost,
  onClose,
  onMerge,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Scal konta Discord</DialogTitle>
    <DialogContent>
      <Alert severity="info" sx={{ mb: 2 }}>
        Wybierz konto Discord (ghost), z którego chcesz przenieść dane na to konto.
        Ghost konto zostanie usunięte lub dezaktywowane.
      </Alert>

      {ghostLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : ghostAccounts.length === 0 ? (
        <Alert severity="warning">
          Nie znaleziono kont Discord do scalenia.
        </Alert>
      ) : (
        <List sx={{ p: 0 }}>
          {ghostAccounts.map((ghost) => (
            <ListItem
              key={ghost.id}
              sx={{
                border: '1px solid',
                borderColor: selectedGhostId === ghost.id ? DISCORD_COLOR : 'divider',
                borderRadius: 1,
                mb: 1,
                p: 0,
                bgcolor: selectedGhostId === ghost.id ? `${DISCORD_COLOR}08` : 'transparent',
                '&:last-child': { mb: 0 },
              }}
            >
              <ListItemButton
                onClick={() => onSelectGhost(ghost.id)}
                selected={selectedGhostId === ghost.id}
                sx={{ borderRadius: 1 }}
              >
                <ListItemText
                  slotProps={{ primary: { component: 'div' }, secondary: { component: 'div' } }}
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {ghost.username}
                      </Typography>
                      {ghost.discord_username && (
                        <Chip
                          label={ghost.discord_username}
                          size="small"
                          sx={{ bgcolor: `${DISCORD_COLOR}14`, color: DISCORD_COLOR, fontWeight: 500 }}
                        />
                      )}
                      {!ghost.active && (
                        <Chip label="Ghost" size="small" sx={{ bgcolor: 'rgba(255, 152, 0, 0.12)', color: 'warning.dark', fontWeight: 600, fontSize: '0.7rem' }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
                      ID: {ghost.id} {ghost.fullname ? `· ${ghost.fullname}` : ''}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {selectedGhostId && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Discord z konta #{selectedGhostId} zostanie przeniesiony na to konto ({targetUsername}).
          Konto źródłowe zostanie usunięte lub dezaktywowane.
        </Alert>
      )}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} disabled={merging}>
        Anuluj
      </Button>
      <Button
        onClick={onMerge}
        variant="contained"
        color="warning"
        disabled={!selectedGhostId || merging}
        startIcon={merging ? <CircularProgress size={16} /> : <MergeIcon />}
      >
        {merging ? 'Scalanie...' : 'Scal konta'}
      </Button>
    </DialogActions>
  </Dialog>
);
