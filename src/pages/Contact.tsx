import EnquiryForm from "../components/EnquiryForm";
import { WhatsAppIcon } from "../components/Icons";
import MapEmbed from "../components/MapEmbed";
import { usePageMeta } from "../lib/usePageMeta";
import { telLink, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import { useCatalogue } from "../lib/useCatalogue";

export default function Contact() {
  const { business } = useSettings();
  const { products } = useCatalogue();
  usePageMeta("Find us", `WhatsApp or call ${business.phone}, or visit us at ${business.address}.`);
  return (
    <div className="container-x py-10">
      <h1 className="text-6xl text-farm-900 sm:text-7xl">Find us</h1>
      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <div>
          <dl className="divide-y-2 divide-ink/10 border-y-2 border-ink">
            <div className="py-4">
              <dt className="label">WhatsApp (quickest)</dt>
              <dd><a href={whatsappLink(business)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-display text-3xl text-[#1f8f4e]"><WhatsAppIcon /> {business.phone}</a></dd>
            </div>
            <div className="py-4">
              <dt className="label">Call</dt>
              <dd className="font-display text-3xl">
                <a href={telLink(business.phone)}>{business.phone}</a>
                {business.alt_phone && <> <span className="text-ink/30">/</span> <a href={telLink(business.alt_phone)}>{business.alt_phone}</a></>}
              </dd>
            </div>
            <div className="py-4"><dt className="label">The farm</dt><dd className="text-lg">{business.address}</dd></div>
            <div className="py-4"><dt className="label">Hours</dt><dd className="text-lg">{business.hours}</dd></div>
            {business.email && <div className="py-4"><dt className="label">Email</dt><dd className="text-lg"><a href={`mailto:${business.email}`} className="underline">{business.email}</a></dd></div>}
          </dl>
          <div className="mt-6"><MapEmbed query={business.map_query} /></div>
        </div>
        <div>
          <h2 className="text-4xl">Or leave a message</h2>
          <p className="mb-4 mt-1 text-ink/70">We'll call or WhatsApp you back.</p>
          <EnquiryForm products={products} />
        </div>
      </div>
    </div>
  );
}
