import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// The basket lives in this browser only (strictly necessary storage, see Cookie Policy).
// Prices shown here are indicative; place_order() recalculates everything on the server.
export interface CartLine { product_id: string; slug: string; name: string; unit: string | null; unit_price_cents: number; quantity: number; max: number }
const KEY = "tshehla-basket-v1";

const read = (): CartLine[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((l) => l && typeof l.product_id === "string" && Number.isInteger(l.quantity)) : [];
  } catch { return []; }
};

export const cartTotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.unit_price_cents * l.quantity, 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);

/** Adds or merges a line, clamping quantity to 1..max. Pure so it can be unit-tested. */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find((l) => l.product_id === line.product_id);
  if (!existing) return [...lines, { ...line, quantity: Math.min(Math.max(1, line.quantity), line.max) }];
  return lines.map((l) => l.product_id === line.product_id
    ? { ...l, ...line, quantity: Math.min(l.quantity + line.quantity, line.max) } : l);
}

export function setQuantity(lines: CartLine[], productId: string, quantity: number): CartLine[] {
  if (quantity <= 0) return lines.filter((l) => l.product_id !== productId);
  return lines.map((l) => l.product_id === productId ? { ...l, quantity: Math.min(quantity, l.max) } : l);
}

interface Ctx { lines: CartLine[]; add: (l: CartLine) => void; update: (id: string, q: number) => void; clear: () => void; count: number; total: number }
const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(read);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage blocked */ }
  }, [lines]);
  const value: Ctx = {
    lines,
    add: (l) => setLines((prev) => addLine(prev, l)),
    update: (id, q) => setLines((prev) => setQuantity(prev, id, q)),
    clear: () => setLines([]),
    count: cartCount(lines),
    total: cartTotal(lines),
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart outside CartProvider");
  return ctx;
};
