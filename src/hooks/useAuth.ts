/**
 * Thin wrapper around AuthContext — keeps the original `useAuth()` API
 * ({ isAuthenticated, userRole, userId, checkToken, handleLogout }) so the
 * 16 existing consumers don't need changes. State and the validation interval
 * live once in AuthProvider instead of per-consumer.
 */

import { useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const auth = useAuthContext();
  const { checkToken } = auth;

  // Re-validate on consumer mount so a freshly stored token (after login)
  // is picked up immediately instead of waiting for the next interval tick.
  useEffect(() => {
    checkToken();
  }, [checkToken]);

  return auth;
};
