import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../../context/AuthContext';

// Builds an unsigned JWT with the given payload (jwt-decode only parses, no verification)
function makeToken(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.sig`;
}

const futureExp = () => Math.floor(Date.now() / 1000) + 60 * 60; // +1h
const nearExp = () => Math.floor(Date.now() / 1000) + 60; // +1min — inside the 5min safety margin

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
);

describe('useAuth (AuthContext)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('exposes decoded role and userId for a valid token', async () => {
    localStorage.setItem('token', makeToken({ role: 'admin', userID: 7, exp: futureExp() }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.userRole).toBe('admin');
    expect(result.current.userId).toBe(7);
  });

  it('is unauthenticated without a token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    expect(result.current.userRole).toBeNull();
    expect(result.current.userId).toBeNull();
  });

  it('treats a token expiring within the 5-minute safety margin as invalid', async () => {
    localStorage.setItem('token', makeToken({ role: 'user', userID: 1, exp: nearExp() }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  });

  it('treats a malformed token as invalid', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('token', 'not-a-jwt');

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  });

  it('handleLogout clears the token and auth state', async () => {
    localStorage.setItem('token', makeToken({ role: 'admin', userID: 7, exp: futureExp() }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.handleLogout());

    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userRole).toBeNull();
  });

  it('shares one auth state between multiple consumers', async () => {
    localStorage.setItem('token', makeToken({ role: 'moderator', userID: 3, exp: futureExp() }));

    const { result } = renderHook(() => ({ a: useAuth(), b: useAuth() }), { wrapper });

    await waitFor(() => expect(result.current.a.isAuthenticated).toBe(true));
    expect(result.current.b.userRole).toBe('moderator');

    act(() => result.current.a.handleLogout());
    expect(result.current.b.isAuthenticated).toBe(false);
  });

  it('checkToken picks up a freshly stored token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));

    localStorage.setItem('token', makeToken({ role: 'user', userID: 11, exp: futureExp() }));
    act(() => {
      result.current.checkToken();
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.userId).toBe(11);
  });
});
