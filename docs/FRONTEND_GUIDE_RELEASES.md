# Frontend Guide: Permanent Releases (Trwałe wydania)

## Overview

Releases allow permanent removal of items from inventory after an event. Items are hard-deleted from inventory, but a release record (receipt) is kept for generating PDF documents.

**Flow:** Suggest items by origin → Create draft → Review/edit → Confirm (admin) → View receipt / generate PDF

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/releases/suggest?origin_id=X&location_id=Y` | moderator | Get suggested items by origin |
| `POST` | `/releases` | moderator | Create draft release with items |
| `GET` | `/releases` | user | List releases |
| `GET` | `/releases/:id` | user | Get release details (for PDF) |
| `PUT` | `/releases/:id/items` | moderator | Update items in draft |
| `POST` | `/releases/:id/confirm` | admin | Confirm and execute |
| `DELETE` | `/releases/:id` | moderator | Delete draft |

---

## Step-by-Step Frontend Flow

### 1. Get suggestions

User selects an origin (e.g., "probis") and optionally a location. Fetch suggested items:

```ts
const res = await fetch('/api/releases/suggest?origin_id=5&location_id=1', {
  headers: { Authorization: `Bearer ${token}` },
})
const suggestions: SuggestResponse = await res.json()
```

**Response:**
```json
{
  "assets": [
    {
      "id": 101,
      "pyr_code": "PYR-0042",
      "item_serial": "SN-12345",
      "status": "available",
      "category_name": "Mikser audio",
      "origin_label": "probis",
      "location_name": "Magazyn główny"
    }
  ],
  "stocks": [
    {
      "id": 50,
      "quantity": 20,
      "category_name": "Kabel XLR 5m",
      "origin_label": "probis",
      "location_name": "Magazyn główny"
    }
  ]
}
```

Display these as a checklist. User selects which items to release and adjusts stock quantities.

### 2. Create draft release

```ts
const res = await fetch('/api/releases', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    origin_id: 5,                          // optional, tags the release
    released_to: 'Probis Sp. z o.o.',      // required - recipient
    notes: 'Zwrot po Pyrkon 2026',         // optional
    assets: [101, 102, 103],               // selected asset IDs
    stocks: [
      { stock_id: 50, quantity: 15 },      // partial release OK
      { stock_id: 51, quantity: 10 },
    ],
  }),
})
const release: ReleaseDetail = await res.json() // status: 201
```

### 3. Review draft

The created release is returned with full details. Display for review:

```ts
const res = await fetch(`/api/releases/${releaseId}`, {
  headers: { Authorization: `Bearer ${token}` },
})
const release: ReleaseDetail = await res.json()
```

**Response structure:**
```json
{
  "id": 1,
  "reference": "WYD-2026-001",
  "origin_id": 5,
  "origin_label": "probis",
  "released_to": "Probis Sp. z o.o.",
  "notes": "Zwrot po Pyrkon 2026",
  "status": "draft",
  "created_by": 1,
  "created_by_name": "admin",
  "completed_at": null,
  "created_at": "2026-03-05T12:00:00Z",
  "assets": [
    {
      "id": 1,
      "item_id": 101,
      "pyr_code": "PYR-0042",
      "item_serial": "SN-12345",
      "category_name": "Mikser audio",
      "origin_label": "probis",
      "location_name": "Magazyn główny"
    }
  ],
  "stocks": [
    {
      "id": 1,
      "stock_id": 50,
      "item_category_id": 3,
      "category_name": "Kabel XLR 5m",
      "quantity": 15,
      "origin_label": "probis",
      "location_name": "Magazyn główny"
    }
  ],
  "summary": {
    "total_assets": 3,
    "total_stock_quantity": 25
  }
}
```

### 4. Update items (optional)

If the user wants to change the selection before confirming:

```ts
await fetch(`/api/releases/${releaseId}/items`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    assets: [101, 103],              // removed asset 102
    stocks: [{ stock_id: 50, quantity: 10 }], // adjusted quantity
  }),
})
```

This **replaces** the entire item list (not append).

### 5. Confirm release (admin only)

```ts
const res = await fetch(`/api/releases/${releaseId}/confirm`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
})
const confirmed: ReleaseDetail = await res.json()
// confirmed.status === "completed"
// confirmed.completed_at is now set
```

**What happens on confirm:**
- Asset snapshots are refreshed with latest data
- Assets are **permanently deleted** from `items` table
- Stock quantities are **decreased** in `non_serialized_items`
- Release status changes to `completed`
- The release record stays as a permanent receipt

### 6. Delete draft (cancel)

```ts
await fetch(`/api/releases/${releaseId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
})
```

Only works for `draft` releases.

---

## List releases

```ts
// All releases
const res = await fetch('/api/releases', { headers })

// Filter by status
const res = await fetch('/api/releases?status=completed', { headers })

// Filter by origin
const res = await fetch('/api/releases?origin_id=5', { headers })

// Both filters
const res = await fetch('/api/releases?status=completed&origin_id=5', { headers })
```

---

## PDF Generation

Use `GET /releases/:id` on a completed release — the response contains all snapshot data needed:

- `reference` — document number (e.g., "WYD-2026-001")
- `released_to` — recipient name
- `created_by_name` — who created the release
- `completed_at` — when it was confirmed
- `assets[]` — each with `pyr_code`, `item_serial`, `category_name`
- `stocks[]` — each with `category_name`, `quantity`
- `summary` — totals

Generate PDF client-side with a library like `jsPDF`, `react-pdf`, or `@react-pdf/renderer`.

---

## Error Handling

| Status | When | Action |
|--------|------|--------|
| 400 | Missing required fields, no items selected | Show validation error |
| 404 | Release not found | Show "not found" |
| 409 | Asset is `in_transit`, asset in another draft, insufficient stock quantity | Show specific error from `details` field |

Error response format:
```json
{
  "error": "Failed to create release",
  "details": "asset validation failed: some assets are not available for release"
}
```

---

## TypeScript Types

```ts
interface Release {
  id: number
  reference: string
  origin_id: number | null
  origin_label: string | null
  released_to: string
  notes: string | null
  status: 'draft' | 'completed'
  created_by: number
  created_by_name: string | null
  completed_at: string | null
  created_at: string
}

interface ReleaseDetail extends Release {
  assets: ReleaseAsset[]
  stocks: ReleaseStock[]
  summary: { total_assets: number; total_stock_quantity: number }
}

interface ReleaseAsset {
  id: number
  item_id: number
  pyr_code: string | null
  item_serial: string | null
  category_name: string | null
  origin_label: string | null
  location_name: string | null
}

interface ReleaseStock {
  id: number
  stock_id: number
  item_category_id: number
  category_name: string | null
  quantity: number
  origin_label: string | null
  location_name: string | null
}

interface SuggestResponse {
  assets: SuggestedAsset[]
  stocks: SuggestedStock[]
}

interface SuggestedAsset {
  id: number
  pyr_code: string | null
  item_serial: string | null
  status: string
  category_name: string | null
  origin_label: string | null
  location_name: string | null
}

interface SuggestedStock {
  id: number
  quantity: number
  category_name: string | null
  origin_label: string | null
  location_name: string | null
}
```
