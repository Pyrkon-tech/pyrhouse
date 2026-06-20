import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import ScheduleDetailPage from './ScheduleDetailPage';
import MobileScheduleView from './MobileScheduleView';

/**
 * Route entry for the duty schedule.
 *
 * On small screens the full editing calendar (drag/drop, slot CRUD) is unusable,
 * so we render a read-only, mobile-friendly preview instead. Desktop/tablet-landscape
 * (>= md) keeps the full editing experience.
 */
const ScheduleViewGate: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return isMobile ? <MobileScheduleView /> : <ScheduleDetailPage />;
};

export default ScheduleViewGate;
