import { Link } from "react-router-dom";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "../lib/cart";
import { formatRand } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";

export default function Basket() {
  const { lines, update, total } = useCart();
  usePageMeta("Your basket", "Items you've picked to order from Tshehla AgriHub.", { noindex: true });

  if (lines.length === 0) return (
    <div className="container-x py-16">
      <h1 className="text-6xl text-farm-900">Your basket</h1>
      <p className="mt-4 font-hand text-3xl text-ink/70">Nothing in here yet.</p>
      <Link to="/products" className="btn-primary mt-6">See what's for sale</Link>
    </div>
  );

  return (
    <div className="container-x py-10">
      <h1 className="text-6xl text-farm-900">Your basket</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <ul className="divide-y-2 divide-ink/10 border-y-2 border-ink">
          {lines.map((l) => (
            <li key={l.product_id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <Link to={`/products/${l.slug}`} className="font-display text-2xl uppercase hover:text-sun-500">{l.name}</Link>
                <p className="text-sm text-ink/70">{formatRand(l.unit_price_cents)} {l.unit && `· ${l.unit}`}</p>
              </div>
              <div className="flex items-center border-2 border-ink">
                <button className="p-2" onClick={() => update(l.product_id, l.quantity - 1)} aria-label={`Fewer ${l.name}`}><Minus className="h-4 w-4" /></button>
                <span className="w-10 text-center font-bold">{l.quantity}</span>
                <button className="p-2 disabled:opacity-30" disabled={l.quantity >= l.max} onClick={() => update(l.product_id, l.quantity + 1)} aria-label={`More ${l.name}`}><Plus className="h-4 w-4" /></button>
              </div>
              <p className="w-24 text-right font-display text-2xl">{formatRand(l.unit_price_cents * l.quantity)}</p>
              <button onClick={() => update(l.product_id, 0)} className="p-1 text-ink/70 hover:text-sun-500" aria-label={`Remove ${l.name}`}><X className="h-5 w-5" /></button>
            </li>
          ))}
        </ul>
        <aside className="self-start border-2 border-ink bg-white p-5">
          <div className="flex items-baseline justify-between"><span className="font-display text-2xl uppercase">Total</span><span className="font-display text-4xl">{formatRand(total)}</span></div>
          <p className="mt-2 text-xs text-ink/70">Final prices are confirmed when you place the order. Delivery, if you need it, is quoted separately.</p>
          <Link to="/checkout" className="btn-primary mt-5 w-full py-3 text-base">Checkout</Link>
          <Link to="/products" className="mt-3 block text-center text-sm font-bold underline underline-offset-4">Keep shopping</Link>
        </aside>
      </div>
    </div>
  );
}
