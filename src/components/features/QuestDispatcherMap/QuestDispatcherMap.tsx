import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Quest } from '../../../types/quest.types';
import type { ServiceDeskRequest } from '../../../types/servicedesk.types';
import type { DispatchAssignment, DispatchModalState, Volunteer } from './types';
import type { OnDutyVolunteer } from '../../../types/schedule.types';
import { groupQuestsByZone, groupServiceDeskByZone } from './utils/matching';
import { ZONES } from './constants/zones';
import { useOnDutyRoster } from '../../../hooks/useOnDutyRoster';
import { useLocations } from '../../../hooks/useLocations';
import { updateQuestLocationAPI } from '../../../services/questService';
import MapCanvas from './components/MapCanvas';
import DispatchSidebar from './components/DispatchSidebar';
import VolunteerPanel from './components/VolunteerPanel';
import DispatchModal from './components/DispatchModal';
import DevTimeSimulator from './components/DevTimeSimulator';

const IS_DEV = (import.meta.env.DEV && window.location.hostname === 'localhost')
  || import.meta.env.VITE_ENABLE_TIME_SIMULATOR === 'true';

function mapOnDutyToVolunteer(entry: OnDutyVolunteer): Volunteer {
  return {
    id: entry.volunteer_id,
    user_id: entry.user_id,
    username: entry.user?.username ?? entry.nickname,
    discord_username: entry.user?.discord_username ?? null,
    avatar_url: entry.user?.avatar_url ?? null,
    fullname: entry.user?.fullname ?? null,
    status: entry.status,
    current_mission: entry.current_mission,
    is_unlinked: entry.user_id === null,
  };
}

interface QuestDispatcherMapProps {
  quests: Quest[];
  onQuestUpdated?: () => void;
  serviceDeskRequests?: ServiceDeskRequest[];
  urgencyHours?: number;
  showVolunteerPanel?: boolean;
}

const QuestDispatcherMap: React.FC<QuestDispatcherMapProps> = ({
  quests,
  onQuestUpdated,
  serviceDeskRequests = [],
  urgencyHours = 8,
  showVolunteerPanel = true,
}) => {
  const navigate = useNavigate();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [simulatedTime, setSimulatedTime] = useState<Date | undefined>(undefined);
  const { locations, refetch: fetchLocations } = useLocations();

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  // Map: location_id → pavilion (canonical, from DB) — used for reliable zone matching
  const locationPavilionMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const loc of locations) {
      if (loc.pavilion) map.set(loc.id, loc.pavilion);
    }
    return map;
  }, [locations]);

  const questsByZone = useMemo(() => groupQuestsByZone(quests, locationPavilionMap), [quests, locationPavilionMap]);
  const sdByZone = useMemo(() => groupServiceDeskByZone(serviceDeskRequests), [serviceDeskRequests]);

  const { roster, fetchRoster } = useOnDutyRoster(simulatedTime);
  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  const volunteers = useMemo(() => roster.map(mapOnDutyToVolunteer), [roster]);

  // Dispatch modal state
  const [dispatchModal, setDispatchModal] = useState<DispatchModalState>({
    open: false,
    quest_id: null,
    zone_id: null,
  });

  const modalQuest = useMemo(
    () => dispatchModal.quest_id ? quests.find(q => q.id === dispatchModal.quest_id) ?? null : null,
    [dispatchModal.quest_id, quests],
  );
  const modalZone = useMemo(
    () => dispatchModal.zone_id ? ZONES.find(z => z.id === dispatchModal.zone_id) ?? null : null,
    [dispatchModal.zone_id],
  );

  // Open dispatch modal for a specific quest
  const handleDispatchQuest = useCallback((quest: Quest) => {
    // Find zone for this quest
    const zoneId = Object.entries(questsByZone).find(
      ([, zoneQuests]) => zoneQuests.some(q => q.id === quest.id),
    )?.[0] ?? null;
    setDispatchModal({ open: true, quest_id: quest.id, zone_id: zoneId });
  }, [questsByZone]);

  // Open dispatch modal from zone icon click — pick first pending quest
  const handleZoneDispatch = useCallback((zoneId: string) => {
    const zoneQuests = questsByZone[zoneId] ?? [];
    const pendingQuest = zoneQuests.find(q => q.status === 'pending');
    if (pendingQuest) {
      setDispatchModal({ open: true, quest_id: pendingQuest.id, zone_id: zoneId });
    }
  }, [questsByZone]);

  const handleCloseDispatch = useCallback(() => {
    setDispatchModal({ open: false, quest_id: null, zone_id: null });
  }, []);

  const handleAssignQuestLocation = useCallback(async (questId: string, locationId: number) => {
    await updateQuestLocationAPI(questId, { location_id: locationId, save_mapping: true });
    onQuestUpdated?.();
  }, [onQuestUpdated]);

  const handleDispatch = useCallback((assignment: DispatchAssignment) => {
    handleCloseDispatch();
    navigate(`/quests/${assignment.quest_id}`, {
      state: {
        autoOpenTransfer: true,
        volunteerIds: assignment.user_ids,
      },
    });
  }, [handleCloseDispatch, navigate]);

  return (
    <Box sx={{ display: 'flex', gap: sidebarOpen ? 2 : 1, height: '100%', minHeight: 520 }}>
      {/* Left column: map + volunteer panel, sized to content */}
      <Box sx={{ flex: 1, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ position: 'relative' }}>
          <MapCanvas
            questsByZone={questsByZone}
            sdByZone={sdByZone}
            selectedZoneId={selectedZoneId}
            onZoneSelect={setSelectedZoneId}
            onZoneDispatch={handleZoneDispatch}
            urgencyHours={urgencyHours}
            simulatedTime={simulatedTime}
          />
          {IS_DEV && (
            <DevTimeSimulator
              simulatedTime={simulatedTime}
              onChange={(t) => {
                setSimulatedTime(t);
                fetchRoster(t);
              }}
            />
          )}
        </Box>
        {showVolunteerPanel && <VolunteerPanel volunteers={volunteers} />}
      </Box>
      {/* Right column: sidebar or thin expand strip */}
      {sidebarOpen ? (
        <DispatchSidebar
          selectedZoneId={selectedZoneId}
          questsByZone={questsByZone}
          sdByZone={sdByZone}
          onZoneSelect={setSelectedZoneId}
          onDispatchQuest={handleDispatchQuest}
          locations={locations}
          onAssignQuestLocation={handleAssignQuestLocation}
          onCollapse={() => setSidebarOpen(false)}
        />
      ) : (
        <Tooltip title="Otwórz panel" placement="left">
          <Box
            onClick={() => setSidebarOpen(true)}
            sx={{
              width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: '#060e1a', border: '1px solid #152535', borderRadius: 2,
              cursor: 'pointer', color: '#3a7a8a',
              '&:hover': { bgcolor: '#0a1929', color: '#ff9800', borderColor: '#ff980044' },
              transition: 'all 0.15s ease',
            }}
          >
            <svg width={12} height={12} viewBox="0 0 12 12">
              <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </Box>
        </Tooltip>
      )}
      {/* Dispatch modal */}
      <DispatchModal
        open={dispatchModal.open}
        quest={modalQuest}
        zone={modalZone}
        volunteers={volunteers}
        onClose={handleCloseDispatch}
        onDispatch={handleDispatch}
      />
    </Box>
  );
};

export default QuestDispatcherMap;
