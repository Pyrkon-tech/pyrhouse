export type AssetDisplayColor = 'warning' | 'error' | 'success' | 'info';

export interface AssetDisplayStatus {
  label: string;
  color: AssetDisplayColor;
}

const MAIN_WAREHOUSE_ID = 1;

export function getAssetDisplayStatus(
  status: string,
  location: { id: number; name: string },
): AssetDisplayStatus {
  if (status === 'in_transit') return { label: 'W transporcie', color: 'warning' };
  if (status === 'unavailable') return { label: 'Niedostępny', color: 'error' };
  // available
  if (location.id === MAIN_WAREHOUSE_ID) return { label: 'Na stanie', color: 'success' };
  return { label: location.name, color: 'info' };
}
