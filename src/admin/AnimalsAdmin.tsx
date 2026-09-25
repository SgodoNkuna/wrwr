import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { formatRand, safeImage } from "../lib/format";
import { IMAGE_TYPES } from "../lib/image";
import { supabase } from "../lib/supabase";
import { uploadImage } from "../lib/upload";
import type { Animal, Product } from "../lib/types";
import { ErrorBox, Modal, PageHeader, Toggle } from "./ui";

type Draft = Omit<Animal, "id" | "products"> & { id?: string };
const STATUS_PILL = { available: "bg-farm-700 text-white", reserved: "bg-yolk text-ink", sold: "bg-ink/10 text-ink/70" };

/** Individual animals (or groups like "10 weaners") listed under a livestock product. */
export default function AnimalsAdmin() {
  const [items, setItems] = useState<Animal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [a, p] = await Promise.all([
      supabase.from("animals").select("*, products(name, slug)").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
    ]);
    setItems((a.data as Animal[]) ?? []);
    setProducts((p.data as Product[]) ?? []);
  };
  useEffect(() => { void load(); }, []);

  const blank = (): Draft => ({ product_id: products.find((p) => !p.orderable)?.id ?? products[0]?.id ?? "", tag: "", title: "", breed: "", sex: null,
    age_months: null, weight_kg: null, quantity: 1, price_cents: null, show_price: false, status: "available", image_url: null, notes: "", published: true, sort_order: items.length + 1 });

  const setStatus = async (a: Animal, status: Animal["status"]) => {
    const { error } = await supabase.from("animals").update({ status }).eq("id", a.id);
    if (error) setError(error.message); else void load();
  };
  const remove = async (a: Animal) => {
    if (!confirm(`Delete listing ${a.tag}?`)) return;
    const { error } = await supabase.from("animals").delete().eq("id", a.id);
    if (error) setError(error.message); else void load();
  };
  const upload = async (file: File) => {
    setBusy(true); setError(null);
    try { const url = await uploadImage(file, "animals"); setDraft((d) => (d ? { ...d, image_url: url } : d)); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy(true); setError(null);
    const { id, ...row } = draft;
    const clean = { ...row, title: row.title || null, breed: row.breed || null, notes: row.notes || null, image_url: row.image_url || null };
    const { error } = id ? await supabase.from("animals").update(clean).eq("id", id) : await supabase.from("animals").insert(clean);
    setBusy(false);
    if (error) return setError(error.message);
    setDraft(null); void load();
  };

  return (
    <>
      <PageHeader title="Livestock listings" action={<button className="btn-primary" onClick={() => setDraft(blank())}><Plus className="h-4 w-4" />Add animal</button>} />
      <p className="mb-4 text-sm text-ink/70">List individual animals (or a group, like 10 weaners) with a photo, age and weight. They show on the product page under "Available now". Mark them reserved or sold as they go.</p>
      <ErrorBox error={error} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f3f1ea] text-left text-xs uppercase tracking-wide text-ink/70">
            <tr><th className="p-3">Animal</th><th className="p-3">Details</th><th className="p-3">Price</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {items.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-ink/70">No listings yet.</td></tr>}
            {items.map((a) => (
              <tr key={a.id} className={a.published ? "" : "opacity-60"}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {safeImage(a.image_url) ? <img src={safeImage(a.image_url)!} alt="" className="h-10 w-10 rounded-tag object-cover" /> : <div className="h-10 w-10 rounded-tag bg-kraft-light" />}
                    <div><p className="font-bold">{a.tag} · {a.title || a.products?.name}</p><p className="text-xs text-ink/70">{a.products?.name}</p></div>
                  </div>
                </td>
                <td className="p-3 text-ink/70">{[a.breed, a.sex, a.age_months != null && `${a.age_months} mo`, a.weight_kg != null && `${a.weight_kg} kg`, a.quantity > 1 && `×${a.quantity}`].filter(Boolean).join(" · ")}</td>
                <td className="p-3">{a.show_price && a.price_cents != null ? formatRand(a.price_cents) : <span className="text-ink/70">Ask</span>}</td>
                <td className="p-3">
                  <select value={a.status} onChange={(e) => setStatus(a, e.target.value as Animal["status"])} className={`rounded-tag px-2 py-1 text-xs font-bold ${STATUS_PILL[a.status]}`} aria-label={`Status of ${a.tag}`}>
                    <option value="available">available</option><option value="reserved">reserved</option><option value="sold">sold</option>
                  </select>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button title="Edit" aria-label={`Edit ${a.tag}`} onClick={() => { const { products: _p, ...rest } = a; setDraft(rest); }} className="rounded-tag p-2 hover:bg-ink/5"><Pencil className="h-4 w-4" /></button>
                    <button title="Delete" aria-label={`Delete ${a.tag}`} onClick={() => remove(a)} className="rounded-tag p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft && (
        <Modal title={draft.id ? `Edit ${draft.tag}` : "New listing"} onClose={() => setDraft(null)}>
          <form onSubmit={save} className="space-y-4">
            <ErrorBox error={error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="an-product">Product *</label>
                <select id="an-product" required className="input" value={draft.product_id} onChange={(e) => setDraft({ ...draft, product_id: e.target.value })}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div><label className="label" htmlFor="an-tag">Tag / ear number *</label><input id="an-tag" required maxLength={40} className="input" value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} placeholder="e.g. C-014" /></div>
              <div><label className="label" htmlFor="an-title">Title</label><input id="an-title" maxLength={120} className="input" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Bonsmara heifer" /></div>
              <div><label className="label" htmlFor="an-breed">Breed</label><input id="an-breed" maxLength={80} className="input" value={draft.breed ?? ""} onChange={(e) => setDraft({ ...draft, breed: e.target.value })} /></div>
              <div><label className="label" htmlFor="an-sex">Sex</label>
                <select id="an-sex" className="input" value={draft.sex ?? ""} onChange={(e) => setDraft({ ...draft, sex: (e.target.value || null) as Draft["sex"] })}>
                  <option value="">Not stated</option><option value="female">Female</option><option value="male">Male</option><option value="mixed">Mixed group</option>
                </select></div>
              <div><label className="label" htmlFor="an-qty">How many in this listing</label><input id="an-qty" type="number" min={1} max={500} className="input" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} /></div>
              <div><label className="label" htmlFor="an-age">Age (months)</label><input id="an-age" type="number" min={0} max={600} className="input" value={draft.age_months ?? ""} onChange={(e) => setDraft({ ...draft, age_months: e.target.value === "" ? null : Math.floor(Number(e.target.value)) })} /></div>
              <div><label className="label" htmlFor="an-kg">Weight (kg)</label><input id="an-kg" type="number" min={0} step="0.1" className="input" value={draft.weight_kg ?? ""} onChange={(e) => setDraft({ ...draft, weight_kg: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><label className="label" htmlFor="an-price">Price (Rand{draft.quantity > 1 ? ", each" : ""})</label><input id="an-price" type="number" min={0} step="0.01" className="input" value={draft.price_cents != null ? draft.price_cents / 100 : ""} onChange={(e) => setDraft({ ...draft, price_cents: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} /></div>
              <div><label className="label" htmlFor="an-status">Status</label>
                <select id="an-status" className="input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })}>
                  <option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option>
                </select></div>
            </div>
            <div><label className="label" htmlFor="an-notes">Notes</label><textarea id="an-notes" rows={3} maxLength={2000} className="input" value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Temperament, vaccinations, pregnancy status…" /></div>
            <div>
              <p className="label">Photo</p>
              <div className="flex items-center gap-3">
                {safeImage(draft.image_url) && <img src={safeImage(draft.image_url)!} alt="" className="h-16 w-16 rounded-tag object-cover" />}
                <label className="btn-outline cursor-pointer"><Upload className="h-4 w-4" />{busy ? "Uploading…" : "Upload"}
                  <input type="file" accept={IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                <span className="text-xs text-ink/70">Resized automatically; location data removed.</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-5">
              <Toggle label="Show price publicly" checked={draft.show_price} onChange={(v) => setDraft({ ...draft, show_price: v })} />
              <Toggle label="Published" checked={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setDraft(null)}>Cancel</button><button disabled={busy} className="btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
