# PyrHouse — Plan Upgrade UI / Architektury / Refaktoringu

> Wygenerowany: 2026-03-06
> Priorytet: ⚡ Krytyczny | ⚠️ Wysoki | 📌 Średni | 💡 Niski

---

## Spis treści

1. [Diagnoza](#1-diagnoza)
2. [Visual Design Upgrade](#2-visual-design-upgrade)
3. [Animacja logowania](#3-animacja-logowania)
4. [Usunięcie zbędnych animacji](#4-usunięcie-zbędnych-animacji)
5. [Unifikacja CSS / Design Tokens](#5-unifikacja-css--design-tokens)
6. [Unifikacja komponentów Button](#6-unifikacja-komponentów-button)
7. [Wyciągnięcie duplikacji — Dialog/Modal](#7-wyciągnięcie-duplikacji--dialogmodal)
8. [Standaryzacja tabel](#8-standaryzacja-tabel)
9. [Architektura komponentów](#9-architektura-komponentów)
10. [Migracja API do apiClient](#10-migracja-api-do-apiclient)
11. [Szybkie filtry w Stan magazynowy](#11-szybkie-filtry-w-stan-magazynowy-listtsx)
12. [Kolejność wdrożenia](#12-kolejność-wdrożenia)

---

## 1. Diagnoza

### Co działa dobrze ✅
- `designTokens.ts` — kompletny system tokenów (kolory, spacing, cienie, gradienty, glassmorphism)
- `theme.ts` — solidna konfiguracja MUI z pełnym styleowaniem komponentów MUI
- `useStyles.ts` — 40+ predefiniowanych stylów z tokenami
- Nowe komponenty UI: `Button`, `Card`, `DataTable` — dobrze zbudowane
- Animacje respektują preferencje systemowe (`useAnimationPreference`)
- Warstwa serwisów jest dobrze zaprojektowana (gdy używa `apiClient`)

### Główne problemy ❌

| Problem | Skala | Pliki |
|---------|-------|-------|
| Hardkodowane kolory/spacing zamiast tokenów | ~80 miejsc | `ReleaseDetailPage.tsx`, `Home.tsx` |
| Duplikacja dialog state (add/edit/delete) | 4+ stron | `CategoryManagementPage`, `OriginsManagementPage`, `UserManagementPage` |
| MUI `<Button>` zamiast customowego `<Button>` | 200+ miejsc | prawie wszystkie feature pages |
| Niestandardowe tabele zamiast `<DataTable>` | 5 stron | `List.tsx`, `LocationPage.tsx`, `UserManagementPage.tsx` |
| Stary pattern `fetch()` zamiast `apiClient` | 23 miejsca | `locationService`, `questService`, `userService` |
| Animacja logowania — za złożona, nie w motywie | 1 plik | `LoginForm.tsx` |

---

## 2. Visual Design Upgrade

### 2.1 Odświeżenie typografii nagłówków

**Problem**: Nagłówki `h1`/`h2` stron używają `variant="h4"` / `variant="h5"` bez spójnego wzorca. Różne `fontWeight`, różne marginesy.

**Rozwiązanie**: Ustalić 3 poziomy nagłówka strony:
```
PageTitle    → variant="h4", fontWeight=700, color="primary.main", Cinzel
SectionTitle → variant="h6", fontWeight=600, color="text.primary"
SubLabel     → variant="overline", color="text.secondary"
```

Dodać do `useStyles.ts` lub stworzyć komponent `<PageHeader title="" actions={[]}/>` (patrz punkt 9).

### 2.2 Spójność kart / papierów

**Problem**: Strony mieszają `<Paper>`, `<Card>` (MUI), własny `<Card>` (ui/), `<Box>` z `sx={{ borderRadius, boxShadow }}`.

**Rozwiązanie**: Przyjąć jedną zasadę:
- `<Card variant="elevated">` (własny) — główne kontenery stron
- `<Card variant="outlined">` — sekcje wewnątrz strony
- `<Card variant="interactive">` — karty klikalne (mobilne listy)
- Usunąć bezpośrednie użycia MUI `<Paper>` / MUI `<Card>` w feature pages

### 2.3 Odświeżenie chipów statusu

**Problem**: `<Chip>` z różnymi `color`, `size`, `variant` w różnych plikach. Brak spójności dla "active/inactive", "asset/stock", "status".

**Rozwiązanie**: Stworzyć `<StatusChip>` (patrz punkt 9.3) z predefiniowanymi wariantami semantycznymi.

### 2.4 Empty state i loading state

**Problem**: Każda strona ma własny "brak danych" tekst i spinner, różne rozmiary i układy.

**Rozwiązanie**: Stworzyć `<EmptyState icon message action>` i `<PageLoader />` (patrz punkt 9.4).

### 2.5 Responsywność nagłówka strony

**Problem**: Strony jak `OriginsManagementPage`, `SettingsPage` (po naprawie), ale też `List.tsx`, `UserManagementPage.tsx` mają inline `display: flex, justifyContent: 'space-between'` w nagłówku — łamie się na mobile.

**Rozwiązanie**: `<PageHeader>` z wbudowaną obsługą responsywności.

---

## 3. Animacja logowania

### Obecny stan — `LoginForm.tsx`

Plik zawiera lokalnie zdefiniowane `@keyframes` (`starStreakAnimation`, `hyperJumpAnimation`) — generuje 200 losowych gwiazd CSS. Efekt "Star Wars hyperjump". Problemy:
- Nie pasuje do motywu "system do zarządzania magazynem"
- Ciężkie (200 elementów DOM, 2 animacje)
- Zdefiniowane lokalnie (nie w `theme.ts`)
- Na urządzeniach mobilnych może być wolne

### Docelowa animacja: "System Initializing"

Motyw: **terminal / system operacyjny / inicjalizacja systemu** w kolorystyce Pyrkonu (orange #ff9800 + deep blue-black).

**Etapy animacji (łącznie ~2.2s):**

```
0.0s — 0.3s   Fade in: logo/ikona PyrHouse (magazyn lub litera P z pochodnią)
0.3s — 1.2s   Animacja: poziomy progress bar w kolorze orange wypełniający się od 0% do 100%
              Subtelny glow effect (glowPulse z theme.ts — już zdefiniowany!)
1.2s — 1.8s   Tekst "INICJALIZACJA SYSTEMU" pojawia się literka po literce (typewriter)
              lub fade-in całego tekstu z małym scale
1.8s — 2.2s   Całość fade-out → przejście do dashboardu
```

**Komponenty techniczne:**
- `glowPulse` — już w `theme.ts:29`, można reużyć
- `fadeIn` — już w `theme.ts:41`
- Progress bar: MUI `LinearProgress` z `variant="determinate"` + useEffect timer
- Typewriter: prosty CSS animation lub `keyframes` z steps()
- Zero zewnętrznych bibliotek, zero wygenerowanych elementów DOM

**Plik do zmiany:** `src/components/features/LoginForm.tsx`
**Usunąć:** lokalne definicje `starStreakAnimation`, `hyperJumpAnimation`, generowanie 200 elementów
**Dodać:** `<SystemInitAnimation onComplete={callback} />`
**Gdzie:** `src/components/animations/SystemInitAnimation.tsx` (nowy plik)

---

## 4. Usunięcie zbędnych animacji

### Inwentarz animacji do oceny

| Animacja | Plik | Akcja |
|----------|------|-------|
| `starStreakAnimation` + `hyperJumpAnimation` | `LoginForm.tsx` | ❌ Usunąć, zastąpić SystemInit |
| `HyperJumpAnimation.tsx` (200 gwiazd) | `src/components/animations/` | ❌ Usunąć (nic nie używa po zmianie logowania) |
| `PageTransitionAnimation.tsx` (progress bar) | `src/components/animations/` | ✅ Zostawić |
| `TransitionAnimation.tsx` (iris wipe) | `src/components/animations/` | ✅ Zostawić |
| `QuestBoardTransition.tsx` | `src/components/animations/` | ✅ Zostawić |
| `LocationTransition.tsx` | `src/components/animations/` | ✅ Zostawić |
| `pulse 2s infinite` na chipach "in transit" | `TransferListPage.tsx`, `EquipmentDetails.tsx` | ✅ Zostawić (skeleton-style, sensowny UX) |
| `shimmer` na `LoadingSkeleton` | `theme.ts` | ✅ Zostawić |
| `spin` na loading spinnerach | `theme.ts` | ✅ Zostawić |
| `float`, `slideInRight`, `scaleIn` | `theme.ts` | 📌 Przejrzeć użycie — zostawić jeśli używane, usunąć jeśli nie |

### Animacje globalne w theme.ts do weryfikacji

Przed usunięciem `float`, `slideInRight`, `scaleIn` z `theme.ts` — warto przegrep'ować:
```bash
grep -r "slideInRight\|scaleIn\|float" src/ --include="*.tsx" --include="*.ts"
```
Jeśli żaden komponent ich nie używa → usunąć definicje z `theme.ts` (czyszczenie).

---

## 5. Unifikacja CSS / Design Tokens

### 5.1 ReleaseDetailPage.tsx — KRYTYCZNE ⚡

**Problem**: ~50 hardkodowanych wartości w widoku druku (linie 52–165).

Przykłady do zastąpienia:
```typescript
// PRZED (hardkodowane)
color: '#000'          → color: 'text.primary'
color: '#555'          → color: 'text.secondary'
color: '#777'          → color: 'text.disabled'
border: '1px solid #ddd' → border: '1px solid', borderColor: 'divider'
backgroundColor: '#f5f5f5' → bgcolor: 'action.hover'
fontSize: 12           → typography.caption lub fontSize: '0.75rem'
padding: '6px 10px'    → p: 0.75 (theme spacing)
```

**Dodatkowy problem**: Użycie HTML `<table>` z inline `style={}` — zastąpić MUI `Table` z `DataTable`.

### 5.2 Home.tsx styled components — WYSOKI ⚠️

Linie 63, 72, 96 — hardkodowane kolory w styled components:
```typescript
// PRZED
rgba('#462f1d', 0.98)          → designTokens.colors.darkPalette.cardBg lub theme.palette.background.paper
'2px solid #8b6d4c'            → `2px solid ${theme.palette.primary.dark}`
'linear-gradient(45deg, #ffd700, #b8860b, #8b6d4c)'
  → designTokens.gradients.primary
```

### 5.3 Padding/spacing hardkodowane

Wyszukać i zastąpić w całym projekcie:
```bash
grep -r "padding: '[0-9]" src/ --include="*.tsx"
grep -r "margin: '[0-9]" src/ --include="*.tsx"
grep -r "fontSize: [0-9]" src/ --include="*.tsx"
```

Wzorzec poprawny: zawsze `p: 2`, `m: 1`, `fontSize: 'body2.fontSize'` lub `'0.875rem'`.

### 5.4 `sx` prop zamiast `style={{}}`

**Reguła**: Nie używać `style={}` na komponentach MUI — zawsze `sx={}`.
Wyjątek: HTML `<div>`, `<span>` bez MUI — akceptowalne.

Wyszukać:
```bash
grep -rn 'style={{' src/components --include="*.tsx"
```
Zamienić każde znalezione `style={{ ... }}` na MUI `sx={{ ... }}` gdzie możliwe.

---

## 6. Unifikacja komponentów Button

### Problem

Istnieje `src/components/ui/Button/Button.tsx` — w pełni wyposażony (variants, sizes, loading, icons). Jest **prawie nieużywany** w feature pages. Wszystkie strony importują MUI `Button` bezpośrednio.

### Zasada

```typescript
// STARE (MUI Button bezpośrednio)
import { Button } from '@mui/material';
<Button variant="contained" color="primary" startIcon={<AddIcon />}>

// NOWE (własny Button)
import { Button } from '../ui/Button';
<Button variant="primary" size="md" leftIcon={<AddIcon />}>
```

### Wyjątki

MUI `Button` w `DialogActions` można zostawić — kontekst dialogi jest specyficzny i custom Button może nie mieć `autoFocus` / `type="submit"` behavior.

### Plan migracji (priorytet stron)

1. `CategoryManagementPage.tsx` — przyciski główne + dialogowe
2. `OriginsManagementPage.tsx` — analogicznie
3. `SettingsPage.tsx` — sync/refresh buttons
4. `UserManagementPage.tsx` — główne akcje
5. `List.tsx` — przyciski filtrowania/akcji
6. Pozostałe strony — kolejna iteracja

---

## 7. Wyciągnięcie duplikacji — Dialog/Modal

### Problem

Kod add/edit/delete dialogów **zduplikowany 4+ razy**. Każda strona zarządza:
```typescript
const [isAddModalOpen, setAddModalOpen] = useState(false);
const [isEditModalOpen, setEditModalOpen] = useState(false);
const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
const [itemToDelete, setItemToDelete] = useState(null);
const [editingItem, setEditingItem] = useState(null);
```

### Rozwiązanie: Hook `useDialogState`

**Plik**: `src/hooks/useDialogState.ts`

```typescript
export function useDialogState<T>() {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteItem, setDeleteItem] = useState<T | null>(null);

  return {
    // Add
    addOpen,
    openAdd: () => setAddOpen(true),
    closeAdd: () => setAddOpen(false),
    // Edit
    editItem,
    openEdit: (item: T) => setEditItem(item),
    closeEdit: () => setEditItem(null),
    isEditOpen: editItem !== null,
    // Delete
    deleteItem,
    openDelete: (item: T) => setDeleteItem(item),
    closeDelete: () => setDeleteItem(null),
    isDeleteOpen: deleteItem !== null,
  };
}
```

**Użycie** (zastępuje ~15 linii state na każdej stronie):
```typescript
const dialogs = useDialogState<Origin>();

// W JSX:
<Button onClick={dialogs.openAdd}>Dodaj</Button>
<IconButton onClick={() => dialogs.openEdit(item)}>...</IconButton>
<IconButton onClick={() => dialogs.openDelete(item)}>...</IconButton>

<AddDialog open={dialogs.addOpen} onClose={dialogs.closeAdd} />
<EditDialog open={dialogs.isEditOpen} item={dialogs.editItem} onClose={dialogs.closeEdit} />
<DeleteDialog open={dialogs.isDeleteOpen} item={dialogs.deleteItem} onClose={dialogs.closeDelete} />
```

### Rozwiązanie: Komponent `<ConfirmDialog>`

**Plik**: `src/components/ui/ConfirmDialog.tsx`

Reużywalny dialog potwierdzenia (delete/save). Zastępuje identyczny `<Dialog>` w każdej stronie:
```typescript
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  confirmColor?: 'error' | 'primary' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}
```

**Użycie** zamiast 20+ linii Dialog markup:
```typescript
<ConfirmDialog
  open={dialogs.isDeleteOpen}
  title="Usuń origin"
  message={<>Czy na pewno usunąć <strong>{dialogs.deleteItem?.slug}</strong>?</>}
  confirmLabel="Usuń"
  confirmColor="error"
  loading={deleting}
  onConfirm={handleDeleteConfirm}
  onClose={dialogs.closeDelete}
/>
```

---

## 8. Standaryzacja tabel

### Problem

7 stron z tabelami:
- **2 używają `DataTable`**: `CategoryManagementPage`, `OriginsManagementPage` ✅
- **5 używa własnego markup**: `List.tsx`, `LocationPage.tsx`, `UserManagementPage.tsx`, `TransferListPage.tsx`, `DutySchedulePage.tsx`

### Zasada

Wszystkie tabele przechodzą na:
```typescript
<DataTable>
  <TableHead>...</TableHead>
  <TableBody>
    {loading ? <DataTableLoadingRow colSpan={N} /> :
     items.length === 0 ? <DataTableEmptyRow colSpan={N} message="..." /> :
     items.map(...)}
  </TableBody>
</DataTable>
```

### Mobile-first pattern

Każda tabela z kolumnami których jest >4 powinna mieć widok kart na `xs`:
```typescript
{isMobile ? renderMobileCards() : renderTable()}
```

Wzorzec kart już zaimplementowany w `CategoryManagementPage` i `OriginsManagementPage` — kopiować ten wzorzec.

---

## 9. Architektura komponentów

### 9.1 Komponent `<PageHeader>`

**Plik**: `src/components/ui/PageHeader.tsx`

Zastępuje powtarzający się nagłówek strony w każdym pliku:
```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;  // przyciski po prawej
  breadcrumbs?: BreadcrumbItem[];
}
```

Automatycznie responsywny: na `xs` przyciski pod tytułem.

**Eliminuje**: ~10 linii `<Box sx={{ display: 'flex', ...}}><Typography>...</Typography>` w każdej stronie.

### 9.2 Komponent `<SearchBar>`

**Plik**: `src/components/ui/SearchBar.tsx`

Zastępuje powtarzający się `<TextField label="Szukaj...">` z ikoną:
```typescript
interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
  size?: 'small' | 'medium';
}
```

**Używany w**: `CategoryManagementPage`, `List.tsx`, `UserManagementPage`, `TransferListPage`.

### 9.3 Komponent `<StatusChip>`

**Plik**: `src/components/ui/StatusChip.tsx`

Zastępuje 30+ różnych użyć `<Chip>` do statusów:
```typescript
type StatusVariant =
  | 'active' | 'inactive'
  | 'available' | 'unavailable' | 'in_transit'
  | 'asset' | 'stock'
  | 'admin' | 'moderator' | 'user'
  | 'completed' | 'pending' | 'open' | 'closed'
  | 'ghost';  // Discord ghost accounts

interface StatusChipProps {
  status: StatusVariant;
  size?: 'small' | 'medium';
  clickable?: boolean;
  onClick?: () => void;
}
```

Centralizuje mapowanie `status → color + label` zamiast powtarzanego:
```typescript
// STARE (powtórzone 4+ razy w różnych plikach)
<Chip
  label={category.type === 'asset' ? 'Sprzęt' : 'Magazyn'}
  color={category.type === 'asset' ? 'primary' : 'secondary'}
/>

// NOWE
<StatusChip status={category.type === 'asset' ? 'asset' : 'stock'} />
```

### 9.4 Komponenty `<EmptyState>` i `<PageLoader>`

**Pliki**: `src/components/ui/EmptyState.tsx`, `src/components/ui/PageLoader.tsx`

**EmptyState**:
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

**PageLoader**:
```typescript
interface PageLoaderProps {
  message?: string;  // "Ładowanie kategorii..."
}
```

Eliminuje ~8 linii `<Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>` w każdej stronie.

### 9.5 Hook `useAsyncOperation`

**Plik**: `src/hooks/useAsyncOperation.ts`

Eliminuje powtarzany pattern loading/error:
```typescript
export function useAsyncOperation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async <T>(operation: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await operation();
      return result;
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, execute };
}
```

**Użycie** zamiast ~10 linii try/catch/finally:
```typescript
const { loading, error, execute } = useAsyncOperation();

const handleCreate = () => execute(async () => {
  await createOriginAPI(addForm);
  refresh();
  showSnackbar('success', 'Origin dodany');
});
```

### 9.6 Struktura katalogów po refaktoringu

```
src/
├── components/
│   ├── ui/
│   │   ├── Button/           (istniejący ✅)
│   │   ├── Card/             (istniejący ✅)
│   │   ├── DataTable.tsx     (istniejący ✅)
│   │   ├── AppSnackbar.tsx   (istniejący ✅)
│   │   ├── PageHeader.tsx    ← NOWY
│   │   ├── SearchBar.tsx     ← NOWY
│   │   ├── StatusChip.tsx    ← NOWY
│   │   ├── EmptyState.tsx    ← NOWY
│   │   ├── PageLoader.tsx    ← NOWY
│   │   └── ConfirmDialog.tsx ← NOWY
│   ├── animations/
│   │   ├── SystemInitAnimation.tsx  ← NOWY (zastępuje HyperJump w logowaniu)
│   │   ├── PageTransitionAnimation.tsx  (istniejący ✅)
│   │   ├── TransitionAnimation.tsx      (istniejący ✅)
│   │   ├── QuestBoardTransition.tsx     (istniejący ✅)
│   │   ├── LocationTransition.tsx       (istniejący ✅)
│   │   └── HyperJumpAnimation.tsx  ← USUNĄĆ po migracji
│   └── features/             (bez zmian struktury)
├── hooks/
│   ├── useDialogState.ts   ← NOWY
│   ├── useAsyncOperation.ts ← NOWY
│   └── ... (istniejące)
```

---

## 10. Migracja API do apiClient

### Status migracji

| Serwis | Status | Akcja |
|--------|--------|-------|
| `transferService.ts` | ✅ Zmigrowany | — |
| `assetService.ts` | ✅ Zmigrowany | — |
| `originService.ts` | ✅ Zmigrowany | — |
| `releaseService.ts` | ✅ Zmigrowany | — |
| `settingsService.ts` | ❌ Legacy | Migrować |
| `userService.ts` | ❌ Legacy | Migrować |
| `locationService.ts` | ❌ Legacy | Migrować |
| `questService.ts` | ❌ Legacy | Migrować |
| `serviceDeskPublicService.ts` | ❌ Legacy | Migrować |
| `discordAuthService.ts` | ⚠️ Częściowo | Dokończyć |

### Wzorzec migracji

```typescript
// STARE
import { getApiUrl, getAuthHeaders } from '../config/api';
const response = await fetch(getApiUrl('/locations'), {
  headers: getAuthHeaders(),
});
if (!response.ok) throw new Error('...');
const data = await response.json();

// NOWE
import { apiClient } from './apiClient';
import type { Location } from '../types';

export const getLocationsAPI = () => apiClient.get<Location[]>('/locations');
export const createLocationAPI = (data: CreateLocationPayload) =>
  apiClient.post<Location>('/locations', data);
```

### Priorytety migracji

1. `settingsService.ts` — prosty, krótki plik
2. `userService.ts` — używany szeroko
3. `locationService.ts` — duży plik, wysoki impact
4. `questService.ts` — wysoki impact
5. `serviceDeskPublicService.ts` — bez tokenu (public endpoint — pamiętaj o `skipAuth`)

---

## 11. Szybkie filtry w Stan magazynowy (`List.tsx`)

### Obecny stan — problemy

Sekcja "Szybkie filtry" (linie 575–615 w `List.tsx`) ma kilka poważnych wad:

**1. Hardkodowane ID lokalizacji — kruche i nieprzejrzyste**
```typescript
const quickFilters: QuickFilter[] = [
  { id: 1, name: 'Magazyn Techniczny' },   // zakłada że id=1 to zawsze MT
  { id: 3, name: 'Brak lokalizacji' },     // id=3 nie istnieje jako lokalizacja!
];
```
Jeśli backend zmieni ID lokalizacji → filter cicho przestaje działać.

**2. Mylący "Brak lokalizacji"**
```typescript
case 3: // Brak lokalizacji
  setSelectedLocations([]);   // CZYŚCI filtr lokalizacji, nie filtruje po braku!
```
Chip "Brak lokalizacji" nie filtruje rzeczy bez lokalizacji — **czyści cały filtr lokalizacji**. To logika odwrócona i dezorientująca.

**3. Słaba użyteczność 2 chipów**
Dwa chipy z własnym nagłówkiem "Szybkie filtry" to przerost formy nad treścią. Zajmują osobną sekcję z podziałem wizualnym, a oferują 2 skróty do specyficznych lokalizacji.

**4. Brak aktywnych filtrów jako chipów**
Nie widać co jest aktualnie zafiltrowane bez analizowania wszystkich dropdownów. Brakuje feedback'u o stanie filtrów.

### Rozwiązanie

#### Wariant A: Semantyczne filtry szybkie (rekomendowany)

Zastąpić hardkodowane filtry lokalizacji filtrami **semantycznymi** — niezależnymi od ID backendu:

```typescript
type QuickFilterDef = {
  id: string;
  label: string;
  apply: (state: FilterState) => FilterState;
  isActive: (state: FilterState) => boolean;
};

const QUICK_FILTERS: QuickFilterDef[] = [
  {
    id: 'in_transit',
    label: 'W transycie',
    apply: (s) => ({ ...s, statusFilter: 'in_transit' }),
    isActive: (s) => s.statusFilter === 'in_transit',
  },
  {
    id: 'asset',
    label: 'Sprzęt (PYR)',
    apply: (s) => ({ ...s, categoryType: 'asset' }),
    isActive: (s) => s.categoryType === 'asset',
  },
  {
    id: 'stock',
    label: 'Materiały',
    apply: (s) => ({ ...s, categoryType: 'stock' }),
    isActive: (s) => s.categoryType === 'stock',
  },
  {
    id: 'no_serial',
    label: 'Brak numeru seryjnego',
    apply: (s) => ({ ...s, noSerial: true }),
    isActive: (s) => s.noSerial === true,
  },
];
```

Chipy działają jako **toggle** — kliknięcie aktywuje/deaktywuje. Są bezpieczne (brak hardkodowanych ID) i użyteczne dla każdego użytkownika.

#### Wariant B: Active filter chips (uzupełnienie)

Po zastosowaniu filtru (lokalizacja, kategoria, typ) — pokazać chipy aktywnych filtrów z `×` do usunięcia:

```
[× Lokalizacja: Magazyn Techniczny]  [× Typ: Sprzęt]  [× Status: W transycie]
```

Zastępuje przycisk "Wyczyść filtry" jako jedyną odpowiedź — każdy filtr można usunąć osobno.

#### Układ panelu filtrów po refaktoringu

Obecny układ (2 sekcje + podział wizualny) → spłaszczyć do 2 stref:

```
┌─ Panel filtrów ─────────────────────────────────────────────────────┐
│ [W transycie] [Sprzęt] [Materiały] [Brak S/N]    [Wyczyść wszystko] │  ← quick chips + reset
├─────────────────────────────────────────────────────────────────────┤
│ [PYR_CODE ___________] [Lokalizacje ▼] [Kategoria ▼] [Typ ▼]       │  ← pełne filtry
└─────────────────────────────────────────────────────────────────────┘
```

Na mobile: obie strefy `flexDirection: column`, chipy `flexWrap: wrap`.

### Pliki do zmiany

- `src/components/features/List.tsx`
  - Usunąć: `quickFilters: QuickFilter[]` (linie 286–289), `applyQuickFilter`, `removeQuickFilter` (linie 291–316)
  - Dodać: `QUICK_FILTERS` jako stałe, nowy stan `statusFilter`, `noSerial`
  - Zmienić: logikę filtrowania `useEffect` (linie 197–230) o nowe pola
  - Uprościć: layout panelu filtrów (linie 548–735)

---

## 12. Kolejność wdrożenia

### Etap 1: Fundament (bez widocznych zmian dla użytkownika)
> Czysto techniczne, zero regresji

- [ ] Stworzyć `src/hooks/useDialogState.ts`
- [ ] Stworzyć `src/hooks/useAsyncOperation.ts`
- [ ] Stworzyć `src/components/ui/ConfirmDialog.tsx`
- [ ] Stworzyć `src/components/ui/StatusChip.tsx`
- [ ] Stworzyć `src/components/ui/PageHeader.tsx`
- [ ] Stworzyć `src/components/ui/SearchBar.tsx`
- [ ] Stworzyć `src/components/ui/EmptyState.tsx` + `PageLoader.tsx`
- [ ] Migracja `settingsService.ts` do apiClient

### Etap 2: Animacja logowania
> Widoczna zmiana, ale izolowana

- [ ] Stworzyć `src/components/animations/SystemInitAnimation.tsx`
- [ ] Zastąpić animację w `LoginForm.tsx`
- [ ] Usunąć lokalne `@keyframes` z `LoginForm.tsx`
- [ ] Usunąć `HyperJumpAnimation.tsx` (jeśli nic nie używa)

### Etap 3: CSS Unifikacja — krytyczne pliki
> Małe pliki, duży zysk wizualny

- [ ] `ReleaseDetailPage.tsx` — zastąpić wszystkie hardkodowane wartości tokenami
- [ ] `Home.tsx` — zastąpić RGBA i hardkodowane kolory w styled components
- [ ] Przejrzeć i wyczyścić globalne `@keyframes` w `theme.ts` (float, slideInRight, scaleIn)

### Etap 4: Standaryzacja tabel + mobile views
> Każda strona po kolei

- [ ] `UserManagementPage.tsx` → DataTable + widok kart mobile
- [ ] `List.tsx` → DataTable + widok kart mobile
- [ ] `LocationPage.tsx` → DataTable + widok kart mobile
- [ ] `TransferListPage.tsx` → weryfikacja DataTable

### Etap 5: Migracja dialogów
> Największe ryzyko regresji — testować po każdej zmianie

- [ ] `CategoryManagementPage.tsx` → `useDialogState` + `ConfirmDialog`
- [ ] `OriginsManagementPage.tsx` → `useDialogState` + `ConfirmDialog`
- [ ] `UserManagementPage.tsx` → `useDialogState` + `ConfirmDialog`
- [ ] `LocationsPage.tsx` → `useDialogState` + `ConfirmDialog`

### Etap 6: Migracja Button
> Po stabilizacji etapów 1-5

- [ ] `CategoryManagementPage.tsx` → własny `<Button>`
- [ ] `OriginsManagementPage.tsx` → własny `<Button>`
- [ ] Pozostałe strony

### Etap 7: Szybkie filtry w List.tsx
> Widoczna zmiana funkcjonalna — wpływa na UX wyszukiwania

- [ ] Zastąpić `quickFilters` hardkodowane semantycznymi filtrami (in_transit, asset, stock, no_serial)
- [ ] Dodać stan `statusFilter` i `noSerial` do logiki filtrowania
- [ ] Przepisać `applyQuickFilter` / `removeQuickFilter` na toggle oparty o stałe definicje
- [ ] Spłaszczyć layout panelu filtrów (usunąć podział na 2 sekcje, jedna linia chipów + filtry)
- [ ] Opcjonalnie: dodać "active filter chips" z `×` do usuwania pojedynczych filtrów

### Etap 8: Migracja API (background)
> Można równolegle z innymi etapami

- [ ] `userService.ts` → apiClient
- [ ] `locationService.ts` → apiClient
- [ ] `questService.ts` → apiClient
- [ ] `serviceDeskPublicService.ts` → apiClient (skipAuth na public endpoints)

---

## Podsumowanie zysku po refaktoringu

| Metryka | Przed | Po |
|---------|-------|----|
| Hardkodowane kolory | ~80 miejsc | ~5 (print edge cases) |
| Duplikacja dialog state | 4+ stron × ~15 linii | 1 hook |
| Custom animacja w LoginForm | 200 elementów DOM | <10 elementów |
| Stron bez widoku mobile | ~5 | 0 |
| Serwisów używających legacy fetch | 8/13 | 0/13 |
| Komponentów UI do reużycia | 4 | 10 |
| Hardkodowane filtry (broken ID logic) | 2 chipy | semantyczne toggle filtry |
| Linii kodu usuniętych (est.) | — | ~700–1000 |

---

*Plan można wdrażać etapami — każdy etap jest niezależny i nie wymaga poprzedniego ukończenia.*
