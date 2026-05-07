import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../context/NotificationContext';
import {
  getScheduleDetailAPI,
  generateScheduleAPI,
  validateScheduleAPI,
  createSlotAPI,
  deleteSlotAPI,
  exportScheduleCSV,
  exportSheetsAPI,
} from '../../../services/scheduleService';
import { ApiError } from '../../../services/apiClient';
import type { ScheduleSlot } from '../../../types/schedule.types';

import { SIDEBAR_COLLAPSED_KEY } from './constants';
import type { PhaseFilter } from './constants';
import type { ApiErrorState, SlotContextMenuState } from './types';
import { buildApiErrorState, buildCalendarData } from './utils';
import { useScheduleLocalState } from './useScheduleLocalState';
import { useScheduleSync } from './useScheduleSync';
import { useScheduleValidation } from './useScheduleValidation';
import { useZoom } from './hooks/useZoom';

import ApiErrorAlert from './components/ApiErrorAlert';
import CalendarGrid from './components/CalendarGrid';
import ScheduleHeader from './components/ScheduleHeader';
import ValidationPanel from './components/ValidationPanel';
import SlotEditor from './components/SlotEditor';
import ImportDialog from './components/ImportDialog';
import NoScheduleView from './components/NoScheduleView';
import QuickAssignPopover from './components/QuickAssignPopover';
import RosterSidebar from './components/RosterSidebar';
import ZoomControl from './components/ZoomControl';
import BottomDetailPanel from './components/BottomDetailPanel';
import SlotContextMenu from './components/SlotContextMenu';

// ============================================================================

const ScheduleDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { showSuccess } = useNotification();

  const isModerator = userRole === 'admin' || userRole === 'moderator';

  const localState = useScheduleLocalState();
  const { state, loadFromServer, clear, setValidation } = localState;
  const { schedule, volunteers, slots, validation } = state;

  // ---- UI state -------------------------------------------------------------
  const [noActive, setNoActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exportingSheets, setExportingSheets] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [rosterSearch, setRosterSearch] = useState('');
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [editAnchorEl, setEditAnchorEl] = useState<HTMLElement | null>(null);
  const [quickAssignSlotId, setQuickAssignSlotId] = useState<number | null>(null);
  const [quickAssignAnchor, setQuickAssignAnchor] = useState<HTMLElement | null>(null);
  const [highlightedVolunteerId, setHighlightedVolunteerId] = useState<number | null>(null);

  // ---- New UI state ---------------------------------------------------------
  const [zoom, setZoom] = useZoom();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<SlotContextMenuState | null>(null);
  // Type for new slot creation — defaults to 'festival', can be changed by phase filter
  const [newSlotType, setNewSlotType] = useState<ScheduleSlot['type']>('festival');

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  const canEdit = isModerator;
  const { undo, redo, canUndo, canRedo, undoLabel, redoLabel } = localState;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const captureApiError = useCallback((e: unknown, operation: string) => {
    setApiError(buildApiErrorState(e, operation));
  }, []);

  const clientValidation = useScheduleValidation(slots, volunteers);

  // ---- Keyboard shortcuts --------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHighlightedVolunteerId(null);
        setContextMenu(null);
        setSelectedSlotId(null);
        setBottomPanelOpen(false);
        return;
      }
      if (!canEdit) return;
      const isMeta = e.ctrlKey || e.metaKey;
      if (!isMeta) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canEdit, undo, redo]);

  // ---- Fetch ---------------------------------------------------------------
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
    } catch { /* silent */ }
  }, [loadFromServer]);

  const fetchValidation = useCallback(async () => {
    try { const v = await validateScheduleAPI(); setValidation(v); } catch { /* silent */ }
  }, [setValidation]);

  // ---- Sync layer ----------------------------------------------------------
  const handleSaveSuccess = useCallback((response: import('../../../types/schedule.types').DraftResponse) => {
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

  // ---- Assign-mode position click ------------------------------------------
  const handlePositionClick = useCallback((slotId: number) => {
    if (highlightedVolunteerId == null) return;
    const vol = volunteers.find((v) => v.id === highlightedVolunteerId);
    if (!vol) return;
    localState.assignVolunteer(vol.id, vol.nickname, slotId);
    setHighlightedVolunteerId(null);
  }, [highlightedVolunteerId, volunteers, localState]);

  // ---- Generate / Publish --------------------------------------------------
  const handleGenerate = async () => {
    setGenerating(true);
    setApiError(null);
    try { const r = await generateScheduleAPI(); loadFromServer(r); showSuccess('Harmonogram wygenerowany'); }
    catch (e) { captureApiError(e, 'Generowanie'); }
    finally { setGenerating(false); }
  };

  // ---- Slot operations -----------------------------------------------------
  const handleRemoveAssignment = useCallback((assignmentId: number) => {
    localState.unassignVolunteer(assignmentId);
  }, [localState]);

  const handleMoveVolunteer = useCallback((
    assignmentId: number,
    volunteerId: number,
    nickname: string,
    fromSlotId: number,
    toSlotId: number,
  ) => {
    localState.moveVolunteer(assignmentId, volunteerId, nickname, fromSlotId, toSlotId);
  }, [localState]);

  const handleAssignVolunteer = useCallback((
    volunteerId: number,
    nickname: string,
    toSlotId: number,
  ) => {
    localState.assignVolunteer(volunteerId, nickname, toSlotId);
  }, [localState]);

  const handleSlotEditClick = useCallback((slot: ScheduleSlot, anchorEl: HTMLElement) => {
    setEditingSlot(slot);
    setEditAnchorEl(anchorEl);
  }, []);

  const handleSlotEditorClose = useCallback(() => {
    // If the editing slot is still a temp slot (user cancelled before saving), remove it
    if (editingSlot && editingSlot.id < 0) {
      const stillTemp = slots.find((s) => s.id === editingSlot.id);
      if (stillTemp) localState.deleteSlot(editingSlot.id);
    }
    setEditingSlot(null);
    setEditAnchorEl(null);
  }, [editingSlot, slots, localState]);

  const handleSlotUpdate = useCallback(async (slotId: number, changes: Partial<Pick<ScheduleSlot, 'start' | 'end' | 'capacity' | 'type' | 'label'>>) => {
    if (slotId < 0) {
      // New slot — persist via API immediately
      const current = slots.find((s) => s.id === slotId);
      if (!current) return;
      const merged = { ...current, ...changes };
      try {
        const created = await createSlotAPI({ type: merged.type, start: merged.start, end: merged.end, capacity: merged.capacity ?? 1, label: merged.label });
        localState.replaceSlot(slotId, created);
        showSuccess('Slot zapisany');
      } catch (e) {
        captureApiError(e, 'Tworzenie slotu');
        throw e;
      }
    } else {
      localState.updateSlot(slotId, changes);
    }
  }, [localState, slots, captureApiError, showSuccess]);

  const handleSlotDelete = useCallback(async (slotId: number) => {
    if (slotId < 0) {
      localState.deleteSlot(slotId);
    } else {
      try {
        await deleteSlotAPI(slotId);
        localState.deleteSlot(slotId);
      } catch (e) {
        captureApiError(e, 'Usuwanie slotu');
        return;
      }
    }
    if (selectedSlotId === slotId) { setSelectedSlotId(null); setBottomPanelOpen(false); }
  }, [localState, selectedSlotId, captureApiError]);

  const handleDuplicateSlot = useCallback(async (slotId: number) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    try {
      const created = await createSlotAPI({ type: slot.type, start: slot.start, end: slot.end, capacity: slot.capacity ?? 0, label: `${slot.label} (kopia)` });
      localState.replaceSlot(localState.createSlot(slot.type, slot.start, slot.end, created.label), created);
      showSuccess('Slot zduplikowany');
    } catch (e) {
      captureApiError(e, 'Duplikowanie slotu');
    }
  }, [localState, slots, showSuccess, captureApiError]);

  // ---- Quick Assign (used via bottom panel / context menu) -----------------
  const handleQuickAssignSelect = useCallback((volunteerId: number, nickname: string) => {
    if (quickAssignSlotId != null) localState.assignVolunteer(volunteerId, nickname, quickAssignSlotId);
  }, [localState, quickAssignSlotId]);

  const handleQuickAssignClose = useCallback(() => {
    setQuickAssignSlotId(null);
    setQuickAssignAnchor(null);
  }, []);

  // ---- Slot creation from calendar -----------------------------------------
  const handleCreateSlotForDay = useCallback((dateKey: string, startHour?: number) => {
    const type: ScheduleSlot['type'] = phaseFilter !== 'all' ? phaseFilter : newSlotType;
    const h = startHour ?? 10;
    const hh = Math.floor(h);
    const mm = h % 1 >= 0.5 ? '30' : '00';
    const ehh = hh + 1 >= 24 ? 0 : hh + 1;
    const pad = (n: number) => String(n).padStart(2, '0');
    const startISO = `${dateKey}T${pad(hh)}:${mm}:00`;
    const endISO = `${hh + 1 >= 24 ? dateKey : dateKey}T${pad(ehh)}:${mm}:00`;
    const newId = localState.createSlot(type, startISO, endISO);
    const newSlot = { id: newId, type, label: '', start: startISO, end: endISO, capacity: 1, credit_hours: 0, volunteers: [] };
    setEditAnchorEl(null);
    setEditingSlot(newSlot as ScheduleSlot);
    showSuccess('Slot utworzony — edytuj szczegóły');
  }, [localState, phaseFilter, newSlotType, showSuccess]);

  // ---- Slot selection (bottom panel) --------------------------------------
  const handleSlotSelect = useCallback((slotId: number) => {
    setSelectedSlotId((prev) => {
      if (prev === slotId) {
        // Toggle off
        setBottomPanelOpen(false);
        return null;
      }
      setBottomPanelOpen(true);
      return slotId;
    });
  }, []);

  // ---- Context menu --------------------------------------------------------
  const handleContextMenu = useCallback((slotId: number, x: number, y: number) => {
    const slot = slots.find((s) => s.id === slotId);
    setContextMenu({ slotId, slotType: slot?.type ?? 'festival', assignmentId: undefined, x, y });
  }, [slots]);

  const handleContextMenuEdit = useCallback((slotId: number, anchorEl: HTMLElement) => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot) handleSlotEditClick(slot, anchorEl);
  }, [slots, handleSlotEditClick]);

  // ---- Derived state -------------------------------------------------------
  const todayStr = now.toISOString().slice(0, 10);

  const filteredSlots = useMemo(() => {
    if (phaseFilter === 'all') return slots;
    return slots.filter((s) => s.type === phaseFilter);
  }, [slots, phaseFilter]);

  const calendarData = useMemo(() => {
    return buildCalendarData(
      filteredSlots, volunteers, validation ?? clientValidation, todayStr,
      schedule ? {
        eventStart: schedule.event_start,
        eventEnd: schedule.event_end,
        festivalStart: schedule.festival_start,
        festivalEnd: schedule.festival_end,
      } : undefined,
    );
  }, [filteredSlots, volunteers, validation, clientValidation, todayStr, schedule]);

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

  const validationIssues = useMemo(() => {
    return (validation ?? clientValidation).issues;
  }, [validation, clientValidation]);

  // ---- Render guards -------------------------------------------------------
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  if (noActive) {
    return <Box sx={{ p: { xs: 2, sm: 3 } }}><NoScheduleView onCreated={fetchSchedule} /></Box>;
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
      }}
      >
        {/* Header */}
        <ScheduleHeader
          schedule={schedule}
          validation={validation}
          clientValidation={clientValidation}
          isModerator={isModerator}
          canEdit={canEdit}
          generating={generating}
          exportingSheets={exportingSheets}
          phaseFilter={phaseFilter}
          syncStatus={syncStatus}
          lastSavedAt={lastSavedAt}
          onBack={() => navigate(-1)}
          onSave={save}
          onValidate={fetchValidation}
          onImportOpen={() => setImportOpen(true)}
          onGenerate={handleGenerate}
          onExportCSV={() => exportScheduleCSV().catch((e) => captureApiError(e, 'Eksport CSV'))}
          onExportSheets={async () => {
            setExportingSheets(true);
            try { const r = await exportSheetsAPI(); showSuccess(`Sheets: ${r.rows_written} wierszy`); }
            catch (e) { captureApiError(e, 'Eksport do Sheets'); }
            finally { setExportingSheets(false); }
          }}
          onPhaseFilterChange={(f) => { setPhaseFilter(f); if (f !== 'all') setNewSlotType(f); }}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          undoLabel={undoLabel}
          redoLabel={redoLabel}
        />

        {/* API errors */}
        {apiError && <ApiErrorAlert error={apiError} onDismiss={() => setApiError(null)} />}

        {/* Validation panel (collapsed by default when valid) */}
        {!clientValidation.valid && <ValidationPanel validation={clientValidation} />}

        {/* Main content row: calendar + roster (right) */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* Calendar area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {/* Zoom control (controls px/hour vertically) */}
            <ZoomControl zoom={zoom} onZoomChange={setZoom} />

            {/* Calendar grid */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <CalendarGrid
                calendarData={calendarData}
                pxPerHour={zoom}
                canEdit={canEdit}
                now={now}
                highlightedVolunteerId={highlightedVolunteerId}
                selectedSlotId={selectedSlotId}
                isAssignMode={highlightedVolunteerId != null}
                volunteers={volunteers}
                onSlotSelect={handleSlotSelect}
                onContextMenu={canEdit ? handleContextMenu : () => {}}
                onAssignModeClick={canEdit && highlightedVolunteerId != null ? handlePositionClick : () => {}}
                onRemoveAssignment={canEdit ? handleRemoveAssignment : () => {}}
                onMoveAssignment={canEdit ? handleMoveVolunteer : undefined}
                onAssignVolunteer={canEdit ? handleAssignVolunteer : undefined}
                onAddSlot={canEdit ? (dateKey) => handleCreateSlotForDay(dateKey) : undefined}
                onEmptyClick={canEdit && highlightedVolunteerId == null ? handleCreateSlotForDay : undefined}
              />
            </Box>

            {/* Bottom detail panel */}
            <BottomDetailPanel
              open={bottomPanelOpen}
              selectedSlotId={selectedSlotId}
              slots={slots}
              volunteers={volunteers}
              validationIssues={validationIssues}
              canEdit={canEdit}
              onClose={() => { setBottomPanelOpen(false); setSelectedSlotId(null); }}
              onRemoveAssignment={handleRemoveAssignment}
              onEditSlot={handleSlotEditClick}
              onDeleteSlot={handleSlotDelete}
              onDuplicateSlot={handleDuplicateSlot}
            />
          </Box>

          {/* Roster sidebar — right side */}
          <RosterSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            volunteers={sortedVolunteers}
            allVolunteers={volunteers}
            slots={slots}
            canEdit={canEdit}
            rosterSearch={rosterSearch}
            onSearchChange={setRosterSearch}
            highlightedVolunteerId={highlightedVolunteerId}
            onToggleHighlight={(id) => setHighlightedVolunteerId((prev) => prev === id ? null : id)}
            onUnassignDrop={canEdit ? handleRemoveAssignment : undefined}
          />
        </Box>

        {/* Assign mode banner */}
      {highlightedVolunteerId != null && canEdit && (() => {
        const vol = volunteers.find((v) => v.id === highlightedVolunteerId);
        if (!vol) return null;
        return (
          <Box sx={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            bgcolor: 'rgba(255,152,0,0.95)', color: '#000', borderRadius: 2, px: 2, py: 0.75,
            boxShadow: '0 4px 16px rgba(255,152,0,0.4)', zIndex: 1200,
            display: 'flex', alignItems: 'center', gap: 1.5, fontSize: '0.8rem', fontWeight: 700,
          }}>
            <span>Tryb przypisywania:</span>
            <strong>{vol.nickname}</strong>
            <span style={{ fontWeight: 400, opacity: 0.8 }}>— kliknij wolne miejsce na slocie</span>
            <Box component="span" onClick={() => setHighlightedVolunteerId(null)}
              sx={{ ml: 1, cursor: 'pointer', opacity: 0.7, '&:hover': { opacity: 1 } }}>✕</Box>
          </Box>
        );
      })()}

      {/* Quick Assign */}
      <QuickAssignPopover
        anchorEl={quickAssignAnchor}
        open={quickAssignSlotId != null}
        volunteers={volunteers}
        targetSlot={quickAssignSlotId != null ? slots.find((s) => s.id === quickAssignSlotId) ?? null : null}
        allSlots={slots}
        onSelect={handleQuickAssignSelect}
        onClose={handleQuickAssignClose}
      />

      {/* Context menu */}
      <SlotContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onEdit={handleContextMenuEdit}
        onDuplicate={handleDuplicateSlot}
        onRemoveAssignment={handleRemoveAssignment}
        onDeleteSlot={handleSlotDelete}
      />

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={fetchSchedule}
      />

      {/* Slot editor */}
      {editingSlot && (
        <SlotEditor
          slot={editingSlot}
          anchorEl={editAnchorEl}
          onClose={handleSlotEditorClose}
          onUpdate={handleSlotUpdate}
          onDelete={handleSlotDelete}
        />
      )}
    </Box>
  );
};

export default ScheduleDetailPage;
