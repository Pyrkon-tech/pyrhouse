import { describe, expect, it } from 'vitest';
import { dayKey, fmtOrderDates, orderStatusView, warsawToISO } from '../shopFormat';
import type { ShopOrder } from '@pyrhouse/api';

describe('warsawToISO', () => {
  it('converts summer time (CEST, UTC+2)', () => {
    expect(warsawToISO('2027-07-15', '16:00')).toBe('2027-07-15T14:00:00.000Z');
  });

  it('converts winter time (CET, UTC+1)', () => {
    expect(warsawToISO('2027-01-15', '16:00')).toBe('2027-01-15T15:00:00.000Z');
  });

  it('handles midnight across the date boundary', () => {
    expect(warsawToISO('2027-07-16', '00:30')).toBe('2027-07-15T22:30:00.000Z');
  });
});

describe('dayKey', () => {
  it('uses the Warsaw calendar day, not UTC', () => {
    // 23:30 UTC on the 15th is already the 16th in Warsaw (summer)
    expect(dayKey('2027-07-15T23:30:00Z')).toBe('2027-07-16');
  });
});

describe('orderStatusView', () => {
  it.each([
    [{ status: 'submitted', quest_status: null }, 'Do potwierdzenia'],
    [{ status: 'confirmed', quest_status: 'pending' }, 'Potwierdzone'],
    [{ status: 'confirmed', quest_status: 'in_progress' }, 'W drodze'],
    [{ status: 'confirmed', quest_status: 'completed' }, 'Dostarczone'],
    [{ status: 'rejected', quest_status: null }, 'Odrzucone'],
    [{ status: 'cancelled', quest_status: null }, 'Anulowane'],
  ] as const)('%o → %s', (order, label) => {
    expect(orderStatusView(order).label).toBe(label);
  });
});

describe('fmtOrderDates', () => {
  const base = {
    delivery_window: { starts_at: '2027-07-15T14:00:00Z', ends_at: '2027-07-15T18:00:00Z' },
    return_window: { starts_at: '2027-07-18T16:00:00Z', ends_at: '2027-07-18T20:00:00Z' },
  } as ShopOrder;

  it('uses the return window day by default', () => {
    expect(fmtOrderDates({ ...base, return_date: null })).toMatch(/15\.07.*→.*18\.07/);
  });

  it('prefers the exact return date', () => {
    expect(fmtOrderDates({ ...base, return_date: '2027-07-19' })).toMatch(/→.*19\.07/);
  });
});
