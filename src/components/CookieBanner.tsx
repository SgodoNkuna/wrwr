import { Link } from "react-router-dom";
import { useConsent } from "../lib/consent";

export default function CookieBanner() {
  const { open, setChoice } = useConsent();
  if (!open) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-24 z-[60] sm:right-auto sm:max-w-md">
      <div className="border-2 border-ink bg-paper p-5 shadow-[4px_4px_0_0_#1d2a1f]">
        <div className="flex items-start gap-3">
          <div className="text-sm">
            <p className="font-hand text-2xl leading-none">A quick word on cookies</p>
            <p className="mt-1 text-farm-950/70">
              We use only essential storage to run this site. With your permission, we also load Google Maps, which sets its own cookies.
              See our <Link to="/cookies" className="font-semibold text-farm-700 underline">Cookie Policy</Link> and{" "}
              <Link to="/privacy" className="font-semibold text-farm-700 underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setChoice("rejected")} className="btn-outline flex-1 py-2">Essential only</button>
          <button onClick={() => setChoice("accepted")} className="btn-green flex-1 py-2">Accept all</button>
        </div>
      </div>
    </div>
  );
}
