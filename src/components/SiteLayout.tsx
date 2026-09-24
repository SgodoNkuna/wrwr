import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Clock, MapPin, Menu, Phone, X } from "lucide-react";
import { telLink, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import { WhatsAppIcon } from "./Icons";
import CookieBanner from "./CookieBanner";
import { useConsent } from "../lib/consent";

const nav = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function SiteLayout() {
  const { business, home } = useSettings();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { reopen } = useConsent();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      {home.announcement && (
        <div className="bg-sun-500 px-4 py-2 text-center text-sm font-semibold text-white">{home.announcement}</div>
      )}
      <header className="sticky top-0 z-40 border-b border-farm-900/10 bg-cream/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-9 w-9" />
            <span className="font-display text-lg leading-none text-farm-900">Tshehla <span className="text-sun-500">AgriHub</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"}
                className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold ${isActive ? "bg-farm-900 text-white" : "text-farm-900 hover:bg-farm-100"}`}>
                {n.label}
              </NavLink>
            ))}
            <a href={whatsappLink(business)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp ml-2"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
          </nav>
          <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav className="container-x flex flex-col gap-1 pb-4 md:hidden">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `rounded-lg px-4 py-3 font-semibold ${isActive ? "bg-farm-900 text-white" : "text-farm-900"}`}>{n.label}</NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-farm-950 text-white/80">
        <div className="container-x grid gap-8 py-12 md:grid-cols-3">
          <div>
            <p className="font-display text-xl text-white">Tshehla <span className="text-sun-400">AgriHub</span></p>
            <p className="mt-2 text-sm">{business.tagline}</p>
            <p className="mt-2 text-sm">Home of <span className="font-semibold text-sun-400">Tau Poultry</span> broiler chicks.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-sun-400" />{business.address}</p>
            <p className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-sun-400" /><a href={telLink(business.phone)} className="hover:text-white">{business.phone}</a>{business.alt_phone && <> · <a href={telLink(business.alt_phone)} className="hover:text-white">{business.alt_phone}</a></>}</p>
            <p className="flex gap-2"><Clock className="h-4 w-4 shrink-0 text-sun-400" />{business.hours}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:text-right">
            {nav.map((n) => <Link key={n.to} to={n.to} className="block hover:text-white">{n.label}</Link>)}
            <Link to="/privacy" className="block hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="block hover:text-white">Terms of Use</Link>
            <Link to="/cookies" className="block hover:text-white">Cookie Policy</Link>
            <Link to="/paia" className="block hover:text-white">PAIA Notice</Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © {new Date().getFullYear()} {business.legal_name || business.name}{business.registration_number && ` · Reg. no. ${business.registration_number}`}. All rights reserved.
          {" · "}<button onClick={reopen} className="hover:text-white">Cookie settings</button>
          {" · "}<Link to="/admin" className="hover:text-white">Staff login</Link>
        </div>
      </footer>

      <a href={whatsappLink(business)} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-110">
        <WhatsAppIcon className="h-7 w-7" />
      </a>
      <CookieBanner />
    </div>
  );
}
