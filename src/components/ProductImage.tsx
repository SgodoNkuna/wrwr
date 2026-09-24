import { Bird, Beef, Carrot, Sprout } from "lucide-react";
import { safeImage } from "../lib/format";
import type { Product } from "../lib/types";

const iconFor = (slug?: string) =>
  slug === "poultry" ? Bird : slug === "livestock" ? Beef : slug === "fresh-produce" ? Carrot : Sprout;

export default function ProductImage({ product, className = "" }: { product: Product; className?: string }) {
  const src = safeImage(product.image_url);
  if (src) return <img src={src} alt={product.name} loading="lazy" className={`object-cover ${className}`} />;
  const Icon = iconFor(product.categories?.slug);
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-farm-800 to-farm-950 ${className}`} role="img" aria-label={product.name}>
      <div className="text-center">
        <Icon className="mx-auto h-14 w-14 text-sun-400" strokeWidth={1.5} />
        <p className="mt-3 font-display text-lg text-white/90">{product.name}</p>
      </div>
    </div>
  );
}
