import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, FormControl, Select, MenuItem, Tooltip, Button, useMediaQuery, useTheme } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import { useNavigate } from 'react-router-dom';
import { useQuests } from '../../hooks/useQuests';
import { useQuestStream } from '../../hooks/useQuestStream';
import { useServiceDeskStream } from '../../hooks/useServiceDeskStream';
import type { QuestEvent } from '../../types/quest.types';
import type { ServiceDeskSSEEvent } from '../../hooks/useServiceDeskStream';
import type { ServiceDeskRequest } from '../../types/servicedesk.types';
import { apiClient } from '../../services/apiClient';
import QuestDispatcherMap from './QuestDispatcherMap/QuestDispatcherMap';

const URGENCY_OPTIONS = [2, 4, 6, 8, 12, 24];
const URGENCY_KEY = 'dispatch_urgency_hours';

const getInitialUrgencyHours = (): number => {
  const stored = localStorage.getItem(URGENCY_KEY);
  const parsed = stored ? Number(stored) : NaN;
  return URGENCY_OPTIONS.includes(parsed) ? parsed : 8;
};

const DispatchPage: React.FC = () => {
  const theme = useTheme();
  const isMobileOrSmall = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [urgencyHours, setUrgencyHours] = useState<number>(getInitialUrgencyHours);
  const [sdRequests, setSdRequests] = useState<ServiceDeskRequest[]>([]);

  const { quests, fetchQuests } = useQuests();

  useEffect(() => {
    fetchQuests({ limit: 500 });
  }, [fetchQuests]);

  const fetchSdRequests = useCallback(async () => {
    try {
      const data = await apiClient.get<ServiceDeskRequest[]>(
        '/service-desk/requests?status=new,in_progress,waiting&limit=500'
      );
      setSdRequests(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore — dispatch map still works without SD data
    }
  }, []);

  useEffect(() => { fetchSdRequests(); }, [fetchSdRequests]);

  const onQuestEvent = useCallback((event: QuestEvent) => {
    if (event.type === 'sync_completed') fetchQuests({ limit: 500 });
  }, [fetchQuests]);
  const { connected: questSseConnected } = useQuestStream({ onEvent: onQuestEvent });

  const onSdEvent = useCallback((event: ServiceDeskSSEEvent) => {
    if (event.type === 'request_created' || event.type === 'request_updated') fetchSdRequests();
  }, [fetchSdRequests]);
  const { connected: sdSseConnected } = useServiceDeskStream({ onEvent: onSdEvent });

  const handleUrgencyChange = useCallback((hours: number) => {
    setUrgencyHours(hours);
    localStorage.setItem(URGENCY_KEY, String(hours));
  }, []);

  const handleQuestUpdated = useCallback(() => {
    fetchQuests({ limit: 500 });
  }, [fetchQuests]);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#060e1a';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  if (isMobileOrSmall) {
    return (
      <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: 'calc(100vh - 64px)', gap: 3, p: 4,
        textAlign: 'center',
      }}>
        <MapIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
        <Typography variant="h5" sx={{
          fontWeight: 700
        }}>
          Mapa Dispatch
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
            maxWidth: 360
          }}>
          Ten widok jest przeznaczony dla ekranów o szerokości minimum 960px
          (tablet poziomo, laptop, desktop).
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/home')}>
          Wróć do strony głównej
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'hidden', m: -3, p: 1, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: '#060e1a' }}>
      {/* Dispatch toolbar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 1.5, py: 0.75, bgcolor: '#060e1a',
        border: '1px solid #152535', borderRadius: 1.5, flexShrink: 0,
      }}>
        <Typography sx={{ color: '#3a7a8a', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, letterSpacing: 3, flex: 1 }}>
          DISPATCH
        </Typography>
        <Tooltip title={questSseConnected ? 'Zamówienia: real-time' : 'Zamówienia: brak połączenia'}>
          <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: questSseConnected ? 'success.main' : 'warning.main', display: 'inline-block' }} />
        </Tooltip>
        <Tooltip title={sdSseConnected ? 'Service Desk: real-time' : 'SD: brak połączenia'}>
          <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: sdSseConnected ? 'success.main' : 'warning.main', display: 'inline-block' }} />
        </Tooltip>
        <FormControl size="small">
          <Select
            value={urgencyHours}
            onChange={(e) => handleUrgencyChange(Number(e.target.value))}
            sx={{
              fontSize: 10, fontFamily: 'monospace', color: '#ff9800',
              bgcolor: '#040c18', height: 24,
              '& .MuiSelect-icon': { color: '#3a7a8a', fontSize: 14 },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1a3548' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff980066' },
              '& .MuiSelect-select': { py: 0, px: 0.75, pr: '20px !important' },
            }}
          >
            {URGENCY_OPTIONS.map(h => (
              <MenuItem key={h} value={h} sx={{ fontSize: 10, fontFamily: 'monospace' }}>{h}h</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <QuestDispatcherMap
        quests={quests}
        serviceDeskRequests={sdRequests}
        urgencyHours={urgencyHours}
        onQuestUpdated={handleQuestUpdated}
      />
    </Box>
  );
};

export default DispatchPage;
