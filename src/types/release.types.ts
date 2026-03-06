export type ReleaseStatus = 'draft' | 'completed';

export interface Release {
  id: number;
  reference: string;
  origin_id: number | null;
  origin_label: string | null;
  notes: string | null;
  status: ReleaseStatus;
  created_by: number;
  created_by_name: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ReleaseAsset {
  id: number;
  item_id: number;
  pyr_code: string | null;
  item_serial: string | null;
  category_name: string | null;
  origin_label: string | null;
  location_name: string | null;
}

export interface ReleaseStock {
  id: number;
  stock_id: number;
  item_category_id: number;
  category_name: string | null;
  quantity: number;
  origin_label: string | null;
  location_name: string | null;
}

export interface ReleaseDetail extends Release {
  assets: ReleaseAsset[];
  stocks: ReleaseStock[];
  summary: {
    total_assets: number;
    total_stock_quantity: number;
  };
}

export interface SuggestedAsset {
  id: number;
  pyr_code: string | null;
  item_serial: string | null;
  status: string;
  category_name: string | null;
  origin_label: string | null;
  location_name: string | null;
}

export interface SuggestedStock {
  id: number;
  quantity: number;
  category_name: string | null;
  origin_label: string | null;
  location_name: string | null;
}

export interface SuggestResponse {
  assets: SuggestedAsset[];
  stocks: SuggestedStock[];
}

export interface CreateReleasePayload {
  origin_id?: number;
  notes?: string;
  assets: number[];
  stocks: { stock_id: number; quantity: number }[];
}

export interface UpdateReleaseItemsPayload {
  assets: number[];
  stocks: { stock_id: number; quantity: number }[];
}
