import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import { formatRand } from "../lib/format";
import { placeOrder, rememberOrder, startOnlinePayment } from "../lib/orders";
import { useSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import type { PaymentMethod } from "../lib/types";
import { usePageMeta } from "../lib/usePageMeta";
import { ItemsTable } from "../components/OrderView";

export default function Checkout() {
  const { lines, total, clear } = useCart();
  const { payments } = useSettings();
  const { session } = useAuth();
  const nav = useNavigate();
  const [fulfilment, setFulfilment] = useState<"collect" | "delivery">("collect");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [prefill, setPrefill] = useState({ name: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  usePageMeta("Checkout", "Place your order with Tshehla AgriHub.", { noindex: true });

  useEffect(() => {
    if (!session) return;
    supabase.from("profiles").select("full_name, phone, email").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => data && setPrefill({ name: data.full_name ?? "", phone: data.phone ?? "", email: data.email ?? "" }));
  }, [session]);

  const options: { id: PaymentMethod; label: string; note: string; enabled: boolean }[] = [
    { id: "payfast", label: "Pay online now", note: payments.online_enabled ? "Card or Instant EFT through PayFast." : "Card and Instant EFT are coming soon.", enabled: payments.online_enabled },
    { id: "eft", label: "EFT (bank transfer)", note: "We'll show our bank details after you order.", enabled: payments.eft_enabled },
    { id: "cash", label: "Pay when you collect", note: "Cash or card at the farm.", enabled: payments.cash_enabled },
  ];

  if (lines.length === 0) return (
    <div className="container-x py-16">
      <h1 className="text-6xl text-farm-900">Checkout</h1>
      <p className="mt-4 text-ink/70">Your basket is empty.</p>
      <Link to="/products" className="btn-primary mt-6">See what's for sale</Link>
    </div>
  );

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("website")) return; // honeypot
    if (!method) return setError("Please choose how you'll pay.");
    setBusy(true); setError(null);
    try {
      const phone = String(f.get("phone")).trim();
      const order = await placeOrder(lines, {
        name: String(f.get("name")).trim(), phone, email: String(f.get("email") || "").trim(),
        fulfilment, delivery_address: String(f.get("delivery_address") || ""), notes: String(f.get("notes") || ""),
        payment_method: method, consent: f.get("consent") === "on", accept_terms: f.get("terms") === "on",
      });
      rememberOrder(order.reference, order.order_id, phone);
      clear();
      if (order.payment_method === "payfast") {
        try { await startOnlinePayment(order.order_id, order.reference); return; } catch { /* fall through to order page */ }
      }
      nav(`/order/${order.reference}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="container-x py-10">
      <h1 className="text-6xl text-farm-900">Checkout</h1>
      <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <fieldset className="space-y-4">
            <legend className="font-display text-3xl uppercase">1. Your details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="co-name">Name *</label><input id="co-name" name="name" required minLength={2} maxLength={100} defaultValue={prefill.name} key={`n${prefill.name}`} className="input" autoComplete="name" /></div>
              <div><label className="label" htmlFor="co-phone">Cellphone *</label><input id="co-phone" name="phone" type="tel" required pattern="\+?[0-9 \(\)\-]{9,20}" defaultValue={prefill.phone} key={`p${prefill.phone}`} className="input" autoComplete="tel" placeholder="071 234 5678" /></div>
              <div className="sm:col-span-2"><label className="label" htmlFor="co-email">Email (for your receipt)</label><input id="co-email" name="email" type="email" maxLength={200} defaultValue={prefill.email} key={`e${prefill.email}`} className="input" autoComplete="email" /></div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-display text-3xl uppercase">2. Collection or delivery</legend>
            {(["collect", "delivery"] as const).map((v) => (
              <label key={v} className={`flex cursor-pointer items-start gap-3 border-2 p-3 ${fulfilment === v ? "border-ink bg-white" : "border-ink/20"}`}>
                <input type="radio" name="fulfilment" checked={fulfilment === v} onChange={() => setFulfilment(v)} className="mt-1 accent-farm-800" />
                <span><b>{v === "collect" ? "I'll collect at the farm" : "Please arrange delivery"}</b>
                  <span className="block text-sm text-ink/60">{v === "collect" ? "Gunyula Farm, Letsitele. We'll WhatsApp you when it's ready." : "We'll WhatsApp you a delivery quote before anything is sent."}</span></span>
              </label>
            ))}
            {fulfilment === "delivery" && (
              <div><label className="label" htmlFor="co-addr">Delivery address *</label><textarea id="co-addr" name="delivery_address" required rows={2} maxLength={500} className="input" /></div>
            )}
            <div><label className="label" htmlFor="co-notes">Anything we should know?</label><textarea id="co-notes" name="notes" rows={2} maxLength={1000} className="input" placeholder="e.g. collecting Saturday morning" /></div>
            <p className="font-hand text-xl text-ink/70">{payments.delivery_note}</p>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-display text-3xl uppercase">3. Payment</legend>
            {options.map((o) => (
              <label key={o.id} className={`flex items-start gap-3 border-2 p-3 ${!o.enabled ? "cursor-not-allowed border-dashed border-ink/20 opacity-60" : method === o.id ? "cursor-pointer border-ink bg-white" : "cursor-pointer border-ink/20"}`}>
                <input type="radio" name="payment" disabled={!o.enabled} checked={method === o.id} onChange={() => setMethod(o.id)} className="mt-1 accent-farm-800" />
                <span><b>{o.label}</b>{!o.enabled && o.id === "payfast" && <span className="ml-2 bg-yolk px-1.5 py-0.5 text-[11px] font-bold uppercase">Coming soon</span>}
                  <span className="block text-sm text-ink/60">{o.note}</span></span>
              </label>
            ))}
          </fieldset>

          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2"><input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 shrink-0 accent-farm-800" />
              <span>I accept the <Link to="/terms" target="_blank" className="font-bold underline">Terms of Use</Link> and the <Link to="/returns" target="_blank" className="font-bold underline">Orders &amp; Returns policy</Link>. *</span></label>
            <label className="flex items-start gap-2"><input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-farm-800" />
              <span>I agree that my details are used to process this order, as set out in the <Link to="/privacy" target="_blank" className="font-bold underline">Privacy Policy</Link>. *</span></label>
          </div>
        </div>

        <aside className="self-start border-2 border-ink bg-white p-5 lg:sticky lg:top-24">
          <p className="font-display text-3xl uppercase">Your order</p>
          <div className="mt-3"><ItemsTable items={lines.map((l) => ({ product_name: l.name, unit: l.unit, quantity: l.quantity, line_total_cents: l.unit_price_cents * l.quantity }))} total={total} /></div>
          {error && <p className="mt-3 border-2 border-sun-500 bg-sun-500/10 px-3 py-2 text-sm font-bold text-sun-600" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-4 w-full py-3 text-base">{busy ? "Placing order…" : `Place order · ${formatRand(total)}`}</button>
          <p className="mt-2 text-xs text-ink/60">Prices are in Rand. We check stock and prices again when you place the order.</p>
        </aside>
      </form>
    </div>
  );
}
