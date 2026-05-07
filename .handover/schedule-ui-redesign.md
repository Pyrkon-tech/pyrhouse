# Schedule UI — Handover

**Ostatnia aktualizacja:** 2026-05-07  
**Autor:** Jakub Gabrys  
**Status:** Implementacja w toku — Faza 1-3 ukończona, Faza 4+ planowane

---

## 1. Co zostało zrobione (2026-05-01 → 2026-05-07)

### 1.1 Usunięcie przycisku "Opublikuj"
- Usunięto `publishScheduleAPI`, stan `publishing`, handler `handlePublish`, props do ScheduleHeader
- `canEdit` uproszczony do `canEdit = isModerator` — brak blokady po statusie `published`
- Z `ScheduleHeader.tsx` usunięto cały blok statusu (chip "Opublikowany/Roboczy") i przycisk Opublikuj

### 1.2 Naprawa tworzenia slotów (nie zapisywały się)
- **Przyczyna:** `createSlotAPI` i `deleteSlotAPI` istniały w serwisie ale nigdy nie były wywoływane — frontend polegał wyłącznie na `PUT /schedule/draft`, którego obsługa `temp_id` na backendzie była zawodna
- **Naprawa:** `handleSlotUpdate` w `ScheduleDetailPage` teraz wywołuje `createSlotAPI` bezpośrednio dla slotów z `id < 0` (temp) i zastępuje je przez `localState.replaceSlot(tempId, realSlot)`
- **Podobnie:** `handleSlotDelete` wywołuje `deleteSlotAPI` dla prawdziwych ID przed usunięciem z lokalnego stanu
- **Dodano:** `replaceSlot(tempId, realSlot)` do `useScheduleLocalState` — zamienia tymczasowy slot na prawdziwy po odpowiedzi z API

### 1.3 Naprawa usuwania slotów festiwalowych
- W `SlotEditor` był guard `slot.type !== 'festival'` ukrywający przycisk Usuń dla slotów festiwalowych — usunięty
- Teraz wszystkie typy slotów można usunąć

### 1.4 Implementacja UI redesignu (plan z 2026-05-01)

Większość planu **już zaimplementowana** — nowe pliki zostały utworzone:

| Plik | Status |
|---|---|
| `hooks/useZoom.ts` | ✅ Gotowy (21 LOC) |
| `hooks/useSlotCreation.ts` | ✅ Gotowy (157 LOC) |
| `components/ZoomControl.tsx` | ✅ Gotowy (99 LOC) |
| `components/BottomDetailPanel.tsx` | ✅ Gotowy (252 LOC) |
| `components/RosterSidebar.tsx` | ✅ Gotowy |
| `components/SlotContextMenu.tsx` | ✅ Gotowy |
| `components/CalendarGrid.tsx` | ✅ Gotowy — nowy widok kalendarza (pionowy, nie Gantt) |
| `ScheduleDetailPage.tsx` | ✅ Zaktualizowany — integruje wszystkie nowe komponenty |

**Uwaga:** `useSlotCreation` jest zaimplementowany ale **nie jest jeszcze podpięty** do `CalendarGrid` — click+drag tworzenie slotów jest na poziomie hooka ale brak `onEmptyAreaDrag` w aktualnym CalendarGrid.

---

## 2. Stan obecny — architektura

### 2.1 Przepływ danych
```
ScheduleDetailPage
  ├── useScheduleLocalState   (in-memory state, undo/redo, temp IDs)
  ├── useScheduleSync         (PUT /schedule/draft, beforeunload warning)
  ├── useScheduleValidation   (client-side + server validation)
  ├── useZoom                 (px/h z localStorage)
  │
  ├── ScheduleHeader          (fazy, undo/redo, save, status sync)
  ├── ZoomControl             (slider px/h)
  ├── CalendarGrid            (nowy widok pionowy — sloty jako bloki w kolumnach dni)
  ├── RosterSidebar           (lista wolontariuszy, zwijany, DnD)
  ├── BottomDetailPanel       (szczegóły zaznaczonego slotu, collapsible)
  ├── SlotContextMenu         (right-click menu)
  └── SlotEditor (Popover)    (edycja slotu — czas, typ, etykieta, usuń)
```

### 2.2 Dwa widoki siatki
- **CalendarGrid** (`CalendarGrid.tsx`) — **nowy, aktywny** — pionowy layout, sloty jako bloki wg godzin, kolumny = dni
- **ScheduleGrid** (`ScheduleGrid.tsx`) — **stary Gantt** — poziomy timeline, zmodyfikowany (przyjmuje `pxPerHour`, `selectedSlotId`, `onSlotSelect`)
- Aktualnie `ScheduleDetailPage` używa `CalendarGrid` (line 469). `ScheduleGrid` może być niegotowy do użycia produkcyjnego.

### 2.3 Slot lifecycle
```
Klik "Dodaj slot" → CreateSlotDialog → tymczasowy slot (id < 0) w lokalnym stanie
  → otwiera SlotEditor
  → użytkownik edytuje i klika "Zapisz"
    → createSlotAPI(payload)  → id prawdziwy
    → localState.replaceSlot(tempId, realSlot)
  → użytkownik klika "Anuluj"
    → localState.deleteSlot(tempId)  ← handleSlotEditorClose czyści temp slot
```

Bulk save przez `PUT /schedule/draft` nadal istnieje (przycisk "Zapisz" w headerze) — syncuje przypisania i ewentualne zmiany pól.

---

## 3. Znane ograniczenia / do zrobienia

### 3.1 Click+drag tworzenie slotów
`useSlotCreation` hook jest zaimplementowany ale nie podpięty do `CalendarGrid`. Trzeba:
1. Dodać `onEmptyAreaDrag?: (startISO: string, endISO: string) => void` prop do CalendarGrid
2. W tle (bg) każdej kolumny dnia podpiąć `onPointerDown` → `slotCreation.start()`
3. W `ScheduleDetailPage` podpiąć `handleEmptyAreaDrag` → `handleAddSlot(startISO, endISO)`

### 3.2 CalendarGrid — click+drag zaznaczenie
Brak rubber-band selection (Ctrl+click multi-select) — planowane w Fazie 5.

### 3.3 Context menu duplikacja
`SlotContextMenu` ma opcję "Duplikuj slot" ale `POST /schedule/slots/:id/duplicate` nie istnieje na backendzie. Frontend używa lokalnej duplikacji przez `handleDuplicateSlot` + `createSlotAPI`.

### 3.4 Brak SSE
W module Schedule nie ma SSE — concurrent editing zabezpieczone przez `version` field w `PUT /schedule/draft` (409 gdy drugi editor próbuje zapisać) — użytkownik dostaje komunikat o konflikcie i musi odświeżyć.

### 3.5 Brak persystencji przy odświeżeniu
`useScheduleLocalState` trzyma stan tylko w pamięci. `beforeunload` ostrzega użytkownika ale nie ratuje danych. Autosave celowo odrzucony.

---

## 4. Pliki zmodyfikowane (nie zacommitowane)

### Zmodyfikowane
| Plik | Zmiana |
|---|---|
| `ScheduleDetailPage.tsx` | Brak publish, createSlotAPI/deleteSlotAPI, nowe komponenty |
| `components/SlotEditor.tsx` | Async save/delete, brak blokady dla festival type |
| `components/ScheduleGrid.tsx` | pxPerHour prop, selectedSlotId, onSlotSelect |
| `components/GridCell.tsx` | data-chip attr, onContextMenu |
| `components/RosterVolunteerCard.tsx` | compact mode |
| `components/RosterDropZone.tsx` | minor |
| `components/CreateSlotDialog.tsx` | nowy formularz tworzenia slotu |
| `components/ImportDialog.tsx` | drobne |
| `useScheduleLocalState.ts` | replaceSlot() |
| `useScheduleValidation.ts` | minor |
| `constants.ts` | ZOOM_MIN/MAX/DEFAULT, SIDEBAR_COLLAPSED_W |
| `types.ts` | SelectedSlotInfo, SlotContextMenuState |
| `utils.ts` | minor |
| `schedule.types.ts` | nowe typy |
| `scheduleService.ts` | bez zmian API, drobne |

### Nowe pliki
| Plik | Opis |
|---|---|
| `components/BottomDetailPanel.tsx` | Collapsible panel ze szczegółami zaznaczonego slotu |
| `components/CalendarGrid.tsx` | Pionowy widok kalendarza (kolumny dni, godziny na osi Y) |
| `components/RosterSidebar.tsx` | Zwijany sidebar z listą wolontariuszy |
| `components/SlotContextMenu.tsx` | Right-click menu na slocie |
| `components/ZoomControl.tsx` | Slider px/h |
| `hooks/useSlotCreation.ts` | Click+drag → nowy slot (hook gotowy, nie wired do CalendarGrid) |
| `hooks/useZoom.ts` | Zoom state z localStorage |
| `mockData.ts` | Mock dane do dev |
| `docs/SCHEDULE_API.md` | Dokumentacja API |

---

## 5. API — stan użycia

| Endpoint | Status |
|---|---|
| `GET /schedule` | ✅ Używany (load + validation inline) |
| `PUT /schedule/draft` | ✅ Używany (bulk save przez "Zapisz") |
| `POST /schedule/slots` | ✅ Teraz wywoływany bezpośrednio przy tworzeniu slotu |
| `PATCH /schedule/slots/:id` | ⚠ Nie wywoływany bezpośrednio — zmiany slotu idą przez PUT /draft |
| `DELETE /schedule/slots/:id` | ✅ Teraz wywoływany bezpośrednio przy usuwaniu slotu |
| `POST /schedule/assignments` | ✅ Używany (DnD assign) |
| `DELETE /schedule/assignments/:id` | ✅ Używany (unassign) |
| `POST /schedule/assignments/swap` | ✅ Używany (DnD swap) |
| `POST /schedule/volunteers` | ✅ Używany (import dialog) |
| `POST /schedule/volunteers/import-sheet` | ✅ Używany (Google Sheets import) |
| `GET /schedule/validate` | ✅ Używany (przycisk Waliduj) |
| `POST /schedule/generate` | ✅ Używany (Auto-generuj) |
| `GET /schedule/export` | ✅ Używany (CSV export) |
| `POST /schedule/export/sheets` | ✅ Używany (Sheets export) |
| `PATCH /schedule/publish` | ❌ Usunięty z frontendu |
| `POST /schedule/slots/:id/duplicate` | ❌ Nie istnieje na backendzie — frontend robi lokalnie |

---

## 6. Fazy implementacji — status

### ✅ Faza 1: Core UX
- `useZoom` + `ZoomControl` + integracja z siatką — **GOTOWE**
- Collapsible `RosterSidebar` — **GOTOWE**
- `constants.ts`: ZOOM_MIN/MAX/DEFAULT, SIDEBAR_COLLAPSED_W — **GOTOWE**

### ✅ Faza 2: Click-to-create (hook gotowy, integracja pending)
- `useSlotCreation` hook — **GOTOWY**
- Ghost overlay — do sprawdzenia czy jest w CalendarGrid
- Integracja w CalendarGrid — **BRAKUJE** (`onEmptyAreaDrag` nie wired)

### ✅ Faza 3: Bottom detail panel
- `BottomDetailPanel` — **GOTOWY**
- Integracja z `selectedSlotId` — **GOTOWA**

### ✅ Faza 4: Context menu
- `SlotContextMenu` — **GOTOWY**
- Duplikacja — działa lokalnie, brak backend endpoint

### ❌ Faza 5: Multi-select (nie zaczęta)
### ❌ Faza 6: Shortcuts & polish (nie zaczęta)
