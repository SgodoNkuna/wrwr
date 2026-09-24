import { useEffect, useState } from "react";
import { Phone, Trash2 } from "lucide-react";
import { WhatsAppIcon } from "../components/Icons";
import { telLink, toWaNumber } from "../lib/format";
import { useAuth } from "../lib/auth";
import { useSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import type { Enquiry } from "../lib/types";
import { ErrorBox, PageHeader } from "./ui";

const STATUSES = ["new", "contacted", "closed"] as const;

export default function EnquiriesAdmin() {
  const { isAdmin } = useAuth();
  const { business } = useSettings();
  const [items, setItems] = useState<Enquiry[]>([]);
  const [filter, setFilter] = useState<"all" | Enquiry["status"]>("new");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    let q = supabase.from("enquiries").select("*, products(name)").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) setError(error.message);
    setItems((data as Enquiry[]) ?? []);
  };
  useEffect(() => { void load(); }, [filter]);

  const update = async (id: string, v: Partial<Enquiry>) => {
    const { error } = await supabase.from("enquiries").update(v).eq("id", id);
    if (error) setError(error.message); else void load();
  };
  const remove = async (e: Enquiry) => {
    if (!confirm(`Delete enquiry from ${e.name}?`)) return;
    const { error } = await supabase.from("enquiries").delete().eq("id", e.id);
    if (error) setError(error.message); else void load();
  };
  const reply = (e: Enquiry) =>
    `https://wa.me/${toWaNumber(e.phone)}?text=${encodeURIComponent(`Hi ${e.name}, thanks for your enquiry${e.products ? ` about ${e.products.name}` : ""} with ${business.name}. `)}`;

  return (
    <>
      <PageHeader title="Enquiries" action={
        <div className="flex gap-1">
          {(["new", "contacted", "closed", "all"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${filter === s ? "bg-farm-900 text-white" : "bg-white ring-1 ring-farm-900/15"}`}>{s}</button>
          ))}
        </div>
      } />
      <ErrorBox error={error} />
      {items.length === 0 && <p className="card p-6 text-sm text-farm-950/60">No {filter === "all" ? "" : filter} enquiries.</p>}
      <div className="space-y-3">
        {items.map((e) => (
          <div key={e.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{e.name} <span className="font-normal text-farm-950/60">· {e.products?.name ?? "General enquiry"}{e.quantity ? ` · Qty: ${e.quantity}` : ""}</span></p>
                <p className="text-xs text-farm-950/50">{new Date(e.created_at).toLocaleString("en-ZA")} · {e.phone}{e.email ? ` · ${e.email}` : ""}</p>
              </div>
              <select value={e.status} onChange={(ev) => update(e.id, { status: ev.target.value as Enquiry["status"] })} className="input w-auto py-1">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm">{e.message}</p>
            <textarea defaultValue={e.admin_notes ?? ""} placeholder="Internal notes (saved when you click away)" maxLength={2000} rows={2} className="input mt-3"
              onBlur={(ev) => ev.target.value !== (e.admin_notes ?? "") && update(e.id, { admin_notes: ev.target.value })} />
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={reply(e)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-1.5" onClick={() => e.status === "new" && update(e.id, { status: "contacted" })}><WhatsAppIcon className="h-4 w-4" />Reply</a>
              <a href={telLink(e.phone)} className="btn-outline py-1.5"><Phone className="h-4 w-4" />Call</a>
              {isAdmin && <button onClick={() => remove(e)} className="btn-outline py-1.5 text-red-600"><Trash2 className="h-4 w-4" />Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
