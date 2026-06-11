export type EquipmentType = 'asset' | 'stock';

export interface AssetLog {
  id: number;
  resource_id: number;
  resource_type: string;
  action: string;
  data: {
    location_id?: number;
    pyrcode?: string;
    msg: string;
    quantity?: number;
    from_location_id?: number;
    from_location_name?: string | null;
    to_location_id?: number;
    to_location_name?: string | null;
    location?: {
      latitude: number;
      longitude: number;
      location_id: number;
      timestamp: string;
    };
    asset_id?: number;
  };
  created_at: string;
}

export interface EquipmentDetailsData {
  id: number;
  status: string;
  origin?: string;
  serial?: string | null;
  pyrcode?: string;
  quantity?: number;
  category?: {
    id?: number;
    name?: string;
    label?: string;
    pyr_id?: string;
    type?: string;
  };
  location?: {
    id?: number;
    name?: string;
    pavilion?: string | null;
    details?: string | null;
  };
}
