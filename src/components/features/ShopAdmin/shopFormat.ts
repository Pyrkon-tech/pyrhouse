import type { ChipProps } from '@mui/material';
import type { ShopAccessSource, ShopInviteStatus, ShopOrder } from '@pyrhouse/api';

export * from '@pyrhouse/ui';

interface StatusView {
  label: string;
  color: ChipProps['color'];
}

/** Order status as the warehouse sees it; confirmed orders show fulfillment from the quest. */
export const orderStatusView = (o: Pick<ShopOrder, 'status' | 'quest_status'>): StatusView => {
  switch (o.status) {
    case 'submitted':
      return { label: 'Do potwierdzenia', color: 'warning' };
    case 'rejected':
      return { label: 'Odrzucone', color: 'error' };
    case 'cancelled':
      return { label: 'Anulowane', color: 'default' };
    case 'confirmed':
      if (o.quest_status === 'in_progress') return { label: 'W drodze', color: 'info' };
      if (o.quest_status === 'completed') return { label: 'Dostarczone', color: 'success' };
      return { label: 'Potwierdzone', color: 'secondary' };
  }
};

export const ACCESS_SOURCE_LABEL: Record<ShopAccessSource, string> = {
  domain: 'Domena',
  allowlist: 'Allowlista',
  invite: 'Zaproszenie',
};

export const INVITE_STATUS_VIEW: Record<ShopInviteStatus, StatusView> = {
  active: { label: 'aktywny', color: 'info' },
  used: { label: 'wykorzystany', color: 'success' },
  revoked: { label: 'unieważniony', color: 'default' },
  expired: { label: 'wygasł', color: 'default' },
};

/** Stable error codes from the shop API → friendlier Polish text where the default is not enough. */
export const shopErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as { code?: string; message?: string } | undefined;
  if (e?.code === 'version_conflict') return 'Zamówienie zmieniło się w międzyczasie — odświeżyłem je, sprawdź i spróbuj ponownie.';
  return e?.message || fallback;
};
