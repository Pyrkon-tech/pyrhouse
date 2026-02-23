# Frontend Guide: Origins & Settings API

## 1. Origins — zarzadzanie zrodlami (origins)

### Co sie zmienilo

Dotychczas origin byl hardcoded enumem (`druga-era`, `personal`, `other`, itd.). Teraz origins sa w bazie danych i zarzadzane przez CRUD API.

**Kluczowe zmiany dla frontu:**
- Origin nie jest juz stalym enumem — trzeba go pobierac z API
- Przy tworzeniu assetu/stocka nadal wysylasz `"origin": "druga-era"` jako string — backend sam rozwiazuje na `origin_id` + `origin_suffix`
- Origins z `allow_suffix: true` akceptuja format `slug-cokolwiek` (np. `personal-jan`, `other-xyz`)

### Endpointy

#### `GET /origins` — lista aktywnych (dla selectow/dropdownow)

**Auth:** JWT (dowolna rola)

**Response:**
```json
[
  {
    "id": 1,
    "slug": "druga-era",
    "label": "Druga Era",
    "allow_suffix": false,
    "active": true,
    "sort_order": 1,
    "created_at": "2025-01-01T00:00:00Z"
  },
  {
    "id": 5,
    "slug": "personal",
    "label": "Personal",
    "allow_suffix": true,
    "active": true,
    "sort_order": 5,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

**Uzycie:** Pobierz na poczatku i uzyj do:
- Selecta/dropdowna przy tworzeniu asseta lub stocka
- Walidacji po stronie frontu (opcjonalnie)

#### `GET /origins/all` — lista wszystkich (wlacznie z nieaktywnymi)

**Auth:** moderator+

**Uzycie:** Panel admina do zarzadzania originami.

#### `POST /origins` — dodaj nowy origin

**Auth:** admin

**Request:**
```json
{
  "slug": "nowy-origin",
  "label": "Nowy Origin",
  "allow_suffix": false,
  "sort_order": 10
}
```

**Response:** `201` z utworzonym obiektem Origin.

**Walidacja:**
- `slug` — wymagany, unique, lowercase, bez spacji (uzyj myslnikow)
- `label` — wymagany, human-readable nazwa
- `allow_suffix` — `false` domyslnie. Ustaw `true` jesli origin akceptuje format `slug-xxx`
- `sort_order` — kolejnosc w liscie, `0` domyslnie

#### `PATCH /origins/:id` — aktualizuj origin

**Auth:** admin

**Request** (wszystkie pola opcjonalne):
```json
{
  "label": "Zmieniona nazwa",
  "allow_suffix": true,
  "active": false,
  "sort_order": 3
}
```

**Response:** `200` z zaktualizowanym obiektem Origin.

**Uwaga:** Slug NIE jest edytowalny (jest uzywany jako identyfikator w danych).

#### `DELETE /origins/:id` — dezaktywuj origin (soft delete)

**Auth:** admin

**Response:** `200 { "message": "Origin deactivated successfully" }`

**Uwaga:** Nie usuwa fizycznie — ustawia `active: false`. Istniejace assety/stocki z tym originem nie zostaja naruszone.

### Jak origin dziala przy tworzeniu asseta/stocka

Backend przyjmuje origin jako zwykly string, np.:

```json
{ "origin": "druga-era" }
```

lub z sufiksem:

```json
{ "origin": "personal-jan" }
```

Backend sam:
1. Normalizuje (lowercase, trim, spacje → myslniki)
2. Szuka po slug w tabeli `origins`
3. Jesli nie znajdzie, probuje dopasowac `slug-suffix` (np. `personal` + `jan`)
4. Zwraca blad jesli origin nie istnieje lub nie jest aktywny

**W odpowiedziach** (GET assety, GET stocki) origin wraca jako string display: `"origin": "druga-era"` lub `"origin": "personal-jan"`.

### UI — sugerowana implementacja dropdowna

```
+----------------------------------+
| Origin:  [v Druga Era          ] |
|                                  |
| (jesli allow_suffix = true)      |
| Suffix:  [jan_________________ ] |
+----------------------------------+
```

1. Pobierz `GET /origins` → wyswietl w select/dropdown
2. Jesli wybrany origin ma `allow_suffix: true` — pokaz dodatkowe pole tekstowe na suffix
3. Przy submit wysylaj jako string: `"origin": "personal-jan"` (slug + "-" + suffix)
4. Jesli `allow_suffix: false` — wysylaj sam slug: `"origin": "druga-era"`

---

## 2. Settings — ustawienia aplikacji

### Co to jest

Generyczna tabela key-value na ustawienia aplikacji, ktore admin moze zmieniac z poziomu frontu bez redeployu. Aktualnie przechowuje konfiguracje Google Sheets dla equipment requests.

### Endpointy

#### `GET /settings` — lista wszystkich ustawien

**Auth:** admin

**Query params:**
- `prefix` (opcjonalny) — filtruje klucze po prefixie, np. `?prefix=equipment_request`

**Response** (bez prefixu — lista skrocona, bez wartosci):
```json
[
  {
    "key": "equipment_request.sheet_id",
    "description": "Google Sheets document ID for equipment requests",
    "updated_at": "2025-01-01T00:00:00Z"
  },
  {
    "key": "equipment_request.sheet_name",
    "description": "Sheet tab name within the document",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

**Response** (z prefixem — pelne dane, z wartosciami):
```json
[
  {
    "key": "equipment_request.sheet_id",
    "value": "16BytrbWmyWeBGnlSIDZn1Lnb5rdspoQu_rpc5m5Vtbc",
    "description": "Google Sheets document ID for equipment requests",
    "updated_at": "2025-01-01T00:00:00Z"
  },
  {
    "key": "equipment_request.sheet_name",
    "value": "Zamówienia",
    "description": "Sheet tab name within the document",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

#### `GET /settings/:key` — pobierz ustawienie

**Auth:** admin

**Przyklad:** `GET /settings/equipment_request.sheet_id`

**Response:**
```json
{
  "key": "equipment_request.sheet_id",
  "value": "16BytrbWmyWeBGnlSIDZn1Lnb5rdspoQu_rpc5m5Vtbc",
  "description": "Google Sheets document ID for equipment requests",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

**Bledy:** `404` jesli klucz nie istnieje.

#### `PUT /settings/:key` — zmien wartosc

**Auth:** admin

**Przyklad:** `PUT /settings/equipment_request.sheet_id`

**Request:**
```json
{
  "value": "nowySheetId123"
}
```

**Response:** `200 { "message": "Setting updated successfully" }`

**Bledy:**
- `400` — brak `value` w body
- `404` — klucz nie istnieje (nie mozna tworzyc nowych kluczy przez API)

### Aktualne klucze

| Key | Opis | Przykladowa wartosc |
|-----|------|-------------------|
| `equipment_request.sheet_id` | ID dokumentu Google Sheets | `16BytrbWmyWeBGnlSIDZn1Lnb5rdspoQu_rpc5m5Vtbc` |
| `equipment_request.sheet_name` | Nazwa zakladki w arkuszu | `Zamówienia` |

### UI — sugerowana implementacja panelu ustawien

Panel admina z formularzem:

```
+--------------------------------------------------+
| Ustawienia aplikacji                    [admin]   |
+--------------------------------------------------+
|                                                   |
| Google Sheets - Equipment Requests                |
| ------------------------------------------------- |
| Sheet ID:                                         |
| [16BytrbWmyWeBGnlSIDZn1Lnb5rdspoQu_rpc5m5Vtbc] |
|                                                   |
| Sheet Name:                                       |
| [Zamówienia___________________________________ ]  |
|                                                   |
|                              [Zapisz] [Sync teraz]|
+--------------------------------------------------+
```

**Flow:**
1. `GET /settings?prefix=equipment_request` → wypelnij formularz wartosciami
2. Admin edytuje pola
3. "Zapisz" → `PUT /settings/equipment_request.sheet_id` + `PUT /settings/equipment_request.sheet_name`
4. Opcjonalnie "Sync teraz" → `POST /equipment-requests/sync` po zapisie

**Uwagi:**
- Zmiana ustawien dziala natychmiast (kolejny sync uzyje nowych wartosci)
- Nie trzeba restartowac serwera
- Jesli w bazie nie ma wartosci, backend uzywa fallbacku z env (backward compat)

---

## 3. Zmiany w istniejacych endpointach

### Assets i Stocki — pole `origin`

Bez zmian w kontrakcie API:
- `POST /assets`, `POST /stocks` — nadal przyjmuja `"origin": "string"`
- `GET /assets`, `GET /stocks` — nadal zwracaja `"origin": "string"`

**Jedyna roznica:** backend waliduje origin wzgledem tabeli `origins`. Jesli origin nie istnieje lub jest nieaktywny, dostaniesz:
```json
{
  "error": "Invalid origin",
  "details": "invalid origin: nieistniejacy-origin"
}
```

### Error codes summary

| Endpoint | Code | Kiedy |
|----------|------|-------|
| POST/PATCH assets/stocks | `400` | Origin nie istnieje lub nieaktywny |
| POST origins | `409` | Slug juz istnieje |
| PATCH/DELETE origins | `404` | Origin o podanym ID nie istnieje |
| GET settings/:key | `404` | Klucz nie istnieje |
| PUT settings/:key | `404` | Klucz nie istnieje |
| PUT settings/:key | `400` | Brak `value` w body |
