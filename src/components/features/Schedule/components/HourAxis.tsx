import React from 'react';
import { Box, Typography } from '@mui/material';
import { PX_PER_HOUR, HOUR_AXIS_H } from '../constants';

const HourAxis: React.FC<{ minHour: number; maxHour: number; width: number }> = ({ minHour, maxHour, width }) => (
  <Box
    sx={{
      position: 'relative',
      width,
      height: HOUR_AXIS_H,
      borderBottom: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.default',
      flexShrink: 0,
    }}
  >
    {Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i).map((hour) => (
      <Box
        key={hour}
        sx={{
          position: 'absolute',
          left: (hour - minHour) * PX_PER_HOUR,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box sx={{ width: 1, height: 8, bgcolor: 'divider', alignSelf: 'flex-end', mb: '2px' }} />
        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', ml: 0.4, whiteSpace: 'nowrap', lineHeight: 1 }}>
          {String(hour % 24).padStart(2, '0')}:00
        </Typography>
      </Box>
    ))}
  </Box>
);

export default HourAxis;
