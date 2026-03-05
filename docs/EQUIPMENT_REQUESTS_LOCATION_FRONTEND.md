# Equipment Requests — Location Handling (Frontend)

Integration guide for location-related fields and endpoints in equipment requests.

---

## Context

Google Sheets form sends destination as `pavilion` + `location` (e.g. `6` + `Magazyn Techniczny`). Backend automatically tries to match this to a `location_id` from the `locations` table using a 4-level strategy:

1. **Manual mapping** — `equipment_request_location_mapping` table (highest priority)
2. **Exact match** — `pavilion` + `name` match in `locations` (case-insensitive)
3. **Normalized match** — strips "Pawilon " prefix (e.g. `"Pawilon 6"` -> `"6"`)
4. **Name-only fallback** — matches by `name` alone if exactly one result

When no match is found, the quest gets `location_resolved: false` and requires manual assignment.

---

## New fields in Quest

| Field | Type | Description |
|-------|------|-------------|
| `location_id` | `number \| null` | Resolved location ID from `locations` table. `null` if unresolved |
| `location_name` | `string \| null` | Resolved location name (from JOIN). `null` if unresolved. No need to fetch `/locations` separately |
| `location_resolved` | `boolean` | `true` = destination mapped successfully, `false` = requires manual assignment |

### Response examples

**Resolved quest:**
```json
{
  "id": "quest-f6c39c6c14716069",
  "destination": {
    "pavilion": "6",
    "location": "Magazyn Techniczny"
  },
  "location_id": 3,
  "location_name": "POW",
  "location_resolved": true,
  "status": "pending",
  "recipient": "Jan Kowalski",
  "items": [...]
}
```

**Unresolved quest:**
```json
{
  "id": "quest-abc123",
  "destination": {
    "pavilion": "WTC",
    "location": "Biuro Akredytacji"
  },
  "location_id": null,
  "location_name": null,
  "location_resolved": false,
  "status": "pending",
  "recipient": "Anna Nowak",
  "items": [...]
}
```

---

## TypeScript types

```typescript
interface Quest {
  id: string;
  destination: { pavilion: string; location: string };
  recipient: string;
  delivery_date: string;
  pickup_time?: string;
  budget_owner: string;
  items: QuestItem[];
  status: "pending" | "in_progress" | "completed" | "cancelled";
  transfer_id?: number;
  transfer_status?: string;
  location_id: number | null;
  location_name: string | null;
  location_resolved: boolean;
  source_rows: number[];
  last_synced: string;
}

interface QuestItem {
  name: string;
  quantity: number;
  category_id?: number;
  category_match: "exact" | "fuzzy" | "manual" | "none";
  category_match_confidence?: number;
  budget_owner?: string;
  notes?: string;
}

interface LocationMapping {
  id: number;
  pavilion: string;
  location_name: string;
  location_id: number;
  created_at: string;   // ISO 8601
  usage_count: number;
}

interface CreateLocationMappingRequest {
  pavilion: string;
  location_name: string;
  location_id: number;
}

interface UpdateQuestLocationRequest {
  location_id: number;
  save_mapping?: boolean;
}

interface CreateTransferFromQuestRequest {
  from_location_id: number;
  to_location_id?: number;
  stock_items?: { id: number; quantity: number }[];
  assets?: { id: number }[];
  users?: { id: number }[];
}
```

---

## Dependencies

To build location-related UI, the frontend needs the list of all available locations:

```
GET /locations
Authorization: Bearer <token>

Response 200:
[
  { "id": 1, "name": "Magazyn Techniczny", "pavilion": "6", "details": null },
  { "id": 2, "name": "Biuro Akredytacji", "pavilion": "WTC", "details": null },
  { "id": 3, "name": "HQ", "pavilion": "10", "details": null }
]
```

Use this to populate dropdowns for manual location assignment. Note that `location_name` is now included directly in quest responses via JOIN, so you don't need to cross-reference locations for display purposes.

---

## Endpoints

### 0. `GET /equipment-requests/quests`

The main quest list now supports `location_id` filter:

```
GET /equipment-requests/quests?location_id=3
GET /equipment-requests/quests?location_id=3&status=pending
```

| Query param | Type | Description |
|-------------|------|-------------|
| `status` | `string` | Filter by quest status |
| `location_id` | `number` | Filter by resolved location ID (for dispatch map: click pin → show quests) |
| `limit` | `number` | Pagination (default: 100, max: 500) |
| `offset` | `number` | Pagination offset |

---

### 1. `GET /equipment-requests/quests/unresolved-locations`

Quests with unresolved location — for the "Needs assignment" section.

**Response 200:**
```json
{
  "count": 2,
  "quests": [
    {
      "id": "quest-abc123",
      "destination": { "pavilion": "WTC", "location": "Biuro Akredytacji" },
      "location_id": null,
      "location_resolved": false,
      "recipient": "Anna Nowak",
      "delivery_date": "2026-02-25",
      "status": "pending",
      "items": [...]
    }
  ]
}
```

> **Note:** `GET /equipment-requests/quests` does NOT support `location_resolved` as a query filter.
> Use this dedicated endpoint to fetch unresolved quests. For the main quest list, use client-side
> filtering on `location_resolved` if you need to show a badge.

---

### 2. `PATCH /equipment-requests/quests/:id/location`

Manually assign a location to a quest.

**Request body:**
```json
{
  "location_id": 3,
  "save_mapping": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `location_id` | `number` | yes | ID from `GET /locations` |
| `save_mapping` | `boolean` | no | `true` = save as mapping for future auto-resolution (default: `false`) |

When `save_mapping: true`, the system creates an entry in `equipment_request_location_mapping` using the quest's `destination.pavilion` + `destination.location`. Future quests with the same combination will be auto-resolved.

**Response 200:**
```json
{
  "message": "Quest location updated successfully",
  "location_id": 3
}
```

**Errors:**

| Code | Reason |
|------|--------|
| 400 | Invalid request body (missing `location_id`) |
| 404 | Quest not found |
| 500 | Database error |

---

### 3. `GET /equipment-requests/location-mappings`

All manual location mappings.

**Response 200:**
```json
{
  "count": 2,
  "mappings": [
    {
      "id": 1,
      "pavilion": "6",
      "location_name": "Magazyn Techniczny",
      "location_id": 3,
      "created_at": "2026-02-20T10:00:00Z",
      "usage_count": 15
    }
  ]
}
```

> **Note:** Response contains `location_id` (number) but not the location name.
> To display the location name in the UI, join with data from `GET /locations`.
> Recommended: fetch locations once and cache them, then map `location_id` -> `name` client-side.

---

### 4. `POST /equipment-requests/location-mappings`

Create a new manual mapping.

**Request body:**
```json
{
  "pavilion": "6",
  "location_name": "Magazyn Techniczny",
  "location_id": 3
}
```

**Response 201:**
```json
{
  "message": "Location mapping created successfully",
  "mapping": {
    "id": 4,
    "pavilion": "6",
    "location_name": "Magazyn Techniczny",
    "location_id": 3,
    "created_at": "2026-02-22T14:30:00Z",
    "usage_count": 0
  }
}
```

**Errors:**

| Code | Reason |
|------|--------|
| 400 | Missing required fields |
| 409 | Mapping already exists for this `pavilion` + `location_name` combination |
| 500 | Database error |

---

### 5. `DELETE /equipment-requests/location-mappings/:id`

Delete a mapping.

**Response 204** (no content)

**Errors:**

| Code | Reason |
|------|--------|
| 400 | Invalid ID (not a number) |
| 404 | Mapping not found |
| 500 | Database error |

---

## Transfer creation integration

When creating a transfer from a quest via `POST /equipment-requests/quests/:id/transfer`:

| Quest state | Frontend behavior |
|-------------|------------------|
| `location_resolved: true` | Backend uses `location_id` as default `to_location_id`. You can still override by passing `to_location_id` in request body |
| `location_resolved: false` | **Frontend must provide `to_location_id`** in request body, otherwise backend returns 422. Show a location picker before allowing transfer creation |

**Request body example:**
```json
{
  "from_location_id": 1,
  "to_location_id": 3,
  "stock_items": [
    { "id": 10, "quantity": 2 }
  ]
}
```

Use `GET /equipment-requests/quests/:id/transfer-preview?from_location_id=1` to preview what stock items would be resolved before creating the transfer.

---

## SSE integration

**Endpoint:** `GET /equipment-requests/stream`

The SSE connection emits events with event name `quest_update`. The JSON payload has a `type` field to distinguish event kinds:

```
event: quest_update
data: {"type":"sync_completed","stats":{"Created":2,"Updated":1,...}}

event: quest_update
data: {"type":"stocks_changed","location_id":3,"action":"updated"}
```

| `event` (SSE) | `type` (JSON field) | Description |
|----------------|---------------------|-------------|
| `quest_update` | `sync_completed` | Google Sheets sync finished. Refresh quest list — new quests will have `location_id` and `location_resolved` set |
| `quest_update` | `stocks_changed` | Stock inventory changed at a location. May affect transfer preview |

```typescript
const eventSource = new EventSource("/api/equipment-requests/stream");

eventSource.addEventListener("quest_update", (e) => {
  const event = JSON.parse(e.data);

  if (event.type === "sync_completed") {
    // Refresh quest list
    refetchQuests();
  }

  if (event.type === "stocks_changed") {
    // Optionally refresh transfer preview if viewing one
    refetchTransferPreview(event.location_id);
  }
});
```

---

## Suggested UX

### Quest list

- Quests with `location_resolved: false` — show a warning badge (e.g. "Location unresolved")
- Quests with `location_resolved: true` — optionally show location name (from cached `GET /locations`)
- Use client-side filtering on `location_resolved` for badges/counters

### "Quests needing assignment" section

- Data source: `GET /equipment-requests/quests/unresolved-locations`
- For each quest show:
  - `destination.pavilion` + `destination.location` (raw form data)
  - Dropdown with locations from `GET /locations`
  - "Assign" button -> `PATCH /quests/:id/location` with selected `location_id`
  - "Save as mapping" checkbox -> `save_mapping: true` in request body

### Location mappings management

- Data source: `GET /equipment-requests/location-mappings`
- Table columns: pavilion, location_name, location name (joined from `/locations`), usage_count
- Add new: `POST /location-mappings`
- Delete: `DELETE /location-mappings/:id`
