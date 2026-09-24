import { describe, expect, it } from "vitest";
import { addLine, cartCount, cartTotal, setQuantity, type CartLine } from "../lib/cart";

const chicks: CartLine = { product_id: "a", slug: "broiler-chicks", name: "Broiler Chicks", unit: "Box of 100", unit_price_cents: 120000, quantity: 2, max: 5 };
const beans: CartLine = { product_id: "b", slug: "green-beans", name: "Green Beans", unit: "Crate", unit_price_cents: 15000, quantity: 1, max: 20 };

describe("basket", () => {
  it("adds new lines and merges repeats", () => {
    let lines = addLine([], chicks);
    lines = addLine(lines, beans);
    lines = addLine(lines, { ...chicks, quantity: 1 });
    expect(lines).toHaveLength(2);
    expect(lines.find((l) => l.product_id === "a")!.quantity).toBe(3);
  });

  it("never exceeds the per-order maximum", () => {
    const lines = addLine(addLine([], chicks), { ...chicks, quantity: 10 });
    expect(lines[0].quantity).toBe(5);
    expect(setQuantity(lines, "a", 99)[0].quantity).toBe(5);
  });

  it("removes a line when quantity drops to zero", () => {
    expect(setQuantity([chicks, beans], "a", 0).map((l) => l.product_id)).toEqual(["b"]);
  });

  it("totals and counts", () => {
    expect(cartTotal([chicks, beans])).toBe(2 * 120000 + 15000);
    expect(cartCount([chicks, beans])).toBe(3);
  });
});
