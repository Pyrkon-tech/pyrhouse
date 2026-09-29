/**
 * Formatting shared by the organizer shop and the warehouse shop panel.
 * Dates are Europe/Warsaw calendar days and times, whatever the viewer's time zone.
 */
import type { ShopLocation, ShopOrder, ShopWindow } from '../types/shop.types';

// Windows and return days are Polish calendar days, whatever the viewer's time zone.
const TZ = 'Europe/Warsaw';

const dayFmt = new Intl.DateTimeFormat('pl-PL', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('pl-PL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat('pl-PL', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const moneyFmt = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

export const fmtMoney = (v: number | null | undefined): string => (v == null ? '—' : moneyFmt.format(v));

/** "czw., 15.07" */
export const fmtDay = (iso: string): string => dayFmt.format(new Date(iso));

/** "15.07, 16:00" */
export const fmtDateTime = (iso: string | null | undefined): string => (iso ? dateTimeFmt.format(new Date(iso)) : '—');

/** "czw., 15.07 · 16:00–20:00" */
export const fmtWindow = (w: Pick<ShopWindow, 'starts_at' | 'ends_at'>): string =>
  `${fmtDay(w.starts_at)} · ${timeFmt.format(new Date(w.starts_at))}–${timeFmt.format(new Date(w.ends_at))}`;

/** YYYY-MM-DD in Europe/Warsaw — groups windows by day */
export const dayKey = (iso: string): string => dayKeyFmt.format(new Date(iso));

/** YYYY-MM-DD → "czw., 15.07" */
export const fmtDayKey = (key: string): string => dayFmt.format(new Date(`${key}T12:00:00Z`));

/** Europe/Warsaw wall time ("2027-07-15", "16:00") → ISO instant, whatever the browser's time zone. */
export const warsawToISO = (date: string, time: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Offset of Warsaw at that instant (CET +1 / CEST +2), read back through Intl.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  );
  const asWarsaw = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return new Date(guess - (asWarsaw - guess)).toISOString();
};

export const fmtLocation =(l: ShopLocation): string => (l.pavilion ? `P${l.pavilion} · ${l.name}` : l.name);

/** "15.07 → 18.07" (return date when given, else the return window's day) */
export const fmtOrderDates = (o: ShopOrder): string => {
  const ret = o.return_date ? fmtDayKey(o.return_date) : fmtDay(o.return_window.starts_at);
  return `${fmtDay(o.delivery_window.starts_at)} → ${ret}`;
};

export const organizerName = (o: Pick<ShopOrder, 'account_name' | 'account_email' | 'contact_name'>): string =>
  o.account_name || o.account_email || o.contact_name;
