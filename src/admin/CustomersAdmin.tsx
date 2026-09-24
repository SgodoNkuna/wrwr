import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { WhatsAppIcon } from "../components/Icons";
import { formatDate, formatRand, toWaNumber } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Order, Profile } from "../lib/types";
import { PageHeader } from "./ui";

interface Row { key: string; name: string; phone: string; email: string | null; account: boolean; orders: number; spent: number; last: string }

/** Everyone who has ordered, plus registered customers who haven't yet. Grouped by account, else by phone. */
export default function CustomersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [staffIds, setStaffIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [o, p, r] = await Promise.all([
        supabase.from("orders").select("*").neq("status", "cancelled").order("created_at", { ascending: false }).limit(2000),
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id"),
      ]);
      setOrders((o.data as Order[]) ?? []);
      setProfiles((p.data as Profile[]) ?? []);
      setStaffIds(new Set((r.data ?? []).map((x) => x.user_id)));
    })();
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const p of profiles.filter((p) => !staffIds.has(p.id))) {
      map.set(p.id, { key: p.id, name: p.full_name || p.email, phone: p.phone ?? "", email: p.email, account: true, orders: 0, spent: 0, last: p.created_at });
    }
    for (const o of orders) {
      const key = o.customer_id ?? `phone:${o.phone.replace(/\D/g, "").slice(-9)}`;
      const r = map.get(key) ?? { key, name: o.customer_name, phone: o.phone, email: o.email, account: Boolean(o.customer_id), orders: 0, spent: 0, last: o.created_at };
      r.orders += 1;
      if (o.payment_status === "paid") r.spent += o.total_cents;
      if (o.created_at > r.last || r.orders === 1) r.last = o.created_at;
      if (!r.phone) r.phone = o.phone;
      map.set(key, r);
    }
    return [...map.values()]
      .filter((r) => !q || `${r.name} ${r.phone} ${r.email ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.last.localeCompare(a.last));
  }, [orders, profiles, staffIds, q]);

  return (
    <>
      <PageHeader title="Customers" action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or number" className="input w-64" />} />
      <p className="mb-4 text-sm text-ink/60">Guests are grouped by cellphone number. "Spent" counts paid orders only.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f3f1ea] text-left text-xs uppercase tracking-wide text-ink/60">
            <tr><th className="p-3">Customer</th><th className="p-3">Type</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Spent</th><th className="p-3">Last seen</th><th className="p-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink/50">No customers yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="p-3"><p className="font-bold">{r.name}</p><p className="text-xs text-ink/50">{r.phone}{r.email && ` · ${r.email}`}</p></td>
                <td className="p-3">{r.account ? "Account" : "Guest"}</td>
                <td className="p-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{r.orders}</td>
                <td className="p-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRand(r.spent)}</td>
                <td className="p-3">{formatDate(r.last)}</td>
                <td className="p-3 text-right">
                  {r.phone && <a href={`https://wa.me/${toWaNumber(r.phone)}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-[#1f8f4e]" aria-label={`WhatsApp ${r.name}`}><WhatsAppIcon className="h-5 w-5" /></a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink/50">To give someone staff access, use <Link to="/admin/users" className="underline">Users &amp; roles</Link>.</p>
    </>
  );
}
