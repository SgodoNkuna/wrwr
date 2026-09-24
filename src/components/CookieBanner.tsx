import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { useConsent } from "../lib/consent";

export default function CookieBanner() {
  const { open, setChoice } = useConsent();
  if (!open) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-24 z-[60] sm:right-auto sm:max-w-md">
      <div className="card border-farm-900/20 p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
          <div className="text-sm">
            <p className="font-semibold">We value your privacy</p>
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
