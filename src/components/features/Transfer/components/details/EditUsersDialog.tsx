import React, { lazy, Suspense } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Checkbox from '@mui/material/Checkbox';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material';

const PersonIcon = lazy(() => import('@mui/icons-material/Person'));

interface EditableUser {
  id: number;
  username: string;
  fullname?: string | null;
}

interface EditUsersDialogProps {
  open: boolean;
  saving: boolean;
  users: EditableUser[];
  usersLoading: boolean;
  selectedUserIds: number[];
  onToggleUser: (userId: number) => void;
  onClose: () => void;
  onSave: () => void;
}

const EditUsersDialog: React.FC<EditUsersDialogProps> = ({
  open,
  saving,
  users,
  usersLoading,
  selectedUserIds,
  onToggleUser,
  onClose,
  onSave,
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
          }
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Suspense fallback={null}><PersonIcon color="primary" /></Suspense>
          <Typography variant="h6">Edytuj listę Gżdaczy</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {usersLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom sx={{
              color: "text.secondary"
            }}>
              Wybierz Gżdaczy, którzy brali udział w transferze:
            </Typography>
            <List sx={{ width: '100%', maxHeight: '300px', minHeight: '600px', overflow: 'auto' }}>
              {users.map((user) => (
                <ListItem
                  key={user.id}
                  dense
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => onToggleUser(user.id)}
                    />
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                      <Suspense fallback={null}><PersonIcon /></Suspense>
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.username}
                    secondary={user.fullname}
                    slotProps={{
                      primary: { sx: { fontWeight: 500 } }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            fontSize: '0.875rem',
            py: 0.75,
            px: 1.5,
          }}
        >
          Anuluj
        </Button>
        <Button
          onClick={onSave}
          color="primary"
          variant="contained"
          disabled={saving}
          sx={{
            fontSize: '0.875rem',
            py: 0.75,
            px: 1.5,
            borderRadius: 1.5,
          }}
        >
          {saving ? <CircularProgress size={20} /> : 'Zapisz zmiany'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUsersDialog;
