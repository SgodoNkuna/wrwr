import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { slugify } from "../lib/format";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import type { Category } from "../lib/types";
import { ErrorBox, PageHeader, Toggle } from "./ui";

export default function CategoriesAdmin() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setItems(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const set = (i: number, v: Partial<Category>) => setItems(items.map((c, j) => (j === i ? { ...c, ...v } : c)));

  const save = async (c: Category) => {
    setError(null);
    const { id, ...row } = c;
    const { error } = id ? await supabase.from("categories").update(row).eq("id", id) : await supabase.from("categories").insert(row);
    if (error) return setError(error.message);
    setFlash(`Saved "${c.name}"`); setTimeout(() => setFlash(null), 2000); void load();
  };

  const remove = async (c: Category) => {
    if (!c.id) return setItems(items.filter((x) => x !== c));
    if (!confirm(`Delete category "${c.name}"? Its products will become uncategorised.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) setError(error.message); else void load();
  };

  return (
    <>
      <PageHeader title="Categories" action={<button className="btn-primary" onClick={() => setItems([...items, { id: "", slug: "", name: "", description: "", sort_order: items.length + 1, published: true }])}><Plus className="h-4 w-4" />Add category</button>} />
      <ErrorBox error={error} />
      {flash && <p className="mb-4 rounded-lg bg-farm-100 px-3 py-2 text-sm text-farm-800">{flash}</p>}
      <div className="space-y-3">
        {items.map((c, i) => (
          <div key={c.id || `new-${i}`} className="card grid gap-3 p-4 md:grid-cols-[1fr_1fr_2fr_80px_auto_auto] md:items-end">
            <label className="block"><span className="label">Name</span><input className="input" maxLength={80} value={c.name} onChange={(e) => set(i, { name: e.target.value, slug: c.id ? c.slug : slugify(e.target.value) })} /></label>
            <label className="block"><span className="label">Slug</span><input className="input" value={c.slug} onChange={(e) => set(i, { slug: slugify(e.target.value) })} /></label>
            <label className="block"><span className="label">Description</span><input className="input" maxLength={500} value={c.description ?? ""} onChange={(e) => set(i, { description: e.target.value })} /></label>
            <label className="block"><span className="label">Order</span><input type="number" className="input" value={c.sort_order} onChange={(e) => set(i, { sort_order: Number(e.target.value) })} /></label>
            <Toggle label="Visible" checked={c.published} onChange={(v) => set(i, { published: v })} />
            <div className="flex gap-1">
              <button onClick={() => save(c)} className="btn-green px-3" title="Save"><Save className="h-4 w-4" /></button>
              {(isAdmin || !c.id) && <button onClick={() => remove(c)} className="btn-outline px-3 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
