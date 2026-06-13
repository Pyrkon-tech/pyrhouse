import React from 'react';
import { Box, Typography, Chip, IconButton, Tooltip, Divider, Avatar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import type { ScheduleSlot, ScheduleVolunteer, ValidationIssue } from '../../../../types/schedule.types';
import { SLOT_TYPE_CONFIG, CELL_STATUS_COLORS, ISSUE_TYPE_LABEL } from '../constants';
import { avatarColor, parseAsLocal } from '../utils';

const PANEL_HEIGHT_OPEN = 220;
const PANEL_HEIGHT_CLOSED = 36;

interface BottomDetailPanelProps {
  open: boolean;
  selectedSlotId: number | null;
  slots: ScheduleSlot[];
  volunteers: ScheduleVolunteer[];
  validationIssues: ValidationIssue[];
  canEdit: boolean;
  onClose: () => void;
  onRemoveAssignment: (assignmentId: number) => void;
  onEditSlot: (slot: ScheduleSlot, anchorEl: HTMLElement) => void;
  onDeleteSlot: (slotId: number) => void;
  onDuplicateSlot: (slotId: number) => void;
}

function fmtTime(iso: string): string {
  const d = parseAsLocal(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(iso: string): string {
  const d = parseAsLocal(iso);
  return d.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

const BottomDetailPanel: React.FC<BottomDetailPanelProps> = ({
  open,
  selectedSlotId,
  slots,
  volunteers,
  validationIssues,
  canEdit,
  onClose,
  onRemoveAssignment,
  onEditSlot,
  onDeleteSlot,
  onDuplicateSlot,
}) => {
  const slot = selectedSlotId != null ? slots.find((s) => s.id === selectedSlotId) ?? null : null;
  const typeCfg = slot ? SLOT_TYPE_CONFIG[slot.type] : null;

  const nicknameToVol = new Map(volunteers.map((v) => [v.nickname, v]));

  const slotIssues = validationIssues.filter(
    (i) => i.slot_id === selectedSlotId || i.slot === selectedSlotId,
  );

  const headerRef = React.useRef<HTMLDivElement>(null);

  const handleEditClick = (e: React.MouseEvent) => {
    if (!slot) return;
    onEditSlot(slot, e.currentTarget as HTMLElement);
  };

  return (
    <Box
      sx={{
        flexShrink: 0,
        height: open ? PANEL_HEIGHT_OPEN : PANEL_HEIGHT_CLOSED,
        borderTop: '1px solid',
        borderColor: open ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        transition: 'height 0.2s ease, border-color 0.2s',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Handle / header bar */}
      <Box
        ref={headerRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          height: PANEL_HEIGHT_CLOSED,
          flexShrink: 0,
          borderBottom: open ? '1px solid' : 'none',
          borderColor: 'divider',
          cursor: 'default',
        }}
      >
        {slot && typeCfg ? (
          <>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: typeCfg.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {slot.label}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {fmtDate(slot.start)} {fmtTime(slot.start)}–{fmtTime(slot.end)}
            </Typography>
            <Chip
              label={`${slot.volunteers.length} os.`}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                bgcolor: slot.volunteers.length === 0 ? 'rgba(239,68,68,0.15)' : slot.volunteers.length < 2 ? 'rgba(255,152,0,0.15)' : 'rgba(16,185,129,0.15)',
                color: slot.volunteers.length === 0 ? 'error.main' : slot.volunteers.length < 2 ? 'warning.main' : 'success.main',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
            {canEdit && (
              <>
                <Tooltip title="Edytuj">
                  <IconButton size="small" onClick={handleEditClick} sx={{ p: 0.25 }}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                {slot.type !== 'festival' && (
                  <>
                    <Tooltip title="Duplikuj slot">
                      <IconButton size="small" onClick={() => onDuplicateSlot(slot.id)} sx={{ p: 0.25 }}>
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Usuń slot">
                      <IconButton size="small" onClick={() => { onDeleteSlot(slot.id); onClose(); }} sx={{ p: 0.25, '&:hover': { color: 'error.main' } }}>
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.disabled', flex: 1 }}>
            Kliknij na slot aby zobaczyć szczegóły
          </Typography>
        )}

        {open && (
          <IconButton size="small" onClick={onClose} sx={{ p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>

      {/* Content */}
      {open && slot && (
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', px: 1.5, py: 1, gap: 2 }}>
          {/* Volunteers section */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Wolontariusze
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {slot.volunteers.map((sv) => {
                const vol = nicknameToVol.get(sv.nickname);
                return (
                  <Chip
                    key={sv.id}
                    avatar={
                      <Avatar sx={{ bgcolor: `${avatarColor(vol?.id ?? 0)} !important`, fontSize: '0.55rem !important', fontWeight: 700 }}>
                        {sv.nickname.slice(0, 1)}
                      </Avatar>
                    }
                    label={sv.nickname}
                    size="small"
                    onDelete={canEdit ? () => onRemoveAssignment(sv.id) : undefined}
                    sx={{
                      fontSize: '0.7rem',
                      height: 24,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                );
              })}
              {slot.volunteers.length === 0 && (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                  Brak przypisań
                </Typography>
              )}
            </Box>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Validation issues for this slot */}
          <Box sx={{ width: 220, flexShrink: 0, overflow: 'hidden' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Ostrzeżenia
            </Typography>
            {slotIssues.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'success.main', fontSize: '0.7rem' }}>
                ✓ Brak problemów
              </Typography>
            ) : (
              slotIssues.map((issue, i) => {
                const isError = issue.severity === 'error';
                const cfg = isError ? CELL_STATUS_COLORS.error : CELL_STATUS_COLORS.warning;
                return (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontSize: '0.68rem', color: cfg.color }}>
                      {ISSUE_TYPE_LABEL[issue.type] ?? issue.type}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Slot meta */}
          <Box sx={{ width: 160, flexShrink: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Szczegóły
            </Typography>
            {typeCfg && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: typeCfg.color }} />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: typeCfg.color }}>{typeCfg.label}</Typography>
              </Box>
            )}
            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.secondary', mb: 0.25 }}>
              {fmtTime(slot.start)} → {fmtTime(slot.end)}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.secondary' }}>
              {slot.credit_hours}h kredytów · {slot.volunteers.length} przypisanych
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default BottomDetailPanel;
