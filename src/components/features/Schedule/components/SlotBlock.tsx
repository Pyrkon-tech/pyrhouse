import React, { useCallback, useRef } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';
import EditIcon from '@mui/icons-material/Edit';
import type { ScheduleSlot } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG, CHIP_GAP, SLOT_PADDING, SLOT_HEADER_H } from '../constants';
import { parseAsLocal } from '../utils';
import VolunteerChip from './VolunteerChip';

interface SlotBlockProps {
  slot: ScheduleSlot;
  /** Pixel height for time-based layout; omit for full-day (auto height) */
  height?: number;
  canEdit: boolean;
  isOver: boolean;
  /** Date key for unique droppable ID (cross-midnight slots appear in 2 columns) */
  dateKey?: string;
  /** Called when user clicks the slot header to edit */
  onEditClick?: (slot: ScheduleSlot, anchorEl: HTMLElement) => void;
  /** Called to remove an assignment from this slot */
  onRemoveAssignment?: (assignmentId: number) => void;
}

const SlotBlock: React.FC<SlotBlockProps> = ({ slot, height, canEdit, isOver, dateKey, onEditClick, onRemoveAssignment }) => {
  // Use dateKey suffix to make droppable ID unique for cross-midnight slots
  const droppableId = dateKey ? `slot:${slot.id}:${dateKey}` : `slot:${slot.id}`;
  const { setNodeRef } = useDroppable({
    id: droppableId,
    data: { type: 'slot', slotId: slot.id },
  });

  const headerRef = useRef<HTMLDivElement>(null);

  const cfg = SLOT_TYPE_CONFIG[slot.type];
  const filled = slot.volunteers.length;
  const isFull = filled >= slot.capacity;
  const isOverstaffed = filled > slot.capacity;

  const startTime = parseAsLocal(slot.start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const endTime = parseAsLocal(slot.end).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  const capacityColor = isOverstaffed ? '#ef5350' : isFull ? '#66bb6a' : 'text.disabled';

  const handleHeaderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canEdit && onEditClick && headerRef.current) {
      onEditClick(slot, headerRef.current);
    }
  }, [canEdit, onEditClick, slot]);

  return (
    <Box
      ref={setNodeRef}
      sx={{
        height: height ?? 'auto',
        bgcolor: isOver ? 'rgba(255,152,0,0.12)' : cfg.bg,
        border: '1px solid',
        borderColor: isOver ? 'primary.main' : cfg.border,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 1,
        p: `${SLOT_PADDING}px`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        transition: 'border-color 0.15s, background-color 0.15s',
        boxSizing: 'border-box',
      }}
    >
      {/* Slot header — clickable to edit */}
      <Box
        ref={headerRef}
        onClick={handleHeaderClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          height: SLOT_HEADER_H,
          flexShrink: 0,
          mb: 0.25,
          cursor: canEdit ? 'pointer' : 'default',
          borderRadius: 0.5,
          mx: -0.5,
          px: 0.5,
          '&:hover': canEdit ? {
            bgcolor: 'rgba(255,255,255,0.08)',
            '& .slot-edit-icon': { opacity: 1 },
          } : {},
        }}
      >
        <Tooltip title={`${slot.label} · ${startTime}–${endTime} · ${slot.credit_hours}h kredytu`} arrow disableInteractive>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: cfg.color,
              flex: 1,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {startTime}–{endTime}
          </Typography>
        </Tooltip>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.6rem',
            fontWeight: 700,
            color: capacityColor,
            flexShrink: 0,
          }}
        >
          {filled}/{slot.capacity}
        </Typography>
        {canEdit && (
          <EditIcon
            className="slot-edit-icon"
            sx={{
              fontSize: 12,
              color: 'text.disabled',
              opacity: 0,
              transition: 'opacity 0.15s',
              flexShrink: 0,
            }}
          />
        )}
      </Box>

      {/* Volunteer chips */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${CHIP_GAP}px`,
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {slot.volunteers.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed',
              borderColor: `${cfg.color}33`,
              borderRadius: 0.5,
              minHeight: 24,
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontSize: '0.55rem', color: 'text.disabled', fontStyle: 'italic' }}
            >
              Przeciągnij tutaj
            </Typography>
          </Box>
        ) : (
          slot.volunteers.map((sv) => (
            <VolunteerChip
              key={`vc-${sv.id}-${dateKey ?? ''}`}
              sv={sv}
              slotId={slot.id}
              canEdit={canEdit}
              dateKey={dateKey}
              onRemove={onRemoveAssignment}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default SlotBlock;
