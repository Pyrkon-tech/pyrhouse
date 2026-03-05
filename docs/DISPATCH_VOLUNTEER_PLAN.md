# Plan: Dispatch Map — Wolontariusze + Auto-fill Transfer

## Kontekst

Widok Dispatch Map ma panel wolontariuszy i modal wyboru wolontariuszy do questa, ale:
1. Dane wolontariuszy są **hardkodowane** w `MOCK_VOLUNTEERS` — brak integracji z API
2. Po wybraniu wolontariuszy i kliknięciu DISPATCH — nawiguje do `/quests/{id}` ale **formularz transferu nie otwiera się automatycznie** i wolontariusze **nie są wstępnie wypełnieni**

Cel: przygotować architekturę pod API (easy swap) i zaimplementować auto-fill formularza transferu wolontariuszami wybranymi w DispatchModal.

Spec API dla backendu: `VOLUNTEER_DISPATCH_API_SPEC.md`

---

## Pliki do modyfikacji / tworzenia

| Plik | Akcja |
|------|-------|
| `src/services/volunteerService.ts` | NOWY — getVolunteersAPI z flagą USE_MOCK |
| `src/hooks/useVolunteers.ts` | NOWY — hook z loading/error state |
| `src/components/features/QuestDispatcherMap/QuestDispatcherMap.tsx` | Zamień MOCK_VOLUNTEERS na useVolunteers |
| `src/components/features/QuestDetailPage.tsx` | Detect route state → auto-open + przekaż initialVolunteerIds |
| `src/components/features/Transfer/components/TransferFormCore.tsx` | Dodaj prop initialVolunteerIds — pre-fill po załadowaniu users |

---

## Faza 1: volunteerService.ts + useVolunteers hook

**`src/services/volunteerService.ts`** (NOWY):
```ts
import { apiClient } from './apiClient';
import type { Volunteer } from '../components/features/QuestDispatcherMap/types';
import { MOCK_VOLUNTEERS } from '../components/features/QuestDispatcherMap/constants/mockVolunteers';

const USE_MOCK = true; // flip do false gdy API gotowe

export async function getVolunteersAPI(): Promise<Volunteer[]> {
  if (USE_MOCK) return Promise.resolve([...MOCK_VOLUNTEERS]);
  return apiClient.get<Volunteer[]>('/dispatch/volunteers');
}
```

**`src/hooks/useVolunteers.ts`** (NOWY):
```ts
export const useVolunteers = () => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVolunteers = useCallback(async () => { ... }, []);

  // setVolunteers eksportowane — QuestDispatcherMap aktualizuje statusy lokalnie po dispatchu
  return { volunteers, setVolunteers, loading, error, fetchVolunteers };
};
```

---

## Faza 2: QuestDispatcherMap.tsx — zamiana MOCK na hook

```ts
// Przed:
const [volunteers, setVolunteers] = useState<Volunteer[]>(MOCK_VOLUNTEERS);

// Po:
const { volunteers, setVolunteers, fetchVolunteers } = useVolunteers();
useEffect(() => { fetchVolunteers(); }, [fetchVolunteers]);
```

Usunąć import `MOCK_VOLUNTEERS` z QuestDispatcherMap (pozostaje w volunteerService).

---

## Faza 3: handleDispatch → navigate z volunteerIds w route state

W `QuestDispatcherMap.tsx`, `handleDispatch`:

```ts
const handleDispatch = useCallback((assignment: DispatchAssignment) => {
  const zone = ZONES.find(z => z.id === assignment.zone_id);
  setVolunteers(prev => prev.map(v =>
    assignment.volunteer_ids.includes(v.id)
      ? { ...v, status: 'on_mission', current_mission: zone ? `Pawilon ${zone.label.replace('\n', ' ')}` : undefined }
      : v,
  ));
  handleCloseDispatch();
  navigate(`/quests/${assignment.quest_id}`, {
    state: {
      autoOpenTransfer: true,
      volunteerIds: assignment.volunteer_ids,  // number[]
    },
  });
}, [handleCloseDispatch, navigate, setVolunteers]);
```

---

## Faza 4: QuestDetailPage.tsx — auto-open + przekaż volunteerIds

```ts
import { useLocation } from 'react-router-dom';

const location = useLocation();
const dispatchState = location.state as { autoOpenTransfer?: boolean; volunteerIds?: number[] } | null;

// Auto-open formularz transferu po dispatch:
useEffect(() => {
  if (dispatchState?.autoOpenTransfer && quest && quest.status !== 'completed') {
    setShowTransferForm(true);
  }
}, [dispatchState?.autoOpenTransfer, quest?.id]);
```

Przekazać `initialVolunteerIds` do TransferFormCore:
```tsx
<TransferFormCore
  questId={quest.id}
  questLocationId={quest.location_id}
  questData={{ ... }}
  initialVolunteerIds={dispatchState?.volunteerIds}
  onSuccess={...}
  onCancel={...}
/>
```

---

## Faza 5: TransferFormCore.tsx — prop initialVolunteerIds

Dodać do `TransferFormCoreProps`:
```ts
/** IDs wolontariuszy wybranych w DispatchModal — pre-fill pola "Uczestnicy transferu" */
initialVolunteerIds?: number[];
```

Po załadowaniu users — pre-fill:
```ts
useEffect(() => {
  const fetchUsers = async () => {
    const data = await getUsersAPI();
    setUsers(data);
    if (initialVolunteerIds?.length) {
      const preselected = data.filter(u => initialVolunteerIds.includes(u.id));
      setValue('users', preselected);
    }
  };
  fetchUsers();
}, []); // initialVolunteerIds stabilne (z route state)
```

---

## Kluczowe założenie: Volunteer.id === User.id

`DispatchModal` wybiera wolontariuszy po ID → `getUsersAPI()` zwraca tych samych użytkowników → pre-fill działa przez `.filter(u => volunteerIds.includes(u.id))`.

---

## Service Desk — oddzielny, prostszy przepływ

SD requests w dispatcherze są **tylko wyświetlane** (brak przycisku DISPATCH). To celowe — SD to zazwyczaj akcje serwisowe (wymiana tonera, problem z internetem), **nie wydanie sprzętu**.

Jeśli chcemy dodać dispatch dla SD, przepływ jest prostszy niż dla questów:

| | Questy | Service Desk |
|---|---|---|
| Po DISPATCH | Otwórz formularz transferu z pre-fill wolontariuszy | Nawiguj do `/servicedesk/{id}`, oznacz jako `in_progress` |
| Formularz | TransferFormCore | Brak — nie wydaje się sprzętu |
| API | `POST /quests/{id}/transfer` z `users[]` | `PATCH /service-desk/requests/{id}` z `{ status: 'in_progress', assignee_ids: [...] }` |

**Implementacja SD dispatch (opcjonalna, osobna faza):**
1. `ServiceDeskItem` → dodać przycisk DISPATCH (analogicznie do `QuestItem`)
2. `DispatchSidebar` → prop `onDispatchSdRequest?(req: ServiceDeskRequest): void`
3. `QuestDispatcherMap` → `handleDispatchSdRequest` — otwiera modal z wolontariuszami, po dispatch naviguje do `/servicedesk/{req.id}` bez otwierania formularza transferu
4. Opcjonalnie: API call oznaczający request jako `in_progress` z przypisanymi użytkownikami

**Uwaga:** SD items mogą nie mieć `location` w sensie lokalizacji magazynowej — często mają tylko `pavilion`/`zone` z opisu zgłoszenia.

---

## Poza zakresem (nie robimy teraz)

- SD dispatch (opisany wyżej) — opcjonalny, osobna faza po głównej implementacji
- `POST /quests/{id}/dispatch` — backend nie gotowy, nie potrzebne do MVP
- Persystencja statusu wolontariuszy po odświeżeniu — mock resetuje się, API naprawi
- SSE dla real-time statusu wolontariuszy — osobny task

---

## Kolejność implementacji

1. `volunteerService.ts` + `useVolunteers.ts` (nowe pliki)
2. `QuestDispatcherMap.tsx` — zamiana MOCK + navigate z state
3. `QuestDetailPage.tsx` — auto-open + pass volunteerIds
4. `TransferFormCore.tsx` — prop + pre-fill po załadowaniu users

---

## Weryfikacja

1. Dispatch Map: panel wolontariuszy pokazuje dane (mock na razie)
2. Kliknij DISPATCH na queście → wybierz wolontariuszy → DISPATCH (N)
3. → Automatycznie otwiera się QuestDetailPage z otwartym formularzem transferu
4. → W polu "Uczestnicy transferu" są chipsy z wybranymi wolontariuszami
5. → Wolontariusze oznaczeni jako BUSY w panelu
6. → Formularz można normalnie edytować (dodać/usunąć uczestników, dodać sprzęt)
7. Po stworzeniu transferu: quest ma linked transfer_id
