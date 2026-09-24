import { Link } from "react-router-dom";
import { ArrowRight, Bird, Beef, Carrot, HeartHandshake, ShieldCheck, Syringe, TrendingUp } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { WhatsAppIcon } from "../components/Icons";
import { formatRand, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import { useCatalogue } from "../lib/useCatalogue";
import { usePageMeta } from "../lib/usePageMeta";

const catIcon: Record<string, typeof Bird> = { poultry: Bird, livestock: Beef, "fresh-produce": Carrot };

export default function Home() {
  const { business, home } = useSettings();
  const { categories, products, loading } = useCatalogue();
  const featured = products.filter((p) => p.featured).slice(0, 6);
  const flagship = products.find((p) => p.slug === "broiler-chicks");
  usePageMeta("Tshehla AgriHub | Livestock, Poultry & Fresh Produce in Letsitele", home.hero_subtitle, { image: "/images/tau-poultry-broilers.jpg" });

  return (
    <>
      <section className="relative overflow-hidden bg-farm-950 text-white">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_80%_20%,#f97316_0,transparent_45%),radial-gradient(circle_at_10%_90%,#16a34a_0,transparent_40%)]" />
        <div className="container-x relative grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-sun-400">Gunyula Farm · Letsitele, Limpopo</p>
            <h1 className="mt-5 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">{home.hero_title}</h1>
            <p className="mt-5 max-w-lg text-lg text-white/75">{home.hero_subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn-primary px-6 py-3 text-base">View products <ArrowRight className="h-4 w-4" /></Link>
              <a href={whatsappLink(business)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-6 py-3 text-base"><WhatsAppIcon /> Chat on WhatsApp</a>
            </div>
          </div>
          {flagship && (
            <Link to={`/products/${flagship.slug}`} className="group relative mx-auto block w-full max-w-sm">
              <div className="overflow-hidden rounded-3xl border-4 border-white/10 shadow-2xl">
                <img src={flagship.image_url ?? "/images/tau-poultry-broilers.jpg"} alt={flagship.name} className="aspect-[3/4] w-full object-cover object-top transition duration-500 group-hover:scale-105" />
              </div>
              {flagship.show_price && flagship.price_cents != null && (
                <div className="absolute -bottom-5 -left-5 rounded-2xl bg-sun-500 px-5 py-3 shadow-xl">
                  <p className="text-xs font-bold uppercase">{flagship.unit}</p>
                  <p className="font-display text-3xl">{formatRand(flagship.price_cents)}</p>
                </div>
              )}
            </Link>
          )}
        </div>
      </section>

      <section className="border-b border-farm-900/10 bg-white">
        <div className="container-x grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {[
            { i: ShieldCheck, t: "Healthy & strong" },
            { i: Syringe, t: "Vaccinated poultry" },
            { i: TrendingUp, t: "Cost effective" },
            { i: HeartHandshake, t: "Raised with care" },
          ].map(({ i: I, t }) => (
            <div key={t} className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-farm-900 text-sun-400"><I className="h-5 w-5" /></span>
              <span className="text-sm font-semibold">{t}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-16">
        <h2 className="text-3xl sm:text-4xl">What we farm</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {categories.map((c) => {
            const Icon = catIcon[c.slug] ?? Bird;
            const count = products.filter((p) => p.category_id === c.id).length;
            return (
              <Link key={c.id} to={`/products?category=${c.slug}`} className="card group p-6 transition hover:-translate-y-0.5 hover:border-sun-500 hover:shadow-lg">
                <Icon className="h-10 w-10 text-sun-500" strokeWidth={1.5} />
                <h3 className="mt-4 text-2xl">{c.name}</h3>
                <p className="mt-2 text-sm text-farm-950/70">{c.description}</p>
                <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-farm-700">{count} products <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-farm-50 py-16">
        <div className="container-x">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl">Popular right now</h2>
            <Link to="/products" className="hidden text-sm font-semibold text-farm-700 hover:underline sm:block">All products →</Link>
          </div>
          {loading ? <p className="mt-8 text-farm-950/60">Loading…</p> : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      <section className="container-x py-16">
        <div className="card flex flex-col items-center gap-6 bg-farm-900 p-10 text-center text-white md:flex-row md:text-left">
          <div className="flex-1">
            <h2 className="text-3xl">Prices depend on the animal.</h2>
            <p className="mt-2 text-white/75">Tell us what you're looking for and we'll send you current prices and availability, usually the same day.</p>
          </div>
          <a href={whatsappLink(business)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-6 py-3 text-base"><WhatsAppIcon /> {business.phone}</a>
        </div>
      </section>
    </>
  );
}
