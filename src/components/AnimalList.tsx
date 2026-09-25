import { useEffect, useState } from "react";
import { formatRand, safeImage, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import type { Animal } from "../lib/types";
import { WhatsAppIcon } from "./Icons";

const SEX: Record<string, string> = { male: "Male", female: "Female", mixed: "Mixed" };

/** "Available now": individual animals for a livestock product. */
export default function AnimalList({ productId, productName }: { productId: string; productName: string }) {
  const { business } = useSettings();
  const [animals, setAnimals] = useState<Animal[] | null>(null);
  useEffect(() => {
    supabase.from("animals").select("*").eq("product_id", productId).eq("published", true).neq("status", "sold").order("sort_order")
      .then(({ data }) => setAnimals((data as Animal[]) ?? []));
  }, [productId]);
  if (!animals || animals.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-5xl text-farm-900">Available now</h2>
      <p className="mt-1 text-ink/70">Each one is priced individually. Tap to ask about a specific animal by its tag.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {animals.map((a) => {
          const img = safeImage(a.image_url);
          const facts = [a.breed, a.sex && SEX[a.sex], a.age_months != null && (a.age_months >= 24 ? `${Math.floor(a.age_months / 12)} years` : `${a.age_months} months`), a.weight_kg != null && `±${a.weight_kg} kg`].filter(Boolean);
          const ask = whatsappLink({ ...business }, `${productName.toLowerCase()} tag ${a.tag}${a.title ? ` (${a.title})` : ""}`);
          return (
            <article key={a.id} className="relative flex flex-col border-2 border-ink bg-white">
              {img ? <img src={img} alt={`${a.title ?? productName} ${a.tag}`} loading="lazy" className="aspect-[4/3] w-full border-b-2 border-ink object-cover" />
                : <div className="flex aspect-[4/3] items-center justify-center border-b-2 border-ink bg-kraft-light font-display text-3xl text-kraft-dark">{a.tag}</div>}
              {a.status === "reserved" && <span className="stamp absolute right-3 top-3 rotate-6 border-sun-500 bg-white/90 text-sun-500">Reserved</span>}
              <div className="flex flex-1 flex-col p-4">
                <p className="font-mono text-xs font-bold text-kraft-dark">TAG {a.tag}{a.quantity > 1 && ` · ${a.quantity} in this group`}</p>
                <h3 className="mt-1 text-2xl">{a.title || productName}</h3>
                {facts.length > 0 && <p className="mt-1 text-sm text-ink/70">{facts.join(" · ")}</p>}
                {a.notes && <p className="mt-2 flex-1 text-sm">{a.notes}</p>}
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className={a.show_price && a.price_cents != null ? "font-display text-2xl" : "font-hand text-xl"}>
                    {a.show_price && a.price_cents != null ? `${formatRand(a.price_cents)}${a.quantity > 1 ? " each" : ""}` : "Ask for a price"}
                  </p>
                  <a href={ask} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-bold text-[#177a41] underline decoration-2 underline-offset-4">
                    <WhatsAppIcon className="h-4 w-4" /> Ask about {a.tag}
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
