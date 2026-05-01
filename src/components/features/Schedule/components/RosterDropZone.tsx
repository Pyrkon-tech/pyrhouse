import React from 'react';
import { Box } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';

const RosterDropZone: React.FC<{ isOver: boolean }> = ({ isOver }) => {
  const { setNodeRef } = useDroppable({ id: 'roster', data: { type: 'roster' } });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        p: '8px 10px',
        borderRadius: 1.5,
        border: '1.5px dashed',
        borderColor: isOver ? 'error.main' : 'action.disabled',
        bgcolor: isOver ? 'rgba(239,83,80,0.10)' : 'rgba(239,83,80,0.03)',
        textAlign: 'center',
        transition: 'all 0.2s',
        fontSize: 11,
        fontWeight: 600,
        color: isOver ? 'error.main' : 'text.secondary',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        position: 'sticky',
        bottom: 0,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14 }}>🗑</span>
      {isOver ? 'Usuń z harmonogramu' : 'Przeciągnij aby usunąć'}
    </Box>
  );
};

export default RosterDropZone;
