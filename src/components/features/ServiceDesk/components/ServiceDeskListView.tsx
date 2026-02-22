import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Avatar, Typography, IconButton, Menu, MenuItem, Tooltip, Box, Alert } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

interface ServiceDeskListViewProps {
  requests: any[];
  types: Record<string, any>;
  users: any[];
  isMobile: boolean;
  onOpenDetails: (request: any) => void;
  onAssign: (requestId: string, user: any) => void;
  assignDropdownOpenId: string | null;
  assignButtonRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  menuWidth: number;
  handleAssignDropdownOpen: (reqId: string) => void;
  handleAssignDropdownClose: () => void;
  isEditable: boolean;
}

const ServiceDeskListView: React.FC<ServiceDeskListViewProps> = ({
  requests,
  types,
  users,
  onOpenDetails,
  onAssign,
  assignDropdownOpenId,
  assignButtonRefs,
  menuWidth,
  handleAssignDropdownOpen,
  handleAssignDropdownClose,
  isEditable
}) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 6 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Tytuł</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Priorytet</TableCell>
            <TableCell>Typ</TableCell>
            <TableCell>Zgłosił</TableCell>
            <TableCell>Data utworzenia</TableCell>
            <TableCell align="right">Akcje</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Alert severity="info">Brak zgłoszeń.</Alert>
              </TableCell>
            </TableRow>
          ) : requests.map(req => (
            <TableRow
              key={req.id}
              hover
              onClick={() => onOpenDetails(req)}
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: theme => theme.palette.action.hover } }}
            >
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {req.title}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={req.status === 'new' ? 'Nowe' : 
                         req.status === 'in_progress' ? 'W trakcie' :
                         req.status === 'waiting' ? 'Zablokowane' :
                         req.status === 'resolved' ? 'Ukończone' : 'Anulowane'}
                  size="small"
                  variant="outlined"
                  color={req.status === 'new' ? 'primary' :
                         req.status === 'in_progress' ? 'info' :
                         req.status === 'waiting' ? 'warning' :
                         req.status === 'resolved' ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={req.priority === 'high' ? 'Wysoki' : req.priority === 'medium' ? 'Średni' : 'Niski'}
                  size="small"
                  color={req.priority === 'high' ? 'error' : req.priority === 'medium' ? 'warning' : 'default'}
                />
              </TableCell>
              <TableCell>
                {req.type && types[req.type] && (
                  <Chip
                    label={types[req.type].name}
                    size="small"
                    variant="outlined"
                  />
                )}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: 13 }}>
                    {req.created_by_user?.username?.[0] || '?'}
                  </Avatar>
                  <Typography variant="body2">
                    {req.created_by_user?.username || req.created_by}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {new Date(req.created_at).toLocaleString('pl-PL')}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Przypisz użytkownika">
                  <Box
                    ref={el => { if (req.id) assignButtonRefs.current[req.id] = el as HTMLDivElement | null; }}
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, cursor: isEditable ? 'pointer' : 'not-allowed', opacity: isEditable ? 1 : 0.7, borderRadius: 2, px: 1, py: 0.5, '&:hover': isEditable ? { bgcolor: 'action.hover' } : {}, transition: 'background 0.2s' }}
                    onClick={e => { e.stopPropagation(); if (isEditable) handleAssignDropdownOpen(req.id); }}
                    tabIndex={isEditable ? 0 : -1}
                    aria-disabled={!isEditable}
                    role="button"
                  >
                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'background.default', color: 'text.primary', fontWeight: 600 }}>
                      {req.assigned_to_user ? req.assigned_to_user.username[0]?.toUpperCase() : <PersonAddIcon fontSize="small" />}
                    </Avatar>
                    <Typography variant="body2" fontWeight={500} color="text.secondary">
                      {req.assigned_to_user ? req.assigned_to_user.username : 'Nie przypisano'}
                    </Typography>
                  </Box>
                </Tooltip>
                <Menu
                  anchorEl={req?.id ? assignButtonRefs.current[req.id] ?? undefined : undefined}
                  open={assignDropdownOpenId === req.id}
                  onClose={handleAssignDropdownClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  PaperProps={{ sx: { minWidth: menuWidth } }}
                >
                  {users.map(user => (
                    <MenuItem
                      key={user.id}
                      selected={req.assigned_to_user?.id === user.id}
                      onClick={() => {
                        onAssign(req.id, user);
                        handleAssignDropdownClose();
                      }}
                      disabled={!isEditable}
                    >
                      <Avatar sx={{ width: 24, height: 24, mr: 1 }}>{user.username[0]?.toUpperCase()}</Avatar>
                      {user.username}
                    </MenuItem>
                  ))}
                </Menu>
                <IconButton size="small" onClick={e => { e.stopPropagation(); onOpenDetails(req); }}>
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ServiceDeskListView; 