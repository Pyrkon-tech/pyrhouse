import React from 'react';
import { Box } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';

const RosterDropZone: React.FC<{ isOver: boolean }> = ({ isOver }) => {
  const { setNodeRef } = useDroppable({ id: 'roster', data: { type: 'roster' } });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        mt: 1,
        p: '6px 8px',
        borderRadius: 1,
        border: '1px dashed',
        borderColor: isOver ? 'error.main' : 'divider',
        bgcolor: isOver ? 'rgba(239,83,80,0.07)' : 'transparent',
        textAlign: 'center',
        transition: 'all 0.15s',
        fontSize: 11,
        color: isOver ? 'error.main' : 'text.disabled',
      }}
    >
      {isOver ? 'Usuń z harmonogramu' : 'Przeciągnij tutaj aby usunąć'}
    </Box>
  );
};

export default RosterDropZone;
