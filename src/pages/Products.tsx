import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useCatalogue } from "../lib/useCatalogue";
import { usePageMeta } from "../lib/usePageMeta";

export default function Products() {
  const { categories, products, loading, error } = useCatalogue();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const active = params.get("category") ?? "all";
  usePageMeta("Products", "Cattle, goats, pigs, broiler chicks, Brahma chickens, turkeys, geese, ducks, ostriches, green peppers and green beans from Letsitele, Limpopo.");

  const list = useMemo(() => products.filter((p) =>
    (active === "all" || p.categories?.slug === active) &&
    (!q || `${p.name} ${p.summary ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [products, active, q]);

  return (
    <div className="container-x py-10">
      <h1 className="text-6xl text-farm-900 sm:text-7xl">What's for sale</h1>
      <p className="mt-2 max-w-2xl text-ink/75">Priced items can be ordered here. For everything else, send us a WhatsApp and we'll tell you what we have and what it costs.</p>

      <div className="mt-8 flex flex-col gap-4 border-y-2 border-ink py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-2" role="tablist">
          {[{ slug: "all", name: "Everything" }, ...categories].map((c) => (
            <button key={c.slug} role="tab" aria-selected={active === c.slug}
              onClick={() => setParams(c.slug === "all" ? {} : { category: c.slug })}
              className={`font-display text-xl uppercase ${active === c.slug ? "text-sun-500" : "text-ink/60 hover:text-ink"}`}>
              {c.name}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. goats" className="input md:w-64" aria-label="Search products" />
      </div>

      {error && <p className="mt-8 border-2 border-sun-500 bg-white p-4 text-sun-600">{error}</p>}
      {loading ? <p className="mt-10 text-ink/60">Loading…</p> : list.length === 0 ? (
        <p className="mt-10 font-hand text-3xl text-ink/60">Nothing matches that. Try another word?</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
