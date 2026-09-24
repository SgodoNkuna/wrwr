import { describe, expect, it } from "vitest";
import { formatRand, priceLabel, safeImage, slugify, telLink, toWaNumber, whatsappLink } from "../lib/format";

describe("format helpers", () => {
  it("formats rand amounts from cents", () => {
    expect(formatRand(120000)).toMatch(/^R1\s?200$/);
    expect(formatRand(1550)).toMatch(/^R15[.,]50$/);
  });

  it("hides prices unless explicitly shown", () => {
    expect(priceLabel({ price_cents: 120000, show_price: false })).toBe("Enquire for price");
    expect(priceLabel({ price_cents: null, show_price: true })).toBe("Enquire for price");
    expect(priceLabel({ price_cents: 120000, show_price: true })).toMatch(/^R1\s?200$/);
  });

  it("normalises South African numbers for WhatsApp", () => {
    expect(toWaNumber("068 828 9347")).toBe("27688289347");
    expect(toWaNumber("+27 68 828 9347")).toBe("27688289347");
    expect(telLink("068 828 9347")).toBe("tel:+27688289347");
  });

  it("builds a WhatsApp link naming the product", () => {
    const url = whatsappLink({ whatsapp: "068 828 9347", name: "Tshehla AgriHub" }, "Cattle");
    expect(url.startsWith("https://wa.me/27688289347?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toContain("Cattle");
  });

  it("slugifies names safely", () => {
    expect(slugify("  Broiler Chicks (Tau Poultry)! ")).toBe("broiler-chicks-tau-poultry");
  });

  it("only renders https or site-relative images", () => {
    expect(safeImage("/images/a.jpg")).toBe("/images/a.jpg");
    expect(safeImage("https://x.supabase.co/a.jpg")).toBe("https://x.supabase.co/a.jpg");
    expect(safeImage("javascript:alert(1)")).toBeNull();
    expect(safeImage("http://insecure.example/a.jpg")).toBeNull();
    expect(safeImage(null)).toBeNull();
  });
});
