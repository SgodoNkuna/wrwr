import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Minus, Phone, Plus } from "lucide-react";
import EnquiryForm from "../components/EnquiryForm";
import { WhatsAppIcon } from "../components/Icons";
import ProductImage from "../components/ProductImage";
import AnimalList from "../components/AnimalList";
import { formatRand, telLink, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import { useCart } from "../lib/cart";
import { supabase } from "../lib/supabase";
import type { Product } from "../lib/types";
import { usePageMeta } from "../lib/usePageMeta";

export default function ProductDetail() {
  const { slug } = useParams();
  const { business } = useSettings();
  const cart = useCart();
  const nav = useNavigate();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setProduct(undefined); setQty(1); setAdded(false);
    supabase.from("products").select("*, categories(slug, name)").eq("slug", slug ?? "").eq("published", true).maybeSingle()
      .then(({ data }) => setProduct(data as Product | null));
  }, [slug]);
  usePageMeta(product?.name ?? "Product", product?.summary ?? "Farm produce from Tshehla AgriHub.", { image: product?.image_url ?? undefined, noindex: product === null });

  useEffect(() => {
    if (!product) return;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = JSON.stringify({
      "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.summary,
      image: product.image_url ? new URL(product.image_url, window.location.origin).href : undefined,
      brand: { "@type": "Brand", name: "Tshehla AgriHub" },
      ...(product.show_price && product.price_cents != null ? { offers: {
        "@type": "Offer", priceCurrency: "ZAR", price: (product.price_cents / 100).toFixed(2),
        availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } } : {}),
    });
    document.head.appendChild(el);
    return () => el.remove();
  }, [product]);

  if (product === undefined) return <div className="container-x py-20 text-ink/70">Loading…</div>;
  if (!product) return (
    <div className="container-x py-20">
      <h1 className="text-5xl">Not on the farm</h1>
      <p className="mt-2 text-ink/70">We couldn't find that product. It may have been sold out and taken down.</p>
      <Link to="/products" className="btn-green mt-6">Back to products</Link>
    </div>
  );

  const priced = product.show_price && product.price_cents != null;
  const canOrder = product.orderable && priced && product.in_stock;
  const max = Math.max(1, Math.min(product.max_per_order, product.stock_qty ?? product.max_per_order));
  const addToBasket = () => {
    cart.add({ product_id: product.id, slug: product.slug, name: product.name, unit: product.unit, unit_price_cents: product.price_cents!, quantity: qty, max });
    setAdded(true);
  };

  return (
    <div className="container-x py-8">
      <Link to="/products" className="text-sm font-bold underline decoration-2 underline-offset-4">← All products</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div className="relative self-start border-2 border-ink bg-white p-2">
          <ProductImage product={product} className="aspect-square w-full object-top" />
          {!product.in_stock && <span className="stamp absolute right-6 top-6 rotate-6 border-sun-500 bg-white/90 text-sun-500">Sold out</span>}
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-kraft-dark">{product.categories?.name}</p>
          <h1 className="mt-2 text-6xl text-farm-900 sm:text-7xl">{product.name}</h1>

          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div className={`ticket px-4 py-2 ${priced ? "bg-yolk" : "bg-kraft-light"}`}>
              <p className={priced ? "font-display text-4xl leading-none" : "font-hand text-3xl leading-none"}>{priced ? formatRand(product.price_cents!) : "Ask for a price"}</p>
              {product.unit && <p className="text-xs font-bold uppercase tracking-wide text-ink/80">{product.unit}</p>}
            </div>
            {product.stock_qty != null && product.in_stock && product.stock_qty <= 10 && (
              <p className="font-hand text-2xl text-sun-600">only {product.stock_qty} left</p>
            )}
          </div>

          {product.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-ink/85">{product.description}</p>}
          {product.highlights.length > 0 && (
            <p className="mt-4 font-hand text-2xl text-farm-700">{product.highlights.join(" · ")}</p>
          )}

          {canOrder && (
            <div className="mt-8 border-2 border-ink bg-white p-5">
              <p className="label">How many?</p>
              <div className="mt-1 flex flex-wrap items-center gap-4">
                <div className="flex items-center border-2 border-ink">
                  <button className="p-2.5 disabled:opacity-30" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Fewer"><Minus className="h-4 w-4" /></button>
                  <input type="number" min={1} max={max} value={qty} aria-label="Quantity"
                    onChange={(e) => setQty(Math.min(max, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                    className="w-14 border-x-2 border-ink bg-transparent py-2 text-center font-bold outline-none" />
                  <button className="p-2.5 disabled:opacity-30" onClick={() => setQty(Math.min(max, qty + 1))} disabled={qty >= max} aria-label="More"><Plus className="h-4 w-4" /></button>
                </div>
                <p className="font-display text-2xl">{formatRand(product.price_cents! * qty)}</p>
                <button onClick={addToBasket} className="btn-primary ml-auto">Add to basket</button>
              </div>
              {added && (
                <p className="mt-3 text-sm">
                  Added. <button onClick={() => nav("/basket")} className="font-bold underline underline-offset-4">Go to basket →</button>
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-5 text-sm font-bold">
            <a href={whatsappLink(business, product.name)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#177a41] underline decoration-2 underline-offset-4">
              <WhatsAppIcon className="h-4 w-4" /> Ask about {product.name.replace(/ \(.+\)$/, "").toLowerCase()} on WhatsApp
            </a>
            <a href={telLink(business.phone)} className="flex items-center gap-1.5 underline decoration-2 underline-offset-4"><Phone className="h-4 w-4" /> {business.phone}</a>
          </div>

          <details className="mt-10 border-t-2 border-ink pt-4" open={!canOrder}>
            <summary className="cursor-pointer font-display text-2xl uppercase">Send us a question</summary>
            <div className="mt-4"><EnquiryForm defaultProductId={product.id} /></div>
          </details>
        </div>
      </div>
      <AnimalList productId={product.id} productName={product.name} />
    </div>
  );
}
