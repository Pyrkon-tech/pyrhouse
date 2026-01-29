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
| 8 | UI/UX Refresh | TODO | - |
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
- `src/types/index.ts` - centralne eksporty

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

### 8. UI/UX Refresh

**Planowane zmiany:**
- Primary color: zmiana z pomarańczowego (#ff9800) na indigo/navy (#3949ab)
- Pomarańczowy jako accent color
- Lepszy kontrast w dark mode dla tabel
- Zebra striping dla tabel
- Subtelne gradienty w nagłówkach/kartach

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
