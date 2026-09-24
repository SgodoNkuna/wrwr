import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Enquiry } from "../lib/types";
import { PageHeader } from "./ui";

export default function Dashboard() {
  const [stats, setStats] = useState({ products: 0, hidden: 0, newEnq: 0, totalEnq: 0 });
  const [recent, setRecent] = useState<Enquiry[]>([]);

  useEffect(() => {
    (async () => {
      const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
      const [products, hidden, newEnq, totalEnq, rec] = await Promise.all([
        count(supabase.from("products").select("*", { count: "exact", head: true })),
        count(supabase.from("products").select("*", { count: "exact", head: true }).eq("published", false)),
        count(supabase.from("enquiries").select("*", { count: "exact", head: true }).eq("status", "new")),
        count(supabase.from("enquiries").select("*", { count: "exact", head: true })),
        supabase.from("enquiries").select("*, products(name)").order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({ products, hidden, newEnq, totalEnq });
      setRecent((rec.data as Enquiry[]) ?? []);
    })();
  }, []);

  const tiles = [
    { label: "New enquiries", value: stats.newEnq, to: "/admin/enquiries", hot: stats.newEnq > 0 },
    { label: "Total enquiries", value: stats.totalEnq, to: "/admin/enquiries" },
    { label: "Products", value: stats.products, to: "/admin/products" },
    { label: "Hidden products", value: stats.hidden, to: "/admin/products" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className={`card p-5 ${t.hot ? "border-sun-500 ring-2 ring-sun-500/30" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-farm-950/60">{t.label}</p>
            <p className="mt-2 font-display text-4xl">{t.value}</p>
          </Link>
        ))}
      </div>
      <div className="card mt-8 p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl">Latest enquiries</h2><Link to="/admin/enquiries" className="text-sm font-semibold text-farm-700">View all →</Link></div>
        {recent.length === 0 ? <p className="mt-4 text-sm text-farm-950/60">No enquiries yet.</p> : (
          <ul className="mt-4 divide-y divide-farm-900/10">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0"><p className="font-semibold">{e.name} <span className="font-normal text-farm-950/60">· {e.products?.name ?? "General"}</span></p><p className="truncate text-farm-950/60">{e.message}</p></div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${e.status === "new" ? "bg-sun-500 text-white" : "bg-farm-100 text-farm-800"}`}>{e.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
