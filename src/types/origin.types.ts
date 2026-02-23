export interface Origin {
  id: number;
  slug: string;
  label: string;
  allow_suffix: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
}

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
