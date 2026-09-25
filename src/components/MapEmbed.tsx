import { MapPin } from "lucide-react";
import { useConsent } from "../lib/consent";

/** Google Maps sets third-party cookies, so it only loads after consent. */
export default function MapEmbed({ query }: { query: string }) {
  const { choice, setChoice } = useConsent();
  const external = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  if (choice !== "accepted") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 border-2 border-dashed border-ink/30 bg-kraft-light/50 p-6 text-center text-sm">
        <MapPin className="h-8 w-8 text-farm-700" />
        <p className="max-w-xs text-farm-950/70">The map is provided by Google, which sets cookies. Load it only if you agree.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setChoice("accepted")} className="btn-green py-2">Load map</button>
          <a href={external} target="_blank" rel="noopener noreferrer" className="btn-outline py-2">Open in Google Maps</a>
        </div>
      </div>
    );
  }
  return (
    <iframe title="Map" className="h-64 w-full border-2 border-ink" loading="lazy" referrerPolicy="no-referrer"
      src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=12&output=embed`} />
  );
}
