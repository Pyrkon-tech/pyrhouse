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

- **Framework**: React 18.2 + TypeScript 5.2
- **UI**: Material-UI 5.17 + Emotion
- **Build**: Vite 6.3
- **Routing**: React Router DOM 6.22
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
│   ├── features/     # Strony funkcjonalne (30 komponentów)
│   ├── common/       # Wspólne (BarcodeScanner, MapComponent)
│   └── animations/   # Animacje przejść stron
├── hooks/            # Custom hooks (18 hooków)
├── services/         # Warstwa API (5 serwisów)
├── theme/            # Design tokens + theme
├── routes/           # Konfiguracja routingu
├── types/            # Definicje TypeScript
├── models/           # Modele danych
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
| `src/hooks/useAuth.ts` | Autentykacja i walidacja tokenu |

## Routing

### Public routes
- `/login` - Logowanie
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

### Admin routes
- `/users/*` - Zarządzanie użytkownikami
- `/categories` - Zarządzanie kategoriami

## Design System

### Design Tokens (`designTokens.ts`)
- **Kolory**: primary (#ff9800), secondary (#e91e63), status colors
- **Spacing**: xs (0.25rem) do 4xl (6rem)
- **Border Radius**: none do full (9999px)
- **Shadows**: sm do 2xl
- **Typography**: Roboto + Cinzel

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

- Base URL: `VITE_API_BASE_URL`
- Auth: Bearer token w Authorization header
- Services: transferService, locationService, assetService, userService

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

## Environment Variables

```env
VITE_API_BASE_URL=<API URL>
VITE_API_TIMEOUT=30000
VITE_APP_NAME=PyrHouse
VITE_ENVIRONMENT=dev|prod
```

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

### Dodawanie API call
1. Dodaj funkcję w odpowiednim service (`services/*.ts`)
2. Użyj `getAuthHeaders()` dla autentykacji
3. Obsłuż błędy z odpowiednimi komunikatami

### Testowanie
- Framework: Vitest + React Testing Library
- Testy w `__tests__/` obok komponentów
- Mock API: MSW
