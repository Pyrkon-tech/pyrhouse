# Volunteer Dispatch — Wymagania API (frontend spec)

> Dokument opisuje endpointy potrzebne frontendowi do obsługi wolontariuszy w widoku Dispatch Map.
> Obecna implementacja używa mocków — poniżej opisano kontrakt API, pod który frontend jest przygotowany.

---

## Modele danych

### `Volunteer`

```json
{
  "id": 1,
  "username": "mnowak",
  "fullname": "Marek Nowak",
  "discord_username": "Marek#1234",
  "avatar_url": "https://cdn.discordapp.com/avatars/.../abc.png",
  "status": "available",
  "current_mission": null
}
```

| Pole | Typ | Opis |
|------|-----|------|
| `id` | `number` | ID użytkownika — **taki sam jak w systemie** (`GET /users`) |
| `username` | `string` | Login |
| `fullname` | `string \| null` | Imię i nazwisko (null dla kont Discord-only) |
| `discord_username` | `string \| null` | Username Discord (wyświetlany na awatarze) |
| `avatar_url` | `string \| null` | URL awatara Discord |
| `status` | `"available" \| "on_mission" \| "offline"` | Aktualny status dyżurny |
| `current_mission` | `string \| null` | Opis misji gdy `on_mission`, np. `"Pawilon 5"` |

**Reguły statusów:**
- `available` — użytkownik aktywny, brak przypisanego questa `in_progress`
- `on_mission` — użytkownik jest przypisany jako uczestnik transferu powiązanego z questem o statusie `in_progress`
- `offline` — użytkownik oznaczony jako nieobecny (pole `dispatch_active = false` lub brak na zmianie)

---

## Endpointy

### 1. Lista wolontariuszy dyżurnych

```
GET /dispatch/volunteers
```

Zwraca listę użytkowników dostępnych/aktywnych na zmianie. Wyświetlani w panelu wolontariuszy i w modalu dispatch.

**Query params (opcjonalne):**
| Param | Typ | Opis |
|-------|-----|------|
| `status` | `string` | Filtr statusów, comma-separated, np. `available,on_mission` |

**Response 200:**
```json
[
  {
    "id": 1,
    "username": "mnowak",
    "fullname": "Marek Nowak",
    "discord_username": "Marek#1234",
    "avatar_url": null,
    "status": "available",
    "current_mission": null
  },
  {
    "id": 4,
    "username": "kkowalczyk",
    "fullname": "Katarzyna Kowalczyk",
    "discord_username": "Kasia#5678",
    "avatar_url": "https://cdn.discordapp.com/...",
    "status": "on_mission",
    "current_mission": "Pawilon 5"
  }
]
```

**Uwagi:**
- Backend powinien wyprowadzać `status` dynamicznie z powiązanych questów/transferów
- Wolontariusz jest `on_mission` jeśli jest uczestnikiem (`users[]`) w transferze powiązanym z questem o statusie `in_progress`
- Endpoint powinien zwracać tylko użytkowników, którzy są "na zmianie" (np. flaga `dispatch_active`, lub filtr po roli)

---

### 2. Przypisanie wolontariuszy do questa

```
POST /quests/{quest_id}/dispatch
```

Rejestruje przypisanie wolontariuszy do questa. Opcjonalny — frontend może obsłużyć to przez samo tworzenie transferu z `users[]`. Przydatny jeśli chcemy śledzić dispatch niezależnie od transferu (np. gdy transfer jeszcze nie istnieje).

**Body:**
```json
{
  "volunteer_ids": [1, 4]
}
```

**Response 200:**
```json
{
  "quest_id": "abc-123",
  "volunteer_ids": [1, 4],
  "dispatched_at": "2026-02-24T14:30:00Z"
}
```

**Efekty:**
- Quest przechodzi w status `in_progress` (jeśli był `pending`)
- Wolontariusze z `volunteer_ids` mają `status = on_mission` w odpowiedzi `GET /dispatch/volunteers`
- `current_mission` = np. `"Pawilon 5"` (z lokalizacji questa)

**Uwagi:**
- Endpoint opcjonalny na start — frontend w pierwszej wersji przechodzi przez `GET /quests/{id}` + formularz transferu z `users[]`
- Potrzebny gdy chcemy pokazywać status wolontariusza PRZED stworzeniem transferu

---

### 3. Rozszerzenie: GET /quests/{id} — przypisani wolontariusze

Dodać do istniejącego endpointu pole `assigned_volunteers`:

```json
{
  "id": "abc-123",
  "status": "in_progress",
  ...
  "assigned_volunteers": [
    { "id": 1, "username": "mnowak", "fullname": "Marek Nowak" }
  ]
}
```

Używane przez `QuestDetailPage` do wyświetlania przypisanych wolontariuszy i wstępnego wypełnienia formularza transferu.

---

### 4. Transfer z uczestnikami (istniejący endpoint)

```
POST /quests/{quest_id}/transfer
```

Istniejący endpoint — przyjmuje `users[]` z ID:

```json
{
  "from_location_id": 1,
  "to_location_id": 42,
  "users": [{ "id": 1 }, { "id": 4 }],
  "assets": [...],
  "stock_items": [...]
}
```

**Ważne:** `users[].id` to ten sam ID co `Volunteer.id` i `User.id` — jeden system identyfikatorów.

---

## Service Desk — oznaczenie jako w trakcie z wolontariuszami (opcjonalne)

```
PATCH /service-desk/requests/{id}
```

Użycie przy dispatchu wolontariuszy do zgłoszenia SD (jeśli ta funkcja zostanie dodana).

**Body:**
```json
{
  "status": "in_progress",
  "assignee_ids": [1, 4]
}
```

**Response 200:**
```json
{
  "id": 42,
  "status": "in_progress",
  "assignees": [
    { "id": 1, "username": "mnowak" },
    { "id": 4, "username": "kkowalczyk" }
  ]
}
```

**Uwaga:** SD nie generuje transferu — wolontariusze są tylko przypisani do zgłoszenia, nie do transferu sprzętu.

---

## Kolejność implementacji backend

Priorytet | Endpoint | Dlaczego
----------|----------|----------
**1** | `GET /dispatch/volunteers` | Blokuje panel wolontariuszy i modal dispatch
**2** | Pole `assigned_volunteers` w `GET /quests/{id}` | Potrzebne do auto-wypełnienia formularza
**3** | `POST /quests/{quest_id}/transfer` z `users[]` | Już istnieje, sprawdzić czy akceptuje `users`
**4** | `POST /quests/{quest_id}/dispatch` | Opcjonalny — potrzebny do real-time statusu przed transferem

---

## Integracja z istniejącym systemem użytkowników

- `Volunteer.id === User.id` — jeden `id` w całym systemie
- `GET /dispatch/volunteers` może być filtrem `GET /users?dispatch_active=true`
- Alternatywnie: osobna tabela `dispatch_shifts` (zmiana dyżurna) z FK do `users`
- `avatar_url` i `discord_username` z tabeli `users` (już istnieje pole `avatar_url` po Discord OAuth)

---

## Frontend — flaga mock/API

W pliku `src/services/volunteerService.ts` (tworzony jako część implementacji):

```ts
// Flip do false gdy backend gotowy:
const USE_MOCK = true;

export async function getVolunteersAPI(): Promise<Volunteer[]> {
  if (USE_MOCK) return MOCK_VOLUNTEERS;
  return apiClient.get<Volunteer[]>('/dispatch/volunteers');
}
```

Prosta zmiana jednej flagi przepina cały system na API.
