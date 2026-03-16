import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  TextField,
} from '@mui/material';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../context/NotificationContext';
import {
  getScheduleDetailAPI,
  generateScheduleAPI,
  validateScheduleAPI,
  publishScheduleAPI,
  exportScheduleCSV,
  exportSheetsAPI,
} from '../../../services/scheduleService';
import { ApiError } from '../../../services/apiClient';
import type { SlotType, ScheduleSlot } from '../../../types/schedule.types';

import { SLOT_TYPE_CONFIG, ROSTER_WIDTH, VOLUNTEER_CHIP_H } from './constants';
import type { PhaseFilter } from './constants';
import type { ApiErrorState } from './types';
import { buildApiErrorState, computeHourRange, buildDayColumns, avatarColor } from './utils';
import { useScheduleLocalState } from './useScheduleLocalState';
import { useScheduleSync } from './useScheduleSync';
import { useScheduleValidation } from './useScheduleValidation';

import ApiErrorAlert from './components/ApiErrorAlert';
import CalendarGrid from './components/CalendarGrid';
import ScheduleHeader from './components/ScheduleHeader';
import ValidationPanel from './components/ValidationPanel';
import SlotEditor from './components/SlotEditor';
import RosterVolunteerCard from './components/RosterVolunteerCard';
import RosterDropZone from './components/RosterDropZone';
import ImportDialog from './components/ImportDialog';
import NoScheduleView from './components/NoScheduleView';

// ============================================================================
// Main page component — vertical calendar layout
// ============================================================================

const ScheduleDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { showSuccess } = useNotification();

  const isModerator = userRole === 'admin' || userRole === 'moderator';
  const isAdmin = userRole === 'admin';

  // ---- Local state (all edits happen here, instant) -----------------------
  const localState = useScheduleLocalState();
  const { state, loadFromServer, clear, setValidation } = localState;
  const { schedule, volunteers, slots, validation } = state;

  // ---- UI-only state ------------------------------------------------------
  const [noActive, setNoActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exportingSheets, setExportingSheets] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [rosterSearch, setRosterSearch] = useState('');
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [editAnchorEl, setEditAnchorEl] = useState<HTMLElement | null>(null);

  const canEdit = isModerator && schedule?.status !== 'published';
  const { undo, redo, canUndo, canRedo, undoLabel, redoLabel } = localState;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const captureApiError = useCallback((e: unknown, operation: string) => {
    setApiError(buildApiErrorState(e, operation));
  }, []);

  // ---- Client-side validation (instant, runs on every state change) --------
  const clientValidation = useScheduleValidation(slots, volunteers);

  // ---- Keyboard shortcuts: Ctrl+Z / Ctrl+Y --------------------------------
  useEffect(() => {
    if (!canEdit) return;

    const handler = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey;
      if (!isMeta) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canEdit, undo, redo]);

  // ---- Fetch schedule from server -----------------------------------------

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoActive(false);
    try {
      const data = await getScheduleDetailAPI();
      loadFromServer(data);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        setNoActive(true);
        clear();
      } else {
        setError(e instanceof Error ? e.message : 'Błąd ładowania harmonogramu');
      }
    } finally {
      setLoading(false);
    }
  }, [loadFromServer, clear]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const refreshFromServer = useCallback(async () => {
    try {
      const data = await getScheduleDetailAPI();
      loadFromServer(data);
    } catch {
      // silent
    }
  }, [loadFromServer]);

  const fetchValidation = useCallback(async () => {
    try {
      const v = await validateScheduleAPI();
      setValidation(v);
    } catch {
      // validation is optional
    }
  }, [setValidation]);

  // ---- Sync layer (bulk save via PUT /schedule/draft) ----------------------

  const handleSaveSuccess = useCallback((response: import('../../../types/schedule.types').DraftResponse) => {
    // Replace local state with server-confirmed state
    loadFromServer(response.schedule);
  }, [loadFromServer]);

  const { save, status: syncStatus, lastSavedAt } = useScheduleSync({
    toDraftPayload: localState.toDraftPayload,
    isDirty: state.isDirty,
    onSaveSuccess: handleSaveSuccess,
    setValidation,
    onError: captureApiError,
    refreshFromServer,
  });

  // ---- DnD handlers (ALL LOCAL) -------------------------------------------

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: { over: { id: string | number } | null }) => {
    setOverDropId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    setOverDropId(null);

    const { active, over } = event;
    if (!over || !schedule) return;

    const sourceData = active.data.current as Record<string, unknown>;
    const targetData = (over.data.current ?? {}) as Record<string, unknown>;

    // Defer state mutations to next frame so @dnd-kit can finish
    // its internal cleanup before the dragged element unmounts.
    requestAnimationFrame(() => {
      // ASSIGNMENT → ROSTER = REMOVE
      if (sourceData.type === 'assignment' && (String(over.id) === 'roster' || targetData.type === 'roster')) {
        localState.unassignVolunteer(sourceData.assignmentId as number);
        return;
      }

      // ASSIGNMENT → SLOT = MOVE
      if (sourceData.type === 'assignment' && targetData.type === 'slot') {
        const sourceSlotId = sourceData.slotId as number;
        const targetSlotId = targetData.slotId as number;
        if (sourceSlotId === targetSlotId) return;

        localState.moveVolunteer(
          sourceData.assignmentId as number,
          sourceData.volunteerId as number,
          sourceData.nickname as string,
          sourceSlotId,
          targetSlotId,
        );
        return;
      }

      // VOLUNTEER (roster) → SLOT = ADD
      if (sourceData.type === 'volunteer' && targetData.type === 'slot') {
        localState.assignVolunteer(
          sourceData.volunteerId as number,
          sourceData.nickname as string,
          targetData.slotId as number,
        );
        return;
      }
    });
  }, [schedule, localState]);

  // ---- Generate / Publish -------------------------------------------------

  const handleGenerate = async () => {
    setGenerating(true);
    setApiError(null);
    try {
      const result = await generateScheduleAPI();
      loadFromServer(result);
      showSuccess('Harmonogram wygenerowany automatycznie');
    } catch (e) {
      captureApiError(e, 'Generowanie harmonogramu');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setApiError(null);
    try {
      const updated = await publishScheduleAPI();
      localState.updateScheduleMeta({ status: updated.status });
      showSuccess('Harmonogram opublikowany');
    } catch (e) {
      captureApiError(e, 'Publikacja harmonogramu');
    } finally {
      setPublishing(false);
    }
  };

  // ---- Assignment removal (X button on chip) ---------------------------------

  const handleRemoveAssignment = useCallback((assignmentId: number) => {
    localState.unassignVolunteer(assignmentId);
  }, [localState]);

  // ---- Slot editor handlers ------------------------------------------------

  const handleSlotEditClick = useCallback((slot: ScheduleSlot, anchorEl: HTMLElement) => {
    setEditingSlot(slot);
    setEditAnchorEl(anchorEl);
  }, []);

  const handleSlotEditorClose = useCallback(() => {
    setEditingSlot(null);
    setEditAnchorEl(null);
  }, []);

  const handleSlotUpdate = useCallback((slotId: number, changes: Partial<Pick<ScheduleSlot, 'start' | 'end' | 'capacity' | 'type' | 'label'>>) => {
    localState.updateSlot(slotId, changes);
  }, [localState]);

  const handleSlotDelete = useCallback((slotId: number) => {
    localState.deleteSlot(slotId);
  }, [localState]);

  /** Click on empty grid space → create a 4h slot at that position and open editor */
  const handleGridClick = useCallback((dateKey: string, hour: number, anchorEl: HTMLElement) => {
    // Infer slot type from existing slots on this date
    const daySlotsForType = slots.filter((s) => s.start.slice(0, 10) === dateKey);
    const dominantType = daySlotsForType.length > 0 ? daySlotsForType[0].type : 'festival';
    const type: SlotType = (dominantType === 'montage' || dominantType === 'demontage')
      ? dominantType
      : 'festival';

    const startHour = Math.max(0, Math.min(hour, 23.5));
    const endHour = Math.min(startHour + 4, 24);
    const startHH = String(Math.floor(startHour)).padStart(2, '0');
    const startMM = startHour % 1 === 0.5 ? '30' : '00';
    const endHH = String(Math.floor(endHour)).padStart(2, '0');
    const endMM = endHour % 1 === 0.5 ? '30' : '00';

    const start = `${dateKey}T${startHH}:${startMM}:00`;
    const end = `${dateKey}T${endHH}:${endMM}:00`;

    const slotId = localState.createSlot(type, start, end, 4);
    // Find the newly created slot and open editor on it
    const newSlot = localState.state.slots.find((s) => s.id === slotId)
      ?? localState.state.schedule?.slots.find((s) => s.id === slotId);
    if (newSlot) {
      setEditingSlot(newSlot);
      setEditAnchorEl(anchorEl);
    }
  }, [localState, slots]);

  // ---- Derived state (ALL before early returns) ---------------------------

  const todayStr = now.toISOString().slice(0, 10);

  // Filter slots by phase
  const filteredSlots = useMemo(() => {
    if (phaseFilter === 'all') return slots;
    return slots.filter((s) => s.type === phaseFilter);
  }, [slots, phaseFilter]);

  const { minHour: globalMinHour, maxHour: globalMaxHour } = computeHourRange(filteredSlots);
  const dayColumns = buildDayColumns(filteredSlots, globalMinHour, todayStr);

  // Filter roster by search
  const filteredVolunteers = useMemo(() => {
    if (!rosterSearch.trim()) return volunteers;
    const q = rosterSearch.toLowerCase().trim();
    return volunteers.filter((v) => v.nickname.toLowerCase().includes(q));
  }, [volunteers, rosterSearch]);

  const sortedVolunteers = useMemo(() =>
    [...filteredVolunteers].sort((a, b) =>
      (a.assigned_hours / Math.max(1, a.target_hours)) -
      (b.assigned_hours / Math.max(1, b.target_hours)),
    ),
  [filteredVolunteers]);

  // ---- Render -------------------------------------------------------------

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  if (noActive) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <NoScheduleView onCreated={fetchSchedule} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button onClick={fetchSchedule}>Spróbuj ponownie</Button>
      </Box>
    );
  }

  if (!schedule) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver as never}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ p: { xs: 1, sm: 1.5 }, display: 'flex', flexDirection: 'column', gap: 1 }}>

        {/* Header with phase tabs */}
        <ScheduleHeader
          schedule={schedule}
          validation={validation ?? clientValidation}
          isModerator={isModerator}
          isAdmin={isAdmin}
          canEdit={canEdit}
          generating={generating}
          publishing={publishing}
          exportingSheets={exportingSheets}
          phaseFilter={phaseFilter}
          syncStatus={syncStatus}
          lastSavedAt={lastSavedAt}
          onBack={() => navigate(-1)}
          onSave={save}
          onValidate={fetchValidation}
          onImportOpen={() => setImportOpen(true)}
          onGenerate={handleGenerate}
          onPublish={handlePublish}
          onExportCSV={() => exportScheduleCSV().catch((e) => captureApiError(e, 'Eksport CSV'))}
          onExportSheets={async () => {
            setExportingSheets(true);
            setApiError(null);
            try {
              const res = await exportSheetsAPI();
              showSuccess(`Google Sheets: zapisano ${res.rows_written} wierszy`);
            } catch (e) {
              captureApiError(e, 'Eksport do Sheets');
            } finally {
              setExportingSheets(false);
            }
          }}
          onPhaseFilterChange={setPhaseFilter}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          undoLabel={undoLabel}
          redoLabel={redoLabel}
        />

        {/* API Error Alert */}
        {apiError && <ApiErrorAlert error={apiError} onDismiss={() => setApiError(null)} />}

        {/* Validation issues (client-side instant, or server if available) */}
        {!clientValidation.valid && <ValidationPanel validation={clientValidation} />}

        {/* Main area: roster sidebar + vertical calendar */}
        <Box
          sx={{
            display: 'flex',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            height: 'calc(100vh - 200px)',
            minHeight: 400,
          }}
        >
          {/* Left: Volunteer roster sidebar */}
          <Box
            sx={{
              width: ROSTER_WIDTH,
              flexShrink: 0,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Roster header with search */}
            <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}
              >
                Wolontariusze ({volunteers.length})
              </Typography>
              <TextField
                size="small"
                placeholder="Szukaj..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                fullWidth
                InputProps={{
                  sx: { fontSize: '0.75rem', height: 28 },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              />
            </Box>

            {/* Roster drop zone (remove assignments) */}
            {canEdit && (
              <Box sx={{ px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <RosterDropZone isOver={overDropId === 'roster'} />
              </Box>
            )}

            {/* Volunteer list */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 0.75 }}>
              {volunteers.length === 0 ? (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, p: 0.5 }}>
                  Brak wolontariuszy. Użyj "Wolontariusze" aby zaimportować z Google Sheets.
                </Typography>
              ) : sortedVolunteers.length === 0 ? (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, p: 0.5 }}>
                  Brak wyników dla "{rosterSearch}"
                </Typography>
              ) : (
                sortedVolunteers.map((vol) => (
                  <RosterVolunteerCard key={vol.id} volunteer={vol} canEdit={canEdit} />
                ))
              )}
            </Box>

            {/* Roster footer stats */}
            <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                Przypisania: {slots.reduce((s, sl) => s + sl.volunteers.length, 0)}
                {' / '}
                {slots.reduce((s, sl) => s + sl.capacity, 0)} miejsc
              </Typography>
            </Box>
          </Box>

          {/* Right: Vertical calendar grid */}
          <CalendarGrid
            columns={dayColumns}
            globalMinHour={globalMinHour}
            globalMaxHour={globalMaxHour}
            canEdit={canEdit}
            overDropId={overDropId}
            now={now}
            onSlotEditClick={canEdit ? handleSlotEditClick : undefined}
            onGridClick={canEdit ? handleGridClick : undefined}
            onRemoveAssignment={canEdit ? handleRemoveAssignment : undefined}
          />
        </Box>
      </Box>

      {/* DragOverlay — dropAnimation={null} prevents snap-back animation artefact */}
      <DragOverlay dropAnimation={null}>
        {activeId && schedule && (() => {
          const id = parseInt(activeId.split(':')[1]);

          // Roster volunteer → compact card matching RosterVolunteerCard width
          if (activeId.startsWith('volunteer:')) {
            const vol = volunteers.find((v) => v.id === id);
            if (!vol) return null;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5,
                bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'primary.main',
                borderRadius: 1, boxShadow: 4, cursor: 'grabbing', width: ROSTER_WIDTH - 24 }}>
                <Avatar sx={{ width: 18, height: 18, fontSize: 8, fontWeight: 700, bgcolor: avatarColor(vol.id) }}>
                  {vol.nickname.slice(0, 1)}
                </Avatar>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {vol.nickname}
                </Typography>
              </Box>
            );
          }

          // Assignment chip → match VolunteerChip dimensions exactly
          let nickname = '';
          let slotType: SlotType = 'festival';
          for (const slot of slots) {
            const sv = slot.volunteers.find((x) => x.id === id);
            if (sv) { nickname = sv.nickname; slotType = slot.type; break; }
          }
          if (!nickname) return null;
          const cfg = SLOT_TYPE_CONFIG[slotType];
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5,
              height: VOLUNTEER_CHIP_H, px: 0.5,
              bgcolor: cfg.bg, border: '1.5px solid', borderColor: cfg.color,
              borderRadius: 0.75, boxShadow: 4, cursor: 'grabbing', width: 140 }}>
              <Avatar sx={{ width: 18, height: 18, fontSize: 8, bgcolor: avatarColor(id), flexShrink: 0 }}>
                {nickname.slice(0, 1)}
              </Avatar>
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {nickname}
              </Typography>
            </Box>
          );
        })()}
      </DragOverlay>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={fetchSchedule}
      />

      {editingSlot && (
        <SlotEditor
          slot={editingSlot}
          anchorEl={editAnchorEl}
          onClose={handleSlotEditorClose}
          onUpdate={handleSlotUpdate}
          onDelete={handleSlotDelete}
        />
      )}
    </DndContext>
  );
};

export default ScheduleDetailPage;
