import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { formatRand, safeImage, slugify } from "../lib/format";
import { useAuth } from "../lib/auth";
import { IMAGE_BUCKET, supabase } from "../lib/supabase";
import type { Category, Product } from "../lib/types";
import { ErrorBox, Modal, PageHeader, Toggle } from "./ui";

type Draft = Omit<Product, "id" | "categories"> & { id?: string };
const empty: Draft = {
  category_id: null, slug: "", name: "", summary: "", description: "", image_url: "", unit: "",
  price_cents: null, show_price: false, in_stock: true, featured: false, published: true, highlights: [], sort_order: 0,
};

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProductsAdmin() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from("products").select("*, categories(slug, name)").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    setItems((p.data as Product[]) ?? []);
    setCats(c.data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const patch = async (id: string, values: Partial<Product>) => {
    const { error } = await supabase.from("products").update(values).eq("id", id);
    if (error) setError(error.message); else void load();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}" permanently? Consider hiding it instead.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) setError(error.message); else void load();
  };

  const upload = async (file: File) => {
    if (!TYPES.includes(file.type)) return setError("Only JPG, PNG or WebP images are allowed.");
    if (file.size > MAX_BYTES) return setError("Images must be 5 MB or smaller.");
    setBusy(true);
    const ext = file.type.split("/")[1];
    const path = `products/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (error) return setError(error.message);
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    setDraft((d) => (d ? { ...d, image_url: data.publicUrl } : d));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy(true); setError(null);
    const { id, ...values } = draft;
    const row = { ...values, slug: values.slug || slugify(values.name), image_url: values.image_url || null,
      highlights: values.highlights.map((h) => h.trim()).filter(Boolean) };
    const { error } = id ? await supabase.from("products").update(row).eq("id", id) : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) return setError(error.message.includes("duplicate") ? "That URL slug is already used by another product." : error.message);
    setDraft(null); void load();
  };

  return (
    <>
      <PageHeader title="Products" action={<button className="btn-primary" onClick={() => setDraft({ ...empty, sort_order: items.length + 1 })}><Plus className="h-4 w-4" />Add product</button>} />
      <ErrorBox error={error} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-farm-50 text-left text-xs uppercase tracking-wide text-farm-950/60">
            <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-farm-900/10">
            {items.map((p) => (
              <tr key={p.id} className={p.published ? "" : "opacity-60"}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {safeImage(p.image_url) ? <img src={safeImage(p.image_url)!} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-farm-100" />}
                    <div><p className="font-semibold">{p.name}</p><p className="text-xs text-farm-950/50">/{p.slug}</p></div>
                  </div>
                </td>
                <td className="p-3">{p.categories?.name ?? "—"}</td>
                <td className="p-3">{p.show_price && p.price_cents != null ? formatRand(p.price_cents) : <span className="text-farm-950/50">Enquire</span>}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {p.featured && <span className="rounded-full bg-sun-500 px-2 py-0.5 text-xs font-semibold text-white">Featured</span>}
                    {!p.in_stock && <span className="rounded-full bg-farm-950 px-2 py-0.5 text-xs font-semibold text-white">Sold out</span>}
                    {!p.published && <span className="rounded-full bg-farm-100 px-2 py-0.5 text-xs font-semibold">Hidden</span>}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button title="Feature" onClick={() => patch(p.id, { featured: !p.featured })} className="rounded-lg p-2 hover:bg-farm-50"><Star className={`h-4 w-4 ${p.featured ? "fill-sun-500 text-sun-500" : ""}`} /></button>
                    <button title={p.published ? "Hide" : "Publish"} onClick={() => patch(p.id, { published: !p.published })} className="rounded-lg p-2 hover:bg-farm-50">{p.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    <button title="Edit" onClick={() => { const { categories: _c, ...rest } = p; setDraft(rest); }} className="rounded-lg p-2 hover:bg-farm-50"><Pencil className="h-4 w-4" /></button>
                    {isAdmin && <button title="Delete" onClick={() => remove(p)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft && (
        <Modal title={draft.id ? "Edit product" : "New product"} onClose={() => setDraft(null)}>
          <form onSubmit={save} className="space-y-4">
            <ErrorBox error={error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Name *</label><input required maxLength={120} className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })} /></div>
              <div><label className="label">URL slug *</label><input required pattern="[a-z0-9-]{1,80}" className="input" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} /></div>
              <div><label className="label">Category</label>
                <select className="input" value={draft.category_id ?? ""} onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}>
                  <option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="label">Unit</label><input maxLength={60} className="input" placeholder="e.g. Box of 100 chicks" value={draft.unit ?? ""} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></div>
              <div><label className="label">Price (Rand)</label><input type="number" min={0} step="0.01" className="input" value={draft.price_cents != null ? draft.price_cents / 100 : ""} onChange={(e) => setDraft({ ...draft, price_cents: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} /></div>
              <div><label className="label">Sort order</label><input type="number" className="input" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></div>
            </div>
            <div><label className="label">Short summary</label><input maxLength={300} className="input" value={draft.summary ?? ""} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></div>
            <div><label className="label">Description</label><textarea rows={5} maxLength={5000} className="input" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div><label className="label">Highlights (one per line)</label><textarea rows={3} className="input" value={draft.highlights.join("\n")} onChange={(e) => setDraft({ ...draft, highlights: e.target.value.split("\n") })} /></div>
            <div>
              <label className="label">Image</label>
              <div className="flex items-center gap-3">
                {safeImage(draft.image_url) && <img src={safeImage(draft.image_url)!} alt="" className="h-16 w-16 rounded-lg object-cover" />}
                <label className="btn-outline cursor-pointer"><Upload className="h-4 w-4" />{busy ? "Uploading…" : "Upload"}
                  <input type="file" accept={TYPES.join(",")} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                {draft.image_url && <button type="button" className="text-sm text-red-600" onClick={() => setDraft({ ...draft, image_url: "" })}>Remove</button>}
              </div>
            </div>
            <div className="flex flex-wrap gap-5">
              <Toggle label="Show price publicly" checked={draft.show_price} onChange={(v) => setDraft({ ...draft, show_price: v })} />
              <Toggle label="In stock" checked={draft.in_stock} onChange={(v) => setDraft({ ...draft, in_stock: v })} />
              <Toggle label="Featured" checked={draft.featured} onChange={(v) => setDraft({ ...draft, featured: v })} />
              <Toggle label="Published" checked={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setDraft(null)}>Cancel</button><button disabled={busy} className="btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
