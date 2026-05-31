import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, Avatar, IconButton, Tooltip, Badge } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RoomIcon from '@mui/icons-material/Room';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface KanbanColumn {
  id: string;
  label: string;
  statuses: string[];
  color: string;
  dropStatus: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: 'new',         label: 'Nowe',                 statuses: ['new'],               color: '#1976d2', dropStatus: 'new' },
  { id: 'in_progress', label: 'W trakcie',             statuses: ['in_progress'],        color: '#0288d1', dropStatus: 'in_progress' },
  { id: 'waiting',     label: 'Zablokowane',           statuses: ['waiting'],            color: '#ed6c02', dropStatus: 'waiting' },
  { id: 'done',        label: 'Ukończone / Anulowane', statuses: ['resolved', 'closed'], color: '#2e7d32', dropStatus: 'resolved' },
];

interface KanbanCardProps {
  req: any;
  types: Record<string, any>;
  onOpenDetails: (req: any) => void;
  assignButtonRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  handleAssignDropdownOpen: (reqId: string) => void;
  isDragging?: boolean;
  canChangeStatus?: boolean;
}

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Wysoki priorytet',
  medium: 'Średni priorytet',
  low: 'Niski priorytet',
};
const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'default'> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};
const STATUS_LABEL: Record<string, string> = {
  new: 'Nowe',
  in_progress: 'W trakcie',
  waiting: 'Zablokowane',
  resolved: 'Ukończone',
  closed: 'Anulowane',
};
const STATUS_COLOR: Record<string, 'primary' | 'info' | 'warning' | 'success' | 'default'> = {
  new: 'primary',
  in_progress: 'info',
  waiting: 'warning',
  resolved: 'success',
  closed: 'default',
};

const KanbanCardContent: React.FC<KanbanCardProps> = ({
  req, types, onOpenDetails, assignButtonRefs, handleAssignDropdownOpen, canChangeStatus,
}) => {
  const isClosed = req.status === 'closed';
  const isDraggable = canChangeStatus && !isClosed;
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: 4,
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        opacity: isClosed ? 0.65 : 1,
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': isClosed ? {} : { boxShadow: 8, transform: 'translateY(-2px)' },
        cursor: isDraggable ? 'grab' : 'default',
        userSelect: 'none',
      }}
      onClick={() => onOpenDetails(req)}
    >
      {/* Header row: drag handle + title + details button */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        {isDraggable && (
          <DragIndicatorIcon
            sx={{ color: 'text.disabled', fontSize: 18, mt: 0.3, flexShrink: 0 }}
          />
        )}
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}
        >
          {req.title}
        </Typography>
        <Tooltip title="Szczegóły">
          <IconButton
            size="small"
            sx={{ color: 'primary.main', p: 0.3, flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); onOpenDetails(req); }}
          >
            <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Description */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: 12 }}
      >
        {req.description}
      </Typography>

      {/* Chips row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {req.priority && (
          <Chip
            label={PRIORITY_LABEL[req.priority] ?? req.priority}
            size="small"
            color={PRIORITY_COLOR[req.priority] ?? 'default'}
            sx={{ height: 20, fontSize: 11 }}
          />
        )}
        {req.type && types[req.type] && (
          <Chip label={types[req.type].name} size="small" sx={{ height: 20, fontSize: 11 }} />
        )}
        {req.location && (
          <Chip
            label={req.location}
            size="small"
            icon={<RoomIcon sx={{ fontSize: 14 }} />}
            sx={{ height: 20, fontSize: 11, bgcolor: 'background.default' }}
          />
        )}
        {isClosed && (
          <Chip
            label={STATUS_LABEL[req.status]}
            size="small"
            color={STATUS_COLOR[req.status] ?? 'default'}
            variant="outlined"
            sx={{ height: 20, fontSize: 11 }}
          />
        )}
      </Box>

      {/* Footer: reporter + assigned */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Avatar sx={{ width: 20, height: 20, fontSize: 11, bgcolor: 'background.default', color: 'text.primary' }}>
            {req.created_by_user?.username?.[0] || '?'}
          </Avatar>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            {req.created_by_user?.username || req.created_by}
          </Typography>
        </Box>
        <Box
          ref={el => { if (req.id) assignButtonRefs.current[req.id] = el as HTMLDivElement | null; }}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: !isClosed ? 'pointer' : 'not-allowed', opacity: !isClosed ? 1 : 0.5, px: 0.5, borderRadius: 1, '&:hover': !isClosed ? { bgcolor: 'action.hover' } : {} }}
          onClick={e => { e.stopPropagation(); if (!isClosed) handleAssignDropdownOpen(req.id); }}
        >
          <Avatar sx={{ width: 20, height: 20, bgcolor: 'background.default', color: 'text.primary', fontSize: 11 }}>
            {req.assigned_to_user ? req.assigned_to_user.username[0]?.toUpperCase() : <PersonAddIcon sx={{ fontSize: 14 }} />}
          </Avatar>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            {req.assigned_to_user ? req.assigned_to_user.username : '—'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Draggable wrapper
const DraggableCard: React.FC<KanbanCardProps> = (props) => {
  const { req, canChangeStatus } = props;
  const isClosed = req.status === 'closed';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: req.id,
    disabled: isClosed || !canChangeStatus,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    transition: isDragging ? undefined : 'opacity 0.2s',
  };

  return (
    <Box ref={setNodeRef} style={style} {...(isClosed ? {} : { ...listeners, ...attributes })}>
      <KanbanCardContent {...props} isDragging={isDragging} />
    </Box>
  );
};

// Droppable column
const KanbanColumn: React.FC<{
  column: KanbanColumn;
  cards: any[];
  isOver: boolean;
  isSourceColumn: boolean;
  types: Record<string, any>;
  onOpenDetails: (req: any) => void;
  assignButtonRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  handleAssignDropdownOpen: (reqId: string) => void;
  canChangeStatus?: boolean;
}> = ({ column, cards, isOver, isSourceColumn, types, onOpenDetails, assignButtonRefs, handleAssignDropdownOpen, canChangeStatus }) => {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <Box
      sx={{
        minWidth: 270,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isOver && !isSourceColumn ? column.color : 'divider',
        boxShadow: isOver && !isSourceColumn ? `0 0 0 2px ${column.color}40` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          borderTop: `4px solid ${column.color}`,
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
          {column.label}
        </Typography>
        <Badge
          badgeContent={cards.length}
          color="default"
          sx={{ '& .MuiBadge-badge': { bgcolor: column.color, color: '#fff', fontSize: 11, minWidth: 20, height: 20 } }}
        />
      </Box>

      {/* Cards area */}
      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 280px)',
          minHeight: 'calc(100vh - 380px)',
          bgcolor: isOver && !isSourceColumn ? `${column.color}08` : 'transparent',
          transition: 'background-color 0.15s',
        }}
      >
        {cards.length === 0 ? (
          <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', mt: 2 }}>
            Brak zgłoszeń
          </Typography>
        ) : (
          cards.map(req => (
            <DraggableCard
              key={req.id}
              req={req}
              types={types}
              onOpenDetails={onOpenDetails}
              assignButtonRefs={assignButtonRefs}
              handleAssignDropdownOpen={handleAssignDropdownOpen}
              canChangeStatus={canChangeStatus}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

interface ServiceDeskKanbanViewProps {
  requests: any[];
  types: Record<string, any>;
  onOpenDetails: (req: any) => void;
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  assignButtonRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  handleAssignDropdownOpen: (reqId: string) => void;
  canChangeStatus?: boolean;
}

const ServiceDeskKanbanView: React.FC<ServiceDeskKanbanViewProps> = ({
  requests,
  types,
  onOpenDetails,
  onStatusChange,
  assignButtonRefs,
  handleAssignDropdownOpen,
  canChangeStatus = false,
}) => {
  const [localRequests, setLocalRequests] = useState(requests);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [sourceColumnId, setSourceColumnId] = useState<string | null>(null);

  useEffect(() => {
    setLocalRequests(requests);
  }, [requests]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const getCardsForColumn = (column: KanbanColumn) =>
    localRequests.filter(r => column.statuses.includes(r.status));

  const activeReq = activeId ? localRequests.find(r => r.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    const req = localRequests.find(r => r.id === id);
    if (req) {
      const col = COLUMNS.find(c => c.statuses.includes(req.status));
      setSourceColumnId(col?.id ?? null);
    }
  };

  const handleDragOver = (event: { over: { id: string } | null }) => {
    setOverId(event.over?.id ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    setSourceColumnId(null);

    if (!over) return;

    const draggedReq = localRequests.find(r => r.id === active.id);
    if (!draggedReq || draggedReq.status === 'closed') return;

    const targetColumn = COLUMNS.find(c => c.id === over.id);
    if (!targetColumn) return;

    const newStatus = targetColumn.dropStatus;
    if (newStatus === draggedReq.status) return;

    // Optimistic update
    const prev = [...localRequests];
    setLocalRequests(reqs => reqs.map(r => r.id === active.id ? { ...r, status: newStatus } : r));

    try {
      await onStatusChange(active.id as string, newStatus);
    } catch {
      setLocalRequests(prev);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver as any}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, alignItems: 'flex-start' }}>
        {COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={getCardsForColumn(column)}
            isOver={overId === column.id}
            isSourceColumn={sourceColumnId === column.id}
            types={types}
            onOpenDetails={onOpenDetails}
            assignButtonRefs={assignButtonRefs}
            handleAssignDropdownOpen={handleAssignDropdownOpen}
            canChangeStatus={canChangeStatus}
          />
        ))}
      </Box>

      <DragOverlay dropAnimation={null}>
        {activeReq ? (
          <Box sx={{ width: 270, opacity: 0.95, transform: 'rotate(2deg)', pointerEvents: 'none' }}>
            <KanbanCardContent
              req={activeReq}
              types={types}
              onOpenDetails={() => {}}
              assignButtonRefs={assignButtonRefs}
              handleAssignDropdownOpen={() => {}}
              canChangeStatus={canChangeStatus}
            />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default ServiceDeskKanbanView;
