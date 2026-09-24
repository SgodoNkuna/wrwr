import { Link } from "react-router-dom";
import { formatRand, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import type { Product } from "../lib/types";
import ProductImage from "./ProductImage";

/** A product "label": photo, name, and a price tag that reads like the ones at the farm stall. */
export default function ProductCard({ product }: { product: Product }) {
  const { business } = useSettings();
  const priced = product.show_price && product.price_cents != null;
  return (
    <article className="group relative flex flex-col border-2 border-ink bg-white">
      <Link to={`/products/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden border-b-2 border-ink">
        <ProductImage product={product} className="h-full w-full object-top transition duration-500 group-hover:scale-[1.03]" />
        {!product.in_stock && (
          <span className="stamp absolute right-3 top-3 rotate-6 border-sun-500 bg-white/90 text-sun-500">Sold out</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-kraft-dark">{product.categories?.name}</p>
        <h3 className="mt-1 text-2xl"><Link to={`/products/${product.slug}`} className="hover:text-farm-700">{product.name}</Link></h3>
        {product.summary && <p className="mt-1 flex-1 text-sm text-ink/70">{product.summary}</p>}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className={`ticket px-3 py-1.5 ${priced ? "bg-yolk" : "bg-kraft-light"}`}>
            <p className={priced ? "font-display text-2xl leading-none" : "font-hand text-xl leading-none"}>
              {priced ? formatRand(product.price_cents!) : "Ask for a price"}
            </p>
            {product.unit && <p className="text-[11px] font-bold uppercase tracking-wide text-ink/60">{product.unit}</p>}
          </div>
          {product.orderable && priced && product.in_stock ? (
            <Link to={`/products/${product.slug}`} className="text-sm font-bold text-farm-700 underline decoration-2 underline-offset-4">Order →</Link>
          ) : (
            <a href={whatsappLink(business, product.name)} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#1f8f4e] underline decoration-2 underline-offset-4">
              WhatsApp us →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
