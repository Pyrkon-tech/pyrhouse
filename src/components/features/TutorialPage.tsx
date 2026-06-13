import React, { useState, useMemo, lazy, Suspense } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  useTheme,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Dynamiczne importy ikon MUI
const Search = lazy(() => import('@mui/icons-material/Search'));
const RocketLaunch = lazy(() => import('@mui/icons-material/RocketLaunch'));
const MyLocation = lazy(() => import('@mui/icons-material/MyLocation'));
const Info = lazy(() => import('@mui/icons-material/Info'));
const MapIcon = lazy(() => import('@mui/icons-material/Map'));
const Navigation = lazy(() => import('@mui/icons-material/Navigation'));
const GpsFixed = lazy(() => import('@mui/icons-material/GpsFixed'));
const HistoryIcon = lazy(() => import('@mui/icons-material/History'));
const HomeIcon = lazy(() => import('@mui/icons-material/Home'));
const AccountCircle = lazy(() => import('@mui/icons-material/AccountCircle'));
const Update = lazy(() => import('@mui/icons-material/Update'));
const LocationOn = lazy(() => import('@mui/icons-material/LocationOn'));
const AddTask = lazy(() => import('@mui/icons-material/AddTask'));
const Inventory = lazy(() => import('@mui/icons-material/Inventory'));
const ListAlt = lazy(() => import('@mui/icons-material/ListAlt'));
const ArrowBack = lazy(() => import('@mui/icons-material/ArrowBack'));
const Check = lazy(() => import('@mui/icons-material/Check'));
const ArrowForward = lazy(() => import('@mui/icons-material/ArrowForward'));
const Close = lazy(() => import('@mui/icons-material/Close'));
const QrCodeScanner = lazy(() => import('@mui/icons-material/QrCodeScanner'));

// Przenosimy dane kroków poza komponent, aby nie były odtwarzane przy każdym renderowaniu
const TUTORIAL_STEPS = [
  {
    label: 'Wyszukiwanie sprzętu',
    description: 'Użyj pola wyszukiwania na stronie głównej, aby znaleźć sprzęt po kodzie PYR. Wpisz kod lub jego fragment, a system podpowie Ci dostępne opcje.',
    icon: <Suspense fallback={null}><Search /></Suspense>,
    action: '/home',
  },
  {
    label: 'Tworzenie questów-dostaw',
    description: 'Utwórz nową dostawę, aby zorganizować transport sprzętu między lokalizacjami. Możesz dodać wiele przedmiotów i określić kto bierze udział w dostawie. Pamiętaj o wybraniu lokalizacji docelowej i uczestników questa.',
    icon: <Suspense fallback={null}><RocketLaunch /></Suspense>,
    action: '/transfers/create',
  },
  {
    label: 'Zarządzanie dostawą',
    description: (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Jako uczestnik questa masz dostęp do wielu funkcji ułatwiających zarządzanie dostawą:
        </Typography>
        
        <Stack spacing={2}>
          {/* Sekcja Aktualizacji Lokalizacji */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Suspense fallback={null}><MyLocation /></Suspense>
              <Typography variant="subtitle2" fontWeight="600">
                Aktualizacja Lokalizacji
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              W szczegółach transferu użyj przycisku "Aktualizuj lokalizację" aby zaznaczyć aktualną pozycję sprzętu na mapie.
            </Typography>
            <Paper 
              elevation={0} 
              sx={{ 
                mt: 1.5, 
                mb: 1.5, 
                p: 1.5, 
                bgcolor: 'info.lighter',
                border: '1px solid',
                borderColor: 'info.light',
                borderRadius: 1
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Suspense fallback={null}><Info /></Suspense>
                <Typography variant="body2">
                  System może poprosić o dostęp do Twojej lokalizacji - pomoże to w dokładniejszym określeniu pozycji sprzętu. Nie martw się, nie zbieramy ani nie przechowujemy tych danych.
                </Typography>
              </Stack>
            </Paper>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip 
                icon={<Suspense fallback={null}><MapIcon /></Suspense>} 
                label="Mapa" 
                size="small" 
                variant="outlined" 
              />
              <Chip 
                icon={<Suspense fallback={null}><Navigation /></Suspense>} 
                label="GPS" 
                size="small" 
                variant="outlined" 
              />
              <Chip 
                icon={<Suspense fallback={null}><GpsFixed /></Suspense>} 
                label="Lokalizacja" 
                size="small" 
                variant="outlined" 
              />
            </Stack>
          </Paper>

          {/* Sekcja Śledzenia Dostaw */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Suspense fallback={null}><HistoryIcon /></Suspense>
              <Typography variant="subtitle2" fontWeight="600">
                Śledzenie Dostaw
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Monitoruj swoje aktywne questy w dwóch wygodnych miejscach:
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Suspense fallback={null}><HomeIcon /></Suspense>
                <Typography variant="body2">
                  Strona główna - szybki podgląd bieżących questów
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Suspense fallback={null}><AccountCircle /></Suspense>
                <Typography variant="body2">
                  "Mój profil" w górnym pasku - pełna lista Twoich questów
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Sekcja Historii */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Suspense fallback={null}><Update /></Suspense>
              <Typography variant="subtitle2" fontWeight="600">
                Historia i Status
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Śledź historię lokalizacji i postęp dostawy w czasie rzeczywistym. System automatycznie zapisuje wszystkie aktualizacje i zmiany statusu.
            </Typography>
          </Paper>
        </Stack>
      </Box>
    ),
    icon: <Suspense fallback={null}><LocationOn /></Suspense>,
    action: '/transfers',
  },
  {
    label: 'Skanowanie kodów kreskowych',
    description: (
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Skanuj kody kreskowe sprzętu, aby błyskawicznie wyszukać lub uzupełnić dane:
        </Typography>
        <ul>
          <li>
            <b>Wyszukiwanie sprzętu:</b> Na stronie głównej kliknij "Skanuj" (na telefonie), zeskanuj kod – system przekieruje Cię do szczegółów sprzętu.
          </li>
          <li>
            <b>Uzupełnianie numeru seryjnego:</b> W szczegółach sprzętu kliknij "Uzupełnij", zeskanuj kod i zatwierdź.
          </li>
        </ul>
        <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
          Tryb "Wybuchło – bez numeru seryjnego" jest awaryjny! Sprzęt dodany w ten sposób wymaga późniejszego uzupełnienia numeru seryjnego przez skanowanie lub ręcznie.
        </Typography>
      </Box>
    ),
    icon: <Suspense fallback={null}><QrCodeScanner /></Suspense>,
    action: '/home',
  },
  {
    label: 'Dodawanie nowego sprzętu',
    description: (
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Dodaj nowy sprzęt do systemu skanując jego numer seryjny lub wpisując go ręcznie. System automatycznie generuje PYRcode. Możesz dodać wiele przedmiotów naraz.
        </Typography>
        <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
          Jeśli nie masz numeru seryjnego (np. sprzęt "wybuchł" lub jest awaria), użyj trybu awaryjnego "Dodaj sprzęt bez numeru seryjnego". Taki sprzęt będzie wymagał późniejszego uzupełnienia serialu w szczegółach sprzętu (np. przez skanowanie).
        </Typography>
      </Box>
    ),
    icon: <Suspense fallback={null}><AddTask /></Suspense>,
    action: '/add-item',
  },
  {
    label: 'Zarządzanie magazynem',
    description: 'Przeglądaj stan magazynowy, sprawdzaj dostępność sprzętu i zarządzaj jego lokalizacjami. Możesz filtrować sprzęt po kategorii i lokalizacji.',
    icon: <Suspense fallback={null}><Inventory /></Suspense>,
    action: '/list',
  },
  {
    label: 'Przeglądanie questów',
    description: 'Sprawdź wszystkie aktywne i zakończone dostawy, ich status i szczegóły. W szczegółach questa zobaczysz historię lokalizacji sprzętu, co pomoże Ci śledzić przebieg dostawy.',
    icon: <Suspense fallback={null}><ListAlt /></Suspense>,
    action: '/transfers',
  },
  {
    label: 'Service Desk i zgłaszanie problemów',
    description: (
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Jeśli napotkasz problem techniczny, awarię sprzętu lub potrzebujesz wsparcia – skorzystaj z modułu <b>Service Desk</b>.
        </Typography>
        <ul>
          <li>
            <b>Panel Service Desk (dla zalogowanych):</b> Możesz przeglądać zgłoszenia, filtrować je po statusie (<b>Nowe</b>, <b>W trakcie</b>, <b>Zablokowane</b>, <b>Rozwiązane</b>, <b>Zamknięte</b>), wyszukiwać po tytule, opisie lub lokalizacji oraz dodawać nowe zgłoszenia przez dedykowany formularz.
          </li>
          <li>
            <b>Workflow zgłoszenia:</b> Każde zgłoszenie przechodzi przez statusy: <i>Nowe</i> → <i>W trakcie</i> → <i>Zablokowane</i> → <i>Rozwiązane</i> → <i>Zamknięte</i>. Możesz śledzić postęp i historię zgłoszenia. <b>Status "Zablokowane" zastępuje dawny "Oczekuje".</b>
          </li>
          <li>
            <b>Uprawnienia do zmiany statusu:</b> <span style={{ color: '#1976d2', fontWeight: 600 }}>Tylko użytkownicy z rolą <b>moderator</b> lub <b>admin</b> mogą zmieniać status zgłoszenia</span>. Pozostali widzą status jako nieedytowalny.
          </li>
          <li>
            <b>Publiczny formularz zgłaszania problemów:</b> Jeśli nie masz konta lub jesteś uczestnikiem/prelegentem, możesz zgłosić problem bez logowania przez publiczny formularz: <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>/servicedesk/request</Box>. Po wysłaniu zgłoszenia zobaczysz czytelny ekran potwierdzenia.
          </li>
        </ul>
      </Box>
    ),
    icon: <Suspense fallback={null}><ListAlt /></Suspense>,
    action: '/servicedesk',
  },
];

// Wydzielamy komponenty, aby zmniejszyć złożoność głównego komponentu
interface StepNavigationProps {
  activeStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

const StepNavigation: React.FC<StepNavigationProps> = ({ activeStep, totalSteps, onBack, onNext, onSkip }) => (
  <Box sx={{ display: 'flex', gap: 2 }}>
    <Button
      disabled={activeStep === 0}
      onClick={onBack}
      startIcon={<Suspense fallback={null}><ArrowBack /></Suspense>}
    >
      Wstecz
    </Button>
    <Button
      variant="contained"
      onClick={activeStep === totalSteps - 1 ? onSkip : onNext}
      endIcon={activeStep === totalSteps - 1 ? <Suspense fallback={null}><Check /></Suspense> : <Suspense fallback={null}><ArrowForward /></Suspense>}
    >
      {activeStep === totalSteps - 1 ? 'Koniec' : 'Dalej'}
    </Button>
  </Box>
);

const TutorialPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();
  const navigate = useNavigate();

  const currentStep = useMemo(() => TUTORIAL_STEPS[activeStep], [activeStep]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSkip = () => {
    navigate('/home');
  };

  const handleStepClick = (index: number) => {
    setActiveStep(index);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 4 },
          borderRadius: 2,
          background: theme.palette.background.paper,
        }}
      >
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Przewodnik po systemie
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleSkip}
            startIcon={<Suspense fallback={null}><Close /></Suspense>}
          >
            Zamknij przewodnik
          </Button>
        </Box>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                background: theme.palette.background.default,
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Stepper activeStep={activeStep} orientation="vertical">
                  {TUTORIAL_STEPS.map((step, index) => (
                    <Step key={step.label}>
                      <StepLabel
                        StepIconProps={{
                          icon: step.icon,
                        }}
                        onClick={() => handleStepClick(index)}
                        sx={{
                          cursor: 'pointer',
                          '& .MuiStepLabel-label': {
                            typography: 'body1',
                            fontWeight: activeStep === index ? 600 : 400,
                          },
                        }}
                      >
                        {step.label}
                      </StepLabel>
                      <StepContent>
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="contained"
                            onClick={() => navigate(step.action)}
                            endIcon={<Suspense fallback={null}><ArrowForward /></Suspense>}
                            fullWidth
                            sx={{ 
                              py: 1,
                              borderRadius: 1.5,
                              boxShadow: 'none',
                              '&:hover': {
                                boxShadow: 1
                              }
                            }}
                          >
                            Wypróbuj
                          </Button>
                        </Box>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: 4,
                background: theme.palette.background.default,
                borderRadius: 2,
              }}
            >
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  {currentStep.icon}
                  {currentStep.label}
                </Typography>
                <Box sx={{ mt: 3 }}>
                  {currentStep.description}
                </Box>
              </Box>

              <Box sx={{ mt: 'auto', pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
                <StepNavigation 
                  activeStep={activeStep} 
                  totalSteps={TUTORIAL_STEPS.length} 
                  onBack={handleBack} 
                  onNext={handleNext} 
                  onSkip={handleSkip}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default TutorialPage; 