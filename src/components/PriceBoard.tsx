import { Link } from "react-router-dom";
import { formatDate, formatRand } from "../lib/format";
import type { Category, Product } from "../lib/types";

/** "Today at the farm gate": a chalkboard price list generated from live stock and prices. */
export default function PriceBoard({ categories, products, animalCounts = {} }: { categories: Category[]; products: Product[]; animalCounts?: Record<string, number> }) {
  const updated = products.reduce<string | undefined>((max, p) => { const d = p.price_updated_at ?? p.updated_at; return d && (!max || d > max) ? d : max; }, undefined);
  return (
    <div className="chalkboard rounded-sm px-6 pb-8 pt-7 sm:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-hand text-4xl normal-case text-paper sm:text-5xl">Today at the farm gate</h2>
        {updated && <p className="font-hand text-xl text-chalk-line/70">prices as at {formatDate(updated)}</p>}
      </div>
      <div className="mt-6 grid gap-x-12 gap-y-8 md:grid-cols-2">
        {categories.map((c) => (
          <div key={c.id}>
            <p className="font-hand text-2xl text-yolk underline decoration-yolk/50 decoration-wavy underline-offset-4">{c.name}</p>
            <ul className="mt-2 space-y-1.5">
              {products.filter((p) => p.category_id === c.id).map((p) => (
                <li key={p.id} className="leaders font-hand text-2xl">
                  <Link to={`/products/${p.slug}`} className={`hover:text-yolk ${p.in_stock ? "" : "line-through decoration-sun-500 decoration-2 opacity-60"}`}>
                    {p.name.replace(/ \(.+\)$/, "")}
                  </Link>
                  <span className="dots" aria-hidden="true" />
                  <span className="shrink-0 text-right">
                    {animalCounts[p.id] ? <span className="mr-2 text-lg text-yolk">{animalCounts[p.id]} available ·</span> : null}
                    {!p.in_stock ? "sold out" : p.show_price && p.price_cents != null ? formatRand(p.price_cents) : "ask us"}
                    {p.in_stock && p.unit && p.show_price && <span className="ml-1 hidden text-lg text-chalk-line/70 sm:inline">/ {p.unit.replace(/^Per /i, "").toLowerCase()}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
