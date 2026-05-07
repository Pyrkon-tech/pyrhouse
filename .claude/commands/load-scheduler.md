# Load Scheduler Module Context

Read the following files to understand the scheduling module architecture and current state:

## Core files (read all)
1. `src/components/features/Schedule/types.ts` — Grid types (GridCell, GridColumn, GridData, GridCellStatus)
2. `src/components/features/Schedule/constants.ts` — Layout constants, colors, status config
3. `src/components/features/Schedule/utils.ts` — Core algorithms: `buildGridData` (lane packing, cross-midnight, validation mapping), `extractLaneMap`, `computeHourRange`, `parseAsLocal`

## Components (read all)
4. `src/components/features/Schedule/components/ScheduleGrid.tsx` — Grid table layout with time axis (supports hours > 24 for cross-midnight), now-line, React.memo
5. `src/components/features/Schedule/components/GridCell.tsx` — Chip rendering, resize handles, status colors, slot type accent, Quick Assign button
6. `src/components/features/Schedule/components/QuickAssignPopover.tsx` — Volunteer assignment with conflict detection
7. `src/components/features/Schedule/components/RosterVolunteerCard.tsx` — Roster sidebar volunteer card with status ring

## Hooks (read all)
8. `src/components/features/Schedule/hooks/useChipResize.ts` — Drag-resize with 30min snap, cross-midnight ISO generation (hours >= 24 → next day)
9. `src/components/features/Schedule/useScheduleLocalState.ts` — Local state management (assign/unassign/move, undo/redo, slot CRUD)
10. `src/components/features/Schedule/useScheduleSync.ts` — Server sync (debounced save, optimistic updates)
11. `src/components/features/Schedule/useScheduleValidation.ts` — Client-side validation (double-booking, hours, capacity)

## Main page
12. `src/components/features/Schedule/ScheduleDetailPage.tsx` — Main orchestrator: DnD, grid building with `prevLaneMap` for lane stability, filtering, Quick Assign flow

## Types
13. `src/types/schedule.types.ts` — Backend API types (ScheduleSlot, ScheduleVolunteer, ValidationResult)

## Tests
14. `src/components/features/Schedule/__tests__/utils.test.ts` — 42 tests covering buildGridData, cross-midnight, lane stability, validation mapping
15. `src/components/features/Schedule/__tests__/useScheduleValidation.test.ts` — 24 tests covering validation logic

## Key architecture decisions
- **Cross-midnight slots**: Single-chip model — slot appears only in its start-day column, time axis extends past 24h (e.g., 22:00→02:00 next day = startH 22, endH 26)
- **Lane stability**: `extractLaneMap()` captures current lane assignments, passed as `prevLaneMap` to next `buildGridData` call via `useRef`
- **Validation**: Visual-only (colored chips), not blocking — users can over-assign, warnings shown
- **DnD**: `@dnd-kit/core` — drag from roster to grid, swap between slots, drag to roster to unassign

After reading, summarize the current state of the module and ask what work to do next.
