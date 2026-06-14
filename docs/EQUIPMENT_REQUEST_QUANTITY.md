# Equipment Requests — pozycje bez określonej ilości (`quantity: null`)

Status: zaimplementowane (frontend) · 2026-06-14

Pozycja w queście (zapotrzebowaniu) może nie mieć określonej ilości, gdy arkusz
źródłowy (Google Sheet) nie podaje liczby sztuk. Backend zwraca wtedy
`quantity: null` zamiast liczby. Ten dokument opisuje, jak front to obsługuje.

## Kontrakt API

### `GET /api/equipment-requests/quests/:id`

```jsonc
{
  "id": "quest-…",
  "items": [
    { "name": "Przedłużacz", "quantity": 5,    "category_id": 8 },
    { "name": "Kabel HDMI",   "quantity": null, "category_id": 22 }  // ← do ustalenia
  ]
}
```

### `GET /api/equipment-requests/quests/:id/transfer-preview?from_location_id=…`

Pozycje bez ilości trafiają do `unresolved` z `quantity: null`:

```jsonc
{
  "resolved_items":   [ { "stock_id": 1, "item_name": "Przedłużacz", "quantity": 5, "available": 80 } ],
  "unresolved_items": [ { "item_name": "Kabel HDMI", "quantity": null, "reason": "quantity not specified in sheet" } ]
}
```

Możliwe wartości `reason` w `unresolved_items`:
- `"quantity not specified in sheet"` — pusta ilość w arkuszu (`quantity: null`)
- `"no category match for this item"` — pozycja bez dopasowanej kategorii
- `"no stock found at source location for this category"` — brak stocku w lokalizacji źródłowej

### `POST /api/equipment-requests/quests/:id/transfer`

Dyspozytor podaje ilość inline (override przez `stock_items`):

```jsonc
{ "from_location_id": 1, "to_location_id": 2, "stock_items": [ { "id": 26, "quantity": 3 } ] }
```

## Typy (frontend)

`src/types/quest.types.ts`:

- `QuestItem.quantity: number | null` — `null` = „do ustalenia".
- `UnresolvedItem.quantity: number | null` — `null` przy `reason: "quantity not specified in sheet"`.
- `ResolvedStockItem.quantity: number` — pozycje rozwiązane zawsze mają ilość.

## Wykrycie stanu

| stan | warunek | UI |
|---|---|---|
| OK | `quantity > 0` | normalnie (chip z liczbą) |
| do ustalenia | `quantity === null` | amber chip `ilość: ?` + tooltip (bez blokady — patrz niżej) |
| brak kategorii | `unresolved_items`, `reason: "no category match for this item"` | mapowanie kategorii (nie surfaceowane — `transfer-preview` nie jest w UI) |
| brak stocku | `unresolved_items`, `reason: "no stock found at source location for this category"` | info (nie surfaceowane — `transfer-preview` nie jest w UI) |

- Pozycja „bez ilości": `item.quantity == null`.
- Quest „wymaga uwagi": `quest.items.some(i => i.quantity == null)`.

## Gdzie to widać w UI

### Lista questów — `QuestBoardPage.tsx`
- Badge w nagłówku: `⚠ N bez ilości` (obok `⚠ N bez lokalizacji`), klik = filtr
  `showMissingQtyOnly` na questy z `questHasUnknownQty`.
- W podsumowaniu pozycji `getItemsSummary` ilość `null` renderuje się jako `(?)`.
- Inline chip `⚠ bez ilości` w komórce „Przedmioty" (tabela) i na karcie mobile.

### Szczegóły questa — `QuestDetailPage.tsx`
- Banner ostrzegawczy nad akcjami: ile pozycji jest bez ilości + przycisk
  **Synchronizuj teraz** (admin/moderator — `triggerSyncAPI` → `refreshQuest`).
- W tabeli pozycji `null` → amber chip `ilość: ?` z tooltipem
  („W arkuszu nie podano ilości — uzupełnij w Google Sheet i zsynchronizuj,
  albo podaj przy wydaniu sprzętu.").
- Sumy null-safe: `totalItems` pomija `null`; nagłówek dopisuje `+ N bez ilości`;
  kolumna „Wysłano" pokazuje `sent/?`; wycena pomija pozycje bez ilości.

### Modale dispatch — `DispatchModal.tsx`, `ActiveQuestModal.tsx`
- `totalItems` (suma) pomija `null`; render pojedynczej pozycji: `x?` / `×?`.

## Brak blokady — `null` to tylko ostrzeżenie

> **Rozjazd z guide'em backendu.** Backendowy guide rekomenduje **twardą bramkę**
> („Gate dispatch (most important)" — disabled submit, dopóki każda pozycja
> `null` nie dostanie ilości). Świadomie tego **nie wdrażamy** — decyzja
> produktowa: `null` ma być oznaczeniem, nie blokadą.

`quantity === null` **nie blokuje** niczego: nie wyłącza „Wydaj sprzęt", nie
blokuje submitu formularza transferu, nie wymusza uzupełnienia. To wyłącznie
wizualne oznaczenie (`severity="warning"`, amber chip).

Powód: pozycja bez ilości oznacza „do doprecyzowania", a nie „błąd". Sprzęt może
wymagać decyzji, czy w ogóle go wysłać, mógł już zostać wydany, albo mieć
specjalne wymaganie opisane w notatce. To człowiek (dyspozytor) podejmuje
decyzję — UI ma to tylko uwidocznić.

Intencja bramki z backendu (nie wysyłać pozycji bez konkretnej ilości) i tak
jest **strukturalnie spełniona**: formularz jest ręczny, więc nie da się dodać
wiersza transferu bez wpisania ilości (`quantity > 0` jest walidowane). Dostajemy
bezpieczeństwo bez blokowania całego questa.

Formularz transferu (`TransferFormCore`) jest **ręczny** — dyspozytor sam dodaje
pozycje magazynowe i wpisuje ilość dla każdej z nich. Quest nie pre-populuje
formularza (decyzja architektoniczna; flow `transfer-preview` nie jest podpięty
do UI — patrz CLAUDE.md, „Usunięty martwy kod"). Faktyczną liczbę dyspozytor
podaje przy dodawaniu wiersza; wartości mapują się na `stock_items: [{ id,
quantity }]`. Istniejąca walidacja `quantity > 0` / `<= dostępne` dotyczy
**wpisanego** wiersza transferu, nie pozycji questa — nie ma związku z `null` na
queście.

## Alternatywna ścieżka „popraw u źródła"

- Banner na `QuestDetailPage` ma przycisk **Synchronizuj teraz** (`POST
  /equipment-requests/sync`) — po syncu quest się odświeża i `quantity`
  przestaje być `null`, jeśli arkusz został uzupełniony.
- Deep-link do konkretnego arkusza nie jest dostępny we froncie (brak URL-a w
  danych questa), więc instrukcja „uzupełnij w Google Sheet" jest tekstowa.

> **Źródłem prawdy jest arkusz.** Ilość podana inline przy transferze dotyczy
> **tylko tego transferu** (`stock_items`) — nie zapisuje się z powrotem na
> pozycję questa. Pozycja zostaje `null` aż do poprawienia w Google Sheet +
> synchronizacji. Edycja ilości bezpośrednio w naszej bazie zostałaby nadpisana
> przy następnym syncu. Trwałe poprawki idą do arkusza.
