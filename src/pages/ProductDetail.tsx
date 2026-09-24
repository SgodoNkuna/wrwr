import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Phone } from "lucide-react";
import EnquiryForm from "../components/EnquiryForm";
import { WhatsAppIcon } from "../components/Icons";
import ProductImage from "../components/ProductImage";
import { priceLabel, telLink, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import type { Product } from "../lib/types";
import { usePageMeta } from "../lib/usePageMeta";

export default function ProductDetail() {
  const { slug } = useParams();
  const { business } = useSettings();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    supabase.from("products").select("*, categories(slug, name)").eq("slug", slug ?? "").eq("published", true).maybeSingle()
      .then(({ data }) => {
        setProduct(data as Product | null);
      });
  }, [slug]);
  usePageMeta(product?.name ?? "Product", product?.summary ?? "Farm produce from Tshehla AgriHub.", { image: product?.image_url ?? undefined, noindex: product === null });

  useEffect(() => {
    if (!product) return;
    // Product structured data for search engines.
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

  if (product === undefined) return <div className="container-x py-20 text-farm-950/60">Loading…</div>;
  if (!product) return (
    <div className="container-x py-20 text-center">
      <h1 className="text-3xl">Product not found</h1>
      <Link to="/products" className="btn-green mt-6">Back to products</Link>
    </div>
  );

  return (
    <div className="container-x py-10">
      <Link to="/products" className="inline-flex items-center gap-1 text-sm font-semibold text-farm-700 hover:underline"><ArrowLeft className="h-4 w-4" /> All products</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl">
          <ProductImage product={product} className="aspect-square w-full object-top" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-farm-700">{product.categories?.name}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{product.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <p className={product.show_price ? "font-display text-4xl text-sun-600" : "text-xl font-semibold"}>{priceLabel(product)}</p>
            {product.unit && <p className="text-farm-950/60">{product.unit}</p>}
          </div>
          {!product.in_stock && <p className="mt-3 inline-block rounded-full bg-farm-950 px-3 py-1 text-xs font-semibold text-white">Currently sold out, enquire for next batch</p>}
          {product.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-farm-950/80">{product.description}</p>}
          {product.highlights.length > 0 && (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {product.highlights.map((h) => <li key={h} className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-farm-600" />{h}</li>)}
            </ul>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={whatsappLink(business, product.name)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-6 py-3 text-base"><WhatsAppIcon /> Enquire on WhatsApp</a>
            <a href={telLink(business.phone)} className="btn-outline px-6 py-3 text-base"><Phone className="h-4 w-4" /> Call {business.phone}</a>
          </div>
          <div className="mt-10">
            <h2 className="mb-4 text-2xl">Or send us a message</h2>
            <EnquiryForm defaultProductId={product.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
