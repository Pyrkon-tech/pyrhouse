import React from 'react';
import { Grid, Card, Box, Typography, Chip, Avatar, IconButton, Tooltip } from '@mui/material';
import RoomIcon from '@mui/icons-material/Room';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

interface ServiceDeskCardsViewProps {
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

const ServiceDeskCardsView: React.FC<ServiceDeskCardsViewProps> = ({
  requests,
  types,
  onOpenDetails,
  assignButtonRefs,
  handleAssignDropdownOpen,
  isEditable
}) => {
  return (
    <Grid container spacing={1.5}>
      {requests.length === 0 ? (
        <Grid item xs={12}><Typography variant="body2">Brak zgłoszeń.</Typography></Grid>
      ) : requests.map(req => (
        <Grid item xs={12} sm={6} md={3} key={req.id}>
          <Card 
            sx={{ 
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              borderRadius: 1,
              boxShadow: 4,
              bgcolor: theme => theme.palette.background.paper,
              transition: 'box-shadow 0.2s, transform 0.2s',
              p: 1,
              minHeight: 110,
              '&:hover': {
                boxShadow: 8,
                transform: 'translateY(-2px) scale(1.01)',
              },
              cursor: 'pointer',
            }}
            onClick={() => onOpenDetails(req)}
          >
            <Box sx={{ p: 0.5, pb: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2 }}>
                <Typography variant="h6" fontWeight={800} sx={{ flex: 1, color: theme => theme.palette.text.primary, fontSize: 18, lineHeight: 1.2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{req.title}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
                <Typography variant="caption" sx={{ color: theme => theme.palette.text.secondary, fontStyle: 'italic', fontSize: 12 }}>
                  {new Date(req.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: theme => theme.palette.text.secondary, mb: 1, minHeight: 28, maxHeight: 32, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 14, fontWeight: 500, flex: 1 }}>
                {req.description}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                {req.priority && <Chip label={req.priority === 'high' ? 'Wysoki priorytet' : req.priority === 'medium' ? 'Średni priorytet' : 'Niski priorytet'} size="small" color={req.priority === 'high' ? 'error' : req.priority === 'medium' ? 'warning' : 'default'} sx={{ height: 22, fontSize: 12, px: 1, borderRadius: 1 }} />}
                {req.type && types[req.type] && <Chip label={types[req.type].name} size="small" sx={{ height: 22, fontSize: 12, px: 1, borderRadius: 1 }} />}
                {req.location && <Chip label={req.location} size="small" sx={{ height: 22, fontSize: 12, px: 1, borderRadius: 1, bgcolor: 'background.default' }} icon={<RoomIcon sx={{ fontSize: 16 }} />} />}
                {req.status && <Chip label={
                  req.status === 'new' ? 'Nowe' :
                  req.status === 'in_progress' ? 'W trakcie' :
                  req.status === 'waiting' ? 'Zablokowane' :
                  req.status === 'resolved' ? 'Ukończone' :
                  req.status === 'closed' ? 'Anulowane' : req.status
                } size="small" variant="outlined" color={
                  req.status === 'new' ? 'primary' :
                  req.status === 'in_progress' ? 'info' :
                  req.status === 'waiting' ? 'warning' :
                  req.status === 'resolved' ? 'success' :
                  'default'
                } sx={{ fontSize: 13, fontWeight: 600 }} />}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, py: 0.5, borderTop: theme => `1px solid ${theme.palette.divider}`, mt: 'auto' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.3, mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 22, height: 22, fontSize: 12, bgcolor: theme => theme.palette.background.default, color: theme => theme.palette.text.primary }}>{req.created_by_user?.username?.[0] || '?'}</Avatar>
                  <Typography variant="caption" sx={{ color: theme => theme.palette.text.secondary, fontSize: 13, fontWeight: 500 }}>Zgłosił: {req.created_by_user?.username || req.created_by}</Typography>
                </Box>
                <Box
                  ref={el => { if (req.id) assignButtonRefs.current[req.id] = el as HTMLDivElement | null; }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: isEditable ? 'pointer' : 'not-allowed', opacity: isEditable ? 1 : 0.7, borderRadius: 1, px: 0.5, py: 0.2, '&:hover': isEditable ? { bgcolor: 'action.hover' } : {}, transition: 'background 0.2s' }}
                  onClick={e => { e.stopPropagation(); if (isEditable) handleAssignDropdownOpen(req.id); }}
                  tabIndex={isEditable ? 0 : -1}
                  aria-disabled={!isEditable}
                  role="button"
                >
                  <Avatar sx={{ width: 22, height: 22, bgcolor: 'background.default', color: 'text.primary', fontWeight: 600, fontSize: 12 }}>
                    {req.assigned_to_user ? req.assigned_to_user.username[0]?.toUpperCase() : <PersonAddIcon fontSize="small" />}
                  </Avatar>
                  <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ fontSize: 12 }}>
                    {req.assigned_to_user ? req.assigned_to_user.username : 'Nie przypisano'}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Tooltip title="Szczegóły">
                  <IconButton size="small" sx={{ color: theme => theme.palette.primary.main, p: 0.5 }} onClick={e => { e.stopPropagation(); onOpenDetails(req); }}>
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ServiceDeskCardsView; 