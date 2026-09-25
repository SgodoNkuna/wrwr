// Delivers queued notifications (new order / enquiry alerts for staff, order updates for customers).
// Called by a database trigger via pg_net with {"id": <notification id>}. Each notification is only
// processed once, so calling this URL directly can't spam anyone.
//
// Channels switch on when their secrets are set (Supabase → Edge Functions → Secrets):
//   Email:    RESEND_API_KEY, EMAIL_FROM ("Tshehla AgriHub <orders@yourdomain>"), ALERT_EMAIL_TO (staff inbox)
//   WhatsApp: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ALERT_TO (owner's number, e.g. 27688289347),
//             WHATSAPP_ALERT_TEMPLATE (an approved template with one {{1}} body parameter)
//   Links:    SITE_URL
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (k: string) => Deno.env.get(k) ?? "";
const rand = (c: number) => "R" + (c / 100).toLocaleString("en-ZA", { minimumFractionDigits: c % 100 ? 2 : 0 });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sendEmail(to: string, subject: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("EMAIL_FROM"), to: [to], subject, text,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${esc(text).replace(/\n/g, "<br>")}</div>` }),
  });
  if (!res.ok) throw new Error(`email ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function sendWhatsAppAlert(text: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: env("WHATSAPP_ALERT_TO"), type: "template",
      template: { name: env("WHATSAPP_ALERT_TEMPLATE"), language: { code: "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: text.slice(0, 900) }] }] } }),
  });
  if (!res.ok) throw new Error(`whatsapp ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let id: number;
  try { id = Number((await req.json()).id); } catch { return new Response("Bad request", { status: 400 }); }
  if (!Number.isInteger(id)) return new Response("Bad request", { status: 400 });

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  // Claim the notification atomically so it's only ever handled once.
  const { data: n } = await db.from("notifications").update({ status: "sent", sent_at: new Date().toISOString(), detail: "processing" })
    .eq("id", id).eq("status", "queued").select().maybeSingle();
  if (!n) return new Response("Nothing to do", { status: 200 });

  const site = env("SITE_URL") || "https://tshehla-agrihub.vercel.app";
  const staff: { subject: string; text: string } | null = await (async () => {
    if (n.kind === "new_enquiry") {
      const { data: e } = await db.from("enquiries").select("*, products(name)").eq("id", n.record_id).maybeSingle();
      if (!e) return null;
      return { subject: `New enquiry from ${e.name}${e.products ? ` about ${e.products.name}` : ""}`,
        text: `${e.name} (${e.phone}${e.email ? `, ${e.email}` : ""}) asked${e.products ? ` about ${e.products.name}` : ""}:\n\n${e.message}\n\nReply: ${site}/admin/enquiries` };
    }
    if (n.kind === "new_order") {
      const { data: o } = await db.from("orders").select("*, order_items(*)").eq("id", n.record_id).maybeSingle();
      if (!o) return null;
      const lines = (o.order_items ?? []).map((i: { quantity: number; product_name: string; line_total_cents: number }) => `  ${i.quantity} × ${i.product_name}: ${rand(i.line_total_cents)}`).join("\n");
      return { subject: `New order ${o.reference}: ${rand(o.total_cents)}`,
        text: `${o.customer_name} (${o.phone}) placed order ${o.reference}.\n\n${lines}\nTotal: ${rand(o.total_cents)}\nPayment: ${o.payment_method}\n${o.fulfilment === "delivery" ? `Delivery to: ${o.delivery_address}` : "Collecting at the farm"}${o.notes ? `\nNote: ${o.notes}` : ""}\n\nOpen: ${site}/admin/orders?open=${o.id}` };
    }
    return null;
  })();

  // Customer emails: order confirmation, confirmed, ready to collect.
  const customer: { to: string; subject: string; text: string } | null = await (async () => {
    if (!["new_order", "order_confirmed", "order_ready"].includes(n.kind)) return null;
    const { data: o } = await db.from("orders").select("*").eq("id", n.record_id).maybeSingle();
    if (!o?.email) return null;
    const first = o.customer_name.split(" ")[0];
    const body = n.kind === "new_order"
      ? `Hi ${first},\n\nThanks for your order ${o.reference} (${rand(o.total_cents)}). We'll confirm it shortly.\n${o.payment_method === "eft" ? `Please pay by EFT using ${o.reference} as the reference.` : o.payment_method === "cash" ? "You can pay when you collect." : ""}`
      : n.kind === "order_confirmed"
      ? `Hi ${first},\n\nWe've confirmed your order ${o.reference} and are getting it ready.`
      : `Hi ${first},\n\nYour order ${o.reference} is ready${o.fulfilment === "delivery" ? " and we'll be in touch about delivery" : " to collect at the farm"}.`;
    return { to: o.email, subject: `Tshehla AgriHub order ${o.reference}`, text: `${body}\n\nTrack it any time: ${site}/track\n\nTshehla AgriHub, Gunyula Farm 38, Letsitele` };
  })();

  const done: string[] = [];
  const errors: string[] = [];
  const emailOn = env("RESEND_API_KEY") && env("EMAIL_FROM");
  if (staff && emailOn && env("ALERT_EMAIL_TO")) await sendEmail(env("ALERT_EMAIL_TO"), staff.subject, staff.text).then(() => done.push("staff email")).catch((e) => errors.push(e.message));
  if (staff && env("WHATSAPP_TOKEN") && env("WHATSAPP_PHONE_NUMBER_ID") && env("WHATSAPP_ALERT_TO") && env("WHATSAPP_ALERT_TEMPLATE"))
    await sendWhatsAppAlert(staff.subject).then(() => done.push("staff whatsapp")).catch((e) => errors.push(e.message));
  if (customer && emailOn) await sendEmail(customer.to, customer.subject, customer.text).then(() => done.push("customer email")).catch((e) => errors.push(e.message));

  const status = errors.length ? "failed" : done.length ? "sent" : "skipped";
  const detail = errors.length ? errors.join("; ") : done.length ? done.join(", ") : "no channel configured yet (see notify function header)";
  await db.from("notifications").update({ status, detail, sent_at: new Date().toISOString() }).eq("id", id);
  return new Response(JSON.stringify({ status, detail }), { status: 200, headers: { "Content-Type": "application/json" } });
});
