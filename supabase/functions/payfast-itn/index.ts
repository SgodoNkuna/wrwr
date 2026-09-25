// PayFast ITN (Instant Transaction Notification) webhook.
// Marks an order paid only when: signature is valid, merchant matches, the amount equals the
// order total, and PayFast's own validate endpoint confirms the payload. Every call is logged.
import { createClient } from "npm:@supabase/supabase-js@2";
import { env, parseOrderedForm, payfastConfig, pfSignature } from "../_shared/payfast.ts";

const ok = () => new Response("OK", { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const cfg = payfastConfig();
  if (!cfg.configured) return new Response("Payments not configured", { status: 503 });

  const raw = await req.text();
  const fields = parseOrderedForm(raw);
  const p = Object.fromEntries(fields);
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

  const sigValid = pfSignature(fields, cfg.passphrase) === (p.signature ?? "");
  const log = (processed: boolean, error: string | null, orderId: string | null) =>
    db.from("payment_events").insert({ order_id: orderId, provider: "payfast", event: `itn:${p.payment_status ?? "unknown"}`,
      payload: p, signature_valid: sigValid, processed, error });

  if (!sigValid) { await log(false, "invalid signature", null); return ok(); }
  if (p.merchant_id !== cfg.merchantId) { await log(false, "merchant mismatch", null); return ok(); }

  const { data: order } = await db.from("orders").select("id, total_cents, payment_status, status").eq("id", p.m_payment_id ?? "").maybeSingle();
  if (!order) { await log(false, "order not found", null); return ok(); }

  const gross = Math.round(parseFloat(p.amount_gross ?? "0") * 100);
  if (gross !== order.total_cents) { await log(false, `amount mismatch: expected ${order.total_cents}, got ${gross}`, order.id); return ok(); }

  const validate = await fetch(cfg.validateUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: raw })
    .then((r) => r.text()).then((t) => t.trim() === "VALID").catch(() => false);
  if (!validate) { await log(false, "payfast validate rejected", order.id); return ok(); }

  if (p.payment_status === "COMPLETE" && order.payment_status !== "paid") {
    await db.from("orders").update({
      payment_status: "paid", paid_at: new Date().toISOString(), payment_reference: p.pf_payment_id ?? null,
      status: order.status === "new" ? "confirmed" : order.status,
    }).eq("id", order.id);
  } else if (p.payment_status === "CANCELLED" || p.payment_status === "FAILED") {
    await db.from("orders").update({ payment_status: "failed" }).eq("id", order.id).neq("payment_status", "paid");
  }
  await log(true, null, order.id);
  return ok();
});
