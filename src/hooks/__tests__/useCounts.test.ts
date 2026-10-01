import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const get = vi.fn();
vi.mock('../../services/apiClient', () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));

import { useQuestCounts } from '../useQuestCounts';
import { useServiceDeskCounts } from '../useServiceDeskCounts';

describe('queue counters', () => {
  beforeEach(() => get.mockReset());

  it('reads quest counts from the grouped endpoint', async () => {
    get.mockResolvedValue({ pending: 4, in_progress: 1, completed: 9, cancelled: 0 });
    const { result } = renderHook(() => useQuestCounts());
    await waitFor(() => expect(result.current.counts.pending).toBe(4));
    expect(get).toHaveBeenCalledWith('/equipment-requests/quests/counts');
  });

  it('reads service desk counts and keeps zeros when the call fails', async () => {
    get.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useServiceDeskCounts());
    await waitFor(() => expect(get).toHaveBeenCalledWith('/service-desk/requests/counts'));
    expect(result.current.counts.new).toBe(0);
  });
});
