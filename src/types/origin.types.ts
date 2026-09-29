/** Origin shape is an alias of the generated API contract (@pyrhouse/api); payloads stay hand-written. */
import type { Schemas } from '@pyrhouse/api';

export type Origin = Schemas['Origin'];

export interface CreateOriginPayload {
  slug: string;
  label: string;
  allow_suffix?: boolean;
  sort_order?: number;
}

export interface UpdateOriginPayload {
  label?: string;
  allow_suffix?: boolean;
  active?: boolean;
  sort_order?: number;
}
