import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken, setUnauthorizedHandler, shopApi } from './api';
import type { ShopAccount, ShopConfig } from '@pyrhouse/api';

interface Session {
  account: ShopAccount | null;
  config: ShopConfig | null;
  /** True until the stored token has been checked */
  loading: boolean;
  /** Why the last session ended (blocked account, expired token) — shown on the login page */
  endedReason: string | null;
  signIn: (token: string, account: ShopAccount) => void;
  signOut: (reason?: string) => void;
  refreshConfig: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);


export const ShopSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<ShopAccount | null>(null);
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [endedReason, setEndedReason] = useState<string | null>(null);

  const signOut = useCallback((reason?: string) => {
    setToken(null);
    setAccount(null);
    setConfig(null);
    setEndedReason(reason ?? null);
  }, []);

  const refreshConfig = useCallback(async () => {
    setConfig(await shopApi.config());
  }, []);

  const signIn = useCallback((token: string, acc: ShopAccount) => {
    setToken(token);
    setAccount(acc);
    setEndedReason(null);
    shopApi.config().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => signOut('Sesja wygasła — zaloguj się ponownie.'));
  }, [signOut]);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    Promise.all([shopApi.me(), shopApi.config()])
      .then(([me, cfg]) => {
        setAccount(me);
        setConfig(cfg);
      })
      .catch((err: { code?: string }) => {
        signOut(err.code === 'account_inactive' ? 'blocked' : undefined);
      })
      .finally(() => setLoading(false));
  }, [signOut]);

  const value = useMemo(
    () => ({ account, config, loading, endedReason, signIn, signOut, refreshConfig }),
    [account, config, loading, endedReason, signIn, signOut, refreshConfig],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useShopSession = (): Session => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useShopSession outside ShopSessionProvider');
  return ctx;
};
