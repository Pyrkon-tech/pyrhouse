/**
 * useScheduleValidation — client-side validation that runs instantly on local state.
 *
 * Mirrors a subset of backend validation rules so the user gets immediate feedback
 * without waiting for a server round-trip. The backend remains authoritative.
 *
 * Checks:
 * - slot_understaffed / slot_overstaffed (capacity vs actual)
 * - under_hours / over_hours (volunteer target vs assigned)
 * - double_booked (volunteer in overlapping time slots)
 * - outside_availability (assignment outside volunteer's available_from/to window)
 */

import { useMemo } from 'react';
import type {
  ScheduleSlot,
  ScheduleVolunteer,
  ValidationIssue,
  ValidationResult,
} from '../../../types/schedule.types';

// ---- Helpers ---------------------------------------------------------------

function slotsOverlap(a: ScheduleSlot, b: ScheduleSlot): boolean {
  const aStart = new Date(a.start).getTime();
  const aEnd = new Date(a.end).getTime();
  const bStart = new Date(b.start).getTime();
  const bEnd = new Date(b.end).getTime();
  return aStart < bEnd && bStart < aEnd;
}

// ---- Hook ------------------------------------------------------------------

export function useScheduleValidation(
  slots: ScheduleSlot[],
  volunteers: ScheduleVolunteer[],
): ValidationResult {
  return useMemo(() => {
    const issues: ValidationIssue[] = [];

    // 1. Slot capacity checks
    for (const slot of slots) {
      const count = slot.volunteers.length;
      if (count < slot.capacity) {
        issues.push({
          type: 'slot_understaffed',
          severity: 'warning',
          slot_id: slot.id,
          slot: slot.id,
          capacity: slot.capacity,
          message: `${slot.label}: ${count}/${slot.capacity} wolontariuszy`,
        });
      } else if (count > slot.capacity) {
        issues.push({
          type: 'slot_overstaffed',
          severity: 'warning',
          slot_id: slot.id,
          slot: slot.id,
          capacity: slot.capacity,
          message: `${slot.label}: ${count}/${slot.capacity} wolontariuszy`,
        });
      }
    }

    // 2. Volunteer hours checks
    for (const vol of volunteers) {
      if (vol.assigned_hours < vol.target_hours) {
        issues.push({
          type: 'under_hours',
          severity: 'warning',
          volunteer: vol.nickname,
          volunteer_id: vol.id,
          assigned: vol.assigned_hours,
          target: vol.target_hours,
        });
      } else if (vol.assigned_hours > vol.target_hours) {
        issues.push({
          type: 'over_hours',
          severity: 'warning',
          volunteer: vol.nickname,
          volunteer_id: vol.id,
          assigned: vol.assigned_hours,
          target: vol.target_hours,
        });
      }
    }

    // 3. Double-booking: volunteer assigned to overlapping slots
    // Build nickname → assigned slot list
    const nicknameSlots = new Map<string, ScheduleSlot[]>();
    for (const slot of slots) {
      for (const sv of slot.volunteers) {
        const list = nicknameSlots.get(sv.nickname);
        if (list) {
          list.push(slot);
        } else {
          nicknameSlots.set(sv.nickname, [slot]);
        }
      }
    }

    for (const [nickname, assignedSlots] of nicknameSlots) {
      if (assignedSlots.length < 2) continue;
      // Sort by start time for efficient pairwise check
      const sorted = [...assignedSlots].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
      for (let i = 0; i < sorted.length - 1; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          if (slotsOverlap(sorted[i], sorted[j])) {
            const vol = volunteers.find((v) => v.nickname === nickname);
            issues.push({
              type: 'double_booked',
              severity: 'error',
              volunteer: nickname,
              volunteer_id: vol?.id,
              slot_id: sorted[j].id,
              message: `${nickname}: ${sorted[i].label} i ${sorted[j].label} nakładają się`,
            });
          }
        }
      }
    }

    // 4. Outside availability window
    for (const vol of volunteers) {
      if (!vol.available_from && !vol.available_to) continue;
      const availFrom = vol.available_from ? new Date(vol.available_from).getTime() : -Infinity;
      const availTo = vol.available_to ? new Date(vol.available_to).getTime() : Infinity;

      for (const slot of slots) {
        const isAssigned = slot.volunteers.some((sv) => sv.nickname === vol.nickname);
        if (!isAssigned) continue;

        const slotStart = new Date(slot.start).getTime();
        const slotEnd = new Date(slot.end).getTime();

        if (slotStart < availFrom || slotEnd > availTo) {
          issues.push({
            type: 'outside_availability',
            severity: 'error',
            volunteer: vol.nickname,
            volunteer_id: vol.id,
            slot_id: slot.id,
            message: `${vol.nickname}: ${slot.label} poza oknem dostępności`,
          });
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }, [slots, volunteers]);
}
