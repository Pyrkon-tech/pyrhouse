# Equipment Requests - Frontend Implementation Specification

## Overview

System do zarządzania zamówieniami sprzętu zintegrowany z Google Sheets i systemem transferów magazynowych.

**Architektura:**
- **Quest** = warstwa integracji (Google Sheets sync, fuzzy matching kategorii, agregacja pozycji)
- **Transfer** = warstwa operacyjna (wydanie magazynowe, śledzenie statusu, potwierdzenie odbioru)
- Quest zasilaja system transferów — quest nigdy nie zarządza wydaniem samodzielnie

**Stack Backend:**
- Go 1.23 + Gin + PostgreSQL
- Auto-sync co 5-15 minut (konfigurowalny)
- Fuzzy matching kategorii (Levenshtein distance)
- Quest aggregation (grupowanie pozycji według lokalizacji/odbiorcy/daty)
- Quest → Transfer integracja (tworzenie transferów z questów, callback statusów)

**Frontend do zaimplementowania:**
- React/Vue/Angular (do wyboru)
- TypeScript (zalecane)
- UI do przeglądania questów, tworzenia transferów z questów, zarządzania wydaniami

---

## 🎯 Funkcjonalności do Implementacji

### Must-Have (Priority 1)
1. **Lista questów** z filtrowaniem i paginacją
2. **Szczegóły questa** z listą pozycji i statusem transferu
3. **Zmiana statusu** questa (tylko dla questów BEZ transferu)
4. **Manual sync trigger** (przycisk "Synchronizuj teraz")
5. **Status ostatniej synchronizacji**
6. **Tworzenie transferu z questa** (podgląd + kreator)
7. **Podgląd transferu** przed utworzeniem (preview endpoint)

### Nice-to-Have (Priority 2)
8. **Dashboard ze statystykami** (ile pending, in_progress, completed, ile z transferem)
9. **Category mapping management** (ręczne dopasowanie nazw → kategorie)
10. **Export do CSV/Excel**
11. **Search/filtering** po odbiorcach, lokalizacjach

### Nice-to-Have (Priority 2) — kontynuacja Phase 4
8. **Dashboard ze statystykami** (ile pending, in_progress, completed, ile z transferem)
9. **Category mapping management** (ręczne dopasowanie nazw → kategorie) — **API gotowe**
10. **Export do CSV/Excel**
11. **Search/filtering** po odbiorcach, lokalizacjach

### Zrealizowane w Phase 4
12. **Real-time updates via SSE** — `GET /equipment-requests/stream` — **DONE**
13. **Scheduler status** — `GET /equipment-requests/sync-status` — **DONE**
14. **Category mappings CRUD** — `GET /category-mappings`, `DELETE /category-mappings/:id` — **DONE**

### Future (Priority 3)
15. **Budget tracking**
16. **Multiple transfers per quest** (częściowe wydania)

---

## 📡 Backend API Reference

**Base URL:** `http://localhost:8080/api`

### Authentication
Wszystkie endpointy wymagają JWT token w header:
```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### 1. GET `/equipment-requests/quests`
Pobierz listę questów z opcjonalnym filtrowaniem i paginacją.

**Query Parameters:**
- `status` (optional): `pending` | `in_progress` | `completed` | `cancelled`
- `limit` (optional): max 500, default 100
- `offset` (optional): default 0

**Request Example:**
```bash
GET /api/equipment-requests/quests?status=pending&limit=20&offset=0
Authorization: Bearer <token>
```

**Response 200 OK:**
```json
{
  "count": 15,
  "limit": 20,
  "offset": 0,
  "quests": [
    {
      "id": "quest-f6c39c6c14716069",
      "destination": {
        "pavilion": "PCC",
        "location": "Maskarada"
      },
      "recipient": "Jan Kowalski",
      "delivery_date": "2025-06-13",
      "pickup_time": "17-18",
      "budget_owner": "Anna Nowak",
      "items": [
        {
          "name": "Laptop",
          "quantity": 2,
          "category_id": 123,
          "category_match": "exact",
          "category_match_confidence": 1.0,
          "budget_owner": "Anna Nowak",
          "notes": "Musi mieć dobrą baterię"
        }
      ],
      "status": "pending",
      "transfer_id": null,
      "transfer_status": null,
      "source_rows": [115, 116],
      "last_synced": "2026-02-17T12:30:00Z"
    }
  ]
}
```

---

#### 2. GET `/equipment-requests/quests/:id`
Pobierz szczegóły pojedynczego questa.

**URL Parameters:**
- `id`: Quest ID (np. `quest-f6c39c6c14716069`)

**Request Example:**
```bash
GET /api/equipment-requests/quests/quest-f6c39c6c14716069
Authorization: Bearer <token>
```

**Response 200 OK:**
```json
{
  "id": "quest-f6c39c6c14716069",
  "destination": {
    "pavilion": "PCC",
    "location": "Maskarada"
  },
  "recipient": "Jan Kowalski",
  "delivery_date": "2025-06-13",
  "pickup_time": "17-18",
  "budget_owner": "Anna Nowak",
  "items": [
    {
      "name": "Laptop Dell",
      "quantity": 2,
      "category_id": 123,
      "category_match": "fuzzy",
      "category_match_confidence": 0.85,
      "notes": "Specjalne wymagania"
    },
    {
      "name": "Mysz bezprzewodowa",
      "quantity": 2,
      "category_id": 456,
      "category_match": "exact",
      "category_match_confidence": 1.0
    }
  ],
  "status": "pending",
  "transfer_id": null,
  "transfer_status": null,
  "source_rows": [115, 116],
  "last_synced": "2026-02-17T12:30:00Z"
}
```

**Response 404 Not Found:**
```json
{
  "error": "Quest not found",
  "details": "no quest found with id quest-xyz"
}
```

---

#### 3. PATCH `/equipment-requests/quests/:id/status`
Zmień status questa. **Dziala TYLKO dla questów bez powiązanego transferu.**

Jeśli quest ma `transfer_id` — status jest zarządzany automatycznie przez transfer (callback). Ręczna zmiana zwróci 409 Conflict.

**URL Parameters:**
- `id`: Quest ID

**Request Body:**
```json
{
  "status": "in_progress"
}
```

**Valid Statuses:**
- `pending` - Oczekujące
- `in_progress` - W trakcie realizacji
- `completed` - Zrealizowane
- `cancelled` - Anulowane

**Request Example:**
```bash
PATCH /api/equipment-requests/quests/quest-f6c39c6c14716069/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress"
}
```

**Response 200 OK:**
```json
{
  "message": "Quest status updated successfully",
  "status": "in_progress"
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Invalid status",
  "details": "Status must be one of: pending, in_progress, completed, cancelled"
}
```

**Response 409 Conflict** (quest linked to transfer):
```json
{
  "error": "Quest status is managed by linked transfer",
  "details": "Quest is linked to transfer 42. Use transfer endpoints to change status."
}
```

> **Frontend note:** Jeśli quest ma `transfer_id`, ukryj przycisk zmiany statusu i pokaż link do transferu.

---

#### 4. POST `/equipment-requests/sync`
Ręcznie wywołaj synchronizację z Google Sheets.

**Request Example:**
```bash
POST /api/equipment-requests/sync
Authorization: Bearer <token>
```

**Response 200 OK:**
```json
{
  "message": "Sync completed successfully",
  "stats": {
    "quests_created": 5,
    "quests_updated": 3,
    "quests_unchanged": 12,
    "items_added": 8,
    "items_removed": 2
  },
  "quests": [
    {
      "id": "quest-abc123",
      "destination": {...},
      "status": "pending"
    }
  ]
}
```

**Response 500 Internal Server Error:**
```json
{
  "error": "Failed to sync equipment requests",
  "details": "unable to fetch spreadsheet data: ..."
}
```

---

#### 5. GET `/equipment-requests/sync-log`
Pobierz informacje o ostatniej synchronizacji.

**Request Example:**
```bash
GET /api/equipment-requests/sync-log
Authorization: Bearer <token>
```

**Response 200 OK:**
```json
{
  "id": 42,
  "synced_at": "2026-02-17T14:30:00Z",
  "rows_processed": 20,
  "quests_created": 5,
  "quests_updated": 3,
  "quests_unchanged": 12,
  "items_added": 8,
  "items_removed": 2,
  "success": true,
  "duration_ms": 2350,
  "sheet_id": "16BytrbWmyWeBGnlSIDZn1Lnb5rdspoQu_rpc5m5Vtbc",
  "errors": ""
}
```

**Response 404 Not Found:**
```json
{
  "error": "No sync log found",
  "details": "no sync operations recorded yet"
}
```

---

#### 6. POST `/equipment-requests/category-mapping`
Stwórz ręczne mapowanie nazwy z formularza → kategoria.

**Request Body:**
```json
{
  "form_item_name": "Laptop Dell",
  "category_id": 123,
  "created_by": 7
}
```

**Request Example:**
```bash
POST /api/equipment-requests/category-mapping
Authorization: Bearer <token>
Content-Type: application/json

{
  "form_item_name": "Laptop Dell XPS",
  "category_id": 123
}
```

**Response 201 Created:**
```json
{
  "message": "Category mapping created successfully",
  "mapping": {
    "id": 15,
    "form_item_name": "Laptop Dell XPS",
    "category_id": 123,
    "created_by": null,
    "created_at": "2026-02-17T15:00:00Z"
  }
}
```

---

#### 7. GET `/equipment-requests/quests/:id/transfer-preview?from_location_id=1`
Podgląd co się stanie gdy stworzymy transfer z questa. Pokazuje rozwiązane stock items, nierozwiązane pozycje i rozwiązaną lokalizację docelową. **Używaj PRZED tworzeniem transferu** żeby user mógł zobaczyć i skorygować dane.

**URL Parameters:**
- `id`: Quest ID

**Query Parameters:**
- `from_location_id` (required): ID magazynu źródłowego

**Request Example:**
```bash
GET /api/equipment-requests/quests/quest-f6c39c6c14716069/transfer-preview?from_location_id=1
Authorization: Bearer <token>
```

**Response 200 OK:**
```json
{
  "from_location_id": 1,
  "to_location_id": 5,
  "to_location_name": "PCC - Maskarada",
  "resolved_items": [
    {
      "stock_id": 42,
      "category_id": 123,
      "category_name": "Laptopy",
      "item_name": "Laptop Dell",
      "quantity": 2,
      "available": 15
    }
  ],
  "unresolved_items": [
    {
      "item_name": "Specjalna lampa UV",
      "quantity": 1,
      "category_id": null,
      "reason": "no category match"
    }
  ]
}
```

**Frontend behavior:**
- `resolved_items` — gotowe do transferu, pokaż zielono
- `unresolved_items` — wymagają ręcznego wskazania stock_id, pokaż czerwono/żółto
- `to_location_id: null` — lokalizacja nie rozwiązana automatycznie, user musi wybrać ręcznie

**Response 400 Bad Request:**
```json
{
  "error": "Missing required parameter",
  "details": "from_location_id query parameter is required"
}
```

**Response 404 Not Found:**
```json
{
  "error": "Quest not found",
  "details": "..."
}
```

---

#### 8. POST `/equipment-requests/quests/:id/transfer`
Stwórz transfer magazynowy na podstawie questa. Quest musi mieć status `pending` i nie mieć `transfer_id`.

Po utworzeniu transferu:
- Quest dostaje `transfer_id` i status zmienia się na `in_progress`
- Dalsze zmiany statusu questa są automatyczne (callback z transferu)
- Transfer `completed` → quest `completed`
- Transfer `cancelled` → quest wraca do `pending`, `transfer_id` = NULL

**URL Parameters:**
- `id`: Quest ID

**Request Body:**
```json
{
  "from_location_id": 1,
  "to_location_id": 5,
  "stock_items": [
    { "id": 42, "quantity": 2 },
    { "id": 78, "quantity": 1 }
  ],
  "assets": [
    { "id": 123 }
  ],
  "users": [
    { "id": 7 }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `from_location_id` | Yes | Magazyn źródłowy |
| `to_location_id` | No | Lokalizacja docelowa. Jeśli brak — auto-resolve z pavilion + location questa |
| `stock_items` | No | Ręczne wskazanie stock items. Jeśli brak — auto-resolve z category_id |
| `assets` | No | Serializowane assety do transferu |
| `users` | No | Użytkownicy przypisani do transferu |

**Request Example (minimal — auto-resolve):**
```bash
POST /api/equipment-requests/quests/quest-f6c39c6c14716069/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "from_location_id": 1
}
```

**Request Example (full — manual override):**
```bash
POST /api/equipment-requests/quests/quest-f6c39c6c14716069/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "from_location_id": 1,
  "to_location_id": 5,
  "stock_items": [
    { "id": 42, "quantity": 2 }
  ],
  "users": [
    { "id": 7 }
  ]
}
```

**Response 201 Created:**
```json
{
  "message": "Transfer created from quest successfully",
  "transfer_id": 156,
  "quest_id": "quest-f6c39c6c14716069"
}
```

**Response 409 Conflict:**
```json
{
  "error": "Failed to create transfer from quest",
  "details": "quest already linked to transfer 42"
}
```

**Response 422 Unprocessable Entity:**
```json
{
  "error": "Failed to create transfer from quest",
  "details": "could not resolve destination location for pavilion 'PCC' and name 'Maskarada'"
}
```

**Response 404 Not Found:**
```json
{
  "error": "Failed to create transfer from quest",
  "details": "quest not found"
}
```

---

## TypeScript Type Definitions

```typescript
// Quest Types
export interface Quest {
  id: string;
  destination: Destination;
  recipient: string;
  delivery_date: string; // ISO date format: "2025-06-13"
  pickup_time?: string;
  budget_owner: string;
  items: QuestItem[];
  status: QuestStatus;
  transfer_id?: number;        // null = no transfer linked
  transfer_status?: string;    // "pending" | "in_transit" | "completed" | "cancelled"
  source_rows: number[];
  last_synced: string; // ISO datetime: "2026-02-17T12:30:00Z"
}

export interface Destination {
  pavilion: string;
  location: string;
}

export interface QuestItem {
  name: string;
  quantity: number;
  category_id?: number;
  category_match: CategoryMatchType;
  category_match_confidence?: number; // 0.0 - 1.0
  budget_owner?: string;
  notes?: string;
}

export type QuestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type CategoryMatchType = 'exact' | 'fuzzy' | 'manual' | 'none';

// API Response Types
export interface QuestsListResponse {
  count: number;
  limit: number;
  offset: number;
  quests: Quest[];
}

export interface SyncResponse {
  message: string;
  stats: SyncStats;
  quests: Quest[];
}

export interface SyncStats {
  quests_created: number;
  quests_updated: number;
  quests_unchanged: number;
  items_added: number;
  items_removed: number;
}

export interface SyncLog {
  id: number;
  synced_at: string;
  rows_processed: number;
  quests_created: number;
  quests_updated: number;
  quests_unchanged: number;
  items_added: number;
  items_removed: number;
  success: boolean;
  duration_ms: number;
  sheet_id: string;
  errors: string;
}

export interface CategoryMapping {
  id: number;
  form_item_name: string;
  category_id: number;
  created_by?: number;
  created_at: string;
}

export interface StatusUpdateRequest {
  status: QuestStatus;
}

export interface CategoryMappingRequest {
  form_item_name: string;
  category_id: number;
  created_by?: number;
}

// Transfer Integration Types

export interface CreateTransferFromQuestRequest {
  from_location_id: number;
  to_location_id?: number;
  stock_items?: StockItemOverride[];
  assets?: AssetOverride[];
  users?: UserOverride[];
}

export interface StockItemOverride {
  id: number;
  quantity: number;
}

export interface AssetOverride {
  id: number;
}

export interface UserOverride {
  id: number;
}

export interface CreateTransferFromQuestResponse {
  message: string;
  transfer_id: number;
  quest_id: string;
}

export interface TransferPreview {
  from_location_id: number;
  to_location_id?: number;
  to_location_name?: string;
  resolved_items: ResolvedStockItem[];
  unresolved_items: UnresolvedItem[];
}

export interface ResolvedStockItem {
  stock_id: number;
  category_id: number;
  category_name?: string;
  item_name: string;
  quantity: number;
  available: number;
}

export interface UnresolvedItem {
  item_name: string;
  quantity: number;
  category_id?: number;
  reason: string; // "no category match" | "no stock in location" | etc.
}

// Error Response
export interface ApiError {
  error: string;
  details?: string;
}
```

---

## 🎨 UI/UX Requirements

### 1. Quest List View

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Equipment Requests                    [Synchronize Now] [+] │
├─────────────────────────────────────────────────────────────┤
│ Filters: [All ▼] [Status: All ▼] [Search: ________]         │
├─────────────────────────────────────────────────────────────┤
│ Last sync: 2 minutes ago (5 created, 3 updated, 12 unchanged)│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PCC - Maskarada                       [PENDING]         │ │
│ │ Recipient: Jan Kowalski                                 │ │
│ │ Delivery: 2025-06-13 | Pickup: 17-18                   │ │
│ │ Items: Laptop (2), Mouse (2)                           │ │
│ │ Budget: Anna Nowak                                      │ │
│ │                                  [Create Transfer]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Pawilon 5 - POW                  [IN_PROGRESS]         │ │
│ │ Recipient: Anna Nowak              Transfer #156        │ │
│ │ Delivery: 2025-06-14                                    │ │
│ │ Items: Monitor (1), Keyboard (1), Mouse (1)            │ │
│ │                                  [View Transfer ->]     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                  [< Previous] Page 1 of 3 [Next >]          │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Card-based layout dla questów
- Color-coded status badges:
  - `pending`: Yellow
  - `in_progress`: Blue
  - `completed`: Green
  - `cancelled`: Red
- Filter by status dropdown
- Search by recipient/location
- Pagination controls
- Last sync info + stats
- "Synchronize Now" button with loading state
- **[Create Transfer]** button na kartach z `transfer_id == null` i `status == pending`
- **Transfer #ID** badge + **[View Transfer]** link na kartach z `transfer_id != null`

---

### 2. Quest Detail View (without transfer)

**Layout — quest BEZ powiązanego transferu:**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to List]     Quest #quest-f6c39c6c14716069          │
├─────────────────────────────────────────────────────────────┤
│ Status: [PENDING ▼]                    [Change Status]      │
├─────────────────────────────────────────────────────────────┤
│ Destination                                                 │
│   Pavilion: PCC                                             │
│   Location: Maskarada                                       │
│                                                             │
│ Recipient                                                   │
│   Jan Kowalski                                              │
│                                                             │
│ Delivery Details                                            │
│   Date: 2025-06-13                                          │
│   Pickup Time: 17-18                                        │
│                                                             │
│ Budget Owner                                                │
│   Anna Nowak                                                │
├─────────────────────────────────────────────────────────────┤
│ Items (2)                                                   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Laptop Dell                                      Qty: 2 │ │
│ │ Category: Electronics (fuzzy match, 85%)               │ │
│ │ Budget: Anna Nowak                                      │ │
│ │ Notes: Musi miec dobra baterie                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Mysz bezprzewodowa                               Qty: 2 │ │
│ │ Category: Accessories (exact match, 100%)              │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              [Create Transfer from Quest]                    │
│  From location: [Warehouse 1 ▼]                             │
│                 [Preview Transfer]                           │
├─────────────────────────────────────────────────────────────┤
│ Metadata                                                    │
│   Source Rows: 115, 116                                     │
│   Last Synced: 2026-02-17 12:30:00                         │
└─────────────────────────────────────────────────────────────┘
```

### 3. Quest Detail View (with transfer)

**Layout — quest Z powiązanym transferem:**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to List]     Quest #quest-f6c39c6c14716069          │
├─────────────────────────────────────────────────────────────┤
│ Status: IN_PROGRESS              Managed by Transfer #156   │
│ (Status zmienia sie automatycznie przez transfer)           │
├─────────────────────────────────────────────────────────────┤
│ Destination / Recipient / Delivery ... (jak wyzej)          │
├─────────────────────────────────────────────────────────────┤
│ Items (2) ... (jak wyzej)                                   │
├─────────────────────────────────────────────────────────────┤
│ Linked Transfer                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Transfer #156                         [IN_TRANSIT]      │ │
│ │ From: Warehouse 1 -> PCC - Maskarada                   │ │
│ │ Items: Laptop Dell (2), Mysz bezprzewodowa (2)         │ │
│ │                                                         │ │
│ │                         [View Transfer Details ->]      │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Metadata                                                    │
│   Source Rows: 115, 116                                     │
│   Last Synced: 2026-02-17 12:30:00                         │
└─────────────────────────────────────────────────────────────┘
```

### 4. Transfer Creation Flow (from Quest)

**Step 1: Preview** — user wybiera `from_location_id`, klika "Preview Transfer"
```
┌─────────────────────────────────────────────────────────────┐
│ Create Transfer from Quest                                  │
├─────────────────────────────────────────────────────────────┤
│ From: [Warehouse 1 ▼]     To: PCC - Maskarada (auto)       │
├─────────────────────────────────────────────────────────────┤
│ Resolved Items (ready to transfer):                GREEN    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Laptop Dell           Stock #42      Qty: 2 / Avail: 15│ │
│ │ Mysz bezprzewodowa    Stock #78      Qty: 2 / Avail: 30│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Unresolved Items (need manual mapping):             YELLOW  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Specjalna lampa UV     Qty: 1                           │ │
│ │ Reason: no category match                               │ │
│ │ Manual override: [Select stock item ▼]                  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Optional: Assign users [Select users ▼]                     │
├─────────────────────────────────────────────────────────────┤
│               [Cancel]        [Create Transfer]             │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Confirm** — user klika "Create Transfer", backend tworzy transfer i linkuje z questem

**UI logic:**
1. User wybiera `from_location_id` z dropdowna lokalizacji
2. Klik "Preview" -> wywolanie `GET /quests/:id/transfer-preview?from_location_id=X`
3. Wyswietl `resolved_items` (zielono) i `unresolved_items` (zolto/czerwono)
4. Dla `unresolved_items` user moze recznie wskazac `stock_id` z dropdowna
5. Klik "Create Transfer" -> wywolanie `POST /quests/:id/transfer` z overrides
6. Po sukcesie: redirect do quest detail (teraz z `transfer_id`)

**Features:**
- Status dropdown with inline update (tylko gdy `transfer_id == null`)
- Info banner "Status managed by transfer" (gdy `transfer_id != null`)
- Structured info display
- Items list with:
  - Category match indicator (exact/fuzzy/manual/none)
  - Confidence percentage for fuzzy matches
  - Color coding based on match quality
- Transfer creation section (preview + create)
- Linked transfer card with link to transfer detail
- Metadata section (debug info)

---

### 5. Dashboard (Optional - Priority 2)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Equipment Requests Dashboard                                │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │  PENDING │ │   IN     │ │COMPLETED │ │CANCELLED │      │
│ │    15    │ │ PROGRESS │ │    45    │ │    3     │      │
│ │          │ │    8     │ │          │ │          │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│ 📊 Last 7 Days Activity                                     │
│ [Chart showing quests created/completed over time]          │
├─────────────────────────────────────────────────────────────┤
│ 🔥 Most Requested Items                                     │
│  1. Laptop (24 requests)                                    │
│  2. Mouse (18 requests)                                     │
│  3. Monitor (12 requests)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Guide

### Step 1: API Client Setup

```typescript
// src/api/equipmentRequests.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const equipmentRequestsAPI = {
  // Get quests list
  getQuests: async (params?: {
    status?: QuestStatus;
    limit?: number;
    offset?: number;
  }): Promise<QuestsListResponse> => {
    const response = await api.get('/equipment-requests/quests', { params });
    return response.data;
  },

  // Get single quest
  getQuest: async (id: string): Promise<Quest> => {
    const response = await api.get(`/equipment-requests/quests/${id}`);
    return response.data;
  },

  // Update quest status
  updateQuestStatus: async (
    id: string,
    status: QuestStatus
  ): Promise<{ message: string; status: string }> => {
    const response = await api.patch(
      `/equipment-requests/quests/${id}/status`,
      { status }
    );
    return response.data;
  },

  // Trigger manual sync
  triggerSync: async (): Promise<SyncResponse> => {
    const response = await api.post('/equipment-requests/sync');
    return response.data;
  },

  // Get sync log
  getSyncLog: async (): Promise<SyncLog> => {
    const response = await api.get('/equipment-requests/sync-log');
    return response.data;
  },

  // Create category mapping
  createCategoryMapping: async (
    mapping: CategoryMappingRequest
  ): Promise<{ message: string; mapping: CategoryMapping }> => {
    const response = await api.post(
      '/equipment-requests/category-mapping',
      mapping
    );
    return response.data;
  },

  // Preview transfer from quest (call BEFORE creating)
  previewTransferFromQuest: async (
    questId: string,
    fromLocationId: number
  ): Promise<TransferPreview> => {
    const response = await api.get(
      `/equipment-requests/quests/${questId}/transfer-preview`,
      { params: { from_location_id: fromLocationId } }
    );
    return response.data;
  },

  // Create transfer from quest
  createTransferFromQuest: async (
    questId: string,
    req: CreateTransferFromQuestRequest
  ): Promise<CreateTransferFromQuestResponse> => {
    const response = await api.post(
      `/equipment-requests/quests/${questId}/transfer`,
      req
    );
    return response.data;
  },
};
```

---

### Step 2: React Components Structure (Example)

```
src/
├── features/
│   └── equipment-requests/
│       ├── components/
│       │   ├── QuestList.tsx
│       │   ├── QuestCard.tsx             // card with transfer badge/button
│       │   ├── QuestDetail.tsx           // detail with conditional transfer section
│       │   ├── QuestFilters.tsx
│       │   ├── SyncButton.tsx
│       │   ├── SyncStatus.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── TransferPreview.tsx       // NEW: preview resolved/unresolved items
│       │   ├── TransferCreationForm.tsx  // NEW: from_location selector + create button
│       │   └── LinkedTransferCard.tsx    // NEW: shows linked transfer info
│       ├── hooks/
│       │   ├── useQuests.ts
│       │   ├── useQuestDetail.ts
│       │   ├── useSync.ts
│       │   └── useTransferFromQuest.ts   // NEW: preview + create transfer logic
│       └── types.ts
├── api/
│   └── equipmentRequests.ts
└── App.tsx
```

---

### Step 3: Example React Hook

```typescript
// src/features/equipment-requests/hooks/useQuests.ts
import { useState, useEffect } from 'react';
import { equipmentRequestsAPI } from '@/api/equipmentRequests';
import type { Quest, QuestStatus } from '../types';

export const useQuests = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: undefined as QuestStatus | undefined,
    limit: 20,
    offset: 0,
  });

  const fetchQuests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await equipmentRequestsAPI.getQuests(filters);
      setQuests(response.quests);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch quests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, [filters]);

  const updateStatus = async (id: string, status: QuestStatus) => {
    try {
      await equipmentRequestsAPI.updateQuestStatus(id, status);
      await fetchQuests();
    } catch (err: any) {
      // Handle 409 Conflict — quest managed by transfer
      if (err.response?.status === 409) {
        throw new Error('Status is managed by linked transfer. Use transfer endpoints.');
      }
      throw new Error(err.response?.data?.error || 'Failed to update status');
    }
  };

  // Helper: check if quest can have manual status change
  const canChangeStatus = (quest: Quest) => !quest.transfer_id;

  return {
    quests,
    loading,
    error,
    filters,
    setFilters,
    updateStatus,
    canChangeStatus,
    refresh: fetchQuests,
  };
};
```

---

### Step 3b: Transfer from Quest Hook (NEW)

```typescript
// src/features/equipment-requests/hooks/useTransferFromQuest.ts
import { useState } from 'react';
import { equipmentRequestsAPI } from '@/api/equipmentRequests';
import type {
  TransferPreview,
  CreateTransferFromQuestRequest,
  CreateTransferFromQuestResponse,
} from '../types';

export const useTransferFromQuest = (questId: string) => {
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async (fromLocationId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await equipmentRequestsAPI.previewTransferFromQuest(
        questId,
        fromLocationId
      );
      setPreview(data);
    } catch (err: any) {
      setError(err.response?.data?.details || 'Failed to fetch preview');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const createTransfer = async (
    req: CreateTransferFromQuestRequest
  ): Promise<CreateTransferFromQuestResponse> => {
    try {
      setCreating(true);
      setError(null);
      const result = await equipmentRequestsAPI.createTransferFromQuest(
        questId,
        req
      );
      return result;
    } catch (err: any) {
      const status = err.response?.status;
      const details = err.response?.data?.details || 'Failed to create transfer';

      if (status === 409) {
        setError('Quest already has a linked transfer');
      } else if (status === 422) {
        setError(`Cannot resolve data: ${details}`);
      } else {
        setError(details);
      }
      throw err;
    } finally {
      setCreating(false);
    }
  };

  return {
    preview,
    loading,
    creating,
    error,
    fetchPreview,
    createTransfer,
    clearPreview: () => setPreview(null),
  };
};
```

---

### Step 4: Example Component

```typescript
// src/features/equipment-requests/components/QuestList.tsx
import React from 'react';
import { useQuests } from '../hooks/useQuests';
import { QuestCard } from './QuestCard';
import { QuestFilters } from './QuestFilters';
import { SyncButton } from './SyncButton';

export const QuestList: React.FC = () => {
  const { quests, loading, error, filters, setFilters, refresh } = useQuests();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="quest-list">
      <header>
        <h1>Equipment Requests</h1>
        <SyncButton onSync={refresh} />
      </header>

      <QuestFilters
        currentFilters={filters}
        onChange={setFilters}
      />

      <div className="quest-grid">
        {quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          disabled={filters.offset === 0}
          onClick={() => setFilters({ ...filters, offset: filters.offset - filters.limit })}
        >
          Previous
        </button>
        <button
          onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## 🎨 Design System Recommendations

### Colors (Status-based)
```css
:root {
  --status-pending: #FCD34D;      /* Yellow 300 */
  --status-in-progress: #60A5FA;  /* Blue 400 */
  --status-completed: #34D399;    /* Green 400 */
  --status-cancelled: #F87171;    /* Red 400 */

  --match-exact: #10B981;         /* Green 500 */
  --match-fuzzy: #F59E0B;         /* Amber 500 */
  --match-manual: #8B5CF6;        /* Purple 500 */
  --match-none: #6B7280;          /* Gray 500 */
}
```

### Typography
- Headers: Inter/Roboto Bold
- Body: Inter/Roboto Regular
- Monospace (IDs): JetBrains Mono / Fira Code

### Icons (Recommended: Heroicons / Lucide)
- 📦 Box: Quest card
- 📍 Map Pin: Location
- 👤 User: Recipient
- 📅 Calendar: Date
- 💰 Currency: Budget
- 🔄 Refresh: Sync button
- ✅ Check: Completed
- ⏸️ Pause: In Progress
- ⏳ Clock: Pending

---

## ✅ Testing Checklist

### Manual Testing — Core
- [ ] Lista questów ładuje się poprawnie
- [ ] Filtrowanie po statusie działa
- [ ] Paginacja działa (next/previous)
- [ ] Kliknięcie w quest otwiera szczegóły
- [ ] Zmiana statusu questa działa i odświeża listę
- [ ] Manual sync button wywołuje synchronizację
- [ ] Sync status pokazuje ostatnią synchronizację
- [ ] Error handling - nieprawidłowy quest ID
- [ ] Error handling - błąd sieci
- [ ] Loading states działają

### Manual Testing — Transfer Integration
- [ ] Quest bez transferu: przycisk "Create Transfer" widoczny
- [ ] Quest z transferem: przycisk "Create Transfer" ukryty, widoczny badge z transfer ID
- [ ] Quest z transferem: zmiana statusu zablokowana, widoczny komunikat
- [ ] Preview transfer: wybranie `from_location_id` i klik "Preview" zwraca podgląd
- [ ] Preview: resolved items wyświetlone na zielono z dostępnymi ilościami
- [ ] Preview: unresolved items wyświetlone na żółto/czerwono z powodem
- [ ] Create transfer: klik "Create Transfer" tworzy transfer i linkuje z questem
- [ ] Create transfer: po sukcesie quest ma `transfer_id` i status `in_progress`
- [ ] Create transfer: podwójne kliknięcie nie tworzy drugiego transferu (409)
- [ ] Quest detail: linked transfer card z linkiem do transfer detail

### Edge Cases
- [ ] Pusta lista questów (brak danych)
- [ ] Quest bez kategorii (category_match = "none")
- [ ] Quest z fuzzy match (pokazuje confidence)
- [ ] Quest z bardzo długimi nazwami pozycji
- [ ] Dużo pozycji w queście (>10)
- [ ] Token wygasł (401 Unauthorized)
- [ ] Preview z nierozwiązaną lokalizacją (to_location_id = null)
- [ ] Preview z 0 resolved items i wszystkimi unresolved
- [ ] Create transfer na quest który już ma transfer (409 Conflict)
- [ ] Create transfer z nieistniejącym from_location_id
- [ ] Quest status auto-update po potwierdzeniu transferu (completed)
- [ ] Quest status auto-reset po anulowaniu transferu (pending, transfer_id = null)

---

## 🚀 Deployment Notes

### Environment Variables
```bash
# .env.production
REACT_APP_API_URL=https://api.yourcompany.com/api
REACT_APP_AUTO_REFRESH_INTERVAL=300000  # 5 minutes
```

### CORS Configuration
Backend musi mieć skonfigurowane CORS dla frontendu:
```go
// Sprawdź .env na backendzie:
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourapp.com
```

---

## 📚 Resources

- **OpenAPI Spec:** `/docs/openapi.yaml`
- **Backend Repo:** [link]
- **Design Mockups:** [Figma/link]
- **API Testing:** Use Postman collection (export z openapi.yaml)

---

## Known Issues & Limitations

1. **Auto-refresh:** ~~Frontend nie ma real-time updates - użyj polling lub manual refresh~~ **ROZWIĄZANE (Phase 4):** Backend obsługuje SSE (`GET /equipment-requests/stream`). Użyj `useQuestStream` hook zamiast pollingu.
2. **Large datasets:** Paginacja max 500 questów per page
3. **Category matching:** Confidence score nie zawsze odzwierciedla jakość - może być false positive
4. **Sync timing:** Auto-sync jest asynchroniczny - może trwać kilka sekund
5. **Transfer callback delay:** Po potwierdzeniu/anulowaniu transferu, quest status zmienia się asynchronicznie (callback). Frontend powinien poll po ~1s żeby zobaczyć zaktualizowany status
6. **Single transfer per quest:** Jeden quest może mieć tylko jeden transfer. Jeśli transfer anulowany, quest wraca do `pending` i można stworzyć nowy
7. **Location resolution:** Auto-resolve lokalizacji działa tylko gdy pavilion+location dokładnie pasują do tabeli `locations` (ILIKE). Jeśli nie — user musi podać `to_location_id` ręcznie
8. **Stock resolution:** Auto-resolve stock items szuka po `category_id` + `from_location_id`. Jeśli brak stocku w danej lokalizacji, item ląduje w `unresolved_items`
9. **SSE reconnect:** `EventSource` automatycznie się reconnektuje po utracie połączenia (built-in browser behavior). Nie implementuj własnego retry loop.
10. **SSE auth:** Backend wymaga `Authorization: Bearer` header (JWTMiddleware nie obsługuje query param). Natywny browser `EventSource` nie obsługuje custom headers — **wymagany `npm install eventsource`** jako polyfill z identycznym API.

---

## 📞 Support

Pytania? Problemy?
- Backend docs: `README.md`, `AGENTS.md`
- API spec: `docs/openapi.yaml`
- Create issue w repo

---

## Phase 4 — Real-Time Updates, Sync Status & Category Mapping Management

### Nowe endpointy (Phase 4)

#### P4.1 — GET `/equipment-requests/stream` (SSE)

Otwiera długie połączenie SSE. Backend wysyła event `quest_update` po każdym zakończonym syncu (ręcznym lub automatycznym).

```
GET /api/equipment-requests/stream
Authorization: Bearer <token>   ← uwaga: EventSource nie obsługuje custom headers, patrz sekcja Known Issues
Content-Type: text/event-stream
```

**Event format:**
```
event: quest_update
data: {"type":"sync_completed","stats":{"quests_created":2,"quests_updated":1,"quests_unchanged":8,"items_added":3,"items_removed":0}}
```

**Zachowanie:**
- Połączenie trwa do momentu zamknięcia przez klienta lub utratę połączenia
- Browser `EventSource` automatycznie reconnektuje
- Jeden event na każdy zakończony sync — nie emituje nic gdy brak zmian w sesji

---

#### P4.2 — GET `/equipment-requests/sync-status`

Zwraca aktualny stan schedulera (auto-sync).

**Response 200 OK:**
```json
{
  "enabled": true,
  "interval": "15m0s",
  "last_sync": "2026-02-19T12:00:00Z",
  "next_sync": "2026-02-19T12:15:00Z",
  "last_error": ""
}
```

Pola:
| Pole | Typ | Opis |
|------|-----|------|
| `enabled` | bool | Czy scheduler jest aktywny |
| `interval` | string | Interwał syncu (format Go Duration: "15m0s") |
| `last_sync` | string? | ISO datetime ostatniego udanego synca |
| `next_sync` | string? | ISO datetime następnego synca (obliczone: `last_sync + interval`) |
| `last_error` | string | Ostatni błąd (pusty string jeśli brak) |

---

#### P4.3 — GET `/equipment-requests/category-mappings`

Zwraca listę ręcznych mapowań (posortowane po `usage_count DESC`).

**Response 200 OK:**
```json
{
  "count": 3,
  "mappings": [
    {
      "id": 1,
      "form_item_name": "Laptop Dell XPS",
      "category_id": 123,
      "usage_count": 15,
      "created_by": null,
      "created_at": "2026-01-10T09:00:00Z"
    }
  ]
}
```

---

#### P4.4 — DELETE `/equipment-requests/category-mappings/:id`

Usuwa mapowanie. Zwraca `204 No Content` — **brak body w response**.

**Błędy:**
- `404` gdy mapping nie istnieje
- `400` gdy ID nie jest liczbą

---

### Rozszerzone TypeScript Types (Phase 4)

```typescript
// Dołącz do src/features/equipment-requests/types.ts

// SSE event — wysyłany po każdym syncu
export interface QuestEvent {
  type: 'sync_completed';
  stats?: SyncStats; // ta sama struktura co w SyncResponse
}

// Stan schedulera
export interface SyncStatusResponse {
  enabled: boolean;
  interval?: string;    // np. "15m0s" — parse za pomocą parseDuration()
  last_sync?: string;   // ISO datetime
  next_sync?: string;   // ISO datetime
  last_error?: string;  // pusty string = brak błędu
}

// Rozszerzone CategoryMapping — nowe pola z backendu
export interface CategoryMapping {
  id: number;
  form_item_name: string;
  category_id: number;
  usage_count: number;  // NEW: ile razy użyte w syncu
  created_by?: number;
  created_at: string;
}

export interface CategoryMappingsResponse {
  count: number;
  mappings: CategoryMapping[];
}
```

---

### Rozszerzone API Client (Phase 4)

```typescript
// Dołącz do src/api/equipmentRequests.ts

export const equipmentRequestsAPI = {
  // ... poprzednie metody ...

  // GET /sync-status
  getSyncStatus: async (): Promise<SyncStatusResponse> => {
    const response = await api.get('/equipment-requests/sync-status');
    return response.data;
  },

  // GET /category-mappings
  getCategoryMappings: async (): Promise<CategoryMappingsResponse> => {
    const response = await api.get('/equipment-requests/category-mappings');
    return response.data;
  },

  // DELETE /category-mappings/:id — returns void (204 No Content)
  deleteCategoryMapping: async (id: number): Promise<void> => {
    await api.delete(`/equipment-requests/category-mappings/${id}`);
  },

  // SSE stream — zwraca EventSource lub null gdy brak wsparcia
  // UWAGA: EventSource nie obsługuje Authorization header.
  // Opcje:
  //   A) Token jako query param (wymaga zmian backendu)
  //   B) Cookie-based auth (wymaga zmian backendu)
  //   C) npm: eventsource (polyfill z headerami)
  //   D) Fetch + ReadableStream (bardziej złożone)
  //
  // Poniżej: wariant z query param (najprostszy)
  openQuestStream: (token: string): EventSource => {
    const url = `${API_BASE_URL}/equipment-requests/stream?token=${encodeURIComponent(token)}`;
    return new EventSource(url);
  },
};
```

---

### Nowe Hooki (Phase 4)

#### `useQuestStream` — SSE

```typescript
// src/features/equipment-requests/hooks/useQuestStream.ts
import { useEffect, useRef, useState } from 'react';
import type { QuestEvent } from '../types';

interface UseQuestStreamOptions {
  onEvent: (event: QuestEvent) => void;
  enabled?: boolean; // domyślnie true
}

export const useQuestStream = ({ onEvent, enabled = true }: UseQuestStreamOptions) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('auth_token') ?? '';
    const url = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'}/equipment-requests/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.addEventListener('quest_update', (e: MessageEvent) => {
      try {
        const data: QuestEvent = JSON.parse(e.data);
        onEvent(data);
      } catch {
        console.warn('[SSE] Failed to parse quest_update event', e.data);
      }
    });

    es.onerror = () => {
      // EventSource sam się reconnektuje po błędzie — tylko logujemy
      setConnected(false);
      setError('SSE connection lost — reconnecting...');
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [enabled]); // onEvent powinien być wrapped w useCallback przez wywołującego

  return { connected, error };
};
```

**Użycie w komponencie:**

```typescript
const { connected } = useQuestStream({
  onEvent: (event) => {
    if (event.type === 'sync_completed') {
      refresh(); // odśwież listę questów
    }
  },
});
```

---

#### `useSyncStatus` — stan schedulera

```typescript
// src/features/equipment-requests/hooks/useSyncStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { equipmentRequestsAPI } from '@/api/equipmentRequests';
import type { SyncStatusResponse } from '../types';

export const useSyncStatus = (refreshIntervalMs = 60_000) => {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await equipmentRequestsAPI.getSyncStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch sync status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, refreshIntervalMs);
    return () => clearInterval(id);
  }, [fetch, refreshIntervalMs]);

  // Helper: parsuje "15m0s" → czytelny tekst
  const formatInterval = (interval?: string) => {
    if (!interval) return '';
    const match = interval.match(/^(?:(\d+)h)?(?:(\d+)m)?/);
    if (!match) return interval;
    const h = match[1] ? `${match[1]}h ` : '';
    const m = match[2] ? `${match[2]}min` : '';
    return `${h}${m}`.trim();
  };

  return { status, loading, error, refresh: fetch, formatInterval };
};
```

---

#### `useCategoryMappings` — lista i usuwanie

```typescript
// src/features/equipment-requests/hooks/useCategoryMappings.ts
import { useState, useEffect, useCallback } from 'react';
import { equipmentRequestsAPI } from '@/api/equipmentRequests';
import type { CategoryMapping } from '../types';

export const useCategoryMappings = () => {
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null); // ID aktualnie usuwanego
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await equipmentRequestsAPI.getCategoryMappings();
      setMappings(data.mappings);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch mappings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMappings(); }, [fetchMappings]);

  const deleteMapping = async (id: number) => {
    try {
      setDeleting(id);
      setError(null);
      await equipmentRequestsAPI.deleteCategoryMapping(id);
      setMappings((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Mapping already deleted');
        await fetchMappings(); // resync
      } else {
        setError(err.response?.data?.error || 'Failed to delete mapping');
      }
    } finally {
      setDeleting(null);
    }
  };

  return { mappings, loading, deleting, error, deleteMapping, refresh: fetchMappings };
};
```

---

#### Zaktualizowany `useQuests` — SSE auto-refresh

```typescript
// ZMIANA w src/features/equipment-requests/hooks/useQuests.ts
// Dodaj integrację z useQuestStream:

import { useCallback } from 'react';
import { useQuestStream } from './useQuestStream';

export const useQuests = () => {
  // ... poprzedni kod ...

  const fetchQuests = useCallback(async () => {
    // ... bez zmian ...
  }, [filters]);

  // SSE — auto-refresh po każdym syncu
  const { connected: sseConnected } = useQuestStream({
    onEvent: (event) => {
      if (event.type === 'sync_completed') {
        fetchQuests();
      }
    },
  });

  return {
    quests,
    loading,
    error,
    filters,
    setFilters,
    updateStatus,
    canChangeStatus,
    refresh: fetchQuests,
    sseConnected, // expose dla UI (wskaźnik połączenia)
  };
};
```

---

### Nowe Komponenty (Phase 4)

#### Zaktualizowane drzewo komponentów

```
src/
├── features/
│   └── equipment-requests/
│       ├── components/
│       │   ├── QuestList.tsx              (zaktualizowany — SSE indicator)
│       │   ├── QuestCard.tsx
│       │   ├── QuestDetail.tsx
│       │   ├── QuestFilters.tsx
│       │   ├── SyncButton.tsx
│       │   ├── SyncStatus.tsx             (zaktualizowany — scheduler info)
│       │   ├── SyncStatusBadge.tsx        NEW: kompaktowy badge z next sync
│       │   ├── StreamIndicator.tsx        NEW: zielona/czerwona kropka SSE
│       │   ├── StatusBadge.tsx
│       │   ├── TransferPreview.tsx
│       │   ├── TransferCreationForm.tsx
│       │   ├── LinkedTransferCard.tsx
│       │   ├── CategoryMappingsList.tsx   NEW: tabela mapowań z delete
│       │   └── CategoryMappingForm.tsx    (istniejący, bez zmian)
│       ├── hooks/
│       │   ├── useQuests.ts              (zaktualizowany — SSE)
│       │   ├── useQuestDetail.ts
│       │   ├── useSync.ts
│       │   ├── useTransferFromQuest.ts
│       │   ├── useQuestStream.ts          NEW: SSE EventSource
│       │   ├── useSyncStatus.ts           NEW: scheduler state
│       │   └── useCategoryMappings.ts     NEW: list + delete
│       └── types.ts                      (zaktualizowany — nowe typy)
├── api/
│   └── equipmentRequests.ts              (zaktualizowany — nowe funkcje)
└── App.tsx
```

---

#### `StreamIndicator` — wskaźnik SSE

```typescript
// src/features/equipment-requests/components/StreamIndicator.tsx
interface Props { connected: boolean }

export const StreamIndicator: React.FC<Props> = ({ connected }) => (
  <span
    title={connected ? 'Real-time updates active' : 'Connecting to real-time updates...'}
    style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: connected ? '#34D399' : '#F87171',
      marginLeft: 6,
      verticalAlign: 'middle',
    }}
  />
);
```

---

#### `SyncStatusBadge` — kompaktowy badge

```typescript
// src/features/equipment-requests/components/SyncStatusBadge.tsx
import { useSyncStatus } from '../hooks/useSyncStatus';

export const SyncStatusBadge: React.FC = () => {
  const { status, formatInterval } = useSyncStatus(60_000);

  if (!status) return null;

  const lastSyncText = status.last_sync
    ? `Last sync: ${new Date(status.last_sync).toLocaleTimeString()}`
    : 'No sync yet';

  const nextSyncText = status.next_sync
    ? ` · Next: ${new Date(status.next_sync).toLocaleTimeString()}`
    : '';

  const intervalText = status.enabled && status.interval
    ? ` (every ${formatInterval(status.interval)})`
    : ' (manual only)';

  return (
    <div className="sync-status-badge" style={{ fontSize: 12, color: '#6B7280' }}>
      {status.last_error ? (
        <span style={{ color: '#F87171' }}>Sync error: {status.last_error}</span>
      ) : (
        <span>{lastSyncText}{nextSyncText}{intervalText}</span>
      )}
    </div>
  );
};
```

**UI integracja — w nagłówku QuestList:**
```
┌─────────────────────────────────────────────────────────────┐
│ Equipment Requests             ● [Synchronize Now]          │
│ Last sync: 12:00 · Next: 12:15 (every 15min)               │
└─────────────────────────────────────────────────────────────┘
```
- `●` = `StreamIndicator` (zielony = SSE aktywne)
- Pod headerem = `SyncStatusBadge`

---

#### `CategoryMappingsList` — zarządzanie mapowaniami

```typescript
// src/features/equipment-requests/components/CategoryMappingsList.tsx
import { useCategoryMappings } from '../hooks/useCategoryMappings';

export const CategoryMappingsList: React.FC = () => {
  const { mappings, loading, deleting, error, deleteMapping } = useCategoryMappings();

  if (loading) return <div>Loading mappings...</div>;

  return (
    <div className="category-mappings">
      <h3>Category Mappings ({mappings.length})</h3>
      {error && <div className="error">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Form Item Name</th>
            <th>Category ID</th>
            <th>Used (times)</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m) => (
            <tr key={m.id} style={{ opacity: deleting === m.id ? 0.5 : 1 }}>
              <td>{m.form_item_name}</td>
              <td>#{m.category_id}</td>
              <td>{m.usage_count}</td>
              <td>{new Date(m.created_at).toLocaleDateString()}</td>
              <td>
                <button
                  onClick={() => {
                    if (confirm(`Delete mapping "${m.form_item_name}"?`)) {
                      deleteMapping(m.id);
                    }
                  }}
                  disabled={deleting === m.id}
                >
                  {deleting === m.id ? 'Deleting...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
          {mappings.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: 'center' }}>No mappings yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
```

**UI layout — w osobnej zakładce lub accordion w nagłówku:**
```
┌─────────────────────────────────────────────────────────────┐
│ Category Mappings (3)                       [+ Add Mapping] │
├─────────────────────────────────────────────────────────────┤
│ Form Item Name        Category ID  Used  Created    Action  │
├─────────────────────────────────────────────────────────────┤
│ Laptop Dell XPS       #123         15    2026-01-10  [Del]  │
│ Projektor Epson       #456         8     2026-01-15  [Del]  │
│ Kabel HDMI 2m         #789         3     2026-02-01  [Del]  │
└─────────────────────────────────────────────────────────────┘
```

---

### SSE Authentication — Wymagana konfiguracja

**Backend wymaga `Authorization: Bearer <token>` header** (`JWTMiddleware` w [jwt_middleware.go](internal/security/jwt_middleware.go) czyta wyłącznie z headera — brak fallbacku na query param). Natywny browser `EventSource` nie obsługuje custom headers — **wymagany `eventsource` npm package**.

```bash
npm install eventsource
# typy (opcjonalnie, jeśli TypeScript)
npm install -D @types/eventsource
```

```typescript
import EventSource from 'eventsource';

const token = localStorage.getItem('auth_token') ?? '';
const es = new EventSource('/api/equipment-requests/stream', {
  headers: { Authorization: `Bearer ${token}` },
});
```

Zaktualizowany `useQuestStream` z paczką:

```typescript
// src/features/equipment-requests/hooks/useQuestStream.ts
import EventSource from 'eventsource'; // <-- zastąp natywny
import { useEffect, useRef, useState } from 'react';
import type { QuestEvent } from '../types';

// reszta hooka bez zmian — API jest identyczne z natywnym EventSource
```

> **Uwaga:** Jeśli w przyszłości backend doda obsługę `?token=` query param w JWTMiddleware, można wrócić do natywnego `EventSource`.

---

### Checklist Testowania — Phase 4

#### SSE / Real-time Updates
- [ ] SSE połączenie nawiązywane przy załadowaniu komponentu QuestList
- [ ] `StreamIndicator` zmienia kolor z czerwonego na zielony po połączeniu
- [ ] `POST /sync` wywołany ręcznie → lista questów odświeża się automatycznie (bez kliknięcia)
- [ ] Auto-sync schedulera → lista questów odświeża się automatycznie
- [ ] Utrata połączenia → `StreamIndicator` czerwony, EventSource reconnektuje
- [ ] Ponowne połączenie → `StreamIndicator` zielony, lista aktualna
- [ ] Zamknięcie karty/komponentu → połączenie SSE prawidłowo zamykane (bez wycieków)
- [ ] Wiele otwartych kart → każda ma niezależne połączenie SSE

#### Sync Status
- [ ] `SyncStatusBadge` pokazuje `last_sync`, `next_sync`, `interval`
- [ ] Gdy scheduler wyłączony (`enabled: false`): brak `next_sync`, tekst "(manual only)"
- [ ] Gdy brak poprzedniego synca: "No sync yet"
- [ ] Gdy `last_error` niepusty: pokazuje błąd na czerwono
- [ ] Badge odświeża się co ~1 minutę (lub po manual refresh)

#### Category Mappings
- [ ] `CategoryMappingsList` ładuje i wyświetla mappings posortowane po `usage_count DESC`
- [ ] Pusta lista: wyświetla komunikat "No mappings yet"
- [ ] Delete: klik "Delete" → potwierdzenie → mapping znika z listy
- [ ] Delete: mapping nie istnieje (404) → error message + resync listy
- [ ] Delete: spinner/disabled state podczas usuwania
- [ ] `usage_count` wyświetlany poprawnie (liczba użyć w syncu)
- [ ] `+ Add Mapping` form tworzy mapowanie i odświeża listę
