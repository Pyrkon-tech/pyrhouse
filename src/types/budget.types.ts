export interface PriceListItem {
  id: number;
  item_name: string;
  supplier: string;
  unit_price: number;
  updated_at: string;
}

export interface UpsertPriceRequest {
  item_name: string;
  supplier: string;
  unit_price: number;
}

export interface SupplierPrice {
  supplier: string;
  unit_price: number;
  total: number;
}

export interface BudgetItem {
  item_name: string;
  quantity: number;
  prices: SupplierPrice[];
}

export interface SupplierTotal {
  supplier: string;
  total: number;
}

export interface BudgetSummary {
  total_positions: number;
  total_quantity: number;
  supplier_totals: SupplierTotal[];
  unpriced_count: number;
  items: BudgetItem[];
}
