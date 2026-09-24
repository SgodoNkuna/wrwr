import { Link } from "react-router-dom";
import { priceLabel, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import type { Product } from "../lib/types";
import { WhatsAppIcon } from "./Icons";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }: { product: Product }) {
  const { business } = useSettings();
  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/products/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        <ProductImage product={product} className="h-full w-full object-top transition duration-500 group-hover:scale-105" />
        {product.featured && <span className="absolute left-3 top-3 rounded-full bg-sun-500 px-3 py-1 text-xs font-bold text-white">Popular</span>}
        {!product.in_stock && <span className="absolute right-3 top-3 rounded-full bg-farm-950/80 px-3 py-1 text-xs font-semibold text-white">Sold out</span>}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-farm-700">{product.categories?.name}</p>
        <h3 className="mt-1 text-xl">
          <Link to={`/products/${product.slug}`} className="hover:text-farm-700">{product.name}</Link>
        </h3>
        {product.summary && <p className="mt-2 flex-1 text-sm text-farm-950/70">{product.summary}</p>}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className={product.show_price ? "font-display text-2xl text-sun-600" : "text-sm font-semibold text-farm-900"}>{priceLabel(product)}</p>
            {product.unit && <p className="text-xs text-farm-950/60">{product.unit}</p>}
          </div>
          <a href={whatsappLink(business, product.name)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-4 py-2" aria-label={`Enquire about ${product.name} on WhatsApp`}>
            <WhatsAppIcon className="h-4 w-4" /> Enquire
          </a>
        </div>
      </div>
    </article>
  );
}
