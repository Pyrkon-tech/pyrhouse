/**
 * Central auth context — single source of truth for the authenticated user.
 *
 * Replaces the previous pattern where every `useAuth()` consumer kept its own
 * copy of the auth state and its own 60s token-validation interval. The provider
 * decodes the JWT once, exposes the result, and re-validates on a single interval.
 *
 * The provider deliberately does NOT navigate on an invalid/expired token —
 * redirecting is the job of `PrivateRoute`, so public routes (login, OAuth
 * callbacks, public service desk form) are unaffected. `handleLogout` (explicit,
 * user-initiated) is the only place that navigates.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useStorage } from '../hooks/useStorage';

interface JwtPayload {
  role: string;
  exp: number;
  userID: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  userId: number | null;
  /** Re-validates the stored token and refreshes the context state. Returns validity. */
  checkToken: () => boolean;
  /** Clears the token, resets auth state and navigates to /login. */
  handleLogout: () => void;
}

// Token is treated as invalid 5 minutes before its actual expiry
const SAFETY_MARGIN = 5 * 60;
const CHECK_INTERVAL_MS = 60_000;

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { getToken, removeToken } = useStorage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  const clearAuthState = useCallback(() => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
  }, []);

  const checkToken = useCallback((): boolean => {
    const token = getToken();
    if (!token) {
      clearAuthState();
      return false;
    }

    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;

      if (decodedToken.exp < currentTime + SAFETY_MARGIN) {
        clearAuthState();
        return false;
      }

      setIsAuthenticated(true);
      setUserRole(decodedToken.role);
      setUserId(decodedToken.userID);
      return true;
    } catch (error) {
      console.error('Błąd dekodowania tokenu:', error);
      clearAuthState();
      return false;
    }
  }, [getToken, clearAuthState]);

  const handleLogout = useCallback(() => {
    removeToken();
    clearAuthState();
    navigate('/login');
  }, [navigate, removeToken, clearAuthState]);

  useEffect(() => {
    checkToken();
    const interval = setInterval(checkToken, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkToken]);

  const value = useMemo(
    () => ({ isAuthenticated, userRole, userId, checkToken, handleLogout }),
    [isAuthenticated, userRole, userId, checkToken, handleLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
