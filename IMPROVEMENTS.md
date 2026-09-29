# PyrHouse - Propozycje usprawnień architektury

## Status implementacji

| # | Propozycja | Status | Plik(i) |
|---|------------|--------|---------|
| 1 | API Client | **DONE** | `src/services/apiClient.ts` |
| 2 | Centralizacja typów | **DONE** | `src/types/*.ts` |
| 3 | Rozszerzenie config/api | **DONE** | `src/config/api.ts` |
| 4 | NotificationContext | **DONE** | `src/context/NotificationContext.tsx` |
| 5 | Environment config | **DONE** | `src/config/env.ts` |
| 6 | Cache invalidation pattern | **DONE** | `src/hooks/useCategories.ts` |
| 7 | Migracja serwisów do apiClient | **IN PROGRESS** | transferService, assetService (done) |
| 8 | UI/UX WOW Redesign | **DONE** | `designTokens.ts`, `theme.ts`, `Layout.tsx` |
| 9 | React Query | TODO | - |
| 10 | Lazy loading libs | TODO | - |
| 11 | MSW setup | TODO | - |
| 12 | Feature folders | TODO | - |

---

## Zaimplementowane (DONE)

### 1. Centralny API Client ✅

**Plik:** `src/services/apiClient.ts`

Klasa `ApiClient` z metodami `get()`, `post()`, `patch()`, `put()`, `delete()`:
- Automatyczne dodawanie tokenu JWT
- Obsługa timeout z AbortController
- Jednolite error handling z `ApiError`
- Typowane odpowiedzi

**Użycie:**
```typescript
import { apiClient, ApiError } from '../services/apiClient';

// GET
const user = await apiClient.get<User>('/users/1');

// POST
const transfer = await apiClient.post<Transfer>('/transfers', payload);

// Z custom timeout
const data = await apiClient.get<Data>('/slow', { timeout: 60000 });

// Bez autoryzacji
const publicData = await apiClient.get<Data>('/public', { skipAuth: true });

// Error handling
try {
  await apiClient.post('/transfers', data);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isUnauthorized()) { /* redirect to login */ }
  }
}
```

---

### 2. Centralizacja typów ✅

**Pliki:**
- `src/types/api.types.ts` - ApiResponse, PaginatedResponse, AsyncState
- `src/types/asset.types.ts` - Asset, AssetCategory, StockItem
- `src/types/location.types.ts` - Location, MapPosition, DeliveryLocation
- `src/types/user.types.ts` - User, UserRole, JwtPayload
- `src/types/transfer.types.ts` - Transfer, TransferItem, TransferFormData
- `packages/api` (`@pyrhouse/api`) - typy generowane z OpenAPI; `src/types/*.types.ts` - aliasy i payloady

**Użycie:**
```typescript
import { User, Asset, Transfer, Location } from '../types';
import type { ApiResponse, PaginatedResponse } from '../types';
```

---

### 3. Rozszerzenie config/api.ts ✅

**Plik:** `src/config/api.ts`

Dodane:
- `API_TIMEOUT` - domyślny timeout (30s)
- `getAuthHeaders()` - nagłówki z tokenem
- `createAbortController()` - helper do timeout
- `hasAuthToken()` - sprawdzenie czy zalogowany
- `getHttpErrorMessage()` - mapowanie kodów HTTP

---

### 4. NotificationContext ✅

**Plik:** `src/context/NotificationContext.tsx`

**Integracja w App.tsx:**
```tsx
import { NotificationProvider } from './context/NotificationContext';

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        {/* reszta */}
      </NotificationProvider>
    </ThemeProvider>
  );
}
```

**Użycie w komponentach:**
```typescript
import { useNotification } from '../context/NotificationContext';

const MyComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  const handleSave = async () => {
    try {
      await saveData();
      showSuccess('Zapisano pomyślnie');
    } catch (error) {
      showError(error.message);
    }
  };
};
```

---

### 5. Environment config ✅

**Plik:** `src/config/env.ts`

Centralna konfiguracja zmiennych środowiskowych:
- Walidacja wymaganych zmiennych
- Wartości domyślne
- Typowanie
- Computed properties (`IS_PRODUCTION`, `HAS_GOOGLE_MAPS`)

**Użycie:**
```typescript
import { env } from '../config/env';

const url = env.API_BASE_URL;
const timeout = env.API_TIMEOUT;

if (env.IS_PRODUCTION) {
  // production-only code
}

if (env.HAS_GOOGLE_MAPS) {
  // enable map features
}
```

---

### 6. Cache invalidation pattern ✅

**Plik:** `src/hooks/useCategories.ts`

Event-based pattern dla synchronizacji cache między komponentami:
```typescript
const CACHE_KEY = 'categories_cache';
const CATEGORIES_CHANGED_EVENT = 'categories_changed';

// Po modyfikacji:
localStorage.removeItem(CACHE_KEY);
window.dispatchEvent(new Event(CATEGORIES_CHANGED_EVENT));

// Nasłuchiwanie w useEffect:
useEffect(() => {
  const handler = () => fetchCategories(true);
  window.addEventListener(CATEGORIES_CHANGED_EVENT, handler);
  return () => window.removeEventListener(CATEGORIES_CHANGED_EVENT, handler);
}, []);
```

---

### 7. Migracja serwisów do apiClient 🔄

**Status:** IN PROGRESS

**Zmigrowane:**
- `transferService.ts` - wszystkie funkcje
- `assetService.ts` - wszystkie funkcje

**Do migracji (~20 plików):**
- Hooks: useCategories, useStocks, useLocations, useTransfers, useDutySchedule
- Komponenty: EquipmentDetails, UserDetailsPage, List, Home
- Formularze: AddAssetForm, AddStockForm, LoginForm

---

## Do zrobienia (TODO)

### 8. UI/UX WOW Redesign ✅

**Status:** DONE

**Zrealizowane zmiany (Kompletny redesign):**

#### System kolorów - Orange jako PRIMARY (Pyrkon branding)
- ✅ Primary: Pyrkon Orange (#ff9800) - główny kolor brandingu
- ✅ Secondary: Deep Burnt Orange (#d84315)
- ✅ Accent: Electric Teal (#00acc1) - kontrast do orange
- ✅ Zebra striping dla tabel z orange tint
- ✅ Hover effects z orange theme

#### Glassmorphism & Efekty wizualne
- ✅ Glassmorphism tokens (light/dark mode)
- ✅ Gradienty: primary, hero, dark, darkCard, darkSidebar
- ✅ Glow effects: orange, orangeStrong, orangeSubtle, teal
- ✅ Premium scrollbar styling z orange accent

#### Dark Mode Enhancement
- ✅ Deep blue-black backgrounds (#0f0f23, #1a1a2e, #16213e)
- ✅ Dedykowana darkPalette z surface i border tokens
- ✅ Orange tint na hover/selected states

#### Layout & Komponenty
- ✅ Glassmorphism AppBar z orange glow line
- ✅ Sidebar z gradient background i orange active states
- ✅ Menu items z orange gradient background gdy aktywne
- ✅ Logo z orange glow on hover
- ✅ User menu button z orange border accent

#### Typografia
- ✅ Cinzel font dla nagłówków (h1-h3)
- ✅ Google Fonts loaded w index.html

#### Animacje CSS (w theme.ts)
- ✅ glowPulse, shimmer, float, fadeIn, slideInRight, scaleIn

**Nowe tokeny w designTokens.ts:**
```typescript
glass: { light: {...}, dark: {...} }
gradients: { primary, hero, dark, darkCard, accent, shimmer }
glow: { orange, orangeStrong, orangeSubtle, teal, white }
darkPalette: { background, surface, border, primaryTint, primaryGlow }
```

---

### 9. React Query

Cache'owanie danych, background refetch, optimistic updates.

```bash
npm install @tanstack/react-query
```

---

### 10. Lazy loading dla heavy dependencies

Quagga, jspdf, jsbarcode jako dynamic imports dla mniejszego initial bundle.

---

### 11. MSW setup

Mock server dla testów jednostkowych i integracyjnych.

---

### 12. Feature-based folder structure

Opcjonalna migracja do struktury opartej na funkcjonalnościach (przy >50 komponentach).

---

## Następne kroki

1. **UI/UX Refresh** - zmiana kolorystyki, lepszy dark mode
2. **Dokończenie migracji do apiClient** - pozostałe hooki i komponenty
3. **React Query** - rozważ dla komponentów z częstym refetchem danych
