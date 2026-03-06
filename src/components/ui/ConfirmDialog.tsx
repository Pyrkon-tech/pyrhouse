import React from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'error' | 'primary' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Reużywalny dialog potwierdzenia (usuń / zapisz / akcja destruktywna).
 * Zastępuje ~20 linii Dialog markup powielanego na każdej stronie CRUD.
 *
 * @example
 * <ConfirmDialog
 *   open={dialogs.isDeleteOpen}
 *   title="Usuń origin"
 *   message={<>Czy na pewno usunąć <strong>{dialogs.deleteItem?.slug}</strong>?</>}
 *   confirmLabel="Usuń"
 *   confirmColor="error"
 *   loading={deleting}
 *   onConfirm={handleDeleteConfirm}
 *   onClose={dialogs.closeDelete}
 * />
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  confirmColor = 'primary',
  loading = false,
  onConfirm,
  onClose,
}) => (
  <Dialog
    open={open}
    onClose={() => !loading && onClose()}
    maxWidth="xs"
    fullWidth
    PaperProps={{ sx: { borderRadius: 2 } }}
  >
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      {typeof message === 'string' ? (
        <DialogContentText>{message}</DialogContentText>
      ) : (
        message
      )}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant="contained"
        color={confirmColor}
        onClick={onConfirm}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);
