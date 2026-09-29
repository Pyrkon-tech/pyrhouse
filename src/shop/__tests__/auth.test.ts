import { beforeEach, describe, expect, it } from 'vitest';
import { codeChallenge, takePendingVerifier } from '../auth';
import { organizerStatus } from '../status';

describe('codeChallenge (PKCE S256)', () => {
  it('matches the RFC 7636 appendix B test vector', async () => {
    expect(await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});

describe('takePendingVerifier', () => {
  const store = (state: string, startedAt = Date.now()) =>
    sessionStorage.setItem('shop_login_pending', JSON.stringify({ state, verifier: 'v-123', startedAt }));

  beforeEach(() => sessionStorage.clear());

  it('returns the verifier for the matching state, once', () => {
    store('abc');
    expect(takePendingVerifier('abc')).toBe('v-123');
    expect(takePendingVerifier('abc')).toBeNull();
  });

  it('refuses a state from another login (forged callback)', () => {
    store('abc');
    expect(takePendingVerifier('evil')).toBeNull();
    expect(sessionStorage.getItem('shop_login_pending')).toBeNull();
  });

  it('refuses a callback without a login started in this browser', () => {
    expect(takePendingVerifier('abc')).toBeNull();
  });

  it('refuses a stale login', () => {
    store('abc', Date.now() - 20 * 60 * 1000);
    expect(takePendingVerifier('abc')).toBeNull();
  });
});

describe('organizerStatus', () => {
  it.each([
    [{ status: 'submitted', quest_status: null }, 'Czeka na potwierdzenie', 1],
    [{ status: 'confirmed', quest_status: 'pending' }, 'Potwierdzone', 2],
    [{ status: 'confirmed', quest_status: 'in_progress' }, 'W drodze', 3],
    [{ status: 'confirmed', quest_status: 'completed' }, 'Dostarczone', 4],
    [{ status: 'rejected', quest_status: null }, 'Odrzucone', 0],
    [{ status: 'cancelled', quest_status: null }, 'Anulowane', 0],
  ] as const)('%o', (order, label, step) => {
    const s = organizerStatus(order);
    expect(s.label).toBe(label);
    expect(s.step).toBe(step);
  });
});
