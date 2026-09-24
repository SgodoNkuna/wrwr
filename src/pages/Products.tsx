import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { useCatalogue } from "../lib/useCatalogue";

export default function Products() {
  const { categories, products, loading, error } = useCatalogue();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const active = params.get("category") ?? "all";

  const list = useMemo(() => products.filter((p) =>
    (active === "all" || p.categories?.slug === active) &&
    (!q || `${p.name} ${p.summary ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [products, active, q]);

  return (
    <div className="container-x py-12">
      <h1 className="text-4xl sm:text-5xl">Our products</h1>
      <p className="mt-2 text-farm-950/70">Livestock, poultry and fresh produce from Gunyula Farm. Tap <b>Enquire</b> to get a price on WhatsApp.</p>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {[{ slug: "all", name: "All" }, ...categories].map((c) => (
            <button key={c.slug} onClick={() => setParams(c.slug === "all" ? {} : { category: c.slug })}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${active === c.slug ? "bg-farm-900 text-white" : "bg-white text-farm-900 ring-1 ring-farm-900/15 hover:bg-farm-50"}`}>
              {c.name}
            </button>
          ))}
        </div>
        <label className="relative md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-farm-950/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="input pl-9" aria-label="Search products" />
        </label>
      </div>

      {error && <p className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      {loading ? <p className="mt-10 text-farm-950/60">Loading products…</p> : list.length === 0 ? (
        <p className="mt-10 text-farm-950/60">No products match your search.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
