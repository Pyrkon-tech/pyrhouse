import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, Tabs, Tab, CircularProgress, Alert, Dialog, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, OpenInNew as OpenInNewIcon, Task as TaskIcon, ViewModule as ViewModuleIcon, ViewList as ViewListIcon } from '@mui/icons-material';
import { getApiUrl } from '../../../config/api';
import ServiceDeskForm from './ServiceDeskForm';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { AppSnackbar } from '../../ui/AppSnackbar';
import { useSnackbarMessage } from '../../../hooks/useSnackbarMessage';
import { useServiceDeskTypes } from '../../../hooks/useServiceDeskTypes';
import { useServiceDeskRequests } from '../../../hooks/useServiceDeskRequests';
import { usePageVisibility } from '../../../hooks/usePageVisibility';
import { useServiceDeskUsers } from '../../../hooks/useServiceDeskUsers';
import ServiceDeskCardsView from './components/ServiceDeskCardsView';
import ServiceDeskListView from './components/ServiceDeskListView';
import ServiceDeskDetailsModal from './components/ServiceDeskDetailsModal';
import { addUserPointsAPI } from '../../../services/userService';

const ServiceDeskPage: React.FC = () => {
  const [status, setStatus] = useState('new');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const { types, loading: typesLoading, error: typesError } = useServiceDeskTypes();
  const { requests, loading, error, refresh } = useServiceDeskRequests(status, search);
  const isPageVisible = usePageVisibility();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();
  const { users } = useServiceDeskUsers();

  const [openForm, setOpenForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [assignDropdownOpenId, setAssignDropdownOpenId] = useState<string | null>(null);
  const assignButtonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [menuWidth, setMenuWidth] = useState<number>(220);
  const isEditable = selectedRequest && selectedRequest.status !== 'closed' && selectedRequest.status !== 'resolved';

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const changeStatus = async (id: string, newStatus: string, onSuccess?: () => void) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(getApiUrl(`/service-desk/requests/${id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Błąd zmiany statusu');
      showSnackbar('success', 'Status zmieniony pomyślnie');
      onSuccess?.();
    } catch (e) {
      showSnackbar('error', 'Nie udało się zmienić statusu');
    }
  };

  const assignUser = async (id: string, assigned_to_id: number, onSuccess?: () => void) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(getApiUrl(`/service-desk/requests/${id}/assign`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assigned_to_id }),
      });
      if (!res.ok) throw new Error('Błąd przypisywania użytkownika');
      showSnackbar('success', 'Użytkownik przypisany pomyślnie');
      onSuccess?.();
    } catch (e) {
      showSnackbar('error', 'Nie udało się przypisać użytkownika');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const request = requests.find(r => r.id === id);
    const assignedUserId = request?.assigned_to_user?.id;
    await changeStatus(id, newStatus, async () => {
      refresh();
      if (selectedRequest) {
        setSelectedRequest((prev: any) => ({ ...prev, status: newStatus }));
      }
      if (newStatus === 'resolved' && assignedUserId) {
        try {
          await addUserPointsAPI(assignedUserId, 10);
          showSnackbar('success', `Przypisano 10 punktów użytkownikowi za rozwiązanie zgłoszenia!`);
        } catch (e: any) {
          showSnackbar('error', 'Nie udało się dodać punktów użytkownikowi', e?.message || '');
        }
      }
    });
  };

  const handleOpenDetails = (request: any) => {
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedRequest(null);
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPageVisible) {
      intervalId = setInterval(() => {
        refresh();
      }, 3 * 60 * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPageVisible, refresh]);

  useEffect(() => {
    if (!assignDropdownOpenId) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        assignDropdownOpenId &&
        assignButtonRefs.current[assignDropdownOpenId] &&
        !assignButtonRefs.current[assignDropdownOpenId]?.contains(event.target as Node)
      ) {
        setAssignDropdownOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [assignDropdownOpenId]);

  const handleTabChange = (_: any, value: string) => setStatus(value);

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'cards' | 'list') => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleAssignDropdownOpen = (reqId: string) => {
    setAssignDropdownOpenId(reqId);
    setTimeout(() => {
      const btn = assignButtonRefs.current[reqId];
      if (btn) setMenuWidth(btn.offsetWidth);
    }, 0);
  };

  const handleAssignDropdownClose = () => setAssignDropdownOpenId(null);

  const changePriority = async (id: string, newPriority: string, onSuccess?: () => void) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(getApiUrl(`/service-desk/requests/${id}/priority`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error('Błąd zmiany priorytetu');
      showSnackbar('success', 'Priorytet zmieniony pomyślnie');
      onSuccess?.();
    } catch (e) {
      showSnackbar('error', 'Nie udało się zmienić priorytetu');
    }
  };

  const handlePriorityChange = async (id: string, newPriority: string) => {
    await changePriority(id, newPriority, () => {
      refresh();
      if (selectedRequest) {
        setSelectedRequest((prev: any) => ({ ...prev, priority: newPriority }));
      }
    });
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 0.5, sm: 1, md: 4 } }}>
    <Box sx={{ 
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        mb: 2,
        gap: { xs: 1, sm: 2 },
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ fontSize: { xs: 26, sm: 32 } }}>
            Service Desk
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <OpenInNewIcon sx={{ color: theme => theme.palette.primary.main, fontSize: 20 }} />
            <a
              href="/servicedesk/request"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'inherit',
                fontWeight: 500,
                fontSize: '1rem',
                letterSpacing: 0.1,
                cursor: 'pointer',
                transition: 'color 0.2s, text-decoration 0.2s',
                textDecoration: 'none',
              }}
              onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              Otwórz publiczny formularz
            </a>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <Button variant="contained" color="primary" onClick={() => setOpenForm(true)}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              fontSize: { xs: '1rem', sm: '0.98rem' },
              py: { xs: 0.9, sm: 0.7 },
              borderRadius: 1,
              fontWeight: 600,
              minWidth: 160,
              boxShadow: 'none',
            }}
          >
            + Nowe zgłoszenie
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              fontSize: { xs: '1rem', sm: '0.98rem' },
              py: { xs: 0.8, sm: 0.6 },
              borderRadius: 1,
              fontWeight: 500,
              minWidth: 120,
              boxShadow: 'none',
            }}
          >
            Odśwież
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, mt: { xs: 0.5, sm: 0 }, pr: { xs: 0, sm: 0.5 } }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="tryb widoku"
          size="small"
          sx={{
            background: theme => theme.palette.background.paper,
            borderRadius: 1,
            boxShadow: 'none',
            gap: 0,
          }}
        >
          <ToggleButton value="cards" aria-label="widok kart" sx={{ borderRadius: '8px 0 0 8px', px: 1.5, py: 0.7 }}>
            <ViewModuleIcon />
          </ToggleButton>
          <ToggleButton value="list" aria-label="widok listy" sx={{ borderRadius: '0 8px 8px 0', px: 1.5, py: 0.7 }}>
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Tabs value={status} onChange={handleTabChange} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        <Tab label="Nowe" value="new" />
        <Tab label="W trakcie" value="in_progress" />
        <Tab label="Zablokowane" value="waiting" />
        <Tab label="Ukończone" value="resolved" />
        <Tab label="Anulowane" value="closed" />
        <Tab label="Wszystkie" value="all" />
      </Tabs>
      <TextField
        fullWidth
        placeholder="Szukaj po tytule, opisie lub lokalizacji..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        sx={{ mb: 3, fontSize: { xs: 16, sm: 18 } }}
      />
      {typesError && <Alert severity="error">{typesError}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {(loading || typesLoading) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : (
        viewMode === 'cards' ? (
          <ServiceDeskCardsView
            requests={requests}
            types={types}
            users={users}
            isMobile={isMobile}
            onOpenDetails={handleOpenDetails}
            onAssign={async (requestId, user) => {
              await assignUser(requestId, user.id, () => {
                refresh();
                if (selectedRequest && selectedRequest.id === requestId) {
                  setSelectedRequest((prev: any) => ({ ...prev, assigned_to_user: user }));
                }
              });
            }}
            assignDropdownOpenId={assignDropdownOpenId}
            assignButtonRefs={assignButtonRefs}
            menuWidth={menuWidth}
            handleAssignDropdownOpen={handleAssignDropdownOpen}
            handleAssignDropdownClose={handleAssignDropdownClose}
            isEditable={isEditable}
          />
        ) : (
          <ServiceDeskListView
            requests={requests}
            types={types}
            users={users}
            isMobile={isMobile}
            onOpenDetails={handleOpenDetails}
            onAssign={async (requestId, user) => {
              await assignUser(requestId, user.id, () => {
                refresh();
                if (selectedRequest && selectedRequest.id === requestId) {
                  setSelectedRequest((prev: any) => ({ ...prev, assigned_to_user: user }));
                }
              });
            }}
            assignDropdownOpenId={assignDropdownOpenId}
            assignButtonRefs={assignButtonRefs}
            menuWidth={menuWidth}
            handleAssignDropdownOpen={handleAssignDropdownOpen}
            handleAssignDropdownClose={handleAssignDropdownClose}
            isEditable={isEditable}
          />
        )
      )}
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />
      <ServiceDeskDetailsModal
        open={isDetailsModalOpen}
        request={selectedRequest}
        types={types}
        users={users}
        isMobile={isMobile}
        onClose={handleCloseDetails}
        onAssign={async (requestId, user) => {
          await assignUser(requestId, user.id, () => {
            refresh();
            if (selectedRequest && selectedRequest.id === requestId) {
              setSelectedRequest((prev: any) => ({ ...prev, assigned_to_user: user }));
            }
          });
        }}
        assignDropdownOpenId={assignDropdownOpenId}
        assignButtonRefs={assignButtonRefs}
        menuWidth={menuWidth}
        handleAssignDropdownOpen={handleAssignDropdownOpen}
        handleAssignDropdownClose={handleAssignDropdownClose}
        isEditable={isEditable}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
      />
      <Dialog 
        open={openForm} 
        onClose={() => setOpenForm(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: theme => ({
            borderRadius: 4,
            background: theme.palette.mode === 'dark' ? 'rgba(32,32,40,0.98)' : 'rgba(255,255,255,0.98)',
            color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.text.primary,
            backdropFilter: 'blur(10px)',
            boxShadow: 24,
            p: { xs: 2, sm: 4 },
            maxWidth: 520,
            mx: 'auto',
            overflow: 'visible',
            maxHeight: '100dvh',
            overflowY: 'auto',
            minHeight: 0,
          })
        }}
            sx={{ 
          '& .MuiDialog-container': {
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(30,30,40,0.45)',
            backdropFilter: 'blur(2px)',
          }
        }}
      >
        <Box sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          minWidth: 0,
          width: '100%',
          pb: { xs: 6, sm: 2 },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TaskIcon color="warning" sx={{ fontSize: 24, mr: 1 }} />
            <Typography variant="h6" fontWeight={600} color="primary.main">
              Nowe zgłoszenie
          </Typography>
        </Box>
          <ServiceDeskForm
            title=""
            subtitle=""
            onSuccess={() => { setOpenForm(false); refresh(); }}
            onError={() => {}}
            className="servicedesk-modal-form"
          />
        </Box>
      </Dialog>
    </Box>
  );
};

export default ServiceDeskPage;
