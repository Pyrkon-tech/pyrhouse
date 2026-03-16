# Backend Task: Schedule API v2 — Slot CRUD + Bulk Draft Save

## Kontekst

Frontend harmonogramu przechodzi na architekturę "frontend-first" — grafik budowany jest lokalnie, a API służy do zapisu i walidacji. Potrzebujemy nowych endpointów do zarządzania slotami i bulk zapisu.

**Pełna specyfikacja:** `SCHEDULE_API_V2_SPEC.md` w tym samym repo.

**Istniejące endpointy które ZOSTAJĄ bez zmian:**
- `GET /schedule`, `POST /schedule`, `PATCH /schedule/publish`
- `POST /schedule/volunteers/import-sheet`, `GET/POST /schedule/export*`
- `POST /schedule/assignments`, `DELETE /schedule/assignments/:id` (deprecated ale działające)

---

## Co zaimplementować (w kolejności priorytetów)

### Priorytet 1 — blokujące frontend

#### 1. `POST /schedule/slots` — utwórz slot
```
Auth: moderator
Body: { type: "montage"|"festival"|"demontage", start: ISO, end: ISO, capacity: int, label?: string }
Response 201: ScheduleSlot (z obliczonym credit_hours)
Walidacja: start < end, capacity >= 1, type valid, daty w zakresie eventu
Error 409 jeśli schedule published
```

#### 2. `PATCH /schedule/slots/:id` — aktualizuj slot
```
Auth: moderator
Body (partial): { start?, end?, capacity?, type?, label? }
Response 200: ScheduleSlot (przelicz credit_hours jeśli zmieniono start/end/type)
Error 409 published, 404 not found
```

#### 3. `DELETE /schedule/slots/:id` — usuń slot
```
Auth: moderator
Response 204
KASKADA: usuń wszystkie assignments powiązane z tym slotem
Error 409 published, 404 not found
```

#### 4. `PUT /schedule/draft` — bulk save (KLUCZOWY)
```
Auth: moderator

Body:
{
  "slots": [
    { "id": 5, "type": "festival", "start": "2026-04-09T08:00:00", "end": "2026-04-09T12:00:00", "capacity": 3 },
    { "temp_id": "uuid-abc-123", "type": "festival", "start": "2026-04-09T12:00:00", "end": "2026-04-09T16:00:00", "capacity": 2 }
  ],
  "assignments": [
    { "volunteer_id": 10, "slot_id": 5 },
    { "volunteer_id": 12, "slot_temp_id": "uuid-abc-123" }
  ]
}

Logika:
1. Sloty z "id" → UPDATE (patch semantyka)
2. Sloty z "temp_id" (bez "id") → INSERT, przypisz serwerowe ID
3. Sloty w bazie ale NIE w payload → DELETE (kaskadowo z assignments)
4. Assignments: rekoncyliuj — dodaj brakujące, usuń nadmiarowe
5. "slot_temp_id" w assignments → zamień na nowo utworzone slot_id
6. Oblicz credit_hours (montaż/demontaż=7h, festiwal=duration)
7. Oblicz assigned_hours per wolontariusz
8. Walidacja na wynikowym stanie

Response 200:
{
  "schedule": { ...ScheduleDetail },
  "created_slots": [{ "temp_id": "uuid-abc-123", "id": 42 }],
  "validation": { "valid": false, "issues": [...] }
}

Error 409 published, 400 bad data, 404 no active schedule
```

### Priorytet 2 — usprawnienia

#### 5. `POST /schedule/validate` z body (walidacja bez zapisu)
```
Auth: user
Body: taki sam jak PUT /schedule/draft (slots + assignments)
Response 200: ValidationResult
NIE zapisuje — tylko waliduje proponowany stan.
```

#### 6. Rozszerzenie ValidationIssue o nowe pola
```json
{
  "type": "under_hours",
  "severity": "warning",        // NOWE: "error" | "warning" | "info"
  "volunteer": "Jan K.",
  "volunteer_id": 10,           // NOWE: do podświetlania w UI
  "slot_id": null,              // NOWE: do podświetlania slotu
  "assigned": 8,
  "target": 14,
  "message": "Wolontariusz ma za mało godzin (8/14h)"
}
```

Nowe reguły walidacji:
| Reguła | type | severity |
|--------|------|----------|
| Wolontariusz > 18h | `over_hours` | warning |
| Slot przeobsadzony | `slot_overstaffed` | warning |
| Nakładające się sloty | `double_booked` | **error** (blokuje publikację) |
| Poza dostępnością | `outside_availability` | warning |

### Priorytet 3 — nice to have

#### 7. `POST /schedule/generate` z polem `mode`
```
Body: { "mode": "replace" | "fill_gaps" | "suggest" }
- replace: obecne zachowanie (destrukcyjne)
- fill_gaps: zachowaj istniejące, uzupełnij puste
- suggest: zwróć propozycję BEZ zapisywania
Backward compat: brak "mode" = "replace"
```

---

## Reguła credit_hours

| Typ slotu | credit_hours |
|-----------|-------------|
| montage | **7** (stałe) |
| demontage | **7** (stałe) |
| festival | `(end - start)` w godzinach |

---

## Ważne zasady

1. **Walidacja NIGDY nie blokuje zapisu** (PUT /draft) — wszystko to ostrzeżenia
2. Jedynie `double_booked` (severity: error) blokuje **publikację** (PATCH /publish)
3. Istniejące endpointy assignments (POST/DELETE/swap) działają nadal — deprecated ale nie usuwaj
4. Wszystkie nowe endpointy wymagają aktywnego harmonogramu (404 jeśli brak)
5. Wszystkie mutujące endpointy blokowane gdy status = "published" (409)

---

## Kiedy zacząć

Frontend może działać BEZ tych endpointów (fallback na istniejące POST/DELETE assignments). Ale **Priorytet 1 (szczególnie PUT /schedule/draft)** odblokuje pełną funkcjonalność — slot CRUD z UI i batch save zamiast individual API calls.

Jak będą gotowe endpointy z Priorytetu 1, daj znać — przepnę frontend na nowe API.
