# PyrHouse Frontend — Przewodnik refaktoryzacji architektury

> Instrukcje dla modeli AI i deweloperów. Każde zadanie ma konkretne pliki: skąd → dokąd.
> Po każdym kroku: `npx tsc --noEmit` + test w przeglądarce.

## Status wykonania

| Zadanie | Status |
|---------|--------|
| 1.1 Usunięcie `src/models/` | DONE |
| 1.2 Usunięcie `src/containers/` | DONE |
| 1.3 Konsolidacja animacji | DONE |
| 2.1 Konsolidacja modułu Transfer | DONE |
| 2.2 Konsolidacja modułu ServiceDesk | DONE |
| 3.1 Barrel export hooks/ | TODO |
| 3.2 Barrel export services/ | TODO |
| 3.3 Konwersja TransferForm.css → MUI sx | DONE (plik usunięty z importem) |

---

## 1. Stan obecny — problemy (ROZWIĄZANE)

### 1.1 Duplikacja Transfer

Dwa miejsca trzymają kod transferów — `components/TransferPage/` i pliki flat w `features/`:

| Plik | Rola |
|------|------|
| `src/components/features/TransferPage.tsx` | Strona tworzenia transferu (route handler) |
| `src/components/features/TransferListPage.tsx` | Lista transferów |
| `src/components/features/TransferDetailsPage.tsx` | Szczegóły transferu (~500 LOC) |
| `src/components/TransferPage/components/TransferFormCore.tsx` | Rdzeń formularza |
| `src/components/TransferPage/components/TransferForm.tsx` | Wrapper formularza |
| `src/components/TransferPage/components/TransferList.tsx` | Lista w formularzu |
| `src/components/TransferPage/components/ConfirmationDialog.tsx` | Dialog potwierdzenia |
| `src/components/TransferPage/components/TransferModal.tsx` | Modal transferu |
| `src/components/TransferPage/components/TransferForm.css` | Style CSS (niezgodne z resztą projektu — MUI sx) |
| `src/containers/TransferDetailsPage.tsx` | Porzucony stub (27 LOC, nie używany w routes) |

### 1.2 Rozbity ServiceDesk

| Plik | Problem |
|------|---------|
| `src/components/features/ServiceDeskPage.tsx` | Strona główna — flat w features/ |
| `src/components/features/ServiceDeskForm.tsx` | Formularz — flat w features/ |
| `src/components/features/ServiceDeskForm.styles.ts` | Style — flat w features/ |
| `src/components/features/PublicServiceDeskForm.tsx` | Publiczny formularz — flat w features/ |
| `src/components/features/ServiceDesk/ServiceDeskCardsView.tsx` | Widok kart — w podfolderze |
| `src/components/features/ServiceDesk/ServiceDeskListView.tsx` | Widok listy — w podfolderze |
| `src/components/features/ServiceDesk/ServiceDeskDetailsModal.tsx` | Modal szczegółów — w podfolderze |

### 1.3 Duplikacja types vs models

| `src/models/` | `src/types/` | Status |
|--------------|-------------|--------|
| `transfer.ts` (4 pola) | `transfer.types.ts` (100 LOC, pełne typy) | Duplikat — models jest uproszczoną wersją |
| `Location.ts` (6 pól) | `location.types.ts` (73 LOC, pełne typy) | Duplikat — identyczny interfejs bazowy |

Pliki importujące z `models/` (do przepięcia na `types/`):
- `src/hooks/useLocations.ts` → `import { Location } from '../models/Location'`
- `src/hooks/useTransfers.ts` → `import { Transfer } from '../models/transfer'`
- `src/components/features/TransferListPage.tsx` → `import { Location } from '../../models/Location'`
- `src/components/features/LocationsPage.tsx` → `import { Location } from '../../models/Location'`
- `src/components/TransferPage/components/TransferForm.tsx` → `import { Location } from '../../../models/Location'`

### 1.4 Rozproszone animacje

| Plik | Zawartość |
|------|-----------|
| `src/animations/keyframes.ts` | `hyperJumpAnimation`, `starStreakAnimation`, `fadeInAnimation`, `pulseAnimation` |
| `src/components/animations/HyperJumpAnimation.tsx` | Komponent animacji hyper-jump |
| `src/components/animations/LocationTransition.tsx` | Przejście lokalizacji |
| `src/components/animations/PageTransitionAnimation.tsx` | Przejście stron |
| `src/components/animations/QuestBoardTransition.tsx` | Przejście quest board |
| `src/components/animations/TransitionAnimation.tsx` | Bazowa animacja przejścia |

Importy:
- `src/components/features/LoginForm.tsx` → `from '../../animations/keyframes'`
- `src/context/AnimationContext.tsx` → `from '../components/animations/HyperJumpAnimation'`

### 1.5 Orphaned containers/

`src/containers/TransferDetailsPage.tsx` — 27 LOC, stub z jednym przyciskiem "Anuluj transfer". **Nie jest używany w routes** (routes importuje `features/TransferDetailsPage`).

### 1.6 features/ — mieszany pattern

30 flat files + 2 foldery (QuestDispatcherMap/, ServiceDesk/) + plik `ServiceDeskForm.styles.ts`. Brak spójnej zasady kiedy tworzyć folder.

---

## 2. Architektura docelowa

```
src/
├── components/
│   ├── ui/                              # Reużywalne atomy UI
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── AppSnackbar.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── LazyIcon.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── Pin.tsx
│   │   └── ThemeSwitch.tsx
│   │
│   ├── layout/                          # Struktura strony
│   │   ├── Layout.tsx
│   │   ├── Layout.styles.ts
│   │   ├── BreadcrumbsComponent.tsx
│   │   └── Container/
│   │
│   ├── common/                          # Współdzielone komponenty domenowe
│   │   ├── BarcodeGenerator.tsx
│   │   ├── BarcodeScanner.tsx
│   │   ├── LocationPicker.tsx
│   │   ├── MapComponent.tsx
│   │   └── RestoreDialog.tsx
│   │
│   ├── animations/                      # SKONSOLIDOWANE — animacje + keyframes
│   │   ├── keyframes.ts                 # ← z src/animations/keyframes.ts
│   │   ├── HyperJumpAnimation.tsx
│   │   ├── LocationTransition.tsx
│   │   ├── PageTransitionAnimation.tsx
│   │   ├── QuestBoardTransition.tsx
│   │   └── TransitionAnimation.tsx
│   │
│   └── features/                        # Moduły funkcjonalne
│       │
│       │  # === FOLDER-BASED (złożone, >150 LOC, sub-components) ===
│       │
│       ├── Transfer/                    # SKONSOLIDOWANY moduł transferów
│       │   ├── index.ts                 # export { TransferCreatePage, TransferDetailsPage, TransferListPage }
│       │   ├── TransferCreatePage.tsx   # ← features/TransferPage.tsx (route handler)
│       │   ├── TransferDetailsPage.tsx  # ← features/TransferDetailsPage.tsx
│       │   ├── TransferListPage.tsx     # ← features/TransferListPage.tsx
│       │   └── components/
│       │       ├── TransferFormCore.tsx  # ← TransferPage/components/TransferFormCore.tsx
│       │       ├── TransferForm.tsx      # ← TransferPage/components/TransferForm.tsx
│       │       ├── TransferList.tsx      # ← TransferPage/components/TransferList.tsx
│       │       ├── ConfirmationDialog.tsx
│       │       └── TransferModal.tsx
│       │
│       ├── ServiceDesk/                 # SKONSOLIDOWANY moduł service desk
│       │   ├── index.ts                 # export { ServiceDeskPage, PublicServiceDeskForm }
│       │   ├── ServiceDeskPage.tsx      # ← features/ServiceDeskPage.tsx
│       │   ├── ServiceDeskForm.tsx      # ← features/ServiceDeskForm.tsx
│       │   ├── ServiceDeskForm.styles.ts
│       │   ├── PublicServiceDeskForm.tsx # ← features/PublicServiceDeskForm.tsx
│       │   └── components/
│       │       ├── ServiceDeskCardsView.tsx
│       │       ├── ServiceDeskListView.tsx
│       │       └── ServiceDeskDetailsModal.tsx
│       │
│       ├── QuestDispatcherMap/          # JUŻ ZREFAKTORYZOWANY
│       │   ├── index.ts
│       │   ├── QuestDispatcherMap.tsx
│       │   ├── types.ts
│       │   ├── components/
│       │   ├── constants/
│       │   └── utils/
│       │
│       │  # === FLAT FILES (proste, <150 LOC, samodzielne) ===
│       │
│       ├── Home.tsx
│       ├── List.tsx
│       ├── AddItemPage.tsx
│       ├── AddAssetForm.tsx
│       ├── AddAssetWithoutSerialForm.tsx
│       ├── AddStockForm.tsx
│       ├── BulkAddAssetForm.tsx
│       ├── EquipmentDetails.tsx
│       ├── LocationPage.tsx
│       ├── LocationsPage.tsx
│       ├── LocationDetailsPage.tsx
│       ├── CategoryManagementPage.tsx
│       ├── DutySchedulePage.tsx
│       ├── TutorialPage.tsx
│       ├── UserManagementPage.tsx
│       ├── UserDetailsPage.tsx
│       ├── QuestBoardPage.tsx
│       ├── QuestDetailPage.tsx
│       ├── LoginForm.tsx
│       ├── Authorisation.tsx
│       ├── RequireRole.tsx
│       ├── DiscordCallback.tsx
│       └── DiscordLinkCallback.tsx
│
├── hooks/                               # BEZ ZMIAN STRUKTURY
│   ├── index.ts                         # NOWY — barrel export
│   ├── useAuth.ts
│   ├── useStyles.ts
│   └── ... (27 hooków)
│
├── services/                            # BEZ ZMIAN STRUKTURY
│   ├── index.ts                         # NOWY — barrel export
│   ├── apiClient.ts
│   └── ... (8 serwisów)
│
├── types/                               # JEDYNE ŹRÓDŁO TYPÓW
│   ├── index.ts                         # barrel export (już istnieje)
│   ├── transfer.types.ts
│   ├── location.types.ts
│   ├── asset.types.ts
│   ├── user.types.ts
│   ├── quest.types.ts
│   ├── api.types.ts
│   └── *.d.ts                           # deklaracje (quagga, bwip-js, zxing)
│
├── theme/                               # BEZ ZMIAN
├── config/                              # BEZ ZMIAN
├── context/                             # BEZ ZMIAN
├── routes/                              # AKTUALIZACJA IMPORTÓW
│   ├── routes.ts
│   └── types.ts
│
│  # === USUNIĘTE ===
│  # src/models/          → przeniesione do types/
│  # src/containers/      → stub usunięty
│  # src/animations/      → skonsolidowane do components/animations/
```

---

## 3. Zasady organizacji

### 3.1 Kiedy folder, kiedy flat file

| Kryterium | Flat file | Folder |
|-----------|-----------|--------|
| LOC | <150 | >150 |
| Sub-components | brak | ma własne komponenty podrzędne |
| Własne typy/utils | brak | ma dedykowane typy, stałe, helpery |
| Przykłady | `Home.tsx`, `LoginForm.tsx` | `Transfer/`, `ServiceDesk/`, `QuestDispatcherMap/` |

### 3.2 Struktura folderu feature

```
FeatureName/
├── index.ts              # WYMAGANY — named exports dla stron, default dla single-page
├── FeaturePage.tsx        # Główna strona (route handler)
├── types.ts               # Opcjonalny — typy specyficzne dla feature
├── components/            # Opcjonalny — podkomponenty
│   └── SubComponent.tsx
├── constants/             # Opcjonalny — stałe specyficzne dla feature
│   └── config.ts
└── utils/                 # Opcjonalny — helpery specyficzne dla feature
    └── helpers.ts
```

### 3.3 Naming conventions

| Element | Konwencja | Przykład |
|---------|-----------|---------|
| Strona (route handler) | `*Page.tsx` | `TransferCreatePage.tsx` |
| Formularz | `*Form.tsx` | `ServiceDeskForm.tsx` |
| Widok/lista | `*View.tsx`, `*List.tsx` | `ServiceDeskCardsView.tsx` |
| Modal/dialog | `*Modal.tsx`, `*Dialog.tsx` | `ConfirmationDialog.tsx` |
| Hook | `use*.ts` | `useTransfers.ts` |
| Typy | `*.types.ts` | `transfer.types.ts` |
| Serwis | `*Service.ts` | `transferService.ts` |
| Stałe | camelCase filename | `statusConfig.ts` |

### 3.4 Import rules

- **Typy**: zawsze z `src/types/` (nigdy z `models/`)
- **Feature-specific types**: z `./types.ts` wewnątrz folderu feature
- **Hooki**: z `src/hooks/` (lub z barrel `src/hooks/index.ts`)
- **Serwisy**: z `src/services/`
- **Animacje**: z `src/components/animations/`
- **Między features**: NIE importuj z jednego feature do drugiego — wyciągnij do `common/`

---

## 4. Zadania refaktoryzacyjne

### PRIORYTET 1: Krytyczne — duplikaty i orphany

#### Zadanie 1.1: Usunięcie `src/models/`

**Dlaczego**: `types/` ma pełniejsze definicje. `models/` to duplikat.

**Kroki**:
1. W każdym pliku poniżej zamień import:

| Plik | Stary import | Nowy import |
|------|-------------|-------------|
| `src/hooks/useLocations.ts` | `from '../models/Location'` | `from '../types/location.types'` |
| `src/hooks/useTransfers.ts` | `from '../models/transfer'` | `from '../types/transfer.types'` |
| `src/components/features/TransferListPage.tsx` | `from '../../models/Location'` | `from '../../types/location.types'` |
| `src/components/features/LocationsPage.tsx` | `from '../../models/Location'` | `from '../../types/location.types'` |
| `src/components/TransferPage/components/TransferForm.tsx` | `from '../../../models/Location'` | `from '../../../../types/location.types'` |

2. Sprawdź czy interfejsy się zgadzają (Location z `models/` = Location z `types/location.types.ts` — identyczne)
3. Sprawdź czy Transfer z `models/` pasuje — `types/transfer.types.ts` ma `Transfer` z rozszerzoną definicją (extends `BaseTransfer`) — może wymagać drobnej korekty w `useTransfers.ts`
4. Usuń `src/models/transfer.ts` i `src/models/Location.ts`
5. Usuń folder `src/models/`

**Weryfikacja**: `npx tsc --noEmit`

#### Zadanie 1.2: Usunięcie `src/containers/`

**Dlaczego**: `containers/TransferDetailsPage.tsx` to stub (27 LOC) — **nie jest używany w routes**. `routes/routes.ts` importuje z `features/TransferDetailsPage`.

**Kroki**:
1. Potwierdź że żaden plik nie importuje z `containers/`:
   ```bash
   grep -r "containers/" src/ --include="*.ts" --include="*.tsx"
   ```
2. Jeśli brak importów → usuń `src/containers/TransferDetailsPage.tsx`
3. Usuń folder `src/containers/`

**Weryfikacja**: `npx tsc --noEmit`

#### Zadanie 1.3: Konsolidacja animacji

**Dlaczego**: Keyframes w `src/animations/`, komponenty w `src/components/animations/`. Powinny być w jednym miejscu.

**Kroki**:
1. Przenieś `src/animations/keyframes.ts` → `src/components/animations/keyframes.ts`
2. Zaktualizuj import w `src/components/features/LoginForm.tsx`:
   - `from '../../animations/keyframes'` → `from '../animations/keyframes'`
3. Sprawdź czy inne pliki importują z `src/animations/`:
   ```bash
   grep -r "from.*animations/keyframes" src/ --include="*.ts" --include="*.tsx"
   ```
4. Usuń folder `src/animations/`

**Weryfikacja**: `npx tsc --noEmit` + sprawdź animację logowania w przeglądarce

### PRIORYTET 2: Ważne — konsolidacja domen

#### Zadanie 2.1: Konsolidacja modułu Transfer

**Dlaczego**: Kod transferów jest w 3 różnych lokalizacjach. Powinien być w jednym folderze.

**Docelowa struktura**:
```
src/components/features/Transfer/
├── index.ts
├── TransferCreatePage.tsx
├── TransferDetailsPage.tsx
├── TransferListPage.tsx
└── components/
    ├── TransferFormCore.tsx
    ├── TransferForm.tsx
    ├── TransferList.tsx
    ├── ConfirmationDialog.tsx
    └── TransferModal.tsx
```

**Kroki**:
1. Utwórz `src/components/features/Transfer/`
2. Utwórz `src/components/features/Transfer/components/`
3. Przenieś sub-components z `src/components/TransferPage/components/`:
   - `TransferFormCore.tsx` → `Transfer/components/TransferFormCore.tsx`
   - `TransferForm.tsx` → `Transfer/components/TransferForm.tsx`
   - `TransferList.tsx` → `Transfer/components/TransferList.tsx`
   - `ConfirmationDialog.tsx` → `Transfer/components/ConfirmationDialog.tsx`
   - `TransferModal.tsx` → `Transfer/components/TransferModal.tsx`
   - `TransferForm.css` → **USUŃ** — przepisz na MUI `sx` prop lub skonwertuj do `.styles.ts`
4. Przenieś strony:
   - `features/TransferPage.tsx` → `Transfer/TransferCreatePage.tsx` (zmień nazwę!)
   - `features/TransferDetailsPage.tsx` → `Transfer/TransferDetailsPage.tsx`
   - `features/TransferListPage.tsx` → `Transfer/TransferListPage.tsx`
5. Utwórz `Transfer/index.ts`:
   ```ts
   export { default as TransferCreatePage } from './TransferCreatePage';
   export { default as TransferDetailsPage } from './TransferDetailsPage';
   export { default as TransferListPage } from './TransferListPage';
   ```
6. Zaktualizuj **wszystkie importy wewnętrzne** w przeniesionych plikach (relative paths się zmienią!)
7. Zaktualizuj `src/routes/routes.ts`:
   ```ts
   const TransferPage = lazy(() => import('../components/features/Transfer/TransferCreatePage'));
   const TransferDetailsPage = lazy(() => import('../components/features/Transfer/TransferDetailsPage'));
   const TransfersListPage = lazy(() => import('../components/features/Transfer/TransferListPage'));
   ```
8. Zaktualizuj `src/components/__tests__/TransferPage.test.tsx` — zmień importy
9. Usuń stary folder `src/components/TransferPage/`

**Weryfikacja**: `npx tsc --noEmit` + przetestuj: tworzenie transferu, lista transferów, szczegóły transferu, transfer z questa

#### Zadanie 2.2: Konsolidacja modułu ServiceDesk

**Dlaczego**: Pliki ServiceDesk są rozrzucone — strona i formularz flat, widoki w podfolderze.

**Docelowa struktura**:
```
src/components/features/ServiceDesk/
├── index.ts
├── ServiceDeskPage.tsx
├── ServiceDeskForm.tsx
├── ServiceDeskForm.styles.ts
├── PublicServiceDeskForm.tsx
└── components/
    ├── ServiceDeskCardsView.tsx
    ├── ServiceDeskListView.tsx
    └── ServiceDeskDetailsModal.tsx
```

**Kroki**:
1. Przenieś do `features/ServiceDesk/`:
   - `features/ServiceDeskPage.tsx` → `ServiceDesk/ServiceDeskPage.tsx`
   - `features/ServiceDeskForm.tsx` → `ServiceDesk/ServiceDeskForm.tsx`
   - `features/ServiceDeskForm.styles.ts` → `ServiceDesk/ServiceDeskForm.styles.ts`
   - `features/PublicServiceDeskForm.tsx` → `ServiceDesk/PublicServiceDeskForm.tsx`
2. Przenieś istniejące widoki do `components/`:
   - `ServiceDesk/ServiceDeskCardsView.tsx` → `ServiceDesk/components/ServiceDeskCardsView.tsx`
   - `ServiceDesk/ServiceDeskListView.tsx` → `ServiceDesk/components/ServiceDeskListView.tsx`
   - `ServiceDesk/ServiceDeskDetailsModal.tsx` → `ServiceDesk/components/ServiceDeskDetailsModal.tsx`
3. Utwórz `ServiceDesk/index.ts`:
   ```ts
   export { default as ServiceDeskPage } from './ServiceDeskPage';
   export { default as PublicServiceDeskForm } from './PublicServiceDeskForm';
   ```
4. Zaktualizuj importy w `ServiceDeskPage.tsx` (widoki z `./ServiceDesk/` → `./components/`)
5. Zaktualizuj `src/routes/routes.ts`:
   ```ts
   const ServiceDeskPage = lazy(() => import('../components/features/ServiceDesk/ServiceDeskPage'));
   // public route:
   component: lazy(() => import('../components/features/ServiceDesk/PublicServiceDeskForm')),
   ```

**Weryfikacja**: `npx tsc --noEmit` + przetestuj: service desk (lista kart/lista), tworzenie zgłoszenia, publiczny formularz

### PRIORYTET 3: Nice-to-have — barrel exports i porządki

#### Zadanie 3.1: Barrel export dla hooks/

**Dlaczego**: Czytelniejsze importy — `from '../hooks'` zamiast `from '../hooks/useAuth'`.

**Kroki**:
1. Utwórz `src/hooks/index.ts`:
   ```ts
   export { useAuth } from './useAuth';
   export { useStyles } from './useStyles';
   export { useStorage } from './useStorage';
   // ... reszta hooków
   ```
2. **NIE zmieniaj istniejących importów** — barrel jest opcjonalny, oba sposoby działają
3. Nowy kod powinien korzystać z barrel exportu

#### Zadanie 3.2: Barrel export dla services/

**Kroki**:
1. Utwórz `src/services/index.ts`:
   ```ts
   export { apiClient, ApiError } from './apiClient';
   export * from './transferService';
   export * from './assetService';
   // ... reszta serwisów
   ```

#### Zadanie 3.3: Konwersja TransferForm.css → MUI sx

**Dlaczego**: Jedyny plik CSS w projekcie — reszta używa MUI `sx` prop.

**Kroki**:
1. Przeczytaj `TransferForm.css` i zidentyfikuj style
2. Przepisz na MUI `sx` prop lub stwórz `TransferForm.styles.ts`
3. Zaktualizuj import w `TransferForm.tsx`
4. Usuń plik CSS

---

## 5. Kolejność wykonania

```
1.1 Usunięcie models/        (5 min, zerowe ryzyko)
1.2 Usunięcie containers/    (1 min, zerowe ryzyko)
1.3 Konsolidacja animacji    (5 min, niskie ryzyko)
    ↓
    npx tsc --noEmit + test w przeglądarce
    ↓
2.1 Konsolidacja Transfer    (30 min, średnie ryzyko — dużo plików)
    ↓
    npx tsc --noEmit + test transferów
    ↓
2.2 Konsolidacja ServiceDesk (15 min, niskie ryzyko)
    ↓
    npx tsc --noEmit + test service desk
    ↓
3.x Barrel exports + CSS     (opcjonalne, do zrobienia gdy jest czas)
```

---

## 6. Checklist weryfikacyjny

Po **każdym** zadaniu:
- [ ] `npx tsc --noEmit` — zero błędów
- [ ] `npm run build` — build przechodzi (jeśli dostępny)
- [ ] Strony ładują się w przeglądarce (lazy loading działa)
- [ ] Żaden import nie odwołuje się do usuniętego pliku

Po **wszystkich** zadaniach:
- [ ] Brak folderów: `src/models/`, `src/containers/`, `src/animations/`
- [ ] `src/components/TransferPage/` nie istnieje (przeniesiony do `features/Transfer/`)
- [ ] `features/` nie ma flat files ServiceDesk (przeniesione do `ServiceDesk/`)
- [ ] Grep `from.*models/` zwraca 0 wyników
- [ ] Grep `from.*containers/` zwraca 0 wyników
- [ ] Grep `from.*src/animations/` zwraca 0 wyników

---

## 7. Czego NIE zmieniamy

- **Logika biznesowa** — żadne zmiany w zachowaniu komponentów
- **Hooki** — struktura `hooks/` zostaje flat (barrel export to dodatek, nie reorganizacja)
- **Services** — struktura `services/` zostaje flat
- **Types** — `types/` zostaje bez zmian (tylko usuwamy duplikat `models/`)
- **Theme/Config/Context/Routes** — bez zmian struktury (tylko aktualizacja ścieżek importów w routes)
- **ui/, layout/, common/** — struktura bez zmian
- **QuestDispatcherMap** — już zrefaktoryzowany, nie ruszamy
