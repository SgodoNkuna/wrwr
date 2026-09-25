import { formatDate, formatRand, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "../lib/format";
import type { OrderItem, OrderStatus } from "../lib/types";

const STEPS: OrderStatus[] = ["new", "confirmed", "ready", "completed"];

export function StatusTrail({ status }: { status: OrderStatus }) {
  if (status === "cancelled") return <p className="stamp -rotate-2 border-sun-500 text-sun-500">Cancelled</p>;
  const at = STEPS.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
      {STEPS.map((s, i) => (
        <li key={s} className={`flex items-center gap-2 ${i <= at ? "text-farm-800" : "text-ink/65"}`}>
          <span className={`inline-block h-3 w-3 rounded-full border-2 ${i <= at ? "border-farm-800 bg-farm-800" : "border-ink/30"}`} />
          {ORDER_STATUS_LABEL[s]}
          {i < STEPS.length - 1 && <span className="h-0.5 w-5 bg-current opacity-40" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

export function ItemsTable({ items, total, delivery = 0 }: { items: OrderItem[]; total: number; delivery?: number }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-ink/10">
        {items.map((i, k) => (
          <tr key={k}>
            <td className="py-2 pr-2">{i.quantity} × {i.product_name ?? i.name}{i.unit && <span className="text-ink/70"> ({i.unit})</span>}</td>
            <td className="py-2 text-right font-bold">{formatRand(i.line_total_cents)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        {delivery > 0 && (
          <>
            <tr className="border-t border-ink/20"><td className="py-2">Subtotal</td><td className="py-2 text-right">{formatRand(total - delivery)}</td></tr>
            <tr><td className="py-2">Delivery</td><td className="py-2 text-right">{formatRand(delivery)}</td></tr>
          </>
        )}
        <tr className="border-t-2 border-ink"><td className="py-2 font-display text-xl uppercase">Total</td><td className="py-2 text-right font-display text-2xl">{formatRand(total)}</td></tr>
      </tfoot>
    </table>
  );
}

export function OrderMeta({ created_at, payment_method, payment_status, fulfilment }: { created_at: string; payment_method: string; payment_status: string; fulfilment: string }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div><dt className="label">Placed</dt><dd>{formatDate(created_at)}</dd></div>
      <div><dt className="label">Payment</dt><dd>{PAYMENT_METHOD_LABEL[payment_method]}</dd></div>
      <div><dt className="label">Paid?</dt><dd className={payment_status === "paid" ? "font-bold text-farm-700" : ""}>{PAYMENT_STATUS_LABEL[payment_status]}</dd></div>
      <div><dt className="label">Getting it</dt><dd>{fulfilment === "delivery" ? "Delivery (arranged)" : "Collect at the farm"}</dd></div>
    </dl>
  );
}
