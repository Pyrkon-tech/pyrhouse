import React from 'react';
import { Box, Typography } from '@mui/material';
import { PX_PER_HOUR_V, HOUR_AXIS_WIDTH } from '../constants';

interface VerticalHourAxisProps {
  minHour: number;
  maxHour: number;
}

const VerticalHourAxis: React.FC<VerticalHourAxisProps> = ({ minHour, maxHour }) => {
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
  const totalHeight = (maxHour - minHour) * PX_PER_HOUR_V;

  return (
    <Box
      sx={{
        width: HOUR_AXIS_WIDTH,
        height: totalHeight,
        position: 'relative',
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {hours.map((hour) => (
        <Box
          key={hour}
          sx={{
            position: 'absolute',
            top: (hour - minHour) * PX_PER_HOUR_V,
            right: 0,
            left: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            pr: 0.75,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              color: 'text.disabled',
              lineHeight: 1,
              transform: 'translateY(-5px)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {String(hour % 24).padStart(2, '0')}:00
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default VerticalHourAxis;
