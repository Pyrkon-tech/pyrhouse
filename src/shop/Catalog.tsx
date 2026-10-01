import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { shopApi } from './api';
import { useShopSession } from './ShopSession';
import type { ShopProduct } from '@pyrhouse/api';

interface CatalogState {
  products: ShopProduct[];
  byId: Map<number, ShopProduct>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const CatalogContext = createContext<CatalogState | null>(null);


export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account } = useShopSession();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      setProducts(await shopApi.catalog());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account) reload();
  }, [account, reload]);

  const value = useMemo(
    () => ({ products, byId: new Map(products.map((p) => [p.id, p])), loading, error, reload }),
    [products, loading, error, reload],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = (): CatalogState => {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog outside CatalogProvider');
  return ctx;
};
