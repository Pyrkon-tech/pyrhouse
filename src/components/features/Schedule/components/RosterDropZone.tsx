import React, { useState } from 'react';
import { Box } from '@mui/material';

interface DragPayload {
  assignmentId: number;
}

interface RosterDropZoneProps {
  onUnassignDrop?: (assignmentId: number) => void;
}

const RosterDropZone: React.FC<RosterDropZoneProps> = ({ onUnassignDrop }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!onUnassignDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!onUnassignDrop) return;
    try {
      const data: DragPayload = JSON.parse(e.dataTransfer.getData('application/json'));
      onUnassignDrop(data.assignmentId);
    } catch { /* ignore malformed data */ }
  };

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        p: '8px 10px',
        borderRadius: 1.5,
        border: '1.5px dashed',
        borderColor: dragOver ? 'error.main' : 'action.disabled',
        bgcolor: dragOver ? 'rgba(239,68,68,0.1)' : 'rgba(239,83,80,0.03)',
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 600,
        color: dragOver ? 'error.main' : 'text.secondary',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        flexShrink: 0,
        transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
      }}
    >
      <span style={{ fontSize: 12 }}>✕</span>
      {dragOver ? 'Upuść aby odpisać' : 'Przeciągnij tutaj aby odpisać'}
    </Box>
  );
};

export default RosterDropZone;
