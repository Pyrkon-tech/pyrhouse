import type { ChipProps } from '@mui/material';
import type { ShopOrder } from '../types/shop.types';

export interface OrganizerStatus {
  label: string;
  color: ChipProps['color'];
  /** 1 submitted … 4 delivered; 0 for rejected/cancelled */
  step: number;
}

/** Order status as the organizer sees it; after confirmation the quest tells how far it got. */
export const organizerStatus = (o: Pick<ShopOrder, 'status' | 'quest_status'>): OrganizerStatus => {
  switch (o.status) {
    case 'submitted':
      return { label: 'Czeka na potwierdzenie', color: 'warning', step: 1 };
    case 'rejected':
      return { label: 'Odrzucone', color: 'error', step: 0 };
    case 'cancelled':
      return { label: 'Anulowane', color: 'default', step: 0 };
    case 'confirmed':
      if (o.quest_status === 'in_progress') return { label: 'W drodze', color: 'info', step: 3 };
      if (o.quest_status === 'completed') return { label: 'Dostarczone', color: 'success', step: 4 };
      return { label: 'Potwierdzone', color: 'secondary', step: 2 };
  }
};
