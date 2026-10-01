import React, { useState } from 'react';
import { Alert, Box, Button, Divider, Paper, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Navigate, useLocation } from 'react-router-dom';
import logo from '@pyrhouse/ui/assets/p-logo.svg';
import { getInvite, startLogin } from '../auth';
import { useShopSession } from '../ShopSession';

const STEPS = ['Dodaj sprzęt do koszyka', 'Wskaż salę, termin dostawy i zwrotu', 'Śledź status, aż sprzęt do Ciebie dotrze'];

const GoogleIcon = () => (
  <Box component="svg" viewBox="0 0 48 48" sx={{ width: 20, height: 20 }} aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Box>
);

const LoginPage: React.FC = () => {
  const { account, loading, endedReason } = useShopSession();
  const location = useLocation();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>((location.state as { error?: string } | null)?.error ?? null);
  const hasInvite = !!getInvite();
  const blocked = endedReason === 'blocked' || (location.state as { code?: string } | null)?.code === 'account_inactive';

  if (!loading && account) return <Navigate to="/" replace />;

  const login = async () => {
    setStarting(true);
    try {
      await startLogin();
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, bgcolor: 'background.default' }}>
      <Box sx={{ p: { xs: 3, md: 9 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4, bgcolor: '#16213e', borderRight: { md: 1 }, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box component="img" src={logo} alt="PyrHouse" sx={{ width: 48, height: 48 }} />
          <Typography sx={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 22, color: '#fff' }}>PyrHouse · Sklep</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, maxWidth: 520 }}>
          <Typography component="h1" sx={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: { xs: 34, md: 52 }, lineHeight: 1.1, color: '#fff' }}>
            Sprzęt techniczny na&nbsp;Twoją salę
          </Typography>
          <Typography sx={{ fontSize: 18, lineHeight: 1.6, color: 'text.secondary' }}>
            Wybierz sprzęt, wskaż miejsce i termin — dział techniczny dostarczy go na miejsce i odbierze po wydarzeniu.
          </Typography>
          <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {STEPS.map((s, i) => (
              <Box component="li" key={s} sx={{ display: 'flex', gap: 1.75, alignItems: 'center' }}>
                <Box component="span" sx={{ width: 32, height: 32, borderRadius: 999, bgcolor: 'rgba(255,152,0,0.16)', color: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {i + 1}
                </Box>
                {s}
              </Box>
            ))}
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Dział techniczny Pyrkonu</Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 6 } }}>
        <Paper sx={{ width: '100%', maxWidth: 440, p: 5, borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography component="h2" sx={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 28 }}>Zaloguj się</Typography>

          {hasInvite && !blocked && (
            <Alert severity="info" icon={<LinkIcon />}>
              <strong>Masz zaproszenie.</strong> Zaloguj się dowolnym kontem Google — to konto zostanie przypisane do
              zaproszenia. Link działa jeden raz.
            </Alert>
          )}
          {blocked && (
            <Alert severity="error" icon={<LockOutlinedIcon />}>
              <strong>Dostęp wyłączony.</strong> Twoje konto w sklepie jest nieaktywne. Skontaktuj się z koordynatorem
              działu technicznego.
            </Alert>
          )}
          {error && !blocked && <Alert severity="error">{error}</Alert>}
          {endedReason && endedReason !== 'blocked' && <Alert severity="warning">{endedReason}</Alert>}

          <Button
            variant="contained"
            size="large"
            onClick={login}
            disabled={starting}
            startIcon={<GoogleIcon />}
            // Google's sign-in button is white; the theme's gradient would override bgcolor
            sx={{ height: 48, background: '#fff', color: '#1f1f1f', boxShadow: 'none', '&:hover': { background: '#f1f1f1', boxShadow: 'none' } }}
          >
            Zaloguj się kontem Google
          </Button>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {hasInvite
              ? 'Po zalogowaniu od razu zobaczysz katalog. Zaproszenie jest ważne 48 godzin.'
              : 'Dostęp mają organizatorzy z kontem @pyrkon.pl oraz osoby zaproszone przez dział techniczny.'}
          </Typography>
          <Divider />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Nie masz konta w domenie pyrkon.pl? Poproś koordynatora o link z zaproszeniem. To nie jest logowanie do
            magazynu PyrHouse.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default LoginPage;
