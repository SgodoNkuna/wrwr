import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Service } from "../lib/types";
import { useSettings } from "../lib/settings";
import { usePageMeta } from "../lib/usePageMeta";

export default function About() {
  const { business } = useSettings();
  const [services, setServices] = useState<Service[]>([]);
  usePageMeta("The farm", `${business.name} is a family farm on Gunyula Farm, Letsitele, raising livestock and poultry and growing fresh produce.`);
  useEffect(() => {
    supabase.from("services").select("*").eq("published", true).order("sort_order").then(({ data }) => setServices(data ?? []));
  }, []);

  return (
    <div className="container-x py-10">
      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="text-6xl text-farm-900 sm:text-7xl">Gunyula Farm, Letsitele</h1>
          <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-ink/85">
            <p>
              {business.name} is a family farm at Gunyula Farm 38, outside Letsitele in Limpopo. We keep cattle, goats and pigs,
              a mixed yard of poultry (broilers, Brahma chickens, turkeys, geese, ducks and ostriches), and we grow green peppers and green beans.
            </p>
            <p>
              Our broiler chicks go out under the <b>Tau Poultry</b> name, sold by the box of 100 and fully vaccinated.
              If you're starting a flock, buying an animal, or need a crate of veg for your shop, WhatsApp us and we'll sort you out.
            </p>
          </div>
          <Link to="/products" className="btn-primary mt-8">See what's for sale</Link>
        </div>
        <figure className="tape relative -rotate-2 self-start border-[10px] border-white bg-white shadow-[0_18px_30px_-12px_rgba(0,0,0,.45)]">
          <img src="/images/tau-poultry-broilers.jpg" alt="Tau Poultry broiler chicks flyer" className="w-full" />
          <figcaption className="pt-2 text-center font-hand text-xl text-ink/70">our Tau Poultry flyer</figcaption>
        </figure>
      </div>
      {services.length > 0 && (
        <section className="mt-16 border-t-2 border-ink pt-8">
          <h2 className="text-5xl text-farm-900">What else we do</h2>
          <dl className="mt-6 grid gap-6 md:grid-cols-2">
            {services.map((s) => (
              <div key={s.id}><dt className="font-display text-2xl uppercase">{s.name}</dt><dd className="mt-1 text-ink/75">{s.description}</dd></div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
