# PyrHouse - Propozycje usprawnień architektury

## Status: Do implementacji

---

## 1. Warstwa API - Centralny API Client

### Problem
Każda funkcja w services pobiera token osobno i ma duplikację kodu obsługi błędów.

### Rozwiązanie
Stworzenie centralnego API client z interceptorami.

```typescript
// src/services/apiClient.ts
import { API_BASE_URL } from '../config/api';

const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

interface RequestConfig extends RequestInit {
  timeout?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = config.timeout || API_TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...config,
        headers: {
          ...this.getAuthHeaders(),
          ...config.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.message || error.error || `HTTP ${response.status}`,
          response.status,
          error.code
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      throw error;
    }
  }

  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiError };
```

### Użycie po zmianach
```typescript
// src/services/transferService.ts
import { apiClient } from './apiClient';

export const validatePyrCodeAPI = (pyrCode: string) =>
  apiClient.get<AssetValidation>(`/assets/pyrcode/${pyrCode}`);

export const createTransferAPI = (payload: CreateTransferPayload) =>
  apiClient.post<Transfer>('/transfers', payload);
```

**Korzyści:**
- 80% mniej kodu w serwisach
- Jednolite error handling
- Łatwe dodawanie retry logic, logging, interceptors

---

## 2. Centralizacja typów

### Problem
Typy są rozproszone w plikach services i komponentach. Niektóre używają `any`.

### Rozwiązanie
Struktura typów w `src/types/`:

```
src/types/
├── api.types.ts      # Typy API responses/requests
├── transfer.types.ts # Typy transferów (istnieje, rozszerzyć)
├── asset.types.ts    # Typy sprzętu
├── user.types.ts     # Typy użytkowników
├── location.types.ts # Typy lokalizacji
└── index.ts          # Re-export wszystkich typów
```

```typescript
// src/types/api.types.ts
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## 3. React Query dla cache'owania

### Problem
Brak cache'owania danych, każda nawigacja = nowy request.

### Rozwiązanie
Dodanie TanStack Query (React Query).

```bash
npm install @tanstack/react-query
```

```typescript
// src/hooks/useTransfersQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export const useTransfers = (userId: number, status: string) => {
  return useQuery({
    queryKey: ['transfers', userId, status],
    queryFn: () => apiClient.get(`/transfers/user/${userId}/status/${status}`),
    staleTime: 5 * 60 * 1000, // 5 minut
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => apiClient.post('/transfers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });
};
```

**Korzyści:**
- Automatyczne cache'owanie
- Background refetching
- Optimistic updates
- Deduplikacja requestów

---

## 4. Feature-based folder structure

### Problem
Obecna struktura oparta na typach (components, hooks, services) utrudnia skalowanie.

### Propozycja (opcjonalna migracja)
```
src/
├── features/
│   ├── transfers/
│   │   ├── components/
│   │   │   ├── TransferForm.tsx
│   │   │   ├── TransferList.tsx
│   │   │   └── TransferDetails.tsx
│   │   ├── hooks/
│   │   │   ├── useTransfers.ts
│   │   │   └── useTransferDetails.ts
│   │   ├── services/
│   │   │   └── transferService.ts
│   │   ├── types/
│   │   │   └── transfer.types.ts
│   │   └── index.ts
│   ├── locations/
│   ├── assets/
│   └── users/
├── shared/
│   ├── components/    # UI components (Button, Card, etc.)
│   ├── hooks/         # Shared hooks (useAuth, useStyles)
│   ├── services/      # apiClient
│   └── types/         # Shared types
└── ...
```

**Rekomendacja:** Zachować obecną strukturę dla małych-średnich projektów. Feature-based lepsze przy >50 komponentach.

---

## 5. Global Error Boundary z toastami

### Problem
Błędy API nie są zawsze wyświetlane użytkownikowi w spójny sposób.

### Rozwiązanie
Centralny error handler z snackbar.

```typescript
// src/context/NotificationContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

interface Notification {
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

interface NotificationContextType {
  showNotification: (notification: Notification) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = useCallback((n: Notification) => {
    setNotification(n);
  }, []);

  const showError = useCallback((message: string) => {
    setNotification({ message, severity: 'error' });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setNotification({ message, severity: 'success' });
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, showError, showSuccess }}>
      {children}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        {notification && (
          <Alert severity={notification.severity}>{notification.message}</Alert>
        )}
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
```

---

## 6. Rozszerzenie config/api.ts

### Problem
Brak centralnych helperów dla API (timeout, headers).

### Rozwiązanie
```typescript
// src/config/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const createAbortController = (timeout = API_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return { controller, timeoutId, clear: () => clearTimeout(timeoutId) };
};
```

---

## 7. Environment-based configuration

### Problem
Brak walidacji zmiennych środowiskowych.

### Rozwiązanie
```typescript
// src/config/env.ts
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key] || defaultValue;
  if (!value && defaultValue === undefined) {
    console.warn(`Missing environment variable: ${key}`);
  }
  return value || '';
};

export const env = {
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8080'),
  API_TIMEOUT: Number(getEnvVar('VITE_API_TIMEOUT', '30000')),
  APP_NAME: getEnvVar('VITE_APP_NAME', 'PyrHouse'),
  ENVIRONMENT: getEnvVar('VITE_ENVIRONMENT', 'development'),
  IS_PRODUCTION: getEnvVar('VITE_ENVIRONMENT') === 'production',
  GOOGLE_MAPS_KEY: getEnvVar('VITE_GOOGLE_MAPS_KEY'),
} as const;
```

---

## 8. Lazy loading dla heavy dependencies

### Problem
Quagga, jspdf, jsbarcode zwiększają initial bundle.

### Rozwiązanie
```typescript
// src/utils/lazyImport.ts
export const loadPdfGenerator = () => import('jspdf');
export const loadBarcodeScanner = () => import('quagga');
export const loadBarcodeGenerator = () => import('jsbarcode');

// Użycie w komponencie
const BarcodeScanner = lazy(() =>
  import('quagga').then(module => ({
    default: () => <QuaggaScanner {...module} />
  }))
);
```

---

## 9. Testing infrastructure

### Problem
Brak mock server setup dla testów.

### Rozwiązanie
```typescript
// src/__mocks__/handlers.ts
import { rest } from 'msw';
import { API_BASE_URL } from '../config/api';

export const handlers = [
  rest.get(`${API_BASE_URL}/transfers`, (req, res, ctx) => {
    return res(ctx.json({ transfers: [] }));
  }),
  rest.post(`${API_BASE_URL}/transfers`, (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ id: 1 }));
  }),
];

// src/__mocks__/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

---

## Priorytetyzacja

| # | Zmiana | Wpływ | Trudność | Priorytet |
|---|--------|-------|----------|-----------|
| 1 | API Client | Wysoki | Średnia | **P0** |
| 2 | Centralizacja typów | Średni | Niska | **P0** |
| 6 | Rozszerzenie config/api | Średni | Niska | **P1** |
| 5 | NotificationContext | Średni | Niska | **P1** |
| 7 | Environment config | Niski | Niska | **P2** |
| 3 | React Query | Wysoki | Średnia | **P2** |
| 8 | Lazy loading libs | Średni | Niska | **P2** |
| 9 | MSW setup | Średni | Średnia | **P3** |
| 4 | Feature folders | Niski | Wysoka | **P4** |

---

## Plan implementacji

### Faza 1 (P0) - Natychmiast
1. Stwórz `src/services/apiClient.ts`
2. Stwórz `src/config/api.ts` z helperami
3. Zorganizuj typy w `src/types/`
4. Zmigruj 1 serwis jako proof of concept

### Faza 2 (P1) - Krótkoterminowo
1. Dodaj `NotificationContext`
2. Zmigruj pozostałe serwisy do apiClient
3. Dodaj env.ts z walidacją

### Faza 3 (P2) - Średnioterminowo
1. Dodaj React Query dla cache
2. Lazy load heavy libs
3. Setup MSW dla testów

### Faza 4 (P3+) - Długoterminowo
1. Rozważ feature-based structure przy dalszym wzroście
2. Dodaj E2E testy (Playwright/Cypress)
3. Storybook dla komponentów UI
