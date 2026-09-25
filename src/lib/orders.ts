import { supabase } from "./supabase";
import type { CartLine } from "./cart";
import type { PaymentMethod, TrackedOrder } from "./types";

export interface CheckoutDetails {
  name: string; phone: string; email: string; fulfilment: "collect" | "delivery"; delivery_address: string; notes: string;
  payment_method: PaymentMethod; consent: boolean; accept_terms: boolean; captcha_token?: string;
}
export interface PlacedOrder { order_id: string; reference: string; total_cents: number; payment_method: PaymentMethod }

/** Server calculates prices, totals and stock; we only send ids + quantities. */
export async function placeOrder(lines: CartLine[], details: CheckoutDetails): Promise<PlacedOrder> {
  const { data, error } = await supabase.rpc("place_order", {
    p_items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
    p_customer: details,
  });
  if (error) throw new Error(friendlyError(error.message));
  const row = (Array.isArray(data) ? data[0] : data) as PlacedOrder | undefined;
  if (!row) throw new Error("Something went wrong placing your order. Please WhatsApp us.");
  return row;
}

export async function trackOrder(reference: string, phone: string): Promise<TrackedOrder | null> {
  const { data, error } = await supabase.rpc("track_order", { p_reference: reference.trim().toUpperCase(), p_phone: phone });
  if (error) throw new Error("We couldn't look that up right now. Please try again.");
  return ((data as TrackedOrder[] | null) ?? [])[0] ?? null;
}

/** Starts a PayFast payment (only works once online payments are switched on). */
export async function startOnlinePayment(orderId: string, reference: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("payfast-checkout", { body: { order_id: orderId, reference } });
  if (error || !data?.action) throw new Error("Online payment isn't available right now. Please pay by EFT or on collection.");
  const form = document.createElement("form");
  form.method = "POST";
  form.action = data.action;
  for (const [k, v] of data.fields as Array<[string, string]>) {
    const input = document.createElement("input");
    input.type = "hidden"; input.name = k; input.value = v;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

// Remember the phone used for recent orders in this tab only, so the confirmation page can show them.
const KEY = "tshehla-recent-orders";
export function rememberOrder(reference: string, orderId: string, phone: string) {
  try {
    const all = JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
    all[reference] = { orderId, phone };
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage blocked */ }
}
export function recallOrder(reference: string): { orderId: string; phone: string } | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "{}")[reference] ?? null; } catch { return null; }
}

const friendlyError = (msg: string) =>
  /not available|between 1 and|Only \d+ left|empty|Consent|accept the Terms|payment method|Too many|lot of orders|Online payment|human/i.test(msg)
    ? msg
    : "Please check your details (a valid phone number is required) and try again.";
