// Builds a signed PayFast checkout for an existing order.
// PLACEHOLDER: returns 503 until PAYFAST_MERCHANT_ID / PAYFAST_MERCHANT_KEY secrets are set
// AND "online payments" is switched on in Admin → Payments.
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, env, json, payfastConfig, pfSignature } from "../_shared/payfast.ts";

const FIELD_ORDER = ["merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
  "name_first", "email_address", "cell_number", "m_payment_id", "amount", "item_name", "item_description"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const cfg = payfastConfig();
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: settings } = await db.from("site_settings").select("value").eq("key", "payments").maybeSingle();
  const enabled = cfg.configured && Boolean(settings?.value?.online_enabled);

  // Status probe for the admin Payments page.
  if (req.method === "GET") return json({ configured: cfg.configured, enabled, sandbox: cfg.sandbox });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!enabled) return json({ error: "Online payments are not switched on yet. Please pay by EFT or on collection." }, 503);

  let body: { order_id?: string; reference?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (!body.order_id || !body.reference) return json({ error: "Missing order" }, 400);

  // Knowing both the random order id and its reference proves the caller placed the order.
  const { data: order } = await db.from("orders")
    .select("id, reference, customer_name, email, phone, total_cents, payment_method, payment_status, status")
    .eq("id", body.order_id).eq("reference", body.reference).maybeSingle();
  if (!order) return json({ error: "Order not found" }, 404);
  if (order.payment_method !== "payfast" || !["pending", "failed"].includes(order.payment_status) || order.status === "cancelled") {
    return json({ error: "This order can't be paid online." }, 409);
  }

  const site = env("SITE_URL") || "https://tshehla-agrihub.vercel.app";
  const values: Record<string, string> = {
    merchant_id: cfg.merchantId,
    merchant_key: cfg.merchantKey,
    return_url: `${site}/order/${order.reference}?payment=return`,
    cancel_url: `${site}/order/${order.reference}?payment=cancelled`,
    notify_url: `${env("SUPABASE_URL")}/functions/v1/payfast-itn`,
    name_first: order.customer_name.slice(0, 100),
    email_address: order.email ?? "",
    m_payment_id: order.id,
    amount: (order.total_cents / 100).toFixed(2),
    item_name: `Tshehla AgriHub order ${order.reference}`,
  };
  const fields = FIELD_ORDER.filter((k) => values[k]).map((k) => [k, values[k]] as [string, string]);
  fields.push(["signature", pfSignature(fields, cfg.passphrase)]);

  await db.from("payment_events").insert({ order_id: order.id, provider: "payfast", event: "checkout_created", processed: true });
  return json({ action: cfg.processUrl, fields });
});
