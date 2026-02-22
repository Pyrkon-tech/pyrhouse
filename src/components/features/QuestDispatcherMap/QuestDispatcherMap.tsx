import React, { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import type { Quest } from '../../../types/quest.types';
import { groupQuestsByZone } from './utils/matching';
import MapCanvas from './components/MapCanvas';
import DispatchSidebar from './components/DispatchSidebar';

interface QuestDispatcherMapProps {
  quests: Quest[];
}

const QuestDispatcherMap: React.FC<QuestDispatcherMapProps> = ({ quests }) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const questsByZone = useMemo(() => groupQuestsByZone(quests), [quests]);

  return (
    <Box sx={{ display: 'flex', gap: 2, minHeight: 520 }}>
      <MapCanvas
        questsByZone={questsByZone}
        selectedZoneId={selectedZoneId}
        onZoneSelect={setSelectedZoneId}
      />
      <DispatchSidebar
        selectedZoneId={selectedZoneId}
        questsByZone={questsByZone}
        onZoneSelect={setSelectedZoneId}
      />
    </Box>
  );
};

export default QuestDispatcherMap;
