import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Service } from "../lib/types";
import { useSettings } from "../lib/settings";
import { usePageMeta } from "../lib/usePageMeta";

export default function About() {
  const { business } = useSettings();
  const [services, setServices] = useState<Service[]>([]);
  usePageMeta("About us", `${business.name} is a family farm on Gunyula Farm, Letsitele, raising livestock and poultry and growing fresh produce.`);
  useEffect(() => {
    supabase.from("services").select("*").eq("published", true).order("sort_order").then(({ data }) => setServices(data ?? []));
  }, []);

  return (
    <div className="container-x py-12">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl sm:text-5xl">About {business.name}</h1>
          <p className="mt-6 text-lg leading-relaxed text-farm-950/80">
            {business.name} is a family farm on Gunyula Farm 38 in Letsitele, Limpopo. We raise cattle, goats and pigs,
            keep a wide range of poultry (broilers, Brahma chickens, turkeys, geese, ducks and ostriches) and grow fresh green peppers and green beans.
          </p>
          <p className="mt-4 leading-relaxed text-farm-950/80">
            Our broiler chicks are sold under the <b>Tau Poultry</b> name: healthy, strong and fully vaccinated, ready for a better harvest.
            Whether you're starting a flock, buying livestock or stocking up on fresh produce, we're a WhatsApp message away.
          </p>
          <Link to="/products" className="btn-primary mt-8">Browse our products</Link>
        </div>
        <img src="/images/tau-poultry-broilers.jpg" alt="Tau Poultry broiler chicks" className="w-full rounded-3xl object-cover shadow-xl" />
      </div>
      {services.length > 0 && (
        <section className="mt-16">
          <h2 className="text-3xl">Our services</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {services.map((s) => (
              <div key={s.id} className="card p-6"><h3 className="text-xl">{s.name}</h3><p className="mt-2 text-sm text-farm-950/70">{s.description}</p></div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
