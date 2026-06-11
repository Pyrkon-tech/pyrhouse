import { describe, it, expect } from 'vitest';
import { getEffectiveDeadline, getZoneMetrics, getQuestUrgency } from '../matching';
import type { Quest, QuestStatus } from '../../../../../types/quest.types';
import type { ServiceDeskRequest } from '../../../../../types/servicedesk.types';
import { ALERT_HOURS, PULSE_HOURS } from '../../constants/thresholds';

const H = 3_600_000;

function makeQuest(deliveryDate: string, status: QuestStatus = 'pending'): Quest {
  return {
    id: `q-${Math.random()}`,
    destination: { pavilion: '5', location: 'Sala A' },
    recipient: 'Jan',
    delivery_date: deliveryDate,
    budget_owner: 'Tech',
    items: [],
    status,
    transfers: [],
    location_id: null,
    location_name: null,
    location_resolved: false,
    source_rows: [],
    last_synced: '2026-06-10T00:00:00Z',
    assigned_volunteers: [],
  } as Quest;
}

function makeSd(status: string): ServiceDeskRequest {
  return { id: 1, status } as unknown as ServiceDeskRequest;
}

describe('getEffectiveDeadline', () => {
  it('returns the exact timestamp for dates with a time component', () => {
    const iso = '2026-06-14T15:30:00Z';
    expect(getEffectiveDeadline(iso)).toBe(new Date(iso).getTime());
  });

  it('returns end of day in local time for date-only strings', () => {
    const deadline = getEffectiveDeadline('2026-06-14');
    expect(deadline).toBe(new Date(2026, 5, 14, 23, 59, 59, 999).getTime());
  });

  it('date-only deadline is NOT midnight UTC', () => {
    // Raw parsing of '2026-06-14' would give midnight UTC — the old bug that made
    // zones turn urgent the previous evening in UTC+ timezones
    expect(getEffectiveDeadline('2026-06-14')).not.toBe(new Date('2026-06-14').getTime());
  });
});

describe('getZoneMetrics — timed deadlines', () => {
  const now = new Date(2026, 5, 14, 12, 0, 0).getTime();
  const at = (hoursFromNow: number) => new Date(now + hoursFromNow * H).toISOString();

  it('counts only pending quests in urgency metrics', () => {
    const quests = [
      makeQuest(at(1), 'in_progress'),
      makeQuest(at(1), 'completed'),
    ];
    const m = getZoneMetrics(quests, 8, now);
    expect(m.urgent).toBe(0);
    expect(m.alertVisible).toBe(0);
    expect(m.alertPulsing).toBe(0);
    expect(m.overdue).toBe(0);
    expect(m.inProgress).toBe(1);
    expect(m.completed).toBe(1);
  });

  it('escalates: alert at ≤24h, urgent at ≤8h, pulse at ≤2h', () => {
    const farAway = getZoneMetrics([makeQuest(at(30))], 8, now);
    expect(farAway.alertVisible).toBe(0);

    const calm = getZoneMetrics([makeQuest(at(ALERT_HOURS - 1))], 8, now);
    expect(calm.alertVisible).toBe(1);
    expect(calm.urgent).toBe(0);
    expect(calm.alertPulsing).toBe(0);

    const urgent = getZoneMetrics([makeQuest(at(7))], 8, now);
    expect(urgent.alertVisible).toBe(1);
    expect(urgent.urgent).toBe(1);
    expect(urgent.alertPulsing).toBe(0);

    const pulsing = getZoneMetrics([makeQuest(at(PULSE_HOURS - 0.5))], 8, now);
    expect(pulsing.urgent).toBe(1);
    expect(pulsing.alertPulsing).toBe(1);
    expect(pulsing.overdue).toBe(0);
  });

  it('respects the configurable urgencyHours threshold', () => {
    const quest = makeQuest(at(3));
    expect(getZoneMetrics([quest], 2, now).urgent).toBe(0);
    expect(getZoneMetrics([quest], 4, now).urgent).toBe(1);
  });

  it('marks past-deadline pending quests as overdue and keeps the alert', () => {
    const m = getZoneMetrics([makeQuest(at(-3))], 8, now);
    expect(m.overdue).toBe(1);
    expect(m.alertVisible).toBe(1);
    expect(m.alertPulsing).toBe(1);
    expect(m.urgent).toBe(1);
  });
});

describe('getZoneMetrics — date-only deadlines (effective deadline = end of day local)', () => {
  // Delivery day: 2026-06-14 → effective deadline 2026-06-14 23:59:59.999 local
  const dateOnly = '2026-06-14';
  const localTime = (d: number, h: number) => new Date(2026, 5, d, h, 0, 0).getTime();

  it('does not alert nor turn urgent the previous evening', () => {
    const m = getZoneMetrics([makeQuest(dateOnly)], 8, localTime(13, 18));
    expect(m.alertVisible).toBe(0);
    expect(m.urgent).toBe(0);
  });

  it('alerts calmly during the delivery day morning (no immediate pulse)', () => {
    const m = getZoneMetrics([makeQuest(dateOnly)], 8, localTime(14, 8));
    expect(m.alertVisible).toBe(1);
    expect(m.urgent).toBe(0);
    expect(m.alertPulsing).toBe(0);
  });

  it('turns urgent in the afternoon and pulses in the evening', () => {
    const afternoon = getZoneMetrics([makeQuest(dateOnly)], 8, localTime(14, 17));
    expect(afternoon.urgent).toBe(1);
    expect(afternoon.alertPulsing).toBe(0);

    const evening = getZoneMetrics([makeQuest(dateOnly)], 8, localTime(14, 23));
    expect(evening.alertPulsing).toBe(1);
    expect(evening.overdue).toBe(0);
  });

  it('keeps a red (overdue) alert after the delivery day passes while still pending', () => {
    const m = getZoneMetrics([makeQuest(dateOnly)], 8, localTime(15, 10));
    expect(m.overdue).toBe(1);
    expect(m.alertVisible).toBe(1);
  });
});

describe('getQuestUrgency', () => {
  const now = new Date(2026, 5, 14, 12, 0, 0).getTime();
  const at = (hoursFromNow: number) => new Date(now + hoursFromNow * H).toISOString();

  it('returns none for non-pending quests regardless of deadline', () => {
    expect(getQuestUrgency(makeQuest(at(-5), 'in_progress'), 8, now)).toBe('none');
    expect(getQuestUrgency(makeQuest(at(-5), 'completed'), 8, now)).toBe('none');
  });

  it('escalates none → soon → urgent → overdue along the same thresholds as zone metrics', () => {
    expect(getQuestUrgency(makeQuest(at(30)), 8, now)).toBe('none');
    expect(getQuestUrgency(makeQuest(at(ALERT_HOURS - 1)), 8, now)).toBe('soon');
    expect(getQuestUrgency(makeQuest(at(7)), 8, now)).toBe('urgent');
    expect(getQuestUrgency(makeQuest(at(-1)), 8, now)).toBe('overdue');
  });

  it('respects the configurable urgencyHours threshold', () => {
    const quest = makeQuest(at(3));
    expect(getQuestUrgency(quest, 2, now)).toBe('soon');
    expect(getQuestUrgency(quest, 4, now)).toBe('urgent');
  });
});

describe('getZoneMetrics — service desk', () => {
  it('counts only SD requests with status new', () => {
    const m = getZoneMetrics([], 8, Date.now(), [makeSd('new'), makeSd('new'), makeSd('in_progress')]);
    expect(m.sdNew).toBe(2);
  });
});
