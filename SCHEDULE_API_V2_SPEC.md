# Schedule API v2 — Specyfikacja dla backendu

> **Kontekst:** Przebudowa systemu harmonogramu na architekturę frontend-first.
> Frontend buduje grafik lokalnie, API waliduje i zapisuje.
> Obecne endpointy assignment CRUD (`POST/DELETE /schedule/assignments`, swap) stają się deprecated — zastąpione przez bulk `PUT /schedule/draft`.

---

## Spis treści

1. [Nowe endpointy](#1-nowe-endpointy)
2. [Zaktualizowane endpointy](#2-zaktualizowane-endpointy)
3. [Deprecated endpointy](#3-deprecated-endpointy)
4. [Rozszerzona walidacja](#4-rozszerzona-walidacja)
5. [Typy danych](#5-typy-danych)
6. [Reguły biznesowe](#6-reguły-biznesowe)
7. [Priorytet implementacji](#7-priorytet-implementacji)

---

## 1. Nowe endpointy

### 1.1 `PUT /schedule/draft` — Bulk save (KLUCZOWY)

Zapisuje cały stan grafiku atomowo. Frontend wysyła pełny stan slotów + przypisań, backend diffuje z obecnym stanem.

**Auth:** moderator

**Request:**
```json
{
  "slots": [
    {
      "id": 5,
      "type": "festival",
      "start": "2026-04-09T08:00:00",
      "end": "2026-04-09T12:00:00",
      "capacity": 3,
      "label": "Środa rano"
    },
    {
      "temp_id": "uuid-abc-123",
      "type": "festival",
      "start": "2026-04-09T12:00:00",
      "end": "2026-04-09T16:00:00",
      "capacity": 2,
      "label": "Środa popołudnie"
    }
  ],
  "assignments": [
    { "volunteer_id": 10, "slot_id": 5 },
    { "volunteer_id": 12, "slot_temp_id": "uuid-abc-123" }
  ]
}
```

**Logika backendu:**
1. Sloty z `id` → aktualizuj (PATCH semantyka)
2. Sloty z `temp_id` (bez `id`) → utwórz nowe, przypisz serwerowe ID
3. Sloty obecne w bazie ale NIEOBECNE w payload → usuń (kaskadowo z przypisaniami)
4. Assignments: rekoncyliuj — dodaj brakujące, usuń nadmiarowe
5. `slot_temp_id` w assignments → zamień na nowo utworzone `slot_id`
6. Oblicz `credit_hours` dla każdego slotu (montaż/demontaż = 7h, festiwal = duration)
7. Oblicz `assigned_hours` per wolontariusz (suma credit_hours przypisanych slotów)
8. Uruchom walidację na wynikowym stanie

**Response: 200**
```json
{
  "schedule": { /* ScheduleDetail — pełny stan po zapisie */ },
  "created_slots": [
    { "temp_id": "uuid-abc-123", "id": 42 }
  ],
  "validation": {
    "valid": false,
    "issues": [ /* ValidationIssue[] */ ]
  }
}
```

**Errors:**
- `409` — schedule is published (read-only)
- `400` — niepoprawne dane (np. end < start, brak wymaganych pól)
- `404` — brak aktywnego harmonogramu

---

### 1.2 `POST /schedule/slots` — Utwórz slot

**Auth:** moderator

**Request:**
```json
{
  "type": "festival",
  "start": "2026-04-09T14:00:00",
  "end": "2026-04-09T18:00:00",
  "capacity": 2,
  "label": "Środa popołudnie"
}
```

**Response: 201**
```json
{
  "id": 42,
  "type": "festival",
  "label": "Środa popołudnie",
  "start": "2026-04-09T14:00:00",
  "end": "2026-04-09T18:00:00",
  "credit_hours": 4,
  "capacity": 2,
  "volunteers": []
}
```

**Walidacja:**
- `start` < `end`
- `capacity` >= 1
- `type` ∈ `['montage', 'festival', 'demontage']`
- `start` i `end` muszą być w zakresie dat eventu harmonogramu

**Errors:**
- `409` — schedule is published
- `400` — niepoprawne dane
- `404` — brak aktywnego harmonogramu

---

### 1.3 `PATCH /schedule/slots/:id` — Aktualizuj slot

**Auth:** moderator

**Request (partial update):**
```json
{
  "start": "2026-04-09T10:00:00",
  "end": "2026-04-09T14:00:00",
  "capacity": 4
}
```

Dozwolone pola: `start`, `end`, `capacity`, `type`, `label`.

**Response: 200** — zaktualizowany `ScheduleSlot`

Backend przelicza `credit_hours` po zmianie start/end.

**Errors:**
- `409` — published
- `404` — slot nie istnieje
- `400` — niepoprawne dane

---

### 1.4 `DELETE /schedule/slots/:id` — Usuń slot

**Auth:** moderator

**Response: 204** (no content)

**Kaskada:** Usuwa wszystkie przypisania (assignments) powiązane z tym slotem.

**Errors:**
- `409` — published
- `404` — slot nie istnieje

---

### 1.5 `POST /schedule/validate` — Walidacja bez zapisu (NOWY)

Frontend wysyła lokalny stan, backend waliduje BEZ zapisywania.

**Auth:** user (read-only operacja)

**Request:**
```json
{
  "slots": [
    { "id": 5, "type": "festival", "start": "...", "end": "...", "capacity": 3 },
    { "temp_id": "uuid-abc", "type": "festival", "start": "...", "end": "...", "capacity": 2 }
  ],
  "assignments": [
    { "volunteer_id": 10, "slot_id": 5 },
    { "volunteer_id": 12, "slot_temp_id": "uuid-abc" }
  ]
}
```

**Response: 200**
```json
{
  "valid": false,
  "issues": [
    {
      "type": "under_hours",
      "severity": "warning",
      "volunteer": "Jan K.",
      "volunteer_id": 10,
      "assigned": 8,
      "target": 14,
      "message": "Wolontariusz ma za mało godzin (8/14h)"
    },
    {
      "type": "double_booked",
      "severity": "error",
      "volunteer": "Anna N.",
      "volunteer_id": 12,
      "conflicting_slot_ids": [5, 42],
      "message": "Wolontariusz przypisany do nakładających się slotów"
    }
  ]
}
```

---

## 2. Zaktualizowane endpointy

### 2.1 `POST /schedule/generate` — Solver z trybami

**Auth:** moderator

**Request (ZMIANA — dodane pole `mode`):**
```json
{
  "mode": "replace"
}
```

**Tryby:**
| Mode | Opis | Zapisuje? |
|------|------|-----------|
| `replace` | Czyści WSZYSTKIE przypisania i generuje od nowa (obecne zachowanie) | Tak |
| `fill_gaps` | Zachowuje istniejące przypisania, wypełnia puste sloty | Tak |
| `suggest` | Generuje propozycję, zwraca ją BEZ zapisywania | Nie |

**Response: 200**

Dla `replace` i `fill_gaps`:
```json
{
  "schedule": { /* ScheduleDetail */ },
  "stats": {
    "assigned": 45,
    "unassigned": 5,
    "conflicts": 2
  }
}
```

Dla `suggest`:
```json
{
  "suggestion": {
    "assignments": [
      { "volunteer_id": 10, "slot_id": 5 },
      { "volunteer_id": 12, "slot_id": 42 }
    ]
  },
  "stats": {
    "assigned": 45,
    "unassigned": 5,
    "conflicts": 2
  }
}
```

**Backward compatibility:** Jeśli `mode` nie podany → domyślnie `replace` (obecne zachowanie).

---

### 2.2 `GET /schedule` — rozszerzony ValidationIssue

Response bez zmian w strukturze, ale `ValidationIssue` rozszerzony o nowe pola (patrz sekcja 4).

---

## 3. Deprecated endpointy

Te endpointy **działają nadal** (backward compatibility), ale frontend v2 ich nie używa:

| Endpoint | Zastąpiony przez |
|----------|-----------------|
| `POST /schedule/assignments` | `PUT /schedule/draft` |
| `DELETE /schedule/assignments/:id` | `PUT /schedule/draft` |
| `POST /schedule/assignments/swap` | `PUT /schedule/draft` |

**Można usunąć** po pełnej migracji frontendu.

---

## 4. Rozszerzona walidacja

### Reguły walidacji

| Reguła | Typ issue | Severity | Opis |
|--------|-----------|----------|------|
| Wolontariusz < target_hours | `under_hours` | warning | Za mało godzin (np. 8/14h) |
| Wolontariusz > 18h | `over_hours` | warning | Przekroczony zalecany limit |
| Pojedynczy dyżur > 6h | `shift_over_6h` | warning | Dyżur dłuższy niż 6h |
| Przerwa między dyżurami < 8h | `insufficient_break` | warning | Za krótka przerwa |
| Brak zmian festiwalowych | `no_festival_shifts` | warning | Wolontariusz ma tylko montaż/demontaż |
| Slot: wolontariuszy < capacity | `slot_understaffed` | warning | Niedobór w slocie |
| Slot: wolontariuszy > capacity | `slot_overstaffed` | warning | Nadmiar w slocie |
| Nakładające się sloty jednej osoby | `double_booked` | **error** | Kolizja czasowa |
| Poza oknem dostępności | `outside_availability` | warning | Wolontariusz niedostępny w tym czasie |

**WAŻNE:** Żadna reguła NIE blokuje zapisu (`PUT /schedule/draft`). Wszystkie są informacyjne. Jedynie `double_booked` (severity: error) blokuje **publikację** (`PATCH /schedule/publish`).

### Rozszerzony typ `ValidationIssue`

```typescript
{
  "type": "under_hours",          // typ reguły
  "severity": "warning",          // NOWE: 'error' | 'warning' | 'info'
  "volunteer": "Jan K.",          // nickname (opcjonalne)
  "volunteer_id": 10,             // NOWE: ID wolontariusza (dla podświetlania w UI)
  "slot_id": null,                // ID slotu (opcjonalne, dla reguł slot-specific)
  "assigned": 8,                  // przypisane godziny (dla under/over_hours)
  "target": 14,                   // docelowe godziny
  "capacity": null,               // pojemność slotu (dla understaffed/overstaffed)
  "break_hours": null,            // NOWE: faktyczna przerwa (dla insufficient_break)
  "conflicting_slot_ids": null,   // NOWE: kolidujące sloty (dla double_booked)
  "message": "Wolontariusz ma za mało godzin (8/14h)"  // ludzki opis
}
```

---

## 5. Typy danych

### ScheduleSlot (bez zmian w strukturze)

```typescript
{
  id: number,
  type: 'montage' | 'festival' | 'demontage',
  label: string,
  start: string,        // ISO 8601
  end: string,          // ISO 8601
  credit_hours: number, // obliczane przez backend
  capacity: number,
  volunteers: [{ id: number, nickname: string }]  // id = assignment_id
}
```

### ScheduleVolunteer (bez zmian)

```typescript
{
  id: number,
  nickname: string,
  user_id: number | null,
  target_hours: number,
  assigned_hours: number,  // obliczane przez backend
  slots: number[],         // slot IDs
  city: string | null,
  available_from: string | null,
  available_to: string | null,
  notes: string | null
}
```

### credit_hours — zasady obliczania

| Typ slotu | credit_hours |
|-----------|-------------|
| `montage` | **7h** (stałe, niezależnie od czasu trwania) |
| `demontage` | **7h** (stałe) |
| `festival` | `(end - start)` w godzinach (np. 08:00–12:00 = 4h) |

---

## 6. Reguły biznesowe (kontekst dla backendu)

Zasady grafikowania wolontariuszy na Pyrkonie:

1. **Minimum 14h dyżuru** per wolontariusz (`target_hours` domyślnie = 14)
2. **Maximum ~18h** jeśli wolontariusz się zgodził (nie blokować, tylko ostrzegać)
3. **Pojedynczy dyżur max 6h** (dłuższe dozwolone za zgodą — ostrzeżenie, nie blokada)
4. **Minimum 8h przerwy** między dyżurami (krótsze dozwolone za zgodą)
5. **Montaż/demontaż = 7h kredytu** niezależnie od faktycznego czasu pracy
6. **Preferowane**: każdy wolontariusz powinien mieć choć część dyżurów festiwalowych (nie tylko montaż/demontaż)
7. **Wyjątek**: niektórzy wolontariusze MOGĄ być przypisani tylko do montażu/demontażu
8. **Walidacja nigdy nie blokuje zapisu** — wszystko to ostrzeżenia. Blokada tylko przy publikacji dla severity: error.

---

## 7. Priorytet implementacji

### Priorytet 1 (blokujące frontend)

| Endpoint | Uzasadnienie |
|----------|-------------|
| `PUT /schedule/draft` | Kluczowy — bez niego frontend musi dalej używać pojedynczych POST/DELETE |
| `POST /schedule/slots` | Tworzenie slotów z UI |
| `PATCH /schedule/slots/:id` | Edycja czasu trwania i pojemności |
| `DELETE /schedule/slots/:id` | Usuwanie slotów z UI |

### Priorytet 2 (usprawnienia)

| Endpoint | Uzasadnienie |
|----------|-------------|
| `POST /schedule/validate` (z body) | Walidacja bez zapisu — UX improvement |
| Rozszerzone `ValidationIssue` | severity, volunteer_id, slot_id, conflicting_slot_ids |

### Priorytet 3 (nice-to-have)

| Endpoint | Uzasadnienie |
|----------|-------------|
| `POST /schedule/generate` z `mode` | Tryby fill_gaps i suggest |

### Dopóki backend nie jest gotowy

Frontend będzie działał z obecnym API jako fallback:
- Zamiast `PUT /schedule/draft` → indywidualne `POST/DELETE /schedule/assignments`
- Zamiast slot CRUD → sloty read-only (z backend auto-generate)
- Walidacja → `GET /schedule/validate` (obecny endpoint)
