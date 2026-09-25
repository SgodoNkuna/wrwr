import { Link } from "react-router-dom";
import { WhatsAppIcon } from "../components/Icons";
import PriceBoard from "../components/PriceBoard";
import { formatRand, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import { useCatalogue } from "../lib/useCatalogue";
import { usePageMeta } from "../lib/usePageMeta";
import { safeImage } from "../lib/format";

const plainName = (n: string) => n.replace(/ \(.+\)$/, "").toLowerCase().replace(/\bbrahma\b/, "Brahma");
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export default function Home() {
  const { business, home } = useSettings();
  const { categories, products, loading, animalCounts } = useCatalogue();
  const flagship = products.find((p) => p.slug === "broiler-chicks");
  const orderable = products.filter((p) => p.orderable && p.show_price && p.in_stock);
  const enquire = products.filter((p) => !(p.orderable && p.show_price));
  usePageMeta("Tshehla AgriHub | Livestock, Poultry & Fresh Produce in Letsitele", home.hero_subtitle, { image: "/images/tau-poultry-broilers.jpg" });

  return (
    <>
      <section className="container-x grid items-center gap-12 pb-16 pt-10 md:grid-cols-[1.15fr_1fr] md:pt-16">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-kraft-dark">Letsitele, Limpopo</p>
          <h1 className="mt-3 text-[3.4rem] text-farm-900 sm:text-7xl lg:text-8xl">{home.hero_title}</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink/80">{home.hero_subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link to="/products" className="btn-primary px-6 py-3 text-base">See what's for sale</Link>
            <a href={whatsappLink(business)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-[#177a41] underline decoration-2 underline-offset-4">
              <WhatsAppIcon className="h-5 w-5" /> {business.phone}
            </a>
          </div>
        </div>

        <Link to={flagship ? `/products/${flagship.slug}` : "/products"} className="group relative mx-auto block w-full max-w-sm">
          <div className="tape relative rotate-[2deg] border-[10px] border-white bg-white shadow-[0_18px_30px_-12px_rgba(0,0,0,.45)] transition group-hover:rotate-[1deg]">
            <img src={safeImage(flagship?.image_url) ?? "/images/tau-poultry-broilers.jpg"} alt="Tau Poultry broiler chicks flyer" className="aspect-[3/4] w-full object-cover object-top" />
          </div>
          <span className="stamp absolute bottom-20 left-1 -rotate-12 border-farm-700 bg-paper/85 text-farm-700 sm:-left-12">Fully vaccinated</span>
          {flagship?.show_price && flagship.price_cents != null && (
            <div className="absolute -bottom-6 -right-3 rotate-[-4deg] bg-yolk px-4 py-2 shadow-md sm:-right-8">
              <p className="font-hand text-xl leading-none">box of 100 chicks</p>
              <p className="font-display text-4xl leading-none">{formatRand(flagship.price_cents)}</p>
            </div>
          )}
        </Link>
      </section>

      <section className="container-x">
        {loading ? <p className="text-ink/70">Loading prices…</p> : <PriceBoard categories={categories} products={products} animalCounts={animalCounts} />}
      </section>

      <section className="container-x mt-16 grid gap-10 md:grid-cols-[1fr_1.1fr]">
        <div className="space-y-10">
          {categories.map((c, i) => (
            <div key={c.id} className={i % 2 ? "md:pl-10" : ""}>
              <Link to={`/products?category=${c.slug}`} className="group">
                <h2 className="text-5xl text-farm-900 group-hover:text-sun-500 sm:text-6xl">{c.name}</h2>
              </Link>
              <p className="mt-2 max-w-md text-ink/75">{c.description}</p>
              <p className="mt-2 text-sm font-bold">
                {products.filter((p) => p.category_id === c.id).map((p, j, arr) => (
                  <span key={p.id}>
                    <Link to={`/products/${p.slug}`} className="underline decoration-kraft underline-offset-4 hover:decoration-sun-500">{p.name.replace(/ \(.+\)$/, "")}</Link>
                    {j < arr.length - 1 && <span className="text-ink/65"> / </span>}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>

        <aside className="relative self-start rotate-[1.5deg] bg-[#fff6c9] p-7 shadow-[0_12px_24px_-12px_rgba(0,0,0,.35)] md:mt-8">
          <p className="font-hand text-4xl leading-none text-ink">How buying works</p>
          {orderable.length > 0 && (
            <p className="mt-4 font-hand text-2xl leading-snug text-ink/85">
              <b className="font-semibold">{sentence(listJoin(orderable.map((p) => plainName(p.name))))}</b>: order on this site, pay by EFT or when you collect.
            </p>
          )}
          {enquire.length > 0 && (
            <p className="mt-3 font-hand text-2xl leading-snug text-ink/85">
              <b className="font-semibold">{sentence(listJoin(enquire.map((p) => plainName(p.name))))}</b>: WhatsApp us. Every animal is different, so we price them one by one.
            </p>
          )}
          <p className="mt-3 font-hand text-2xl leading-snug text-ink/85">Collection is at the farm in Letsitele. Ask us about delivery.</p>
          <p className="mt-5 text-right font-hand text-2xl text-farm-700">~ {business.name}</p>
        </aside>
      </section>
    </>
  );
}
