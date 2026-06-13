import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import DeleteIcon from '@mui/icons-material/Delete';
import type { SlotContextMenuState } from '../types';

interface SlotContextMenuProps {
  state: SlotContextMenuState | null;
  onClose: () => void;
  onEdit: (slotId: number, anchorEl: HTMLElement) => void;
  onDuplicate: (slotId: number) => void;
  onRemoveAssignment: (assignmentId: number) => void;
  onDeleteSlot: (slotId: number) => void;
}

const SlotContextMenu: React.FC<SlotContextMenuProps> = ({
  state,
  onClose,
  onEdit,
  onDuplicate,
  onRemoveAssignment,
  onDeleteSlot,
}) => {
  if (!state) return null;

  const isFestival = state.slotType === 'festival';

  const handleEdit = () => {
    // Find a DOM element near the context menu position to use as anchor
    const el = document.elementFromPoint(state.x, state.y) as HTMLElement | null;
    if (el) onEdit(state.slotId, el);
    onClose();
  };

  const handleDuplicate = () => { onDuplicate(state.slotId); onClose(); };
  const handleRemove = () => { if (state.assignmentId) onRemoveAssignment(state.assignmentId); onClose(); };
  const handleDelete = () => { onDeleteSlot(state.slotId); onClose(); };

  return (
    <Menu
      open
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={{ top: state.y, left: state.x }}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            minWidth: 180,
          },
        },
      }}
    >
      <MenuItem onClick={handleEdit} dense>
        <ListItemIcon><EditIcon sx={{ fontSize: 16 }} /></ListItemIcon>
        <ListItemText slotProps={{
          primary: { sx: { fontSize: '0.8rem' } }
        }}>Edytuj slot</ListItemText>
      </MenuItem>
      {!isFestival && (
        <MenuItem onClick={handleDuplicate} dense>
          <ListItemIcon><ContentCopyIcon sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText slotProps={{
            primary: { sx: { fontSize: '0.8rem' } }
          }}>Duplikuj slot</ListItemText>
        </MenuItem>
      )}
      {state.assignmentId != null && [
        <Divider key="div" />,
        <MenuItem key="remove" onClick={handleRemove} dense>
          <ListItemIcon><PersonRemoveIcon sx={{ fontSize: 16, color: 'warning.main' }} /></ListItemIcon>
          <ListItemText slotProps={{
            primary: { sx: { fontSize: '0.8rem', color: 'warning.main' } }
          }}>Usuń przypisanie</ListItemText>
        </MenuItem>,
      ]}
      {!isFestival && (
        <>
          <Divider />
          <MenuItem onClick={handleDelete} dense>
            <ListItemIcon><DeleteIcon sx={{ fontSize: 16, color: 'error.main' }} /></ListItemIcon>
            <ListItemText slotProps={{
              primary: { sx: { fontSize: '0.8rem', color: 'error.main' } }
            }}>Usuń slot</ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );
};

export default SlotContextMenu;
