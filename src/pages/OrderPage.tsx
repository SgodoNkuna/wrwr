import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { WhatsAppIcon } from "../components/Icons";
import { ItemsTable, OrderMeta, StatusTrail } from "../components/OrderView";
import { useAuth } from "../lib/auth";
import { formatRand, toWaNumber } from "../lib/format";
import { recallOrder, startOnlinePayment, trackOrder } from "../lib/orders";
import { useSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import type { TrackedOrder } from "../lib/types";
import { usePageMeta } from "../lib/usePageMeta";

/** Order confirmation / status page. Works for the buyer's own tab, signed-in customers, or reference + phone. */
export default function OrderPage() {
  const { reference = "" } = useParams();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [order, setOrder] = useState<TrackedOrder | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const remembered = recallOrder(reference);
  usePageMeta(`Order ${reference}`, "Your Tshehla AgriHub order.", { noindex: true });

  useEffect(() => {
    (async () => {
      if (remembered) { setOrder(await trackOrder(reference, remembered.phone).catch(() => null)); return; }
      if (session) {
        const { data } = await supabase.from("orders").select("*, order_items(*)").eq("reference", reference).maybeSingle();
        if (data) { setOrder({ ...data, items: data.order_items } as TrackedOrder); return; }
      }
      setOrder(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, session]);

  const lookup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const found = await trackOrder(reference, String(new FormData(e.currentTarget).get("phone"))).catch(() => null);
    if (!found) setError("That number doesn't match this order.");
    setOrder(found ?? null);
  };

  if (order === undefined) return <div className="container-x py-16 text-ink/60">Loading your order…</div>;
  if (order === null) return (
    <div className="container-x max-w-lg py-16">
      <h1 className="text-5xl text-farm-900">Order {reference}</h1>
      <p className="mt-3 text-ink/70">Enter the cellphone number you used to see this order.</p>
      <form onSubmit={lookup} className="mt-5 flex gap-2">
        <input name="phone" type="tel" required className="input" placeholder="071 234 5678" aria-label="Cellphone number" />
        <button className="btn-green">Show</button>
      </form>
      {error && <p className="mt-3 text-sm font-bold text-sun-600">{error}</p>}
    </div>
  );

  return <OrderDetails order={order} orderId={remembered?.orderId} paymentFlag={params.get("payment")} />;
}

export function OrderDetails({ order, orderId, paymentFlag }: { order: TrackedOrder; orderId?: string; paymentFlag?: string | null }) {
  const { business, payments } = useSettings();
  const [payError, setPayError] = useState<string | null>(null);
  const wa = `https://wa.me/${toWaNumber(business.whatsapp)}?text=${encodeURIComponent(`Hi ${business.name}, about my order ${order.reference}: `)}`;
  const hasBank = payments.bank_name && payments.account_number;

  return (
    <div className="container-x py-10">
      {paymentFlag === "cancelled" && <p className="mb-6 border-2 border-sun-500 bg-white p-3 font-bold text-sun-600">Payment was cancelled. Your order is saved; you can try again or pay another way.</p>}
      {paymentFlag === "return" && order.payment_status !== "paid" && <p className="mb-6 border-2 border-ink bg-white p-3">Thanks! We're waiting for PayFast to confirm your payment. Refresh this page in a minute to see it.</p>}
      <p className="font-hand text-3xl text-farm-700">{order.status === "new" ? "Got it, thank you!" : "Your order"}</p>
      <h1 className="text-5xl text-farm-900 sm:text-6xl">Order {order.reference}</h1>
      <div className="mt-4"><StatusTrail status={order.status} /></div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <OrderMeta {...order} />
          <div className="border-2 border-ink bg-white p-5"><ItemsTable items={order.items} total={order.total_cents} /></div>
        </div>

        <aside className="space-y-4 self-start">
          {order.payment_status === "paid" ? (
            <div className="rotate-[-1deg] bg-farm-900 p-6 text-paper"><p className="font-hand text-3xl">Paid, thank you.</p></div>
          ) : order.status === "cancelled" ? null : order.payment_method === "eft" ? (
            <div className="border-2 border-ink bg-[#fff6c9] p-5">
              <p className="font-display text-2xl uppercase">Pay by EFT</p>
              {hasBank ? (
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="font-bold">Bank</dt><dd>{payments.bank_name}</dd>
                  <dt className="font-bold">Account name</dt><dd>{payments.account_name}</dd>
                  <dt className="font-bold">Account no.</dt><dd className="font-mono">{payments.account_number}</dd>
                  <dt className="font-bold">Branch code</dt><dd className="font-mono">{payments.branch_code}</dd>
                  <dt className="font-bold">Reference</dt><dd className="font-mono font-bold">{order.reference}</dd>
                  <dt className="font-bold">Amount</dt><dd className="font-bold">{formatRand(order.total_cents)}</dd>
                </dl>
              ) : (
                <p className="mt-2 text-sm">We'll WhatsApp you our bank details. Use <b className="font-mono">{order.reference}</b> as the reference.</p>
              )}
              <p className="mt-3 text-sm text-ink/70">{payments.eft_note}</p>
            </div>
          ) : order.payment_method === "cash" ? (
            <div className="border-2 border-ink bg-[#fff6c9] p-5">
              <p className="font-display text-2xl uppercase">Pay when you collect</p>
              <p className="mt-1 text-sm">Bring {formatRand(order.total_cents)} (cash or card) when you collect. We'll WhatsApp you when it's ready.</p>
            </div>
          ) : (
            <div className="border-2 border-ink bg-white p-5">
              <p className="font-display text-2xl uppercase">Pay online</p>
              {orderId ? (
                <button className="btn-primary mt-3 w-full" onClick={() => startOnlinePayment(orderId, order.reference).catch((e) => setPayError(e.message))}>Pay {formatRand(order.total_cents)} now</button>
              ) : <p className="mt-1 text-sm">WhatsApp us and we'll send you a payment link.</p>}
              {payError && <p className="mt-2 text-sm font-bold text-sun-600">{payError}</p>}
            </div>
          )}
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full"><WhatsAppIcon className="h-4 w-4" /> WhatsApp us about this order</a>
          <p className="text-sm text-ink/60">Keep your order number. You can check it any time on <Link to="/track" className="font-bold underline">Track order</Link>.</p>
        </aside>
      </div>
    </div>
  );
}
