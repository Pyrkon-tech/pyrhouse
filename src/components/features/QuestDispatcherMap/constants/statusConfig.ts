import type { QuestStatus } from '../../../../types/quest.types';

export const STATUS_COLORS: Record<QuestStatus, string> = {
  pending: '#ff9800',
  in_progress: '#ffd54f',
  completed: '#66bb6a',
  cancelled: '#ef5350',
};

export const STATUS_LABELS: Record<QuestStatus, string> = {
  pending: 'Oczekujące',
  in_progress: 'W realizacji',
  completed: 'Zrealizowane',
  cancelled: 'Anulowane',
};
