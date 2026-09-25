import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate, formatRand, ORDER_STATUS_LABEL } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Enquiry, Order, Product } from "../lib/types";
import OrdersChart, { type DayCount } from "./OrdersChart";
import { PageHeader } from "./ui";

const sast = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" }); // YYYY-MM-DD

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [openRequests, setOpenRequests] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 45 * 864e5).toISOString();
      const [o, e, p, r] = await Promise.all([
        supabase.from("orders").select("*").gte("created_at", since).order("created_at", { ascending: false }),
        supabase.from("enquiries").select("*, products(name)").eq("status", "new").order("created_at", { ascending: false }).limit(5),
        supabase.from("products").select("*").not("stock_qty", "is", null).lte("stock_qty", 10).order("stock_qty"),
        supabase.from("data_requests").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      ]);
      setOrders((o.data as Order[]) ?? []);
      setEnquiries((e.data as Enquiry[]) ?? []);
      setLowStock((p.data as Product[]) ?? []);
      setOpenRequests(r.count ?? 0);
      setLoaded(true);
    })();
  }, []);

  const live = orders.filter((o) => o.status !== "cancelled");
  const monthStart = sast(new Date()).slice(0, 7);
  const paidThisMonth = live.filter((o) => o.payment_status === "paid" && sast(new Date(o.paid_at ?? o.created_at)).startsWith(monthStart));
  const toHandle = live.filter((o) => o.status === "new" || o.status === "confirmed");
  const awaitingPayment = live.filter((o) => o.payment_status !== "paid" && o.status !== "completed");

  const days: DayCount[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5);
    const key = sast(d);
    const todays = live.filter((o) => sast(new Date(o.created_at)) === key);
    return { date: key, label: d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" }),
      count: todays.length, revenue: todays.reduce((s, o) => s + o.total_cents, 0) };
  });

  const tiles = [
    { label: "Orders to handle", value: String(toHandle.length), to: "/admin/orders", hot: toHandle.length > 0 },
    { label: "Awaiting payment", value: formatRand(awaitingPayment.reduce((s, o) => s + o.total_cents, 0)), sub: `${awaitingPayment.length} orders`, to: "/admin/orders" },
    { label: "Paid this month", value: formatRand(paidThisMonth.reduce((s, o) => s + o.total_cents, 0)), sub: `${paidThisMonth.length} orders`, to: "/admin/orders" },
    { label: "New enquiries", value: String(enquiries.length), to: "/admin/enquiries", hot: enquiries.length > 0 },
  ];

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className={`card p-4 ${t.hot ? "border-l-4 border-l-sun-500" : ""}`}>
            <p className="text-sm text-ink/70">{t.label}</p>
            <p className="mt-1 text-3xl font-bold text-ink">{loaded ? t.value : "…"}</p>
            {t.sub && <p className="text-xs text-ink/70">{t.sub}</p>}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <h2 className="font-sans text-base font-bold normal-case">Orders per day, last 14 days</h2>
          <p className="text-xs text-ink/70">Cancelled orders excluded. Hover or tab onto a day for its value.</p>
          <div className="mt-3"><OrdersChart days={days} /></div>
        </section>

        <section className="card p-5">
          <h2 className="font-sans text-base font-bold normal-case">Needs attention</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {toHandle.slice(0, 6).map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <Link to={`/admin/orders?open=${o.id}`} className="font-bold hover:underline">{o.reference}</Link>
                <span className="truncate text-ink/70">{o.customer_name} · {ORDER_STATUS_LABEL[o.status]}</span>
              </li>
            ))}
            {lowStock.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <Link to="/admin/products" className="font-bold hover:underline">{p.name}</Link>
                <span className={p.stock_qty === 0 ? "font-bold text-sun-600" : "text-ink/70"}>{p.stock_qty === 0 ? "Out of stock" : `${p.stock_qty} left`}</span>
              </li>
            ))}
            {openRequests > 0 && (
              <li className="flex justify-between gap-2"><Link to="/admin/privacy" className="font-bold hover:underline">Privacy requests</Link><span className="text-ink/70">{openRequests} open</span></li>
            )}
            {loaded && toHandle.length === 0 && lowStock.length === 0 && openRequests === 0 && <li className="text-ink/70">All caught up.</li>}
          </ul>
        </section>
      </div>

      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between"><h2 className="font-sans text-base font-bold normal-case">Latest enquiries</h2><Link to="/admin/enquiries" className="text-sm font-bold text-farm-700">View all →</Link></div>
        {enquiries.length === 0 ? <p className="mt-3 text-sm text-ink/70">No new enquiries.</p> : (
          <ul className="mt-3 divide-y divide-ink/10">
            {enquiries.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <p className="font-bold">{e.name} <span className="font-normal text-ink/70">· {e.products?.name ?? "General"} · {formatDate(e.created_at)}</span></p>
                <p className="truncate text-ink/70">{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
