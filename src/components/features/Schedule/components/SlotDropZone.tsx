import React from 'react';
import { Box } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';

const SlotDropZone: React.FC<{
  slotId: number;
  left: number;
  width: number;
  contentHeight: number;
  isOver: boolean;
}> = ({ slotId, left, width, contentHeight, isOver }) => {
  const { setNodeRef } = useDroppable({
    id: `slot:${slotId}`,
    data: { type: 'slot', slotId },
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: left + 1,
        width: width - 2,
        height: contentHeight,
        border: '2px solid',
        borderColor: isOver ? 'primary.main' : 'transparent',
        bgcolor: isOver ? 'rgba(255,152,0,0.08)' : 'transparent',
        borderRadius: 1,
        transition: 'all 0.15s',
        zIndex: 0,
        pointerEvents: 'all',
      }}
    />
  );
};

export default SlotDropZone;
