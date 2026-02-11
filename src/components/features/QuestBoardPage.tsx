import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  Button,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from '@mui/material';
import { AccessTime, LocationOn, AddCircleOutline } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useStorage } from '../../hooks/useStorage';
import { getApiUrl } from '../../config/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import LoadingSkeleton from '../ui/LoadingSkeleton';
import { designTokens } from '../../theme/designTokens';

// Quest theme colors for easier reference
const questColors = designTokens.colors.questTheme;

interface Quest {
  recipient: string;
  delivery_date: string;
  location: string;
  pavilion: string;
  items: Array<{
    item_name: string;
    quantity: number;
    notes: string;
  }>;
}

const QuestCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  background: `linear-gradient(145deg, ${questColors.parchment.medium}, ${questColors.parchment.dark})`,
  border: `2px solid ${questColors.ink.primary}`,
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url("/parchment-texture.png")',
    opacity: 0.1,
    pointerEvents: 'none',
  },
  '&:hover': {
    transform: 'translateY(-4px)',
    transition: 'transform 0.2s ease-in-out',
  }
}));

// Nowy komponent dla pilnych zadań
const UrgentQuestCard = styled(QuestCard)(() => ({
  background: questColors.urgent.gradient,
  border: `2px solid ${questColors.urgent.background}`,
  boxShadow: '0 4px 12px rgba(164, 70, 45, 0.5)',
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 4px 12px rgba(164, 70, 45, 0.5)',
    },
    '50%': {
      boxShadow: '0 4px 20px rgba(164, 70, 45, 0.8)',
    },
    '100%': {
      boxShadow: '0 4px 12px rgba(164, 70, 45, 0.5)',
    },
  }
}));

// Komponent dla znacznika pilności
const UrgencyBadge = styled(Box)(() => ({
  position: 'absolute',
  top: -10,
  right: 60,
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '0.8rem',
  fontWeight: 'bold',
  color: '#fff',
  backgroundColor: questColors.urgent.background,
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&::before': {
    content: '"!"',
    marginRight: '2px',
  }
}));

const DifficultyBadge = styled(Box)<{ difficulty: string }>(({ difficulty }) => ({
  position: 'absolute',
  top: -10,
  right: -10,
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '0.8rem',
  fontWeight: 'bold',
  color: '#fff',
  backgroundColor:
    difficulty === 'easy' ? designTokens.colors.success.main :
    difficulty === 'medium' ? designTokens.colors.accent[500] :
    designTokens.colors.error.main,
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
}));

const CountdownTimer: React.FC<{ deadline: string }> = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalHours: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const difference = deadlineDate.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        const totalHours = days * 24 + hours + minutes / 60;

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          totalHours
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0 });
      }
    };

    // Oblicz czas od razu
    calculateTimeLeft();

    // Aktualizuj co sekundę
    const timer = setInterval(calculateTimeLeft, 1000);

    // Wyczyść interval przy odmontowaniu komponentu
    return () => clearInterval(timer);
  }, [deadline]);

  // Określ kolor na podstawie pozostałego czasu
  const getTimerColor = () => {
    if (timeLeft.totalHours < 1) return questColors.urgent.background; // Czerwony dla mniej niż godziny
    if (timeLeft.days < 1) return designTokens.colors.accent[500]; // Pomarańczowy dla mniej niż dnia
    return questColors.ink.primary; // Standardowy kolor
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1,
      color: getTimerColor(),
      fontFamily: '"Cinzel", serif'
    }}>
      <AccessTime sx={{ fontSize: '1.2rem' }} />
      <Typography variant="h6" sx={{ fontFamily: 'inherit' }}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {timeLeft.hours.toString().padStart(2, '0')}:
        {timeLeft.minutes.toString().padStart(2, '0')}:
        {timeLeft.seconds.toString().padStart(2, '0')}
      </Typography>
    </Box>
  );
};

const QuestBoardPage: React.FC = () => {
  const { getToken } = useStorage();
  const { userRole } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'delivered'>('active');
  const [showAdminInfo, setShowAdminInfo] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  // Funkcja sprawdzająca, czy użytkownik ma uprawnienia administratora
  const hasAdminAccess = () => {
    return userRole === 'admin' || userRole === 'moderator';
  };

  // Automatyczne zamykanie informacji dla administratorów po 5 sekundach
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedQuestBoard');
    if (!hasVisited) {
      setShowAdminInfo(true);
      localStorage.setItem('hasVisitedQuestBoard', 'true');
    }
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    if (status === 'delivered') {
      setActiveTab('delivered');
    }
  }, [location]);

  useEffect(() => {
    fetchQuests();
  }, [activeTab]);

  useEffect(() => {
    if (error) {
      showSnackbar('error', error);
    }
  }, [error]);

  const fetchQuests = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const url = activeTab === 'delivered' 
        ? getApiUrl('/sheets/quests?status=delivered')
        : getApiUrl('/sheets/quests');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Nie udało się pobrać questów');
      }

      const data = await response.json();
      setQuests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas pobierania questów');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'active' | 'delivered') => {
    setActiveTab(newValue);
    const searchParams = new URLSearchParams(location.search);
    if (newValue === 'delivered') {
      searchParams.set('status', 'delivered');
    } else {
      searchParams.delete('status');
    }
    navigate({ search: searchParams.toString() });
  };

  const handleCreateTransfer = (quest: Quest) => {
    // Przekazujemy dane questa jako parametry URL
    navigate('/transfers/create', { 
      state: { 
        questData: {
          recipient: quest.recipient,
          deliveryDate: quest.delivery_date,
          location: quest.location,
          pavilion: quest.pavilion,
          items: quest.items
        }
      } 
    });
  };

  // Funkcja określająca poziom trudności na podstawie liczby przedmiotów
  const determineDifficulty = (items: Quest['items']): 'easy' | 'medium' | 'hard' => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems <= 2) return 'easy';
    if (totalItems <= 5) return 'medium';
    return 'hard';
  };

  // Funkcja formatująca datę
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Funkcja sprawdzająca, czy zadanie jest pilne (mniej niż 3 dni)
  const isUrgent = (deadline: string): boolean => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const difference = deadlineDate.getTime() - now.getTime();
    const daysLeft = difference / (1000 * 60 * 60 * 24);
    return daysLeft < 3 && daysLeft > 0;
  };

  // Sortowanie zadań po dacie dostawy
  const sortedQuests = [...quests].sort((a, b) => 
    new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <LoadingSkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <AppSnackbar
          open={snackbar.open}
          type={snackbar.type}
          message={snackbar.message}
          details={snackbar.details}
          onClose={closeSnackbar}
          autoHideDuration={snackbar.autoHideDuration}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 4, 
      minHeight: '100vh',
      background: '#171713',
      backgroundImage: 'url("/wooden-texture.png")',
      backgroundBlend: 'multiply'
    }}>
      <Container maxWidth="lg">
        <Typography
          variant="h2"
          gutterBottom
          sx={{
            textAlign: 'center',
            fontFamily: '"Cinzel", serif',
            color: questColors.parchment.medium,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            mb: 6
          }}
        >
          📜 Tablica Zadań 📜
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            centered
            sx={{
              '& .MuiTab-root': {
                color: questColors.parchment.medium,
                '&.Mui-selected': {
                  color: questColors.urgent.background,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: questColors.urgent.background,
              },
            }}
          >
            <Tab label="Aktywne Questy" value="active" />
            <Tab label="Dostarczone Questy" value="delivered" />
          </Tabs>
        </Box>

        {hasAdminAccess() && (
          <Snackbar
            open={showAdminInfo}
            autoHideDuration={3000}
            onClose={() => setShowAdminInfo(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert
              onClose={() => setShowAdminInfo(false)}
              severity="info"
              sx={{
                backgroundColor: questColors.ink.primary,
                color: questColors.parchment.medium,
                '& .MuiAlert-icon': {
                  color: questColors.parchment.medium
                },
                '& .MuiAlert-action': {
                  color: questColors.parchment.medium
                }
              }}
            >
              <Typography variant="subtitle1" sx={{ fontFamily: '"Cinzel", serif', mb: 1 }}>
                Informacja dla administratorów
              </Typography>
              <Typography variant="body2">
                Lista questów jest aktualizowana z excela. Po utworzeniu transferu dla questa, musisz ręcznie oznaczyć go jako dostarczony w excelu.
              </Typography>
            </Alert>
          </Snackbar>
        )}

        <Grid container spacing={4}>
          {sortedQuests.map((quest, index) => {
            const urgent = isUrgent(quest.delivery_date);
            const difficulty = determineDifficulty(quest.items);
            const CardComponent = urgent ? UrgentQuestCard : QuestCard;
            
            return (
              <Grid item xs={12} md={6} key={index}>
                <CardComponent elevation={3}>
                  <DifficultyBadge difficulty={difficulty}>
                    {difficulty.toUpperCase()}
                  </DifficultyBadge>
                  
                  {urgent && (
                    <UrgencyBadge>
                      PILNE
                    </UrgencyBadge>
                  )}
                  
                  <Typography
                    variant="h5"
                    sx={{
                      fontFamily: '"Cinzel", serif',
                      color: questColors.ink.primary,
                      borderBottom: `2px solid ${questColors.ink.primary}`,
                      pb: 1,
                      mb: 2
                    }}
                  >
                    Zlecenie dla: {quest.recipient}
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <CountdownTimer deadline={quest.delivery_date} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: questColors.ink.primary,
                        fontStyle: 'italic',
                        fontSize: '0.9rem'
                      }}
                    >
                      Termin dostawy: {formatDate(quest.delivery_date)}
                    </Typography>
                  </Box>

                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 2,
                    color: questColors.ink.primary,
                    backgroundColor: `${questColors.parchment.medium}4d`,
                    p: 1,
                    borderRadius: '4px',
                    border: `1px dashed ${questColors.urgent.background}`
                  }}>
                    <LocationOn sx={{ color: questColors.urgent.background }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {quest.location} - {quest.pavilion}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: questColors.ink.primary,
                        fontFamily: '"Cinzel", serif',
                        mb: 1
                      }}
                    >
                      Wymagane przedmioty:
                    </Typography>
                    <Box component="ul" sx={{ 
                      m: 0, 
                      pl: 2,
                      listStyle: 'none'
                    }}>
                      {quest.items.map((item, idx) => (
                        <Box
                          component="li"
                          key={idx}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 1,
                            color: questColors.ink.primary,
                            '&::before': {
                              content: '"•"',
                              color: questColors.urgent.background,
                              fontWeight: 'bold',
                              fontSize: '1.2rem'
                            }
                          }}
                        >
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {item.quantity}x {item.item_name}
                            {item.notes && (
                              <Typography
                                component="span"
                                sx={{
                                  ml: 1,
                                  fontSize: '0.9rem',
                                  fontStyle: 'italic',
                                  color: questColors.urgent.background
                                }}
                              >
                                ({item.notes})
                              </Typography>
                            )}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddCircleOutline />}
                    onClick={() => handleCreateTransfer(quest)}
                    sx={{
                      mt: 3,
                      width: '100%',
                      backgroundColor: questColors.ink.primary,
                      '&:hover': {
                        backgroundColor: questColors.urgent.background,
                      }
                    }}
                  >
                    Rozpocznij Quest
                  </Button>
                </CardComponent>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
};

export default QuestBoardPage;
