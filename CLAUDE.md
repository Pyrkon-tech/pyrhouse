# PyrHouse Frontend - Kontekst projektu

## Przegląd

PyrHouse to aplikacja React/TypeScript do zarządzania stanami magazynowymi dla działu technicznego Pyrkonu. System obsługuje:
- Zarządzanie sprzętem (assets/stock) z kodami kreskowymi
- Transfery między lokalizacjami
- System quest board (gamifikowany interfejs transferów)
- Service desk (tickety wewnętrzne)
- Harmonogram dyżurów
- Zarządzanie użytkownikami i rolami

## Tech Stack

- **Framework**: React 19.2 + TypeScript 5.9
- **UI**: Material-UI 5.18 + Emotion
- **Build**: Vite 6.4
- **Routing**: React Router DOM 7.17
- **State**: React Context + Custom Hooks
- **Formularze**: react-hook-form
- **Mapy**: Google Maps API
- **PDF/Barcode**: jspdf, jsbarcode, quagga

## Struktura projektu

```
src/
├── components/
│   ├── ui/           # Reużywalne komponenty (Button, Card, Container)
│   ├── layout/       # Layout, Navigation, Breadcrumbs
│   ├── features/     # Strony funkcjonalne (flat files + moduły folderowe)
│   │   ├── Transfer/           # Moduł transferów (create, details, list + sub-components)
│   │   ├── ServiceDesk/        # Moduł service desk (page, form, views + sub-components)
│   │   ├── QuestDispatcherMap/ # Mapa dispatch (SVG overlay, sidebar, zones)
│   │   └── *.tsx               # Proste strony (<150 LOC)
│   ├── common/       # Wspólne (BarcodeScanner, MapComponent)
│   └── animations/   # Animacje przejść stron + keyframes
├── hooks/            # Custom hooks (27 hooków)
├── services/         # Warstwa API (8 serwisów)
├── theme/            # Design tokens + theme
├── routes/           # Konfiguracja routingu
├── types/            # Definicje TypeScript (jedyne źródło typów)
└── context/          # React Context providers
```

## Kluczowe pliki

| Plik | Opis |
|------|------|
| `src/App.tsx` | Główny komponent z routingiem |
| `src/theme/designTokens.ts` | Centralne design tokens |
| `src/theme/theme.ts` | Konfiguracja MUI theme |
| `src/routes/routes.ts` | Definicje tras |
| `src/hooks/useStyles.ts` | Hook do stylowania |
| `src/context/AuthContext.tsx` | Centralny stan auth (jeden interwał walidacji JWT); provider w App.tsx wewnątrz Routera |
| `src/hooks/useAuth.ts` | Cienki wrapper na AuthContext (stare API zachowane) |
| `src/services/apiClient.ts` | Centralny klient API |
| `src/config/env.ts` | Konfiguracja zmiennych środowiskowych |
| `src/context/NotificationContext.tsx` | Centralne powiadomienia |
| `src/types/index.ts` | Centralne eksporty typów |
| `src/components/features/Transfer/` | Moduł transferów (3 strony + 5 sub-components) |
| `src/components/features/ServiceDesk/` | Moduł service desk (strona + formularz + 3 widoki) |
| `src/components/features/QuestDispatcherMap/` | Mapa dispatch MTP z overlayami stref |

## Routing

### Public routes
- `/login` - Logowanie
- `/auth/discord/callback` - Discord login callback
- `/auth/discord/link-callback` - Discord link callback
- `/servicedesk/request` - Publiczny formularz service desk

### Protected routes (wymagają JWT)
- `/home` - Dashboard
- `/list` - Lista magazynu
- `/add-item` - Dodawanie sprzętu
- `/transfers/*` - Zarządzanie transferami
- `/quests` - Quest board
- `/equipment/:id` - Szczegóły sprzętu
- `/locations/*` - Zarządzanie lokalizacjami
- `/duty-schedule` - Harmonogram dyżurów
- `/servicedesk` - Service desk
- `/dispatch` - Mapa Dispatch (centrum dowodzenia dyżurnego — questy + SD per strefa, SSE, urgency)

### Admin routes
- `/users/*` - Zarządzanie użytkownikami
- `/categories` - Zarządzanie kategoriami

## Design System

### Design Tokens (`designTokens.ts`)
- **Primary**: Pyrkon Orange (#ff9800) - główny kolor brandingu
- **Secondary**: Deep Burnt Orange (#d84315)
- **Accent**: Electric Teal (#00acc1) - kontrast do orange
- **Spacing**: xs (0.25rem) do 4xl (6rem)
- **Border Radius**: none do full (9999px)
- **Shadows**: sm do 2xl + primary (orange glow), accent (teal glow)
- **Typography**: Roboto (body) + Cinzel (headings h1-h3)
- **Glassmorphism**: glass.light, glass.dark tokens
- **Gradients**: primary, hero, dark, darkCard, accent
- **Glow effects**: orange, orangeStrong, orangeSubtle, teal

### Dark Mode
- Deep blue-black backgrounds (#0f0f23, #1a1a2e, #16213e)
- Orange tint on hover/selected states
- Custom scrollbar z orange accent
- Gradient sidebar background

### Użycie stylów
```typescript
import useStyles from '../hooks/useStyles';
import { designTokens } from '../theme/designTokens';

const { commonStyles } = useStyles();
// lub bezpośrednio: designTokens.spacing.lg
```

## Autentykacja

- JWT token w localStorage (key: "token")
- Dekodowanie: `jwt-decode` -> role, userID, exp
- Walidacja co 60 sekund z 5-minutowym marginesem bezpieczeństwa
- Role: user, admin, moderator

## API

- Base URL: `VITE_API_BASE_URL` (dostęp przez `env.API_BASE_URL`)
- Auth: Bearer token w Authorization header
- Services: transferService, locationService, assetService, userService, discordAuthService

### Nowy sposób (zalecany) - apiClient
```typescript
import { apiClient, ApiError } from '../services/apiClient';

// GET
const data = await apiClient.get<User>('/users/1');

// POST
const result = await apiClient.post<Transfer>('/transfers', payload);

// Error handling
try {
  await apiClient.post('/endpoint', data);
} catch (error) {
  if (error instanceof ApiError && error.isUnauthorized()) {
    // redirect to login
  }
}
```

### Status migracji do apiClient
**Zmigrowane:**
- transferService.ts (kompletnie)
- assetService.ts (kompletnie)

**Do migracji (~20 plików):**
- Hooks: useCategories, useStocks, useLocations, useTransfers, useDutySchedule, useServiceDeskComments
- Komponenty: EquipmentDetails, UserDetailsPage, List, Home, QuestBoardPage, ServiceDeskPage
- Formularze: AddAssetForm, AddStockForm, LoginForm

### Stary sposób (legacy - do migracji)
```typescript
import { getApiUrl, getAuthHeaders } from '../config/api';

const response = await fetch(getApiUrl('/endpoint'), {
  headers: getAuthHeaders(),
});
```

## Konwencje kodowania

### Komponenty
1. Używaj design tokens zamiast hardkodowanych wartości
2. Preferuj `sx` prop dla prostych stylów
3. Używaj reużywalnych komponentów UI (Button, Card, Container)
4. TypeScript interfaces dla wszystkich props

### Routing
1. Definiuj trasy w `routes.ts`, nie inline w App.tsx
2. Lazy loading dla wszystkich komponentów
3. Wrap w ErrorBoundary + Suspense

### Hooki
- `useAuth` - autentykacja
- `useStyles` - stylowanie
- `useStorage` - localStorage/sessionStorage
- Domenowe: useTransfers, useLocations, useCategories, etc.

### Formularze z czytnikiem kodów kreskowych

**KRYTYCZNE**: Czytnik kodów kreskowych (barcode/QR) symuluje klawiaturę — wpisuje kod i wciska **Enter**. Bez `e.preventDefault()` w onKeyDown Enter submituje formularz lub dodaje nową linię.

- `src/components/features/TransferPage.tsx` — jedyny formularz w projekcie przygotowany pod skaner
- `src/components/common/BarcodeScanner.tsx` — kamera (Quagga.js, CODE_128)
- **Nie buduj własnych inline formularzy do wydania sprzętu** — zamiast tego przekieruj do `/transfers/create` z kontekstem w route state
- Wzorzec dla pola PYR code: `onKeyDown={(e) => { if (e.key==='Enter') { e.preventDefault(); validate(); } }}`
- Po walidacji: auto-focus następnego rzędu przez `setTimeout(..., 100)`

**Tworzenie transferu z kontekstem questa — właściwy przepływ (dispatch):**

Transfer z questa jest tworzony **inline** na `QuestDetailPage` (nie przez `/transfers/create`).

```
DispatchPage → DispatchModal (wybór wolontariuszy z on-duty) → DISPATCH
  → navigate(`/quests/:id`, { state: { autoOpenTransfer: true, volunteerIds: [user_id, ...] } })
  → QuestDetailPage: auto-otwiera TransferFormCore inline
  → POST /equipment-requests/quests/:id/transfer
```

Kluczowe szczegóły:
- `volunteerIds` w route state to **system user IDs** (z `OnDutyVolunteer.user_id`), nie schedule volunteer IDs
- Wolontariusze bez powiązanego konta (`user_id: null`, `is_unlinked: true`) nie są pre-selectowani w formularzu
- Po submit: `setShowTransferForm(false)` + `refreshQuest()` — nie ma redirect
- `/transfers/create` nadal obsługuje `questId` z route state (fallback), ale żadna nawigacja z quest flow tam nie prowadzi

**Cykl życia statusu `on_mission` wolontariusza (backend, bez frontu):**

`on_mission` jest **wyliczany at read time** przez SQL join, nigdy nie zapisywany do kolumny:

```
transfer_users → transfers → equipment_request_quests WHERE status = 'in_progress'
```

| Zdarzenie | Efekt na status |
|---|---|
| `POST /quests/:id/transfer` (tworzenie transferu) | quest.status = `in_progress` → wolontariusz = `on_mission` |
| transfer.status = `completed` | quest.status = `completed` → wolontariusz = `available` |
| transfer anulowany | quest odlinkowany od transferu, status cofnięty → `available` |

`current_mission` = `destination_pavilion + ' - ' + destination_location` z questa.

**Brak endpointu do ręcznego ustawiania `on_mission`** (`PATCH /schedule/volunteers/:vid` nie ma pola `status`).

Wolontariusz staje się `on_mission` **dopiero po finalnym submit formularza transferu** — nie po kliknięciu DISPATCH w modalu.

**Usunięty martwy kod (nie przywracać):**
- `QuestData` interface i prop `questData` w `TransferFormCore` — dane questa nie były nigdy używane w ciele formularza
- `useTransferFromQuest` hook — preview/create wrapper, zastąpiony bezpośrednim wywołaniem `createTransferFromQuestAPI` w `TransferFormCore`
- `getTransferPreviewAPI` — endpoint preview nie jest używany w UI

### Cache invalidation pattern (useCategories)
Hook `useCategories` używa event-based pattern do synchronizacji między komponentami:
```typescript
// Po dodaniu/usunięciu/edycji kategorii:
localStorage.removeItem(CACHE_KEY);        // Inwalidacja cache
notifyCategoriesChanged();                  // Powiadom inne komponenty

// Inne komponenty nasłuchują:
window.addEventListener('categories_changed', () => fetchCategories(true));
```
Ten wzorzec można zastosować do innych hooków z cache'owaniem.

## Environment Variables

```env
VITE_API_BASE_URL=<API URL>
VITE_API_TIMEOUT=30000
VITE_APP_NAME=PyrHouse
VITE_ENVIRONMENT=dev|prod
VITE_DISCORD_CLIENT_ID=<Discord OAuth2 Client ID>
```

## Discord Integration

### Architektura
- **Login**: `discordAuthService.initiateLogin()` → backend redirect → Discord OAuth → backend callback → JWT token
- **Linking**: `discordAuthService.initiateLinking(userId)` → bezpośredni Discord OAuth → frontend callback → `POST /users/:id/link-discord`

### Typy użytkowników (nowy kontrakt API)
- `UserListItem` — lista użytkowników (GET /users), bez `discord_id`/`avatar_url`
- `UserDetails` — szczegóły (GET /users/:id), z pełnymi danymi Discord
- Oba mają `fullname: string | null` (null dla kont Discord)
- `auth_provider: 'discord' | null` — metoda rejestracji

### Łączenie kont (POST /users/:id/link-discord)
- Body: `{ code: string, state: string }` — z Discord OAuth2
- 200: Połączono pomyślnie
- 409: Discord account już podłączone do innego usera
- Admin widzi przycisk "Połącz z Discord" na profilu użytkownika bez Discord
- Wymaga `VITE_DISCORD_CLIENT_ID` w env

### Scalanie kont Discord (POST /users/:id/merge-discord)
- Przenosi dane Discord z ghost konta na konto docelowe
- Body: `{ source_user_id: number }` — ID ghost konta
- Wymagana rola: moderator lub admin
- 200: Sukces (`source_deleted: true/false` — ghost usunięty lub dezaktywowany)
- 400: source == target / source bez Discorda
- 403: Brak uprawnień
- 404: Konto nie istnieje
- 409: Target już ma podłączony Discord
- Ghost konta na liście użytkowników: `auth_provider: "discord"`, `active: false` — oznaczone chipem "Ghost"
- Dialog scalania dostępny na profilu użytkownika bez Discorda (przycisk "Scal konta Discord")

### Kluczowe pliki Discord
| Plik | Opis |
|------|------|
| `src/services/discordAuthService.ts` | OAuth flow (login + linking) |
| `src/services/userService.ts` | `linkDiscordAPI()`, `mergeDiscordAPI()` |
| `src/types/user.types.ts` | `MergeDiscordPayload`, `MergeDiscordResponse` |
| `src/components/features/DiscordCallback.tsx` | Callback logowania |
| `src/components/features/DiscordLinkCallback.tsx` | Callback łączenia kont |
| `src/hooks/useDiscordAuth.ts` | Hook logowania Discord |

## Ostatnie naprawy (2025-01)

### useCategories - cache invalidation
- **Problem**: Nowe kategorie nie były widoczne w innych komponentach bez odświeżenia
- **Rozwiązanie**: Event-based pattern z `categories_changed` event
- **Pliki**: `src/hooks/useCategories.ts`

### EquipmentDetails - response format
- **Problem**: API zwraca dane bezpośrednio, nie pod kluczem `asset/stock`
- **Rozwiązanie**: Fallback `const itemData = data[type] || data;`
- **Pliki**: `src/components/features/EquipmentDetails.tsx`

### TypeScript errors po refaktoringu
- Naprawiono ~15 błędów typów w: Card, Container, Button, App, routes
- Dodano `TransferStatus = 'completed'` do typów
- Naprawiono `CreateTransferPayload` format

## Powiązana dokumentacja

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Szczegółowa architektura
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Przewodnik migracji
- [AGENTS.md](./AGENTS.md) - Definicje agentów AI
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Propozycje usprawnień architektury

---

## Instrukcje dla Claude - Aktualizacja dokumentacji

**WAŻNE:** Po każdej znaczącej zmianie w projekcie, zaktualizuj odpowiednie pliki dokumentacji:

### Kiedy aktualizować CLAUDE.md:
- Dodanie nowej strony/trasy
- Nowy hook domenowy
- Nowy serwis API
- Zmiana struktury folderów
- Nowe zmienne środowiskowe

### Kiedy aktualizować ARCHITECTURE.md:
- Zmiana wzorców architektonicznych
- Nowe komponenty UI
- Modyfikacja design systemu

### Kiedy aktualizować AGENTS.md:
- Nowe wzorce kodu do zapamiętania
- Nowe konwencje

### Kiedy aktualizować IMPROVEMENTS.md:
- Zakończenie implementacji propozycji (oznacz jako "Done")
- Nowe propozycje usprawnień
- Zmiana priorytetów

### Automatyczna aktualizacja:
```
Po zakończeniu zadania sprawdź:
1. Czy dodałeś nowy plik? -> Zaktualizuj CLAUDE.md (struktura)
2. Czy zmieniłeś architekturę? -> Zaktualizuj ARCHITECTURE.md
3. Czy zaimplementowałeś propozycję? -> Oznacz w IMPROVEMENTS.md jako Done
```

## Quick Start dla Claude

### Dodawanie nowej strony
1. Utwórz komponent w `src/components/features/`
2. Dodaj trasę w `src/routes/routes.ts`
3. Użyj `useStyles` do stylowania
4. Dodaj typy w `src/types/`

### Modyfikacja stylów
1. Użyj design tokens z `designTokens.ts`
2. Rozszerz `commonStyles` w `useStyles.ts` jeśli potrzeba
3. Nigdy nie używaj hardkodowanych wartości kolorów/spacing

### Dodawanie API call (nowy sposób)
1. Użyj `apiClient` z `src/services/apiClient.ts`
2. Dodaj typy w `src/types/`
3. Obsłuż błędy z `ApiError`

```typescript
import { apiClient } from '../services/apiClient';
import type { MyType } from '../types';

export const getMyDataAPI = () => apiClient.get<MyType>('/endpoint');
export const createMyDataAPI = (data: CreatePayload) =>
  apiClient.post<MyType>('/endpoint', data);
```

### Powiadomienia
```typescript
import { useNotification } from '../context/NotificationContext';

const { showSuccess, showError } = useNotification();
showSuccess('Zapisano!');
showError('Wystąpił błąd');
```

### Testowanie
- Framework: Vitest + React Testing Library
- Testy w `__tests__/` obok komponentów
- Mock API: MSW
