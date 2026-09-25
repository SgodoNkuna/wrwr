import { safeImage } from "../lib/format";
import type { Product } from "../lib/types";

/** Real photo when there is one; otherwise a kraft "label" with the product name, not a stock icon. */
export default function ProductImage({ product, className = "" }: { product: Product; className?: string }) {
  const src = safeImage(product.image_url);
  if (src) return <img src={src} alt={product.name} loading="lazy" className={`object-cover ${className}`} />;
  return (
    <div className={`flex items-center justify-center bg-kraft-light ${className}`} role="img" aria-label={product.name}>
      <span className="-rotate-2 border-2 border-dashed border-kraft-dark px-4 py-2 font-display text-2xl uppercase text-kraft-dark">{product.name}</span>
    </div>
  );
}
