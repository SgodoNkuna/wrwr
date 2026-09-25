import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { trackOrder } from "../lib/orders";
import type { TrackedOrder } from "../lib/types";
import { usePageMeta } from "../lib/usePageMeta";
import { OrderDetails } from "./OrderPage";

export default function Track() {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  usePageMeta("Track your order", "Check the status of a Tshehla AgriHub order.");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      const found = await trackOrder(String(f.get("reference")), String(f.get("phone")));
      if (!found) setError("We couldn't find an order with that number and cellphone. Check both and try again.");
      setOrder(found);
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  };

  if (order) return <OrderDetails order={order} />;
  return (
    <div className="container-x max-w-xl py-12">
      <h1 className="text-6xl text-farm-900">Track your order</h1>
      <p className="mt-2 text-ink/70">You'll find your order number (it starts with <b>TA-</b>) on your confirmation page or in our WhatsApp message.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 border-2 border-ink bg-white p-5">
        <div><label className="label" htmlFor="tr-ref">Order number</label><input id="tr-ref" name="reference" required maxLength={20} placeholder="TA-260925-XXXXX" className="input font-mono uppercase" /></div>
        <div><label className="label" htmlFor="tr-phone">Cellphone used for the order</label><input id="tr-phone" name="phone" type="tel" required className="input" placeholder="071 234 5678" /></div>
        {error && <p className="text-sm font-bold text-sun-600" role="alert">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? "Looking…" : "Show my order"}</button>
      </form>
      <p className="mt-4 text-sm text-ink/70">Have an account? <Link to="/account" className="font-bold underline">Sign in</Link> to see all your orders.</p>
    </div>
  );
}
