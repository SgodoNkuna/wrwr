import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Service } from "../lib/types";
import { ErrorBox, PageHeader, Toggle } from "./ui";

export default function ServicesAdmin() {
  const [items, setItems] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    setItems(data ?? []);
  };
  useEffect(() => { void load(); }, []);
  const set = (i: number, v: Partial<Service>) => setItems(items.map((s, j) => (j === i ? { ...s, ...v } : s)));

  const save = async (s: Service) => {
    setError(null);
    const { id, ...row } = s;
    const { error } = id ? await supabase.from("services").update(row).eq("id", id) : await supabase.from("services").insert(row);
    if (error) setError(error.message); else void load();
  };
  const remove = async (s: Service) => {
    if (!s.id) return setItems(items.filter((x) => x !== s));
    if (!confirm(`Delete service "${s.name}"?`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    if (error) setError(error.message); else void load();
  };

  return (
    <>
      <PageHeader title="Services" action={<button className="btn-primary" onClick={() => setItems([...items, { id: "", name: "", description: "", image_url: null, published: false, sort_order: items.length + 1 }])}><Plus className="h-4 w-4" />Add service</button>} />
      <p className="mb-4 text-sm text-farm-950/60">Published services appear on the About page. None are offered yet, so add them here when you're ready.</p>
      <ErrorBox error={error} />
      {items.length === 0 && <p className="card p-6 text-sm text-farm-950/60">No services yet.</p>}
      <div className="space-y-3">
        {items.map((s, i) => (
          <div key={s.id || `new-${i}`} className="card grid gap-3 p-4 md:grid-cols-[1fr_2fr_auto_auto] md:items-end">
            <div><label className="label">Name</label><input className="input" maxLength={120} value={s.name} onChange={(e) => set(i, { name: e.target.value })} /></div>
            <div><label className="label">Description</label><input className="input" maxLength={3000} value={s.description ?? ""} onChange={(e) => set(i, { description: e.target.value })} /></div>
            <Toggle label="Published" checked={s.published} onChange={(v) => set(i, { published: v })} />
            <div className="flex gap-1">
              <button onClick={() => save(s)} className="btn-green px-3"><Save className="h-4 w-4" /></button>
              <button onClick={() => remove(s)} className="btn-outline px-3 text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
