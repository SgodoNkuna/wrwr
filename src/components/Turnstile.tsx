import { useEffect, useRef } from "react";

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id: string) => void; remove: (id: string) => void } }
}
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Cloudflare Turnstile "I'm human" check. Renders only when the owner has set a site key. */
export default function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (t: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let widget: string | undefined;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !box.current || !window.turnstile) return;
      widget = window.turnstile.render(box.current, {
        sitekey: siteKey, theme: "light", callback: (t: string) => onToken(t),
        "expired-callback": () => onToken(null), "error-callback": () => onToken(null),
      });
    };
    if (window.turnstile) mount();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      if (!s) { s = document.createElement("script"); s.src = SRC; s.async = true; document.head.appendChild(s); }
      s.addEventListener("load", mount);
    }
    return () => { cancelled = true; if (widget && window.turnstile) window.turnstile.remove(widget); };
  }, [siteKey, onToken]);
  return <div ref={box} className="min-h-[65px]" />;
}
