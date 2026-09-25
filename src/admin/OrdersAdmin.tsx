import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Phone } from "lucide-react";
import { WhatsAppIcon } from "../components/Icons";
import { ItemsTable } from "../components/OrderView";
import { useAuth } from "../lib/auth";
import { formatDate, formatRand, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, telLink, toWaNumber } from "../lib/format";
import { useSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import type { Order, OrderStatus } from "../lib/types";
import { ErrorBox, Modal, PageHeader } from "./ui";
import { requestApproval } from "../lib/approvals";
import { downloadCsv } from "../lib/csv";

const FILTERS = ["open", "new", "confirmed", "ready", "completed", "cancelled", "all"] as const;
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { new: "confirmed", confirmed: "ready", ready: "completed" };
const STATUS_PILL: Record<string, string> = {
  new: "bg-sun-500 text-white", confirmed: "bg-yolk text-ink", ready: "bg-farm-700 text-white", completed: "bg-farm-100 text-farm-800", cancelled: "bg-ink/10 text-ink/70 line-through",
};

export default function OrdersAdmin() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("open");
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const openId = params.get("open");
  const open = orders.find((o) => o.id === openId) ?? null;

  const load = async () => {
    let q = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(300);
    if (filter === "open") q = q.in("status", ["new", "confirmed", "ready"]);
    else if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) setError(error.message);
    setOrders((data as Order[]) ?? []);
  };
  useEffect(() => { void load(); }, [filter]);
  useEffect(() => {
    // Deep link from the dashboard to an order outside the current filter.
    if (openId && !orders.some((o) => o.id === openId) && orders.length && filter !== "all") setFilter("all");
  }, [openId, orders, filter]);

  const exportCsv = async () => {
    const from = window.prompt("Export orders from (YYYY-MM-DD):", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
    if (!from) return;
    const to = window.prompt("…up to and including (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!to) return;
    const { data, error } = await supabase.from("orders").select("*, order_items(*)")
      .gte("created_at", `${from}T00:00:00+02:00`).lte("created_at", `${to}T23:59:59+02:00`).order("created_at");
    if (error) return setError(error.message);
    const r = (c: number) => (c / 100).toFixed(2);
    downloadCsv(`orders-${from}-to-${to}.csv`, [
      ["Order", "Date", "Customer", "Cellphone", "Email", "Items", "Subtotal (R)", "Delivery (R)", "Total (R)", "Payment method", "Payment status", "Paid at", "Payment ref", "Status", "Test"],
      ...((data as Order[]) ?? []).map((o) => [o.reference, new Date(o.created_at).toLocaleString("en-ZA"), o.customer_name, o.phone, o.email,
        o.order_items?.map((i) => `${i.quantity} x ${i.product_name}`).join("; "), r(o.subtotal_cents), r(o.delivery_cents), r(o.total_cents),
        PAYMENT_METHOD_LABEL[o.payment_method], PAYMENT_STATUS_LABEL[o.payment_status], o.paid_at ? new Date(o.paid_at).toLocaleString("en-ZA") : "",
        o.payment_reference, ORDER_STATUS_LABEL[o.status], o.is_test ? "yes" : ""]),
    ]);
  };

  const update = async (id: string, v: Partial<Order>) => {
    setError(null);
    const { error } = await supabase.from("orders").update(v).eq("id", id);
    if (error) setError(error.message); else await load();
  };

  return (
    <>
      <PageHeader title="Orders" action={
        <div className="flex flex-wrap items-center gap-1">
          <button onClick={exportCsv} className="btn-outline mr-2 py-1.5">Export CSV</button>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-tag px-3 py-1.5 text-sm font-bold capitalize ${filter === f ? "bg-ink text-paper" : "bg-white ring-1 ring-ink/15"}`}>{f === "open" ? "To do" : f}</button>
          ))}
        </div>
      } />
      <ErrorBox error={error} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f3f1ea] text-left text-xs uppercase tracking-wide text-ink/70">
            <tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3 text-right">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {orders.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink/70">No orders here.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="cursor-pointer hover:bg-yolk/10" onClick={() => setParams({ open: o.id })}>
                <td className="p-3"><p className="font-mono font-bold">{o.reference}</p><p className="text-xs text-ink/70">{formatDate(o.created_at)}{o.is_test && " · TEST"}</p></td>
                <td className="p-3"><p className="font-bold">{o.customer_name}</p><p className="text-xs text-ink/70">{o.phone}</p></td>
                <td className="max-w-[16rem] truncate p-3 text-ink/70">{o.order_items?.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</td>
                <td className="p-3 text-right font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRand(o.total_cents)}</td>
                <td className="p-3"><p className={o.payment_status === "paid" ? "font-bold text-farm-700" : ""}>{PAYMENT_STATUS_LABEL[o.payment_status]}</p><p className="text-xs text-ink/70">{PAYMENT_METHOD_LABEL[o.payment_method]}</p></td>
                <td className="p-3"><span className={`rounded-tag px-2 py-0.5 text-xs font-bold ${STATUS_PILL[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <OrderModal order={open} isAdmin={isAdmin} onClose={() => setParams({})} onUpdate={(v) => update(open.id, v)} onMessage={setError} />}
    </>
  );
}

function OrderModal({ order: o, isAdmin, onClose, onUpdate, onMessage }: { order: Order; isAdmin: boolean; onClose: () => void; onUpdate: (v: Partial<Order>) => Promise<void>; onMessage: (m: string) => void }) {
  const { business } = useSettings();
  const [payRef, setPayRef] = useState(o.payment_reference ?? "");
  const [delivery, setDelivery] = useState(o.delivery_cents ? String(o.delivery_cents / 100) : "");
  const [note, setNote] = useState<string | null>(null);
  const ask = async (action: "delete_order" | "refund_order", what: string) => {
    try { const msg = await requestApproval(action, o.id, what); if (msg) setNote(msg); }
    catch (e) { onMessage((e as Error).message); }
  };
  const next = NEXT[o.status];
  const waText = (msg: string) => `https://wa.me/${toWaNumber(o.phone)}?text=${encodeURIComponent(`Hi ${o.customer_name.split(" ")[0]}, it's ${business.name} about your order ${o.reference}. ${msg}`)}`;
  const messages: Record<string, string> = {
    confirmed: "We've confirmed your order and are getting it ready.",
    ready: "Your order is ready to collect at the farm.",
    unpaid: `The total is ${formatRand(o.total_cents)}. Please use ${o.reference} as your payment reference.`,
    delivery: `Delivery to you will be ${formatRand(o.delivery_cents)}, so your new total is ${formatRand(o.total_cents)}.`,
  };

  return (
    <Modal title={`Order ${o.reference}`} onClose={onClose}>
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`rounded-tag px-2 py-1 text-xs font-bold ${STATUS_PILL[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
          <span className="text-ink/70">Placed {new Date(o.created_at).toLocaleString("en-ZA")}{o.is_test && " · TEST ORDER"}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">Customer</p>
            <p className="font-bold">{o.customer_name}</p>
            <p>{o.phone}{o.email && ` · ${o.email}`}</p>
            <p className="text-ink/70">{o.customer_id ? "Has an account" : "Guest checkout"}</p>
            <div className="mt-2 flex gap-2">
              <a href={waText("")} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-3 py-1.5"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a>
              <a href={telLink(o.phone)} className="btn-outline px-3 py-1.5"><Phone className="h-4 w-4" />Call</a>
            </div>
          </div>
          <div>
            <p className="label">Fulfilment</p>
            <p className="font-bold">{o.fulfilment === "delivery" ? "Delivery (arrange & quote)" : "Collect at the farm"}</p>
            {o.delivery_address && <p className="whitespace-pre-line">{o.delivery_address}</p>}
            {o.notes && <p className="mt-2 rounded-tag bg-yolk/20 p-2"><b>Customer note:</b> {o.notes}</p>}
          </div>
        </div>

        <div className="border-y border-ink/10 py-2"><ItemsTable items={o.order_items ?? []} total={o.total_cents} delivery={o.delivery_cents} /></div>
        {note && <p className="rounded-tag bg-farm-100 px-3 py-2 text-farm-800">{note}</p>}

        {o.fulfilment === "delivery" && (
          <div>
            <p className="label">Delivery charge</p>
            {o.payment_status === "paid" ? <p>{formatRand(o.delivery_cents)} (locked: order is paid)</p> : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">R</span>
                <input type="number" min={0} step="0.01" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="input w-32 py-1.5" aria-label="Delivery charge in Rand" />
                <button className="btn-green px-3 py-1.5" onClick={() => onUpdate({ delivery_cents: Math.max(0, Math.round(Number(delivery || 0) * 100)) })}>Save delivery</button>
                {o.delivery_cents > 0 && <a href={waText(messages.delivery)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#177a41] underline">WhatsApp: delivery quote</a>}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">Payment</p>
            <p><b>{PAYMENT_STATUS_LABEL[o.payment_status]}</b> · {PAYMENT_METHOD_LABEL[o.payment_method]}</p>
            {o.paid_at && <p className="text-ink/70">Paid {new Date(o.paid_at).toLocaleString("en-ZA")}</p>}
            {o.payment_status !== "paid" ? (
              <div className="mt-2 flex gap-2">
                <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Bank / receipt ref (optional)" maxLength={100} className="input py-1.5" />
                <button className="btn-green shrink-0 px-3 py-1.5" onClick={() => onUpdate({ payment_status: "paid", paid_at: new Date().toISOString(), payment_reference: payRef || null, status: o.status === "new" ? "confirmed" : o.status })}>Mark paid</button>
              </div>
            ) : isAdmin && (
              <button className="mt-2 text-xs font-bold text-sun-600 underline" onClick={() => ask("refund_order", `Refund order ${o.reference} (${formatRand(o.total_cents)})?`)}>Request refund…</button>
            )}
          </div>
          <div>
            <p className="label">Move it along</p>
            <div className="flex flex-wrap gap-2">
              {next && <button className="btn-primary px-3 py-1.5" onClick={() => onUpdate({ status: next })}>Mark {ORDER_STATUS_LABEL[next].toLowerCase()}</button>}
              {o.status !== "cancelled" && o.status !== "completed" && (
                <button className="btn-outline px-3 py-1.5" onClick={() => confirm("Cancel this order? Stock goes back on the shelf.") && onUpdate({ status: "cancelled" })}>Cancel order</button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 text-xs font-bold text-[#177a41]">
              {o.status === "new" && <a href={waText(messages.confirmed)} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp: confirmed</a>}
              {(o.status === "confirmed" || o.status === "ready") && <a href={waText(messages.ready)} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp: ready to collect</a>}
              {o.payment_status !== "paid" && <a href={waText(messages.unpaid)} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp: payment reminder</a>}
            </div>
          </div>
        </div>

        <div>
          <p className="label">Internal notes</p>
          <textarea defaultValue={o.admin_notes ?? ""} rows={2} maxLength={2000} className="input" placeholder="Only staff see this. Saved when you click away."
            onBlur={(e) => e.target.value !== (o.admin_notes ?? "") && onUpdate({ admin_notes: e.target.value })} />
        </div>

        {isAdmin && (
          <div className="flex justify-end border-t border-ink/10 pt-3">
            <button className="text-xs font-bold text-red-700 underline" onClick={() => ask("delete_order", `Permanently delete order ${o.reference}? Keep real orders for 5 years for tax records; delete only test or duplicate orders.`)}>Request deletion…</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
