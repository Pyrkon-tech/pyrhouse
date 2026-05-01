import React, { lazy, Suspense } from 'react';
import { Box, Typography, Chip, Button, CircularProgress, Tooltip, IconButton, ToggleButtonGroup, ToggleButton } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
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
const DownloadIcon = lazy(() => import('@mui/icons-material/Download'));
const PublishIcon = lazy(() => import('@mui/icons-material/Publish'));
const PersonAddIcon = lazy(() => import('@mui/icons-material/PersonAdd'));
const TableChartIcon = lazy(() => import('@mui/icons-material/TableChart'));

interface ScheduleHeaderProps {
  schedule: ScheduleDetail;
  validation: ValidationResult | null;
  clientValidation?: ValidationResult | null;
  isModerator: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  generating: boolean;
  publishing: boolean;
  exportingSheets: boolean;
  phaseFilter: PhaseFilter;
  syncStatus: SyncStatus;
  lastSavedAt: Date | null;
  onBack: () => void;
  onSave: () => void;
  onValidate: () => void;
  onImportOpen: () => void;
  onGenerate: () => void;
  onPublish: () => void;
  onExportCSV: () => void;
  onExportSheets: () => void;
  onPhaseFilterChange: (filter: PhaseFilter) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
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
  isAdmin,
  canEdit,
  generating,
  publishing,
  exportingSheets,
  phaseFilter,
  syncStatus,
  lastSavedAt,
  onBack,
  onSave,
  onValidate,
  onImportOpen,
  onGenerate,
  onPublish,
  onExportCSV,
  onExportSheets,
  onPhaseFilterChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
}) => {
  const isPublished = schedule.status === 'published';
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
        <Chip
          label={isPublished ? 'Opublikowany' : 'Roboczy'}
          color={isPublished ? 'success' : 'default'}
          size="small"
        />
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
        <Button size="small" variant="outlined" onClick={onValidate}>Waliduj</Button>
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
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            onClick={onImportOpen}
            startIcon={<Suspense fallback={null}><PersonAddIcon /></Suspense>}
          >
            Wolontariusze
          </Button>
        )}
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={onGenerate}
            disabled={generating}
            startIcon={
              generating
                ? <CircularProgress size={14} color="inherit" />
                : <Suspense fallback={null}><AutoFixHighIcon /></Suspense>
            }
          >
            {generating ? 'Generuję…' : 'Auto-generuj'}
          </Button>
        )}
        {isAdmin && !isPublished && (
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={onPublish}
            disabled={publishing}
            startIcon={
              publishing
                ? <CircularProgress size={14} color="inherit" />
                : <Suspense fallback={null}><PublishIcon /></Suspense>
            }
          >
            Opublikuj
          </Button>
        )}
        {isModerator && (
          <Button
            size="small"
            variant="outlined"
            onClick={onExportCSV}
            startIcon={<Suspense fallback={null}><DownloadIcon /></Suspense>}
          >
            CSV
          </Button>
        )}
        {isModerator && (
          <Button
            size="small"
            variant="outlined"
            disabled={exportingSheets}
            startIcon={
              exportingSheets
                ? <CircularProgress size={14} color="inherit" />
                : <Suspense fallback={null}><TableChartIcon /></Suspense>
            }
            onClick={onExportSheets}
          >
            Sheets
          </Button>
        )}
      </Box>

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
          <ToggleButton value="montage" sx={{ color: DAY_TYPE_COLORS.montage.color }}>
            Montaż
          </ToggleButton>
          <ToggleButton value="festival" sx={{ color: DAY_TYPE_COLORS.festival.color }}>
            Festiwal
          </ToggleButton>
          <ToggleButton value="demontage" sx={{ color: DAY_TYPE_COLORS.demontage.color }}>
            Demontaż
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
