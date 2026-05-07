# Schedule API — Specyfikacja

## Filozofia projektowa

Harmonogram ma jednego aktywnego editora na raz (moderator/admin). UI robi szybkie zmiany lokalnie (optimistic state), a API służy do persystencji. Główna zasada: **UI nie czeka na API** — zmiany są lokalne, a sync idzie w tle.

Trzy mechanizmy bezpieczeństwa:
1. **`version`** — optimistic locking. Każdy save sprawdza czy nie nadpisujesz cudzej zmiany.
2. **`Idempotency-Key`** — retry-safe dla operacji POST. Możesz wysłać ten sam request dwa razy bez skutku ubocznego.
3. **`PUT /schedule/draft` jako truth** — zamiast N requestów per operacja, frontend akumuluje zmiany i wysyła jeden bulk-save. API reconciluje diff.

---

## Auth

```
Authorization: Bearer <JWT>
```

JWT dekoduje się do `{ user_id, role, exp }`. Role wymagane do zapisu: `admin`, `moderator`.
Opublikowany harmonogram (`status: published`) jest readonly nawet dla moderatora — tylko admin może cofnąć do draftu.

---

## Konwencje

### Base URL
```
/api/v1
```

### Format błędów — zawsze taki sam kształt
```jsonc
// 4xx / 5xx
{
  "error": "conflict",           // machine-readable slug
  "message": "Wersja harmonogramu jest nieaktualna. Odśwież stronę.",
  "details": { ... }            // opcjonalne, zależy od typu błędu
}
```

Kody które frontend musi obsłużyć:
| Kod | Znaczenie |
|-----|-----------|
| `400` | Walidacja requestu — złe pole, zły format |
| `401` | Brak/wygasły token |
| `403` | Brak uprawnień (np. moderator próbuje publishować) |
| `404` | Brak aktywnego harmonogramu |
| `409` | Conflict — wersja nieaktualna lub duplicate assignment |
| `422` | Semantycznie nieprawidłowe — np. koniec slotu przed startem |
| `503` | Serwer niedostępny (retry z backoff) |

### Daty
Wszystkie daty: **ISO 8601 z offsetem**, lokalny czas Poznań (`+02:00` lub `+01:00` zależnie od DST).
```
"2026-04-10T10:00:00+02:00"
```
Frontend parsuje przez `new Date(iso)` — nigdy nie przyjmuj "naiwnych" datetime bez offsetu bo JavaScript zakłada UTC.

---

## Modele

### ScheduleDetail
```typescript
interface ScheduleDetail {
  id: number;
  name: string;
  status: 'draft' | 'published';
  version: number;          // ← inkrementuje przy każdym savie; używany do optimistic locking
  event_start: string;      // ISO date
  event_end: string;
  festival_start: string;   // ISO datetime — kiedy zaczynają się sloty godzinowe
  festival_end: string;
  created_at: string;
  slots: ScheduleSlot[];
  volunteers: ScheduleVolunteer[];
  validation: ValidationResult;
}
```

### ScheduleSlot
```typescript
interface ScheduleSlot {
  id: number;
  type: 'montage' | 'festival' | 'demontage';
  label: string;
  start: string;            // ISO datetime
  end: string;
  credit_hours: number;     // credit, nie calendar hours (montage/demontage = 7h)
  capacity: number;         // oczekiwana obsada; 0 = auto (= count assigned)
  volunteers: SlotVolunteer[];
}

interface SlotVolunteer {
  id: number;               // assignment_id — używany do DELETE i swap
  volunteer_id: number;
  nickname: string;
}
```

### ScheduleVolunteer
```typescript
interface ScheduleVolunteer {
  id: number;
  nickname: string;
  user_id: number | null;   // null = nie ma konta w systemie (normalne)
  target_hours: number;
  assigned_hours: number;   // przeliczone przez backend, nie ufaj frontendowemu cache
  slots: number[];          // slot IDs
  available_from?: string;
  available_to?: string;
  city?: string;
  notes?: string;
}
```

### ValidationResult
```typescript
interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  type: ValidationIssueType;
  severity: 'error' | 'warning' | 'info';
  slot_id?: number;
  volunteer_id?: number;
  volunteer?: string;       // nickname, dla czytelności w UI
  message?: string;
}

type ValidationIssueType =
  | 'under_hours'           // wolontariusz ma za mało godzin
  | 'over_hours'            // wolontariusz ma za dużo godzin
  | 'no_festival_shifts'    // wolontariusz nie ma żadnego dyzuru festiwalowego
  | 'slot_understaffed'     // slot ma mniej osób niż capacity
  | 'slot_too_long'         // slot > 8h
  | 'consecutive_over_6h'  // ciągła seria slotów > 6h bez przerwy
  | 'insufficient_break'   // przerwa między slotami < 8h
  | 'double_booked'         // ten sam wolontariusz na dwóch nakładających się slotach
  | 'outside_availability'; // slot poza zadeklarowaną dostępnością wolontariusza
```

---

## Endpointy

### 1. Harmonogram

#### `GET /schedule`
Pobierz aktywny harmonogram z walidacją. 404 → brak aktywnego.

**Response 200:**
```json
{
  "id": 1,
  "name": "Pyrkon 2026",
  "status": "draft",
  "version": 42,
  "festival_start": "2026-04-10T10:00:00+02:00",
  "festival_end": "2026-04-12T20:00:00+02:00",
  "event_start": "2026-04-07",
  "event_end": "2026-04-13",
  "slots": [...],
  "volunteers": [...],
  "validation": { "valid": false, "issues": [...] }
}
```

---

#### `POST /schedule`
Utwórz nowy harmonogram. Poprzedni jest archiwizowany (nie usuwany).
Automatycznie generuje festiwalowe sloty godzinowe na podstawie `festival_start`/`festival_end`.

**Request:**
```json
{
  "name": "Pyrkon 2026",
  "event_start": "2026-04-07",
  "event_end": "2026-04-13",
  "festival_start": "2026-04-10T10:00:00+02:00",
  "festival_end": "2026-04-12T20:00:00+02:00"
}
```

**Response 201:** `ScheduleDetail` (slots = auto-generated festival slots, volunteers = [])

> **Ważne:** Festival sloty są generowane server-side w tym wywołaniu. Frontend NIE tworzy festival slotów przez `POST /schedule/slots` — tylko montaż/demontaż.

---

#### `PATCH /schedule/status`
Zmień status. Publish wymaga roli `admin` i `valid: true` w walidacji.

**Request:**
```json
{ "status": "published" }
```

**Response 200:** `ScheduleDetail` z nowym statusem.

**Error 409** jeśli próba publikacji z `valid: false`:
```json
{
  "error": "validation_failed",
  "message": "Harmonogram ma błędy blokujące publikację.",
  "details": { "error_count": 3 }
}
```

---

### 2. Draft (bulk save) — główny mechanizm persystencji

#### `PUT /schedule/draft`

Bulk-save stanu harmonogramu. **To jest jedyny endpoint do zapisu zmian w normalnym flow.**

Frontend akumuluje `pendingChanges` i wysyła je tutaj (debounce 2s, max co 30s, na Ctrl+S natychmiast).

**Mechanizm bezpieczeństwa — `version`:**
- Frontend wysyła `version` z ostatniego GET/PUT response
- Jeśli serwer ma nowszą wersję → **409 Conflict**
- Frontend musi wtedy: pokazać ostrzeżenie → GET /schedule → zresetować local state

**Request:**
```json
{
  "version": 42,
  "slots": [
    {
      "id": 15,
      "type": "montage",
      "label": "Montaż — wtorek",
      "start": "2026-04-07T08:00:00+02:00",
      "end": "2026-04-07T15:00:00+02:00",
      "capacity": 0
    },
    {
      "temp_id": "tmp_abc123",
      "type": "montage",
      "label": "Montaż — dodatkowy",
      "start": "2026-04-07T15:00:00+02:00",
      "end": "2026-04-07T18:00:00+02:00",
      "capacity": 0
    }
  ],
  "assignments": [
    { "volunteer_id": 5, "slot_id": 15 },
    { "volunteer_id": 7, "slot_temp_id": "tmp_abc123" }
  ]
}
```

Semantyka serwera:
- Slot z `id` → uaktualnij
- Slot z `temp_id` (bez `id`) → utwórz, zwróć mapowanie temp→real
- Sloty z bazy których **brak** w body → **usuń** (tylko montaż/demontaż; festival NIE są usuwane)
- Assignments: reconcile — dodaj brakujące, usuń nadmiarowe

**Response 200:**
```json
{
  "schedule": { ... },        // pełny ScheduleDetail z nową version
  "created_slots": [
    { "temp_id": "tmp_abc123", "id": 78 }
  ],
  "validation": { "valid": true, "issues": [] }
}
```

**Error 409 — version conflict:**
```json
{
  "error": "version_conflict",
  "message": "Harmonogram został zmieniony przez innego użytkownika.",
  "details": { "server_version": 45, "your_version": 42 }
}
```

> **Nota:** Festival sloty są zarządzane przez serwer — nigdy nie wysyłaj ich w tym body. Backend ignoruje je w sekcji `slots` lub odrzuca z 422.

---

#### `POST /schedule/validate`
Waliduj stan BEZ zapisu. Identyczne body jak `PUT /schedule/draft` ale bez zapisu.
Używane do podglądu walidacji przed savem lub w odpowiedzi na zmiany użytkownika.

**Request:** identyczne z `PUT /schedule/draft`

**Response 200:** `ValidationResult`

---

### 3. Sloty (montaż/demontaż)

> Festival sloty są zarządzane automatycznie. Poniższe endpointy służą tylko do montaż/demontaż i ewentualnych slotów specjalnych.
> W praktyce większość operacji idzie przez `PUT /schedule/draft`.

#### `POST /schedule/slots`
```json
{
  "type": "montage",
  "label": "Montaż — czwartek",
  "start": "2026-04-09T08:00:00+02:00",
  "end": "2026-04-09T15:00:00+02:00",
  "capacity": 0
}
```
**Response 201:** `ScheduleSlot`

---

#### `PATCH /schedule/slots/:id`
Partial update. Nie pozwól na zmianę `type` slotu festiwalowego — zwróć 422.

```json
{ "label": "Montaż — czwartek (zm.)", "end": "2026-04-09T16:00:00+02:00" }
```
**Response 200:** `ScheduleSlot`

**Error 422** jeśli `end - start > 8h`:
```json
{
  "error": "slot_too_long",
  "message": "Slot nie może trwać dłużej niż 8 godzin.",
  "details": { "duration_hours": 9.5, "max_hours": 8 }
}
```

---

#### `DELETE /schedule/slots/:id`
Usuwa slot i kaskadowo wszystkie jego assignmenty.
**Nie pozwól usunąć festival slotów** — zwróć 403.

**Response 204:** (no content)

---

### 4. Przypisania (assignments)

#### `POST /schedule/assignments`
Idempotent dzięki `Idempotency-Key` w headerze. Jeśli wolontariusz już jest na slocie → **409** (nie 500).

**Headers:**
```
Idempotency-Key: <uuid-v4>
```

**Request:**
```json
{ "volunteer_id": 5, "slot_id": 42 }
```

**Response 201:**
```json
{ "id": 301, "slot_id": 42, "volunteer_id": 5, "nickname": "Ania" }
```

**Error 409 — duplicate:**
```json
{
  "error": "already_assigned",
  "message": "Ania jest już przypisana do tego slotu.",
  "details": { "assignment_id": 301 }
}
```

---

#### `DELETE /schedule/assignments/:id`
**Response 204**. Idempotent — jeśli assignment już nie istnieje, zwróć też 204 (nie 404).

---

#### `POST /schedule/assignments/move`
Przenieś wolontariusza między slotami atomowo (replace w jednej transakcji).
Zastępuje: DELETE + POST w dwóch requestach.

**Request:**
```json
{
  "assignment_id": 301,
  "to_slot_id": 55
}
```

**Response 200:**
```json
{
  "deleted_assignment_id": 301,
  "created_assignment": { "id": 302, "slot_id": 55, "volunteer_id": 5, "nickname": "Ania" }
}
```

**Error 409** jeśli wolontariusz już jest na `to_slot_id`.

---

#### `POST /schedule/assignments/swap`
Zamień dwóch wolontariuszy między slotami atomowo.

**Request:**
```json
{ "assignment_a": 301, "assignment_b": 412 }
```

**Response 200:**
```json
{
  "assignment_a": { "id": 301, "slot_id": 55, "volunteer_id": 5 },
  "assignment_b": { "id": 412, "slot_id": 42, "volunteer_id": 9 }
}
```

---

### 5. Wolontariusze

#### `POST /schedule/volunteers`
Bulk import — zastępuje listę (nie usuwa assignmentów dla wolontariuszy którzy zostają).

**Request:**
```json
{
  "volunteers": [
    {
      "nickname": "Ania",
      "hours": 14,
      "available_from": "2026-04-09T08:00:00+02:00",
      "available_to": "2026-04-12T22:00:00+02:00",
      "city": "Poznań"
    }
  ]
}
```

**Response 200:**
```json
{ "imported": 15, "updated": 3, "skipped": 0 }
```

---

#### `POST /schedule/volunteers/import-sheet`
Import z Google Sheets. Sheet musi mieć nagłówki: `nickname`, `hours`, `available_from`, `available_to`, opcjonalnie `city`, `notes`.

**Request:**
```json
{ "sheet_id": "1BxiMVs...", "sheet_name": "Wolontariusze" }
```

**Response 200:**
```json
{ "imported": 15, "updated": 3, "skipped": 0, "errors": [] }
```

`errors` to wiersze których nie udało się sparsować — nie failuj całego importu z powodu jednego błędnego wiersza.

---

#### `PATCH /schedule/volunteers/:id`
Częściowa aktualizacja. Typowe użycie: przypisanie konta systemowego po rejestracji.

```json
{ "user_id": 42 }
```

**Response 200:** `ScheduleVolunteer`

---

### 6. Auto-generowanie i export

#### `POST /schedule/generate`
Uruchom solver (auto-generowanie przypisań). Czyści TYLKO assignmenty (nie sloty).
Wymaga roli `admin`.

**Response 200:** `ScheduleDetail`

---

#### `GET /schedule/export/csv`
Plik CSV z pełnym harmonogramem.

**Response 200:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="schedule_pyrkon_2026.csv"
```

---

#### `POST /schedule/export/sheets`
Push do Google Sheets.

**Response 200:**
```json
{ "rows_written": 142 }
```
> `sheet_url` opcjonalne — backend nie przechowuje URL arkusza (tylko ID), pole może być pominięte.

---

## Optimistic Update Flow

```
Użytkownik przeciąga chip → UI aktualizuje lokalny state natychmiast
       │
       ├─ Sync layer (useScheduleSync) — debounce 2s
       │
       └─ PUT /schedule/draft
              │
              ├─ 200 OK → zapisz nową version, zresetuj pendingChanges
              │
              └─ 409 Conflict (version_conflict)
                     │
                     └─ Pokaż toast "Harmonogram zmieniony przez inną osobę"
                            │
                            └─ GET /schedule → nadpisz local state
                                   (local zmiany TRACONE — edge case w praktyce 1 editor)
```

**Ważne:** Jeśli request leci i user robi kolejną zmianę, nie anuluj in-flight requestu. Pozwól mu się skończyć, a następny batch wyśle świeżą `version` ze starego response. Kolejka, nie race.

```
Change 1 → PUT (version: 42) ─────────────────→ 200 (version: 43)
Change 2 → PUT (version: 43) ─────────→ 200 (version: 44)   ✓
```

---

## Mechanizm bezpieczeństwa — Idempotency-Key

Dla POST operacji na assignmentach frontend wysyła UUID v4 jako `Idempotency-Key`. Serwer cache'uje response przez 60s — powtórzony request z tym samym kluczem zwraca zapisany response bez ponownego wykonania.

```
Idempotency-Key: 7f9c4b2a-1234-4e5f-9876-abcdef012345
```

Stosuj gdy: sieć może odciąć po wysłaniu requestu ale przed odebraniem response — bez tego retry tworzyłby duplikaty.

---

## Co NIE powinno być osobnymi requestami

Zamiast wysyłać N requestów (jeden per operacja), używaj `PUT /schedule/draft` który akumuluje wszystko.

| Anty-wzorzec | Poprawne |
|---|---|
| POST /assignments na każde przeciągnięcie chipa | Akumuluj w pendingChanges → bulk PUT |
| PATCH /slots na każdą zmianę labelki podczas pisania | Debounce lokalny → bulk PUT |
| DELETE + POST przy move | `POST /schedule/assignments/move` (atomowe) |

Wyjątek: `POST /schedule/generate` i `POST /schedule/export/sheets` — to operacje jednorazowe, nie batch.

---

## Walidacja — co serwer sprawdza przy PUT /schedule/draft

1. `slot.end > slot.start` — zły zakres → 422
2. `slot_too_long`: `end - start > 8h` (festiwal) → error w ValidationResult, NIE blokuje zapisu
3. `double_booked`: ten sam wolontariusz na dwóch nakładających się slotach → error
4. `consecutive_over_6h`: ciągła seria > 6h → warning
5. `insufficient_break`: przerwa < 8h między blokami → warning
6. `under_hours` / `over_hours`: wolontariusz poza targetem → warning
7. `outside_availability`: slot poza zadeklarowaną dostępnością → warning

**Ważne:** Walidacja NIGDY nie blokuje zapisu draftu — zawsze 200 z `validation.issues`. Blokuje tylko `PATCH /schedule/status` z `{ status: "published" }` gdy są błędy severity `error`.

---

## Typowe błędy do unikania

1. **Nie zwracaj 500 za constraint violation** (duplicate assignment) — użyj 409.
2. **Nie przyjmuj datetime bez offsetu** — JavaScript zakłada UTC, Poznań jest +1/+2.
3. **Nie usuwaj festival slotów przez `DELETE /schedule/slots/:id`** — zwróć 403.
4. **Nie kasuj assignmentów przy `PUT /schedule/draft`** dla wolontariuszy których nie ma w body — reconcile tylko assignments, nie wolontariuszy.
5. **Nie blokuj zapisu draftu przez walidację** — walidacja jest informacyjna, nie blokująca.
6. **Nie zmieniaj `version` jeśli payload nie różni się od aktualnego stanu** — optymalizacja, unika false conflicts przy retry.
7. **Idempotent DELETE** — `DELETE /schedule/assignments/999` gdzie 999 nie istnieje → 204, nie 404.
