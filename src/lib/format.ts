import type { BusinessSettings, Product } from "./types";

export const formatRand = (cents: number) =>
  "R" + (cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });

export const priceLabel = (p: Pick<Product, "price_cents" | "show_price">) =>
  p.show_price && p.price_cents != null ? formatRand(p.price_cents) : "Enquire for price";

/** Normalises SA numbers (e.g. "068 828 9347") to wa.me format (27688289347). */
export const toWaNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("0") ? "27" + digits.slice(1) : digits;
};

export const whatsappLink = (biz: Pick<BusinessSettings, "whatsapp" | "name">, productName?: string) => {
  const text = productName
    ? `Hi ${biz.name}, I'm interested in your ${productName}. Could you please send me the price and availability?`
    : `Hi ${biz.name}, I'd like to make an enquiry.`;
  return `https://wa.me/${toWaNumber(biz.whatsapp)}?text=${encodeURIComponent(text)}`;
};

export const telLink = (phone: string) => "tel:+" + toWaNumber(phone);

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Only allow http(s) and site-relative image URLs to be rendered. */
export const safeImage = (url: string | null | undefined) =>
  url && (/^https:\/\//i.test(url) || url.startsWith("/")) ? url : null;
