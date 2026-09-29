import React, { useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShopApiError, shopApi } from '../api';
import { callbackUrl, clearInvite, getInvite, takePendingVerifier } from '../auth';
import { useShopSession } from '../ShopSession';

/** /auth/google/callback: checks state, exchanges the code with the PKCE verifier, signs in. */
const CallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useShopSession();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // the code is single-use; StrictMode would run this twice
    ran.current = true;

    const fail = (error: string, code?: string) => navigate('/login', { replace: true, state: { error, code } });
    const code = params.get('code');
    if (params.get('error') || !code) {
      fail('Logowanie przez Google zostało przerwane.');
      return;
    }
    const verifier = takePendingVerifier(params.get('state'));
    if (!verifier) {
      fail('Logowanie nie zostało rozpoczęte w tej przeglądarce albo trwało za długo — spróbuj ponownie.');
      return;
    }

    shopApi
      .login({ code, redirect_uri: callbackUrl(), code_verifier: verifier, invite_token: getInvite() ?? undefined })
      .then(({ token, account }) => {
        clearInvite();
        signIn(token, account);
        navigate('/', { replace: true });
      })
      .catch((err: ShopApiError) => {
        // A used or expired invite stays useless; drop it so the login page stops announcing it.
        if (err.code === 'invite_invalid') clearInvite();
        fail(err.message, err.code);
      });
  }, [params, navigate, signIn]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <CircularProgress />
      <Typography sx={{ color: 'text.secondary' }}>Logowanie…</Typography>
    </Box>
  );
};

export default CallbackPage;
