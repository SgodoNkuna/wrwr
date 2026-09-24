import { useEffect, useState, type FormEvent } from "react";
import { useSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import type { PaymentSettings } from "../lib/types";
import { AdminOnly } from "./AdminLayout";
import { ErrorBox, PageHeader, Toggle } from "./ui";

interface Probe { configured: boolean; enabled: boolean; sandbox: boolean }
interface PaymentEvent { id: number; event: string; processed: boolean; error: string | null; signature_valid: boolean | null; created_at: string; order_id: string | null }

export default function PaymentsAdmin() {
  const { payments, reload } = useSettings();
  const [form, setForm] = useState<PaymentSettings>(payments);
  const [probe, setProbe] = useState<Probe | null | "error">(null);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  useEffect(() => setForm(payments), [payments]);
  useEffect(() => {
    supabase.functions.invoke("payfast-checkout", { method: "GET" })
      .then(({ data, error }) => setProbe(error ? "error" : (data as Probe)));
    supabase.from("payment_events").select("*").order("created_at", { ascending: false }).limit(20).then(({ data }) => setEvents(data ?? []));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setOk(false);
    if (!form.eft_enabled && !form.cash_enabled && !form.online_enabled) return setError("Leave at least one way to pay switched on.");
    const { error } = await supabase.from("site_settings").upsert({ key: "payments", value: form });
    if (error) return setError(error.message);
    await reload(); setOk(true);
  };
  const set = <K extends keyof PaymentSettings>(k: K, v: PaymentSettings[K]) => setForm({ ...form, [k]: v });
  const keysReady = probe !== null && probe !== "error" && probe.configured;

  return (
    <AdminOnly>
      <PageHeader title="Payments" />
      <form onSubmit={save} className="space-y-6">
        <ErrorBox error={error} />
        {ok && <p className="rounded-tag bg-farm-100 px-3 py-2 text-sm text-farm-800">Saved. Checkout updates straight away.</p>}

        <section className="card space-y-3 p-5">
          <h2 className="font-sans text-lg font-bold normal-case">Online payments (PayFast)</h2>
          <p className="text-sm">
            Status:{" "}
            {probe === null ? "checking…" : probe === "error" ? <b className="text-sun-600">can't reach the payment service</b>
              : probe.configured ? <b className="text-farm-700">merchant keys installed{probe.sandbox ? " (SANDBOX test mode)" : " (LIVE)"}</b>
              : <b className="text-sun-600">not set up yet: no merchant keys</b>}
          </p>
          <Toggle label={keysReady ? "Offer 'Pay online' at checkout" : "Offer 'Pay online' at checkout (needs merchant keys first)"}
            checked={form.online_enabled} onChange={(v) => (keysReady || !v) && set("online_enabled", v)} />
          <details className="text-sm text-ink/70">
            <summary className="cursor-pointer font-bold text-ink">How to switch on online payments</summary>
            <ol className="ml-5 mt-2 list-decimal space-y-1">
              <li>Open a PayFast merchant account (payfast.io) in the business's name and complete verification.</li>
              <li>In the Supabase dashboard → Edge Functions → Secrets, add <code>PAYFAST_MERCHANT_ID</code>, <code>PAYFAST_MERCHANT_KEY</code>, <code>PAYFAST_PASSPHRASE</code>, <code>SITE_URL</code> and <code>PAYFAST_SANDBOX=true</code>.</li>
              <li>Test a sandbox payment end to end, then set <code>PAYFAST_SANDBOX=false</code>.</li>
              <li>Come back here and switch "Pay online" on.</li>
            </ol>
            <p className="mt-2">Keys are never stored in the website or this database; only the payment function can read them.</p>
          </details>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-sans text-lg font-bold normal-case sm:col-span-2">EFT (bank transfer)</h2>
          <div className="sm:col-span-2"><Toggle label="Offer EFT at checkout" checked={form.eft_enabled} onChange={(v) => set("eft_enabled", v)} /></div>
          {([["bank_name", "Bank"], ["account_name", "Account name"], ["account_number", "Account number"], ["branch_code", "Branch code"]] as const).map(([k, label]) => (
            <div key={k}><label className="label">{label}</label><input className="input" maxLength={100} value={form[k]} onChange={(e) => set(k, e.target.value)} /></div>
          ))}
          <div className="sm:col-span-2"><label className="label">Note shown with bank details</label><input className="input" maxLength={300} value={form.eft_note} onChange={(e) => set("eft_note", e.target.value)} /></div>
          <p className="text-xs text-ink/50 sm:col-span-2">If bank details are empty, customers are told you'll send them on WhatsApp.</p>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-sans text-lg font-bold normal-case">Pay on collection & delivery</h2>
          <Toggle label="Offer 'Pay when you collect'" checked={form.cash_enabled} onChange={(v) => set("cash_enabled", v)} />
          <div><label className="label">Collection / delivery note at checkout</label><input className="input" maxLength={300} value={form.delivery_note} onChange={(e) => set("delivery_note", e.target.value)} /></div>
        </section>

        <button className="btn-primary">Save payment settings</button>
      </form>

      <section className="card mt-6 p-5">
        <h2 className="font-sans text-lg font-bold normal-case">Payment log</h2>
        <p className="text-xs text-ink/50">Every online checkout and PayFast notification is logged here, including rejected ones.</p>
        {events.length === 0 ? <p className="mt-3 text-sm text-ink/50">Nothing yet.</p> : (
          <table className="mt-3 w-full text-xs">
            <tbody className="divide-y divide-ink/10">
              {events.map((e) => (
                <tr key={e.id}><td className="py-1.5">{new Date(e.created_at).toLocaleString("en-ZA")}</td><td>{e.event}</td>
                  <td className={e.processed ? "text-farm-700" : "font-bold text-sun-600"}>{e.processed ? "ok" : e.error}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminOnly>
  );
}
