import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useShopSession } from './ShopSession';

export interface CartLine {
  productId: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  count: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  quantityOf: (productId: number) => number;
  setQuantity: (productId: number, quantity: number) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | null>(null);


// Per account: two people sharing a computer keep separate carts (PLAN: cart in localStorage per account).
const storageKey = (accountId: number) => `shop_cart_${accountId}`;

const load = (accountId: number): CartLine[] => {
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l.productId > 0 && l.quantity > 0) : [];
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account } = useShopSession();
  const accountId = account?.id ?? 0;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLines(accountId ? load(accountId) : []);
  }, [accountId]);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    if (!accountId) return;
    try {
      localStorage.setItem(storageKey(accountId), JSON.stringify(next));
    } catch {
      // Storage unavailable: the cart lives only in memory.
    }
  }, [accountId]);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setLines((prev) => {
      const rest = prev.filter((l) => l.productId !== productId);
      const next = quantity > 0 ? [...rest, { productId, quantity }].sort((a, b) => a.productId - b.productId) : rest;
      if (accountId) {
        try {
          localStorage.setItem(storageKey(accountId), JSON.stringify(next));
        } catch {
          // see persist
        }
      }
      return next;
    });
  }, [accountId]);

  const value = useMemo<CartState>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    open,
    setOpen,
    quantityOf: (id) => lines.find((l) => l.productId === id)?.quantity ?? 0,
    setQuantity,
    replace: persist,
    clear: () => persist([]),
  }), [lines, open, setQuantity, persist]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartState => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart outside CartProvider');
  return ctx;
};
