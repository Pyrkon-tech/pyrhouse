# Dispatch Map — Volunteer API Spec

## Overview

Two new pieces of data are available:

| What | Endpoint | When |
|---|---|---|
| Volunteer list with real-time status | `GET /dispatch/volunteers` | Replaces `MOCK_VOLUNTEERS` |
| Transfer participants on a quest | `GET /equipment-requests/quests/:id` → `assigned_volunteers[]` | Replaces route-state-only prefill |

---

## 1. `GET /dispatch/volunteers`

```
GET /dispatch/volunteers
Authorization: Bearer <jwt>
```

### Optional query param

```
?status=available,on_mission
```

Comma-separated. Omit to return all. Possible values: `available`, `on_mission`.

### Response `200`

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
    "avatar_url": "https://cdn.discordapp.com/avatars/123/abc.png",
    "status": "on_mission",
    "current_mission": "Pawilon 5 - Sala A"
  }
]
```

### Status derivation (backend logic)

| Status | Condition |
|---|---|
| `available` | `user.active = true` AND not in any `transfer_users` linked to an `in_progress` quest |
| `on_mission` | `user.active = true` AND IS in `transfer_users` linked to an `in_progress` quest |

> **Note:** `offline` is NOT returned by this endpoint — only active users are included.
> If you need to show offline state, derive it client-side when a previously known volunteer
> disappears from the list.

### TypeScript type

```ts
export interface Volunteer {
  id: number;
  username: string;
  fullname: string | null;
  discord_username: string | null;
  avatar_url: string | null;
  status: 'available' | 'on_mission';
  current_mission: string | null;
}
```

### Flip mock → API

In `src/services/volunteerService.ts`:

```ts
const USE_MOCK = false; // ← flip this

export async function getVolunteersAPI(): Promise<Volunteer[]> {
  if (USE_MOCK) return Promise.resolve([...MOCK_VOLUNTEERS]);
  return apiClient.get<Volunteer[]>('/dispatch/volunteers');
}
```

---

## 2. `assigned_volunteers` on quest

`GET /equipment-requests/quests/:id` now includes:

```json
{
  "id": "quest-abc123",
  "status": "in_progress",
  "transfer_id": 17,
  "assigned_volunteers": [
    { "id": 1, "username": "mnowak", "fullname": "Marek Nowak" },
    { "id": 4, "username": "kkowalczyk", "fullname": "Katarzyna Kowalczyk" }
  ],
  ...
}
```

- `assigned_volunteers` is always an array (never `null`) — empty `[]` when no transfer exists yet.
- Populated from `transfer_users` joined with `users` — only when `transfer_id` is set.

### Usage in `TransferFormCore`

Combine route-state and quest data for maximum robustness:

```ts
// Phase 4 — QuestDetailPage.tsx
const dispatchState = location.state as { autoOpenTransfer?: boolean; volunteerIds?: number[] } | null;

// Auto-open guard — only when quest has NO transfer yet
useEffect(() => {
  if (dispatchState?.autoOpenTransfer && quest && !quest.transfer_id && quest.status !== 'completed') {
    setShowTransferForm(true);
    // Clear route state to prevent re-trigger on refresh
    navigate(location.pathname, { replace: true, state: null });
  }
}, [dispatchState?.autoOpenTransfer, quest?.id]);

// Resolve volunteer IDs: prefer route state (just dispatched), fall back to quest data (direct nav)
const initialVolunteerIds =
  dispatchState?.volunteerIds ??
  quest?.assigned_volunteers?.map((v) => v.id) ??
  [];
```

```tsx
// Pass to TransferFormCore
<TransferFormCore
  questId={quest.id}
  questLocationId={quest.location_id}
  questData={...}
  initialVolunteerIds={initialVolunteerIds}
  onSuccess={...}
  onCancel={...}
/>
```

### Phase 5 — `TransferFormCore.tsx` pre-fill

No changes needed to the pre-fill logic — `initialVolunteerIds` already works via
`data.filter(u => initialVolunteerIds.includes(u.id))`.

---

## Implementation order (frontend)

1. **`volunteerService.ts`** — flip `USE_MOCK = false`, call `GET /dispatch/volunteers`
2. **`useVolunteers.ts`** — no changes, hook already calls `volunteerService`
3. **`QuestDispatcherMap.tsx`** — no changes, already uses `useVolunteers` hook
4. **`QuestDetailPage.tsx`** — update auto-open guard + route state clear + `initialVolunteerIds` fallback
5. **`TransferFormCore.tsx`** — no changes if pre-fill prop already implemented

---

## Edge cases

| Scenario | Behaviour |
|---|---|
| Quest already has `transfer_id` when dispatching | Auto-open guard blocked by `!quest.transfer_id` — user sees existing transfer details |
| Page refresh after dispatch nav | Route state is cleared — `initialVolunteerIds` falls back to `quest.assigned_volunteers` |
| Volunteer on multiple in_progress quests | Backend picks the most recent transfer (`ORDER BY t.id DESC`) — one `current_mission` shown |
| No volunteers on shift | Returns `[]` — handle empty state in panel UI |
| `discord_username` / `avatar_url` null | User registered via local auth, no Discord link — show username initials fallback |
