import { Clock, MapPin, Phone } from "lucide-react";
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
  usePageMeta("Contact us", `WhatsApp or call ${business.phone}, or visit us at ${business.address}.`);
  return (
    <div className="container-x py-12">
      <h1 className="text-4xl sm:text-5xl">Get in touch</h1>
      <p className="mt-2 text-farm-950/70">The fastest way to reach us is WhatsApp. You can also call or send a message below.</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <a href={whatsappLink(business)} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 p-5 hover:border-[#25D366]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white"><WhatsAppIcon /></span>
            <div><p className="font-semibold">WhatsApp</p><p className="text-sm text-farm-950/70">{business.phone}</p></div>
          </a>
          <div className="card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-farm-900 text-sun-400"><Phone /></span>
            <div><p className="font-semibold">Call</p><p className="text-sm"><a href={telLink(business.phone)} className="hover:underline">{business.phone}</a>{business.alt_phone && <> · <a href={telLink(business.alt_phone)} className="hover:underline">{business.alt_phone}</a></>}</p></div>
          </div>
          <div className="card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-farm-900 text-sun-400"><MapPin /></span>
            <div><p className="font-semibold">Visit</p><p className="text-sm text-farm-950/70">{business.address}</p></div>
          </div>
          <div className="card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-farm-900 text-sun-400"><Clock /></span>
            <div><p className="font-semibold">Hours</p><p className="text-sm text-farm-950/70">{business.hours}</p></div>
          </div>
          <MapEmbed query={business.map_query} />
        </div>
        <EnquiryForm products={products} />
      </div>
    </div>
  );
}
