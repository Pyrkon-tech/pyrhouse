import React, { lazy, Suspense, useState, useRef, useCallback } from 'react';
import { Box, Typography, Chip, Button, CircularProgress, Tooltip, IconButton, ToggleButtonGroup, ToggleButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { ScheduleDetail, ValidationResult } from '../../../../types/schedule.types';
import type { PhaseFilter } from '../constants';
import { DAY_TYPE_COLORS } from '../constants';
import type { SyncStatus } from '../useScheduleSync';

const ArrowBackIcon = lazy(() => import('@mui/icons-material/ArrowBack'));
const UndoIcon = lazy(() => import('@mui/icons-material/Undo'));
const RedoIcon = lazy(() => import('@mui/icons-material/Redo'));
const AutoFixHighIcon = lazy(() => import('@mui/icons-material/AutoFixHigh'));
const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const WarningIcon = lazy(() => import('@mui/icons-material/Warning'));
const PersonAddIcon = lazy(() => import('@mui/icons-material/PersonAdd'));
const TableChartIcon = lazy(() => import('@mui/icons-material/TableChart'));
const RuleIcon = lazy(() => import('@mui/icons-material/Rule'));

interface ScheduleHeaderProps {
  schedule: ScheduleDetail;
  validation: ValidationResult | null;
  clientValidation?: ValidationResult | null;
  isModerator: boolean;
  canEdit: boolean;
  generating: boolean;
  exportingSheets: boolean;
  slotCount: number;
  phaseFilter: PhaseFilter;
  syncStatus: SyncStatus;
  lastSavedAt: Date | null;
  onBack: () => void;
  onSave: () => void;
  onValidate: () => void;
  onImportOpen: () => void;
  onGenerate: () => void;
  onExportSheets: () => void;
  onPhaseFilterChange: (filter: PhaseFilter) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  isAdmin?: boolean;
  onDeleteSchedule?: () => Promise<void>;
}

const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  saved: 'Zapisano',
  saving: 'Zapisywanie…',
  dirty: 'Niezapisane zmiany',
  error: 'Błąd zapisu',
};

const SYNC_STATUS_COLOR: Record<SyncStatus, string> = {
  saved: '#66bb6a',
  saving: '#ffb74d',
  dirty: '#ff9800',
  error: '#ef5350',
};

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  schedule,
  validation,
  clientValidation,
  isModerator,
  canEdit,
  generating,
  exportingSheets,
  slotCount,
  phaseFilter,
  syncStatus,
  lastSavedAt,
  onBack,
  onSave,
  onValidate,
  onImportOpen,
  onGenerate,
  onExportSheets,
  onPhaseFilterChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  isAdmin,
  onDeleteSchedule,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const closeMenu = () => setMenuAnchor(null);

  // ---- Delete schedule dialog (hold-to-confirm) ----------------------------
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const eventEnded = new Date(schedule.event_end) < new Date();
  const canDeleteSchedule = isAdmin && !!onDeleteSchedule && eventEnded;

  const startHold = useCallback(() => {
    if (deleting) return;
    holdInterval.current = setInterval(() => {
      setHoldProgress((p) => {
        if (p >= 100) {
          clearInterval(holdInterval.current!);
          return 100;
        }
        return p + 4; // ~2.5s to fill
      });
    }, 100);
  }, [deleting]);

  const cancelHold = useCallback(() => {
    if (holdInterval.current) clearInterval(holdInterval.current);
    setHoldProgress(0);
  }, []);

  const handleHoldComplete = useCallback(async () => {
    if (holdProgress < 100 || deleting) return;
    setDeleting(true);
    await onDeleteSchedule?.();
    setDeleting(false);
    setDeleteOpen(false);
    setHoldProgress(0);
  }, [holdProgress, deleting, onDeleteSchedule]);

  // Trigger delete when progress reaches 100
  React.useEffect(() => {
    if (holdProgress >= 100) handleHoldComplete();
  }, [holdProgress, handleHoldComplete]);

  // Use clientValidation (real-time) when available, fall back to server validation
  const displayValidation = clientValidation ?? validation;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Top row: title + status + actions */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Button
          size="small"
          onClick={onBack}
          startIcon={<Suspense fallback={null}><ArrowBackIcon /></Suspense>}
        >
          Wróć
        </Button>
        {canEdit && (
          <>
            <Tooltip title={undoLabel ? `Cofnij: ${undoLabel} (Ctrl+Z)` : 'Cofnij (Ctrl+Z)'}>
              <span>
                <IconButton size="small" onClick={onUndo} disabled={!canUndo} sx={{ p: 0.5 }}>
                  <Suspense fallback={null}><UndoIcon sx={{ fontSize: 18 }} /></Suspense>
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={redoLabel ? `Ponów: ${redoLabel} (Ctrl+Y)` : 'Ponów (Ctrl+Y)'}>
              <span>
                <IconButton size="small" onClick={onRedo} disabled={!canRedo} sx={{ p: 0.5 }}>
                  <Suspense fallback={null}><RedoIcon sx={{ fontSize: 18 }} /></Suspense>
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1, minWidth: 0 }}>
          {schedule.name}
        </Typography>
        {displayValidation && (
          <Tooltip title={displayValidation.valid ? 'Brak błędów' : `${displayValidation.issues.length} problemów`}>
            <Chip
              icon={
                <Suspense fallback={null}>
                  {displayValidation.valid ? <CheckCircleIcon /> : <WarningIcon />}
                </Suspense>
              }
              label={displayValidation.valid ? 'OK' : displayValidation.issues.length}
              color={displayValidation.valid ? 'success' : 'warning'}
              size="small"
              onClick={onValidate}
            />
          </Tooltip>
        )}
        {canEdit && (
          <Button
            size="small"
            variant={syncStatus === 'dirty' ? 'contained' : 'outlined'}
            color={syncStatus === 'error' ? 'error' : 'primary'}
            onClick={onSave}
            disabled={syncStatus === 'saving' || syncStatus === 'saved'}
            startIcon={
              syncStatus === 'saving'
                ? <CircularProgress size={14} color="inherit" />
                : <SaveIcon sx={{ fontSize: 16 }} />
            }
          >
            Zapisz
          </Button>
        )}
        <Tooltip title="Więcej opcji">
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
            <MoreVertIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={closeMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => { onValidate(); closeMenu(); }}>
            <ListItemIcon><Suspense fallback={null}><RuleIcon fontSize="small" /></Suspense></ListItemIcon>
            <ListItemText>Waliduj</ListItemText>
          </MenuItem>
          {canEdit && <Divider />}
          {canEdit && (
            <MenuItem onClick={() => { onImportOpen(); closeMenu(); }}>
              <ListItemIcon><Suspense fallback={null}><PersonAddIcon fontSize="small" /></Suspense></ListItemIcon>
              <ListItemText>Wolontariusze</ListItemText>
            </MenuItem>
          )}
          {canEdit && <Divider />}
          {canEdit && (
            <Tooltip
              title={slotCount > 0 ? 'Harmonogram już zawiera sloty — usuń je przed auto-generowaniem' : ''}
              placement="left"
            >
              <span>
                <MenuItem
                  onClick={() => { onGenerate(); closeMenu(); }}
                  disabled={generating || slotCount > 0}
                >
                  <ListItemIcon>
                    {generating
                      ? <CircularProgress size={16} color="inherit" />
                      : <Suspense fallback={null}><AutoFixHighIcon fontSize="small" /></Suspense>}
                  </ListItemIcon>
                  <ListItemText>{generating ? 'Generuję…' : 'Auto-generuj'}</ListItemText>
                </MenuItem>
              </span>
            </Tooltip>
          )}
          {isModerator && <Divider />}
          {isModerator && (
            <MenuItem onClick={() => { onExportSheets(); closeMenu(); }} disabled={exportingSheets}>
              <ListItemIcon>
                {exportingSheets
                  ? <CircularProgress size={16} color="inherit" />
                  : <Suspense fallback={null}><TableChartIcon fontSize="small" /></Suspense>}
              </ListItemIcon>
              <ListItemText>Eksport Sheets</ListItemText>
            </MenuItem>
          )}
          {canDeleteSchedule && <Divider />}
          {canDeleteSchedule && (
            <Tooltip title="Dostępne tylko po zakończeniu wydarzenia" placement="left">
              <MenuItem onClick={() => { setDeleteOpen(true); closeMenu(); }} sx={{ color: 'error.main' }}>
                <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Usuń harmonogram</ListItemText>
              </MenuItem>
            </Tooltip>
          )}
        </Menu>
      </Box>

      {/* Delete schedule dialog */}
      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); cancelHold(); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, color: 'error.main' }}>
          Usuń harmonogram
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Usunięcie <strong>{schedule.name}</strong> skasuje wszystkie sloty, wolontariuszy i przypisania. Operacja jest nieodwracalna.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Przytrzymaj przycisk poniżej przez 2.5 sekundy, żeby potwierdzić:
          </Typography>
          <Box sx={{ position: 'relative' }}>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              disabled={deleting}
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              sx={{ userSelect: 'none', position: 'relative', overflow: 'hidden', height: 40 }}
            >
              {deleting ? <CircularProgress size={16} color="inherit" /> : 'Przytrzymaj, aby usunąć'}
              {holdProgress > 0 && (
                <LinearProgress
                  variant="determinate"
                  value={holdProgress}
                  color="error"
                  sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 }}
                />
              )}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => { setDeleteOpen(false); cancelHold(); }}>Anuluj</Button>
        </DialogActions>
      </Dialog>

      {/* Phase filter tabs + sync status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
          Fazy:
        </Typography>
        <ToggleButtonGroup
          value={phaseFilter}
          exclusive
          size="small"
          onChange={(_, v) => { if (v !== null) onPhaseFilterChange(v); }}
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.25,
              px: 1.5,
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <ToggleButton value="all">Wszystko</ToggleButton>
          <ToggleButton value="festival" sx={{ color: DAY_TYPE_COLORS.festival.color }}>
            Festiwal
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Sync status */}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: SYNC_STATUS_COLOR[syncStatus],
              ...(syncStatus === 'saving' && {
                animation: 'pulse-sync 1.2s ease-in-out infinite',
                '@keyframes pulse-sync': {
                  '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                  '50%': { opacity: 0.4, transform: 'scale(0.75)' },
                },
              }),
            }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
            {SYNC_STATUS_LABEL[syncStatus]}
            {lastSavedAt && syncStatus === 'saved' && (
              <> · {lastSavedAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ScheduleHeader;
