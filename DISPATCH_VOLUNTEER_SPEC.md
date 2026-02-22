# Dispatch Volunteer System — Specyfikacja implementacji

> Interfejs inspirowany mechaniką Dispatch z Zenless Zone Zero / SDN Dispatch.
> Dyspozytornia do wysyłania wolontariuszy (gżdaczy) na misje questowe z mapą MTP Poznań.

---

## Spis treści

1. [Koncept UX](#1-koncept-ux)
2. [Architektura komponentów](#2-architektura-komponentów)
3. [Typy danych](#3-typy-danych)
4. [Mock data](#4-mock-data)
5. [Faza 1 — Panel wolontariuszy](#5-faza-1--panel-wolontariuszy)
6. [Faza 2 — Dispatch flow (ikony + modal + przypisanie)](#6-faza-2--dispatch-flow)
7. [Faza 3 — Podpięcie API (przyszłość)](#7-faza-3--podpięcie-api)
8. [Stylowanie](#8-stylowanie)
9. [Pliki do utworzenia/zmodyfikowania](#9-pliki-do-utworzeniazmodyfikowania)
10. [Weryfikacja](#10-weryfikacja)

---

## 1. Koncept UX

### Inspiracja: ZZZ Dispatch
W grze Zenless Zone Zero panel Dispatch wygląda tak:
- **Mapa** z lokacjami misji, każda z ikonami statusu (gotowa / w trakcie / zakończona)
- **Dolny panel** z listą bohaterów — karty z awatarem, imieniem, stanem (dostępny / na misji / niedostępny)
- **Kliknięcie misji** → modal z przypisaniem bohaterów, podgląd wymagań, przycisk "DISPATCH"
- Po dispatchu bohater znika z dostępnych, misja zmienia status

### Nasza adaptacja — PyrHouse Dispatch
- **Mapa MTP** (istniejąca SVG) z budynkami-strefami
- **Dolny panel** pod mapą z wolontariuszami na dyżurze — avatar Discord, nick, status
- **Budynek z pending questami** → pulsujący beacon + większa ikona "oczekuje reakcji" (zamiast superhero — ikona package/quest)
- **Kliknięcie budynku** → modal "Dispatch Mission" z:
  - Lista questów w tej strefie
  - Wybór wolontariuszy do przypisania (drag & drop lub checkboxy)
  - Przycisk "DISPATCH" → nawigacja do `/quests/{id}` (szczegóły z formularzem transferu)

### Layout docelowy

```
┌─────────────────────────────────────────────────────────────────────┐
│  DISPATCH · CENTRUM DOWODZENIA                          [Sidebar]  │
│ ┌─────────────────────────────────────────────┐ ┌────────────────┐ │
│ │                                             │ │  Pawilon 7A    │ │
│ │              SVG MAPA MTP                   │ │  ⚡2 oczekujące │ │
│ │                                             │ │  Quest: Stoly  │ │
│ │   [7A]⚡   [7]    [8A]   [8]               │ │  Quest: Kable  │ │
│ │                                             │ │                │ │
│ │        [PCC]            [5]                 │ │  (lista)       │ │
│ │                                             │ │                │ │
│ │   [1]        [2]        [3]    [3A]         │ │                │ │
│ │                                             │ ├────────────────┤ │
│ ├─────────────────────────────────────────────┤ │ Wolontariusze  │ │
│ │  ╔══════════════════════════════════════╗    │ │ na dyżurze:    │ │
│ │  ║  WOLONTARIUSZE NA DYŻURZE           ║    │ │ (count)        │ │
│ │  ║  [🟢 Avatar1 Nick1] [🟢 Avatar2]   ║    │ │                │ │
│ │  ║  [🟡 Avatar3 Nick3] [⚫ Avatar4]   ║    │ │                │ │
│ │  ╚══════════════════════════════════════╝    │ └────────────────┘ │
│ └─────────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Modal Dispatch (po kliknięciu budynku z pending questami)

```
┌──────────────────────────────────────────────┐
│  ⚡ DISPATCH MISSION — Pawilon 7A            │
│  ─────────────────────────────────────────── │
│                                              │
│  QUEST: Stoły dla sekcji gier planszowych    │
│  Odbiorca: Jan Kowalski                      │
│  Termin: 15.04.2026 (godz. 10:00)           │
│  Przedmioty: 5 pozycji (12 szt.)            │
│                                              │
│  ─────────────────────────────────────────── │
│  PRZYPISZ WOLONTARIUSZY:                     │
│                                              │
│  [✓] 🟢 @marek_dev     Marek Nowak          │
│  [✓] 🟢 @ania_tech     Anna Wiśniewska      │
│  [ ] 🟢 @piotr_log     Piotr Zieliński      │
│  [ ] 🟡 @kasia_org     Na misji (Paw. 5)    │
│                                              │
│  ─────────────────────────────────────────── │
│  [  ANULUJ  ]              [ ⚡ DISPATCH  ]  │
└──────────────────────────────────────────────┘
```

---

## 2. Architektura komponentów

### Drzewo komponentów (po zmianach)

```
QuestDispatcherMap/
├── QuestDispatcherMap.tsx          # MODIFY — dodaj state volunteers, dispatch modal
├── index.ts                        # bez zmian
├── types.ts                        # MODIFY — dodaj Volunteer, DispatchAssignment
├── constants/
│   ├── zones.ts                    # bez zmian
│   ├── statusConfig.ts             # bez zmian
│   └── mockVolunteers.ts           # CREATE — mock data wolontariuszy
├── components/
│   ├── MapCanvas.tsx               # MODIFY — dodaj pending quest icons (większe ikony)
│   ├── ZoneOverlay.tsx             # MODIFY — dodaj quest-ready indicator icon
│   ├── DispatchSidebar.tsx         # MODIFY — dodaj bottomPanel slot (już jest prop!)
│   ├── VolunteerPanel.tsx          # CREATE — dolny panel z wolontariuszami
│   ├── VolunteerCard.tsx           # CREATE — karta wolontariusza (avatar + nick + status)
│   └── DispatchModal.tsx           # CREATE — modal przypisania wolontariuszy do questa
└── utils/
    ├── geometry.ts                 # bez zmian
    └── matching.ts                 # bez zmian
```

### Przepływ danych

```
QuestBoardPage
  └── QuestDispatcherMap
        ├── props: quests[]
        ├── state: volunteers[] (mock → potem z API)
        ├── state: selectedZoneId
        ├── state: dispatchModal { open, questId, zoneId }
        │
        ├── MapCanvas
        │     ├── ZoneOverlay (per zone) — kliknięcie → otwiera DispatchModal
        │     └── Quest-ready icons na budynkach z pending
        │
        ├── DispatchSidebar
        │     ├── ZoneDetail / ZoneSummary (istniejące)
        │     └── bottomPanel → VolunteerPanel
        │
        ├── VolunteerPanel (dolny panel pod mapą LUB w sidebar)
        │     └── VolunteerCard[] (avatar, nick, status badge)
        │
        └── DispatchModal (Dialog MUI)
              ├── Quest info
              ├── Volunteer selection (checkboxy)
              └── DISPATCH button → navigate(`/quests/${questId}`)
```

---

## 3. Typy danych

### Nowe typy w `QuestDispatcherMap/types.ts`

```typescript
// Status wolontariusza w systemie dispatch
export type VolunteerStatus = 'available' | 'on_mission' | 'offline';

// Wolontariusz na dyżurze
export interface Volunteer {
  id: number;
  username: string;              // nick PyrHouse
  discord_username: string | null;
  avatar_url: string | null;     // Discord avatar URL
  fullname: string | null;
  status: VolunteerStatus;
  current_mission?: string;      // np. "Pawilon 5" — jeśli on_mission
}

// Przypisanie wolontariuszy do misji (dispatch)
export interface DispatchAssignment {
  quest_id: string;
  zone_id: string;
  volunteer_ids: number[];
}

// Stan modala dispatch
export interface DispatchModalState {
  open: boolean;
  quest: Quest | null;           // wybrany quest
  zone_id: string | null;
}
```

### Przyszłe typy API (faza 3)

```typescript
// GET /duty-schedule/on-duty — wolontariusze na aktualnym dyżurze
export interface OnDutyResponse {
  volunteers: Volunteer[];
  shift_start: string;
  shift_end: string;
}

// POST /quests/{id}/dispatch — przypisanie wolontariuszy
export interface DispatchPayload {
  volunteer_ids: number[];
}

export interface DispatchResponse {
  message: string;
  quest_id: string;
  assigned_volunteers: number[];
}
```

---

## 4. Mock data

### Plik: `constants/mockVolunteers.ts`

```typescript
import type { Volunteer } from '../types';

export const MOCK_VOLUNTEERS: Volunteer[] = [
  {
    id: 1,
    username: 'marek_dev',
    discord_username: 'marek_dev#1234',
    avatar_url: null,      // fallback do inicjałów
    fullname: 'Marek Nowak',
    status: 'available',
  },
  {
    id: 2,
    username: 'ania_tech',
    discord_username: 'ania_tech#5678',
    avatar_url: null,
    fullname: 'Anna Wiśniewska',
    status: 'available',
  },
  {
    id: 3,
    username: 'piotr_log',
    discord_username: 'piotr_log#9012',
    avatar_url: null,
    fullname: 'Piotr Zieliński',
    status: 'available',
  },
  {
    id: 4,
    username: 'kasia_org',
    discord_username: 'kasia_org#3456',
    avatar_url: null,
    fullname: 'Katarzyna Kowalczyk',
    status: 'on_mission',
    current_mission: 'Pawilon 5',
  },
  {
    id: 5,
    username: 'tomek_av',
    discord_username: 'tomek_av#7890',
    avatar_url: null,
    fullname: 'Tomasz Lewandowski',
    status: 'on_mission',
    current_mission: 'Pawilon 3A',
  },
  {
    id: 6,
    username: 'ola_deko',
    discord_username: null,
    avatar_url: null,
    fullname: 'Aleksandra Dąbrowska',
    status: 'offline',
  },
  {
    id: 7,
    username: 'bartek_it',
    discord_username: 'bartek_it#2345',
    avatar_url: null,
    fullname: 'Bartosz Wójcik',
    status: 'available',
  },
  {
    id: 8,
    username: 'gosia_med',
    discord_username: 'gosia_med#6789',
    avatar_url: null,
    fullname: 'Małgorzata Kamińska',
    status: 'available',
  },
];
```

---

## 5. Faza 1 — Panel wolontariuszy

### Cel
Dolny panel z listą wolontariuszy na dyżurze, widoczny pod mapą SVG.

### Komponenty do utworzenia

#### `VolunteerCard.tsx` (~60 LOC)

Karta pojedynczego wolontariusza w stylu dispatch:

```
┌──────────────────┐
│  [Avatar]        │
│  @discord_nick   │
│  🟢 Dostępny    │
└──────────────────┘
```

- **Avatar**: okrągły 40x40, Discord avatar lub inicjały na gradiencie
- **Nick**: `discord_username` lub `username` jako fallback
- **Status badge**: kolorowa kropka + tekst
  - 🟢 available → `#66bb6a` "Dostępny"
  - 🟡 on_mission → `#ffd54f` "Na misji" + tooltip z lokalizacją
  - ⚫ offline → `#666` "Offline"
- **Styl**: dark glass card, border glow na hover, monospace font
- **Kliknięcie**: highlight / toggle selection (przygotowane na fazę 2)

```typescript
interface VolunteerCardProps {
  volunteer: Volunteer;
  selected?: boolean;
  onClick?: (volunteer: Volunteer) => void;
  compact?: boolean;    // true = w panelu dolnym (mniejszy), false = w modalu
}
```

#### `VolunteerPanel.tsx` (~80 LOC)

Poziomy scrollowalny panel pod mapą:

```typescript
interface VolunteerPanelProps {
  volunteers: Volunteer[];
  selectedIds?: number[];
  onVolunteerClick?: (volunteer: Volunteer) => void;
}
```

- **Layout**: `display: flex`, `overflow-x: auto`, horizontal scroll
- **Header**: "WOLONTARIUSZE NA DYŻURZE" + count badge + legendę statusów
- **Karty**: VolunteerCard[] w rzędzie, compact mode
- **Sortowanie**: available first → on_mission → offline
- **Scrollbar**: custom styled (dark theme, orange accent)
- **Empty state**: "Brak wolontariuszy na dyżurze" z ikoną

### Integracja w `QuestDispatcherMap.tsx`

```typescript
// Dodaj import i state
import { MOCK_VOLUNTEERS } from './constants/mockVolunteers';
import VolunteerPanel from './components/VolunteerPanel';

// W komponencie:
const [volunteers] = useState(MOCK_VOLUNTEERS); // mock → potem hook

// Layout zmiana: mapa + panel dolny po lewej, sidebar po prawej
return (
  <Box sx={{ display: 'flex', gap: 2, minHeight: 520 }}>
    {/* Lewa kolumna: mapa + panel wolontariuszy */}
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <MapCanvas ... />
      <VolunteerPanel volunteers={volunteers} />
    </Box>
    {/* Prawa kolumna: sidebar */}
    <DispatchSidebar ... />
  </Box>
);
```

### Stylowanie panelu

Kontynuacja istniejącego dark dispatch theme:
- Background: `#060e1a` z `border: 1px solid #152535`
- Karty wolontariuszy: `#07111e` z `border: 1px solid #1a3548`
- Hover: `#0e1f31` z orange glow na border
- Selected: `border: 1px solid #ff9800` z `box-shadow: 0 0 8px rgba(255,152,0,0.3)`
- Avatar ring: kolor statusu (green/yellow/gray)
- Scrollbar: `::-webkit-scrollbar-thumb` → `#1a3548`, hover → `#ff9800`

---

## 6. Faza 2 — Dispatch flow

### Cel
Kliknięcie budynku z pending questami → modal → wybór wolontariuszy → DISPATCH → nawigacja do quest detail.

### 6.1 — Ikony "Quest Ready" na budynkach

#### Zmiana w `ZoneOverlay.tsx`

Gdy budynek ma `metrics.pending > 0`, oprócz pulsującego beacona dodaj **większą ikonę SVG** wskazującą "oczekuje reakcji":

```svg
<!-- Ikona: paczka / skrzynia z wykrzyknikiem -->
<g transform="translate(cx-20, minY-40)">
  <!-- Tło ikony -->
  <rect x="0" y="0" width="40" height="36" rx="4" fill="#ff9800" opacity="0.9" />
  <!-- Ikona paczki (uproszczona) -->
  <path d="M8 10h24v18H8z M8 10l12-6 12 6" stroke="#fff" fill="none" stroke-width="2" />
  <!-- Wykrzyknik -->
  <text x="20" y="24" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">!</text>
  <!-- Pulsujące tło -->
  <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.5s" repeatCount="indefinite" />
</g>
```

**Warunek wyświetlania**: `metrics.pending > 0`

**Pozycja**: nad budynkiem, wycentrowany, lekko nad górnym edge'em polygonu (`bb.minY - 40`)

**Warianty ikony** w zależności od ilości pending:
- 1 quest: mała ikona (30x28)
- 2-3 questy: średnia ikona (40x36)
- 4+ questów: duża ikona (50x44) z dodatkowym counter badge

#### Zmiana w `ZoneOverlay` props

```typescript
interface ZoneOverlayProps {
  zone: Zone;
  metrics: ZoneMetrics;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDispatch?: (zoneId: string) => void;  // NEW — kliknięcie ikony dispatcha
}
```

Kliknięcie **ikony** (nie polygonu) → triggeruje `onDispatch` zamiast `onSelect`.
Kliknięcie **polygonu** → nadal `onSelect` (podświetlenie + sidebar).

### 6.2 — Dispatch Modal

#### `DispatchModal.tsx` (~200 LOC)

MUI Dialog w ciemnym dispatch theme.

```typescript
interface DispatchModalProps {
  open: boolean;
  quest: Quest | null;
  zone: Zone | null;
  volunteers: Volunteer[];
  onClose: () => void;
  onDispatch: (assignment: DispatchAssignment) => void;
}
```

**Sekcje modala:**

1. **Header**: "⚡ DISPATCH MISSION — Pawilon {label}" + ikona zamknięcia
2. **Quest info card**:
   - Odbiorca, cel dostawy, termin, ilość przedmiotów
   - Status chip
   - Kompaktowy layout (Grid 2 kolumny)
3. **Volunteer selection**:
   - Lista z checkboxami
   - Available: normalne, klikalne
   - On_mission: wyszarzone, tooltip "Na misji: {lokalizacja}", nieklikalne
   - Offline: ukryte (nie pokazuj offline w modalu)
   - Każdy wiersz: [Checkbox] [Avatar 32px] [Nick] [Status badge]
4. **Footer actions**:
   - "ANULUJ" (outlined, szary)
   - "⚡ DISPATCH ({count})" (contained, orange, disabled gdy count === 0)

**Styl**:
- Dialog: `PaperProps={{ sx: { bgcolor: '#0a1929', border: '1px solid #1a3548', ... } }}`
- Jak reszta dispatch — ciemny, monospace, orange accenty
- Max width: 500px

#### Logika dispatch

```typescript
const handleDispatch = (assignment: DispatchAssignment) => {
  // Faza 2 (mock): nawiguj do quest detail
  navigate(`/quests/${assignment.quest_id}`);

  // Opcjonalnie: zmień status wolontariuszy na 'on_mission' (local state)
  setVolunteers(prev => prev.map(v =>
    assignment.volunteer_ids.includes(v.id)
      ? { ...v, status: 'on_mission' as const, current_mission: `Pawilon ${zone.label}` }
      : v
  ));
};
```

### 6.3 — Zmiana flow kliknięcia budynku

Aktualnie kliknięcie budynku → podświetlenie + sidebar.

**Nowy flow:**
1. **Pierwszy klik** na budynek → podświetlenie + sidebar (jak teraz)
2. **Klik na ikonę quest-ready** (nad budynkiem) → otwiera DispatchModal z pierwszym pending questem
3. **Klik na konkretny quest w sidebarze** → otwiera DispatchModal dla tego questa (zamiast nawigacji)

Alternatywnie (prostsze):
1. Kliknięcie budynku → sidebar jak teraz
2. W sidebarze, na QuestItem: dodaj przycisk "⚡ Dispatch" obok nazwy questa
3. Przycisk otwiera DispatchModal

### 6.4 — Zmiana w `DispatchSidebar.tsx`

Dodaj przycisk Dispatch na każdym QuestItem który jest `pending`:

```typescript
// W QuestItem component:
{quest.status === 'pending' && (
  <Button
    size="small"
    onClick={(e) => {
      e.stopPropagation();
      onDispatchQuest(quest);
    }}
    sx={{ /* orange dispatch style */ }}
  >
    ⚡ Dispatch
  </Button>
)}
```

### 6.5 — State management w `QuestDispatcherMap.tsx`

```typescript
const [volunteers, setVolunteers] = useState(MOCK_VOLUNTEERS);
const [dispatchModal, setDispatchModal] = useState<DispatchModalState>({
  open: false,
  quest: null,
  zone_id: null,
});

const handleOpenDispatch = (quest: Quest, zoneId: string) => {
  setDispatchModal({ open: true, quest, zone_id: zoneId });
};

const handleCloseDispatch = () => {
  setDispatchModal({ open: false, quest: null, zone_id: null });
};

const handleDispatch = (assignment: DispatchAssignment) => {
  // Update local volunteer state
  setVolunteers(prev => prev.map(v =>
    assignment.volunteer_ids.includes(v.id)
      ? { ...v, status: 'on_mission' as const, current_mission: `Zona ${assignment.zone_id}` }
      : v
  ));
  handleCloseDispatch();
  navigate(`/quests/${assignment.quest_id}`);
};
```

---

## 7. Faza 3 — Podpięcie API (przyszłość)

### Endpointy do stworzenia (backend)

```
GET  /duty-schedule/on-duty                    → OnDutyResponse
POST /equipment-requests/quests/{id}/dispatch  → DispatchResponse
GET  /equipment-requests/quests/{id}/dispatch  → { volunteers: Volunteer[] }
```

### Hook: `useDispatchVolunteers.ts`

```typescript
export const useDispatchVolunteers = () => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOnDuty = useCallback(async () => {
    const data = await apiClient.get<OnDutyResponse>('/duty-schedule/on-duty');
    setVolunteers(data.volunteers);
  }, []);

  const dispatchVolunteers = useCallback(async (questId: string, volunteerIds: number[]) => {
    await apiClient.post(`/equipment-requests/quests/${questId}/dispatch`, {
      volunteer_ids: volunteerIds,
    });
    await fetchOnDuty(); // refresh statuses
  }, [fetchOnDuty]);

  return { volunteers, loading, fetchOnDuty, dispatchVolunteers };
};
```

### Migracja z mock na API

W `QuestDispatcherMap.tsx`:
```typescript
// Faza 2 (mock):
const [volunteers] = useState(MOCK_VOLUNTEERS);

// Faza 3 (API):
const { volunteers, fetchOnDuty, dispatchVolunteers } = useDispatchVolunteers();
useEffect(() => { fetchOnDuty(); }, [fetchOnDuty]);
```

### Integracja z istniejącym UserListItem

Backend powinien rozszerzyć `GET /duty-schedule/on-duty` żeby zwracać:
- `UserListItem` + `avatar_url` + `status` + `current_mission`
- Lub nowy typ `VolunteerOnDuty` oparty na `UserDetails`

---

## 8. Stylowanie

### Design tokens do użycia

Wszystkie kolory/spacing z istniejącego dispatch theme:

```typescript
// Tło
const BG_PRIMARY = '#060e1a';     // panel/sidebar bg
const BG_CARD = '#07111e';        // card bg
const BG_HOVER = '#0e1f31';       // card hover
const BORDER = '#152535';          // primary border
const BORDER_ACTIVE = '#1a3548';   // active border
const BORDER_SELECTED = '#ff9800'; // selected border

// Status colors (reuse z statusConfig.ts)
const VOLUNTEER_STATUS_COLORS = {
  available: '#66bb6a',
  on_mission: '#ffd54f',
  offline: '#666666',
};

// Text
const TEXT_PRIMARY = '#c8e8f5';
const TEXT_SECONDARY = '#3a7a8a';
const TEXT_MUTED = '#1a5a6a';

// Accent
const ACCENT_ORANGE = '#ff9800';
const ACCENT_TEAL = '#00acc1';
```

### Avatar z fallback na inicjały

```typescript
// Jeśli avatar_url jest null, generuj gradient z inicjałów
const getInitials = (name: string | null, username: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return username.slice(0, 2).toUpperCase();
};

// Deterministyczny kolor z ID
const getAvatarColor = (id: number) => {
  const colors = ['#ff9800', '#00acc1', '#66bb6a', '#ffd54f', '#ef5350', '#ab47bc', '#42a5f5'];
  return colors[id % colors.length];
};
```

### Avatar z Discord

```tsx
<Avatar
  src={volunteer.avatar_url || undefined}
  sx={{
    width: 40, height: 40,
    bgcolor: volunteer.avatar_url ? 'transparent' : getAvatarColor(volunteer.id),
    border: `2px solid ${VOLUNTEER_STATUS_COLORS[volunteer.status]}`,
    fontSize: 14,
    fontFamily: 'monospace',
  }}
>
  {!volunteer.avatar_url && getInitials(volunteer.fullname, volunteer.username)}
</Avatar>
```

---

## 9. Pliki do utworzenia/zmodyfikowania

### Faza 1

| Plik | Akcja | LOC (est.) |
|------|-------|------------|
| `QuestDispatcherMap/types.ts` | MODIFY — dodaj `Volunteer`, `VolunteerStatus`, `DispatchAssignment`, `DispatchModalState` | +25 |
| `QuestDispatcherMap/constants/mockVolunteers.ts` | CREATE — mock data 8 wolontariuszy | ~70 |
| `QuestDispatcherMap/components/VolunteerCard.tsx` | CREATE — karta wolontariusza | ~70 |
| `QuestDispatcherMap/components/VolunteerPanel.tsx` | CREATE — panel poziomy z kartami | ~90 |
| `QuestDispatcherMap/QuestDispatcherMap.tsx` | MODIFY — dodaj volunteers state, VolunteerPanel w layout | +15 |

### Faza 2

| Plik | Akcja | LOC (est.) |
|------|-------|------------|
| `QuestDispatcherMap/components/DispatchModal.tsx` | CREATE — modal dispatch z volunteer selection | ~200 |
| `QuestDispatcherMap/components/ZoneOverlay.tsx` | MODIFY — dodaj quest-ready icon SVG | +40 |
| `QuestDispatcherMap/components/MapCanvas.tsx` | MODIFY — pass onDispatch callback do ZoneOverlay | +5 |
| `QuestDispatcherMap/components/DispatchSidebar.tsx` | MODIFY — dodaj Dispatch button na QuestItem | +15 |
| `QuestDispatcherMap/QuestDispatcherMap.tsx` | MODIFY — dispatch modal state + handlers | +30 |

### Faza 3 (przyszłość)

| Plik | Akcja |
|------|-------|
| `src/hooks/useDispatchVolunteers.ts` | CREATE — hook API |
| `src/services/questService.ts` | MODIFY — dodaj dispatch endpoints |
| `src/types/quest.types.ts` | MODIFY — dodaj DispatchPayload/Response |
| `QuestDispatcherMap/QuestDispatcherMap.tsx` | MODIFY — zamień mock na hook |

---

## 10. Weryfikacja

### Po fazie 1
- [ ] Panel wolontariuszy widoczny pod mapą SVG
- [ ] 8 kart z mockami — avatar (inicjały), nick, status badge
- [ ] Sortowanie: available → on_mission → offline
- [ ] Horizontal scroll działa płynnie
- [ ] Dark dispatch theme spójny z resztą
- [ ] `npx tsc --noEmit` — zero błędów

### Po fazie 2
- [ ] Budynki z pending questami mają ikonę "quest ready" (paczka z !)
- [ ] Ikona pulsuje/animuje się
- [ ] Kliknięcie questa w sidebar → modal Dispatch
- [ ] Modal pokazuje info o queście + listę wolontariuszy z checkboxami
- [ ] On_mission wolontariusze wyszarzeni i nieklikalni
- [ ] Przycisk DISPATCH: disabled gdy 0 wybranych, aktywny gdy ≥1
- [ ] Po kliknięciu DISPATCH: nawigacja do `/quests/{id}`
- [ ] Wybrany wolontariusz zmienia status na `on_mission` (local)
- [ ] `npx tsc --noEmit` — zero błędów

### Po fazie 3
- [ ] Dane wolontariuszy z API `/duty-schedule/on-duty`
- [ ] POST dispatch zapisuje przypisanie w backendzie
- [ ] Real-time update statusów via SSE
- [ ] Avatar Discord wyświetla się prawidłowo

---

## Uwagi implementacyjne

1. **Nie modyfikuj istniejącej logiki routingu** — dispatch modal NIE tworzy nowej strony, tylko nawiguje do istniejącego `/quests/{id}`
2. **DispatchSidebar ma już `bottomPanel` prop** — wykorzystaj go do osadzenia VolunteerPanel
3. **Zachowaj performance** — VolunteerCard powinien być `React.memo` (lista się nie zmienia często)
4. **MUI Avatar** — użyj istniejącego MUI Avatar zamiast custom SVG
5. **Nie dodawaj nowych dependencies** — wszystko osiągalne z MUI + istniejącymi narzędziami
6. **Mock → API migracja** powinna wymagać zmiany JEDNEGO import/useState na hook — reszta komponentów nie powinna się zmienić
