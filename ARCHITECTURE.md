# Architektura PyrHouse Frontend

## Przegląd

PyrHouse to aplikacja React z TypeScript wykorzystująca Material-UI do zarządzania sprzętem i transferami. Aplikacja została zrefaktoryzowana w celu poprawy architektury, łatwości rozwoju i spójności stylów.

## Struktura projektu

```
src/
├── components/
│   ├── ui/                 # Reużywalne komponenty UI
│   │   ├── Button/         # Komponenty przycisków
│   │   ├── Card/           # Komponenty kart
│   │   └── ...
│   ├── layout/             # Komponenty layoutu
│   │   ├── Container/      # Kontenery
│   │   └── ...
│   ├── features/           # Komponenty funkcjonalne
│   └── common/             # Wspólne komponenty
├── theme/
│   ├── designTokens.ts     # Centralne design tokens
│   ├── theme.ts           # Konfiguracja motywu
│   └── ...
├── routes/
│   ├── routes.ts          # Definicje tras
│   └── types.ts           # Typy routingu
├── hooks/
│   ├── useStyles.ts       # Hook do zarządzania stylami
│   └── ...
└── ...
```

## Kluczowe komponenty architektury

### 1. Design System

#### Design Tokens (`src/theme/designTokens.ts`)
Centralny system wartości designowych:
- **Kolory**: Paleta kolorów z wariantami light/dark
- **Typografia**: Rozmiary fontów, wagi, line-height
- **Spacing**: System odstępów
- **Border Radius**: Promienie zaokrągleń
- **Shadows**: System cieni
- **Transitions**: Animacje i przejścia
- **Breakpoints**: Punkty przełamania responsywności

```typescript
// Przykład użycia
import { designTokens } from '../theme/designTokens';

const styles = {
  padding: designTokens.spacing.lg,
  borderRadius: designTokens.borderRadius.lg,
  color: designTokens.colors.primary[500],
};
```

#### Motyw (`src/theme/theme.ts`)
Konfiguracja Material-UI z design tokens:
- Automatyczne generowanie motywów light/dark
- Cache'owanie motywów dla wydajności
- Spójne style dla wszystkich komponentów MUI

### 2. System komponentów UI

#### Reużywalne komponenty (`src/components/ui/`)
- **Button**: Przyciski z różnymi wariantami (primary, secondary, outline, ghost, danger)
- **Card**: Karty z wariantami (default, elevated, outlined, interactive)
- **Container**: Kontenery z różnymi rozmiarami i paddingami

```typescript
// Przykład użycia
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

<Button variant="primary" size="md" loading={isLoading}>
  Zapisz
</Button>

<Card variant="elevated" padding="lg" hover>
  Treść karty
</Card>
```

### 3. System routingu

#### Definicje tras (`src/routes/routes.ts`)
- **Public routes**: Trasy dostępne bez autoryzacji
- **Protected routes**: Trasy wymagające autoryzacji
- **Admin routes**: Trasy wymagające określonych ról
- Lazy loading dla wszystkich komponentów

```typescript
// Przykład definicji trasy
{
  path: '/transfers/create',
  component: TransferPage,
  title: 'Utwórz transfer',
  icon: 'Transfer',
  showInNav: true,
}
```

#### Routing w App.tsx
- Automatyczne generowanie tras z definicji
- Obsługa błędów i loading states
- Role-based access control

### 4. Hook do zarządzania stylami

#### useStyles (`src/hooks/useStyles.ts`)
Centralny hook do zarządzania stylami:
- Dostęp do design tokens
- Predefiniowane style dla typowych przypadków
- Responsywne style
- Theme-aware styles

```typescript
// Przykład użycia
import useStyles from '../hooks/useStyles';

const MyComponent = () => {
  const { commonStyles, createStyles } = useStyles();
  
  const customStyles = createStyles({
    container: {
      ...commonStyles.container,
      backgroundColor: 'primary.main',
    },
  });
  
  return <Box sx={customStyles.container}>...</Box>;
};
```

## Zasady architektury

### 1. Single Responsibility Principle
Każdy komponent ma jedną odpowiedzialność:
- Komponenty UI: Tylko prezentacja
- Komponenty features: Logika biznesowa
- Layout: Struktura strony

### 2. DRY (Don't Repeat Yourself)
- Wspólne style w design tokens
- Reużywalne komponenty UI
- Centralne definicje tras

### 3. Separation of Concerns
- Stylowanie oddzielone od logiki
- Routing oddzielony od komponentów
- Typy oddzielone od implementacji

### 4. Consistency
- Spójne nazewnictwo
- Spójne style
- Spójna struktura plików

## Best Practices

### Stylowanie
1. **Używaj design tokens** zamiast hardkodowanych wartości
2. **Preferuj sx prop** dla prostych stylów
3. **Używaj styled-components** dla złożonych komponentów
4. **Unikaj inline styles**

### Komponenty
1. **Twórz reużywalne komponenty** dla często używanych elementów
2. **Używaj TypeScript** dla wszystkich props
3. **Dodawaj PropTypes** lub TypeScript interfaces
4. **Testuj komponenty** jednostkowo

### Routing
1. **Definiuj trasy centralnie** w `routes.ts`
2. **Używaj lazy loading** dla wszystkich komponentów
3. **Implementuj role-based access control**
4. **Obsługuj błędy** i loading states

### Performance
1. **Cache'uj motywy** i ciężkie obliczenia
2. **Używaj React.memo** dla komponentów
3. **Implementuj lazy loading** dla tras
4. **Optymalizuj bundle size**

## Migracja z starej architektury

### 1. Stylowanie
```typescript
// Stare
const styles = {
  padding: '16px',
  borderRadius: '8px',
};

// Nowe
const { commonStyles } = useStyles();
// lub
const styles = {
  padding: designTokens.spacing.lg,
  borderRadius: designTokens.borderRadius.lg,
};
```

### 2. Komponenty
```typescript
// Stare
<Button sx={{ backgroundColor: '#ff9800' }}>Zapisz</Button>

// Nowe
<Button variant="primary">Zapisz</Button>
```

### 3. Routing
```typescript
// Stare - inline w App.tsx
<Route path="/transfers" element={<TransferListPage />} />

// Nowe - centralnie zdefiniowane
// routes.ts
{ path: '/transfers', component: TransferListPage, title: 'Lista transferów' }
```

## Narzędzia deweloperskie

### ESLint
- Konfiguracja dla TypeScript i React
- Reguły dla spójności kodu

### Prettier
- Automatyczne formatowanie kodu
- Spójny styl w całym projekcie

### TypeScript
- Strict mode włączony
- Typy dla wszystkich komponentów
- Interfaces dla props

## Testowanie

### Struktura testów
```
src/
├── components/
│   └── __tests__/
│       └── ComponentName.test.tsx
└── hooks/
    └── __tests__/
        └── useHook.test.ts
```

### Narzędzia
- Jest + React Testing Library
- MSW dla mockowania API
- Storybook dla komponentów UI

## Deployment

### Build process
1. TypeScript compilation
2. Bundle optimization
3. Asset optimization
4. Environment configuration

### Environment variables
- `VITE_API_URL`: URL API
- `VITE_APP_NAME`: Nazwa aplikacji
- `VITE_ENVIRONMENT`: Środowisko (dev/prod)

## Monitoring i Analytics

### Error tracking
- Error boundaries w komponentach
- Global error handling
- Logging do external service

### Performance monitoring
- Bundle size analysis
- Runtime performance
- User experience metrics 