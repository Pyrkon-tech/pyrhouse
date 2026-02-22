import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Quest } from '../../../types/quest.types';
import type { Volunteer, DispatchAssignment, DispatchModalState } from './types';
import { groupQuestsByZone } from './utils/matching';
import { MOCK_VOLUNTEERS } from './constants/mockVolunteers';
import { ZONES } from './constants/zones';
import { useLocations } from '../../../hooks/useLocations';
import { updateQuestLocationAPI } from '../../../services/questService';
import MapCanvas from './components/MapCanvas';
import DispatchSidebar from './components/DispatchSidebar';
import VolunteerPanel from './components/VolunteerPanel';
import DispatchModal from './components/DispatchModal';

interface QuestDispatcherMapProps {
  quests: Quest[];
  onQuestUpdated?: () => void;
}

const QuestDispatcherMap: React.FC<QuestDispatcherMapProps> = ({ quests, onQuestUpdated }) => {
  const navigate = useNavigate();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
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
  const [volunteers, setVolunteers] = useState<Volunteer[]>(MOCK_VOLUNTEERS);

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
    // Update volunteer statuses locally
    const zone = ZONES.find(z => z.id === assignment.zone_id);
    setVolunteers(prev => prev.map(v =>
      assignment.volunteer_ids.includes(v.id)
        ? { ...v, status: 'on_mission' as const, current_mission: zone ? `Pawilon ${zone.label.replace('\n', ' ')}` : undefined }
        : v,
    ));
    handleCloseDispatch();
    navigate(`/quests/${assignment.quest_id}`);
  }, [handleCloseDispatch, navigate]);

  return (
    <Box sx={{ display: 'flex', gap: 2, minHeight: 520 }}>
      {/* Left column: map + volunteer panel */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <MapCanvas
          questsByZone={questsByZone}
          selectedZoneId={selectedZoneId}
          onZoneSelect={setSelectedZoneId}
          onZoneDispatch={handleZoneDispatch}
          debugMode={true} // Set to true to enable polygon tracing debug tools
        />
        <VolunteerPanel volunteers={volunteers} />
      </Box>
      {/* Right column: sidebar */}
      <DispatchSidebar
        selectedZoneId={selectedZoneId}
        questsByZone={questsByZone}
        onZoneSelect={setSelectedZoneId}
        onDispatchQuest={handleDispatchQuest}
        locations={locations}
        onAssignQuestLocation={handleAssignQuestLocation}
      />
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
