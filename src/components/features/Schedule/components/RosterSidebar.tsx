import React, { useState } from 'react';
import { Box, Typography, TextField, Tooltip, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import type { ScheduleSlot, ScheduleVolunteer } from '../../../../types/schedule.types';
import { ROSTER_WIDTH, SIDEBAR_COLLAPSED_W } from '../constants';
import { avatarColor } from '../utils';
import RosterVolunteerCard from './RosterVolunteerCard';
import RosterDropZone from './RosterDropZone';
import LinkAccountsDialog from './LinkAccountsDialog';

interface RosterSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  volunteers: ScheduleVolunteer[];
  allVolunteers: ScheduleVolunteer[];
  slots: ScheduleSlot[];
  canEdit: boolean;
  isAdmin?: boolean;
  rosterSearch: string;
  onSearchChange: (v: string) => void;
  highlightedVolunteerId: number | null;
  onToggleHighlight: (id: number) => void;
  onUnassignDrop?: (assignmentId: number) => void;
  onDeleteVolunteer?: (volunteerId: number) => void;
  onVolunteerLinked?: (volunteerId: number, userId: number | null) => void;
}

const RosterSidebar: React.FC<RosterSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  volunteers,
  allVolunteers,
  slots,
  canEdit,
  isAdmin,
  rosterSearch,
  onSearchChange,
  highlightedVolunteerId,
  onToggleHighlight,
  onUnassignDrop,
  onDeleteVolunteer,
  onVolunteerLinked,
}) => {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const totalAssigned = slots.reduce((s, sl) => s + sl.volunteers.length, 0);

  return (
    <>
      <Box
        sx={{
          width: collapsed ? SIDEBAR_COLLAPSED_W : ROSTER_WIDTH,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Toggle button */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            px: collapsed ? 0 : 1,
            py: 0.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
            minHeight: 36,
          }}
        >
          {!collapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Wolontariusze ({allVolunteers.length})
              </Typography>
              {onVolunteerLinked && (
                <Tooltip title="Powiąż z kontami systemowymi" placement="bottom">
                  <IconButton size="small" onClick={() => setLinkDialogOpen(true)} sx={{ p: 0.25, ml: 'auto' }}>
                    <ManageAccountsIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
          <Tooltip title={collapsed ? 'Rozwiń panel' : 'Zwiń panel'} placement="right">
            <Box
              component="button"
              onClick={onToggleCollapse}
              sx={{
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 0.25,
                borderRadius: 0.5,
                '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
              }}
            >
              {collapsed ? <ChevronRightIcon sx={{ fontSize: 18 }} /> : <ChevronLeftIcon sx={{ fontSize: 18 }} />}
            </Box>
          </Tooltip>
        </Box>

        {collapsed ? (
          /* Collapsed: color stripe per volunteer */
          (<Box sx={{ flex: 1, overflowY: 'auto', py: 0.75, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            {allVolunteers.map((vol) => (
              <Tooltip key={vol.id} title={`${vol.nickname} ${vol.assigned_hours}/${vol.target_hours}h`} placement="right">
                <Box
                  onClick={() => onToggleHighlight(vol.id)}
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '3px',
                    bgcolor: avatarColor(vol.id),
                    cursor: 'pointer',
                    opacity: highlightedVolunteerId !== null && highlightedVolunteerId !== vol.id ? 0.25 : 1,
                    outline: highlightedVolunteerId === vol.id ? '2px solid' : 'none',
                    outlineColor: 'primary.main',
                    outlineOffset: 1,
                    transition: 'opacity 0.15s',
                    flexShrink: 0,
                  }}
                />
              </Tooltip>
            ))}
          </Box>)
        ) : (
          <>
            {/* Search */}
            <Box sx={{ px: 0.75, pt: 0.5, pb: 0.25, flexShrink: 0 }}>
              <TextField
                size="small"
                placeholder="Szukaj..."
                value={rosterSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0.75 } }}
                slotProps={{
                  input: { sx: { fontSize: '0.7rem', height: 24 } }
                }}
              />
            </Box>

            {/* Volunteer list */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 0.5, pb: 0.25 }}>
              {allVolunteers.length === 0 ? (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    fontSize: 10,
                    p: 0.5
                  }}>
                  Brak wolontariuszy.
                </Typography>
              ) : volunteers.length === 0 ? (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    fontSize: 10,
                    p: 0.5
                  }}>
                  Brak wyników dla "{rosterSearch}"
                </Typography>
              ) : (
                volunteers.map((vol) => (
                  <RosterVolunteerCard
                    key={vol.id}
                    volunteer={vol}
                    canEdit={canEdit}
                    isAdmin={isAdmin}
                    slots={slots}
                    isHighlighted={highlightedVolunteerId === vol.id}
                    onToggleHighlight={onToggleHighlight}
                    onDelete={onDeleteVolunteer}
                  />
                ))
              )}
            </Box>

            {/* Unassign hint */}
            {canEdit && (
              <Box sx={{ px: 0.75, pb: 0.5, flexShrink: 0 }}>
                <RosterDropZone onUnassignDrop={onUnassignDrop} />
              </Box>
            )}

            {/* Footer stats */}
            <Box sx={{ px: 1, py: 0.75, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: 10
                }}>
                Przypisania łącznie: {totalAssigned}
              </Typography>
            </Box>
          </>
        )}
      </Box>
      {onVolunteerLinked && (
        <LinkAccountsDialog
          open={linkDialogOpen}
          onClose={() => setLinkDialogOpen(false)}
          volunteers={allVolunteers}
          onVolunteerUpdated={onVolunteerLinked}
        />
      )}
    </>
  );
};

export default RosterSidebar;
