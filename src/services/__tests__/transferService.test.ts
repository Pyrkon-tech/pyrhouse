import { describe, expect, it } from 'vitest';
import { normalizeUserTransfer } from '../transferService';
import type { TransferSummary } from '../../types/transfer.types';

describe('normalizeUserTransfer', () => {
  const summary: TransferSummary = {
    id: 7,
    from_location: { id: 1, name: 'Magazyn', pavilion: null, details: null },
    to_location: { id: 2, name: 'Scena', pavilion: '5', details: null },
    transfer_date: '2026-09-30T10:00:00Z',
    status: 'in_transit',
  };

  it('passes the current API shape through', () => {
    expect(normalizeUserTransfer(summary)).toBe(summary);
  });

  it('maps the pre-2026-09-30 Go field names', () => {
    expect(
      normalizeUserTransfer({
        ID: 7,
        FromLocationID: 1,
        FromLocationName: 'Magazyn',
        ToLocationID: 2,
        ToLocationName: 'Scena',
        TransferDate: '2026-09-30T10:00:00Z',
        Status: 'in_transit',
      })
    ).toEqual({ ...summary, to_location: { ...summary.to_location, pavilion: null } });
  });
});
