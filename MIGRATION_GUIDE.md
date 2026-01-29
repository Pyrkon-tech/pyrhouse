# Przewodnik migracji - PyrHouse Frontend

## Wprowadzenie

Ten przewodnik pomoże Ci zmigrować istniejący kod do nowej architektury. Każda sekcja zawiera konkretne przykłady zmian.

## 1. Migracja stylowania

### 1.1 Zastąpienie hardkodowanych wartości design tokens

**Przed:**
```typescript
// W komponencie
const styles = {
  padding: '16px',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  color: '#ff9800',
};
```

**Po:**
```typescript
import { designTokens } from '../theme/designTokens';

const styles = {
  padding: designTokens.spacing.lg,
  borderRadius: designTokens.borderRadius.lg,
  boxShadow: designTokens.shadows.md,
  color: designTokens.colors.primary[500],
};
```

### 1.2 Użycie hooka useStyles

**Przed:**
```typescript
const MyComponent = () => {
  return (
    <Box sx={{
      padding: 2,
      borderRadius: 2,
      backgroundColor: 'background.paper',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 4,
      }
    }}>
      Treść
    </Box>
  );
};
```

**Po:**
```typescript
import useStyles from '../hooks/useStyles';

const MyComponent = () => {
  const { commonStyles } = useStyles();
  
  return (
    <Box sx={{
      ...commonStyles.card,
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 4,
      }
    }}>
      Treść
    </Box>
  );
};
```

### 1.3 Migracja styled-components

**Przed:**
```typescript
const StyledButton = styled(Button)(({ theme }) => ({
  padding: '12px 24px',
  borderRadius: '8px',
  fontWeight: 600,
  backgroundColor: '#ff9800',
  color: '#ffffff',
  '&:hover': {
    backgroundColor: '#f57c00',
  }
}));
```

**Po:**
```typescript
import { Button } from '../components/ui/Button';

// Użyj gotowego komponentu
<Button variant="primary" size="md">
  Zapisz
</Button>

// Lub jeśli potrzebujesz custom styled component
const StyledButton = styled(Button)(({ theme }) => ({
  padding: designTokens.spacing.md + ' ' + designTokens.spacing.lg,
  borderRadius: designTokens.borderRadius.lg,
  fontWeight: designTokens.typography.fontWeight.semiBold,
  backgroundColor: designTokens.colors.primary[500],
  color: '#ffffff',
  '&:hover': {
    backgroundColor: designTokens.colors.primary[600],
  }
}));
```

## 2. Migracja komponentów

### 2.1 Zastąpienie Material-UI komponentów reużywalnymi

**Przed:**
```typescript
import { Button, Paper, Box } from '@mui/material';

const MyComponent = () => {
  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Button 
        variant="contained" 
        sx={{ 
          backgroundColor: '#ff9800',
          '&:hover': { backgroundColor: '#f57c00' }
        }}
      >
        Zapisz
      </Button>
    </Paper>
  );
};
```

**Po:**
```typescript
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const MyComponent = () => {
  return (
    <Card variant="default" padding="md">
      <Button variant="primary">
        Zapisz
      </Button>
    </Card>
  );
};
```

### 2.2 Migracja formularzy

**Przed:**
```typescript
const TransferForm = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <TextField
        fullWidth
        label="Nazwa"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          }
        }}
      />
      <Button
        variant="contained"
        sx={{
          py: 1.5,
          borderRadius: 2,
          fontWeight: 600,
        }}
      >
        Zapisz
      </Button>
    </Box>
  );
};
```

**Po:**
```typescript
import useStyles from '../hooks/useStyles';

const TransferForm = () => {
  const { commonStyles } = useStyles();
  
  return (
    <Box sx={commonStyles.transferForm}>
      <TextField
        fullWidth
        label="Nazwa"
        sx={commonStyles.formControl}
      />
      <Button variant="primary" size="md">
        Zapisz
      </Button>
    </Box>
  );
};
```

## 3. Migracja routingu

### 3.1 Dodanie nowej trasy

**Przed:**
```typescript
// W App.tsx
<Route path="/new-feature" element={
  <ErrorBoundary>
    <Suspense fallback={<LoadingSkeleton />}>
      <NewFeaturePage />
    </Suspense>
  </ErrorBoundary>
} />
```

**Po:**
```typescript
// W routes.ts
{
  path: '/new-feature',
  component: lazy(() => import('../components/features/NewFeaturePage')),
  title: 'Nowa funkcja',
  icon: 'NewFeature',
  showInNav: true,
}
```

### 3.2 Dodanie trasy z wymaganą rolą

**Przed:**
```typescript
// W App.tsx
<Route path="/admin/users" element={
  <RequireRole allowed={['admin']}>
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton />}>
        <UserManagementPage />
      </Suspense>
    </ErrorBoundary>
  </RequireRole>
} />
```

**Po:**
```typescript
// W routes.ts - dodaj do adminRoutes
{
  path: '/admin/users',
  component: lazy(() => import('../components/features/UserManagementPage')),
  title: 'Zarządzanie użytkownikami',
  icon: 'Users',
  showInNav: true,
  requiredRoles: ['admin'],
}
```

## 4. Migracja motywu

### 4.1 Użycie design tokens w motywie

**Przed:**
```typescript
// W theme.ts
const baseTheme: ThemeOptions = {
  palette: {
    primary: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
  },
  shape: {
    borderRadius: 8
  }
};
```

**Po:**
```typescript
// W theme.ts
import { designTokens } from './designTokens';

const createBaseTheme = (): ThemeOptions => ({
  palette: {
    primary: {
      main: designTokens.colors.primary[500],
      light: designTokens.colors.primary[400],
      dark: designTokens.colors.primary[600],
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: designTokens.typography.fontFamily.primary,
    h1: { 
      fontWeight: designTokens.typography.fontWeight.bold,
      fontSize: designTokens.typography.fontSize['4xl'],
    },
  },
  shape: {
    borderRadius: parseInt(designTokens.borderRadius.lg),
  },
});
```

## 5. Migracja komponentów z inline styles

### 5.1 Komponenty z sx prop

**Przed:**
```typescript
const QuestCard = () => {
  return (
    <Paper sx={{
      position: 'relative',
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(139, 69, 19, 0.1), rgba(160, 82, 45, 0.1))'
        : 'linear-gradient(135deg, rgba(255, 248, 220, 0.8), rgba(255, 235, 205, 0.8))',
      border: `2px solid ${theme.palette.mode === 'dark' ? '#8B4513' : '#DAA520'}`,
      borderRadius: 2,
      padding: 3,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 8,
      },
    }}>
      Treść
    </Paper>
  );
};
```

**Po:**
```typescript
import useStyles from '../hooks/useStyles';

const QuestCard = () => {
  const { commonStyles } = useStyles();
  
  return (
    <Paper sx={commonStyles.questCard}>
      Treść
    </Paper>
  );
};
```

### 5.2 Komponenty z styled-components

**Przed:**
```typescript
const StyledQuestItem = styled(Paper)(({ theme }) => ({
  position: 'relative',
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(139, 69, 19, 0.1), rgba(160, 82, 45, 0.1))'
    : 'linear-gradient(135deg, rgba(255, 248, 220, 0.8), rgba(255, 235, 205, 0.8))',
  border: `2px solid ${theme.palette.mode === 'dark' ? '#8B4513' : '#DAA520'}`,
  borderRadius: '6px',
  padding: theme.spacing(3),
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  }
}));
```

**Po:**
```typescript
import { Card } from '../components/ui/Card';

const QuestItem = () => {
  return (
    <Card 
      variant="interactive" 
      padding="lg" 
      hover
      sx={{
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(139, 69, 19, 0.1), rgba(160, 82, 45, 0.1))'
          : 'linear-gradient(135deg, rgba(255, 248, 220, 0.8), rgba(255, 235, 205, 0.8))',
        border: `2px solid ${theme.palette.mode === 'dark' ? '#8B4513' : '#DAA520'}`,
      }}
    >
      Treść
    </Card>
  );
};
```

## 6. Migracja layoutów

### 6.1 Użycie Container komponentu

**Przed:**
```typescript
const MyPage = () => {
  return (
    <Box sx={{
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: { xs: 2, sm: 3 },
    }}>
      Treść strony
    </Box>
  );
};
```

**Po:**
```typescript
import { Container } from '../components/layout/Container';

const MyPage = () => {
  return (
    <Container variant="default" padding="md">
      Treść strony
    </Container>
  );
};
```

## 7. Checklista migracji

### Dla każdego komponentu:

- [ ] Zastąp hardkodowane wartości design tokens
- [ ] Użyj reużywalnych komponentów UI gdzie to możliwe
- [ ] Zastąp inline styles sx prop lub useStyles hook
- [ ] Dodaj TypeScript interfaces dla props
- [ ] Przetestuj komponent po migracji

### Dla całego projektu:

- [ ] Zaktualizuj wszystkie importy
- [ ] Sprawdź czy wszystkie trasy są zdefiniowane w routes.ts
- [ ] Przetestuj wszystkie funkcjonalności
- [ ] Sprawdź responsywność
- [ ] Sprawdź dostępność (accessibility)
- [ ] Zaktualizuj dokumentację

## 8. Rozwiązywanie problemów

### Problem: Komponent nie renderuje się
**Rozwiązanie:** Sprawdź czy import jest poprawny i czy komponent jest eksportowany

### Problem: Style nie działają
**Rozwiązanie:** Sprawdź czy design tokens są poprawnie zaimportowane

### Problem: Routing nie działa
**Rozwiązanie:** Sprawdź czy trasa jest zdefiniowana w routes.ts i czy komponent jest lazy loaded

### Problem: TypeScript błędy
**Rozwiązanie:** Sprawdź czy wszystkie typy są poprawnie zdefiniowane

## 9. Przykłady gotowych komponentów

### Przykład komponentu po migracji:

```typescript
import React from 'react';
import { Typography, Box } from '@mui/material';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Container } from '../components/layout/Container';
import useStyles from '../hooks/useStyles';
import { designTokens } from '../theme/designTokens';

interface TransferCardProps {
  title: string;
  description: string;
  onEdit: () => void;
  onDelete: () => void;
}

const TransferCard: React.FC<TransferCardProps> = ({
  title,
  description,
  onEdit,
  onDelete,
}) => {
  const { commonStyles } = useStyles();

  return (
    <Container variant="narrow" padding="md">
      <Card variant="elevated" padding="lg" hover>
        <Typography 
          variant="h5" 
          sx={{ 
            marginBottom: designTokens.spacing.md,
            color: designTokens.colors.primary[500],
          }}
        >
          {title}
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            marginBottom: designTokens.spacing.lg,
            color: designTokens.colors.text.secondary,
          }}
        >
          {description}
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: designTokens.spacing.md,
          justifyContent: 'flex-end',
        }}>
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edytuj
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            Usuń
          </Button>
        </Box>
      </Card>
    </Container>
  );
};

export default TransferCard;
```

Ten przewodnik powinien pomóc Ci w bezpiecznej migracji do nowej architektury. Pamiętaj, aby migrować stopniowo i testować każdy krok. 