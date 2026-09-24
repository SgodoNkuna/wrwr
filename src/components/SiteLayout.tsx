import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, ShoppingBasket, X } from "lucide-react";
import { telLink, whatsappLink } from "../lib/format";
import { useSettings } from "../lib/settings";
import { useCart } from "../lib/cart";
import { useConsent } from "../lib/consent";
import { useAuth } from "../lib/auth";
import { WhatsAppIcon } from "./Icons";
import CookieBanner from "./CookieBanner";

const nav = [
  { to: "/products", label: "Products" },
  { to: "/about", label: "The farm" },
  { to: "/contact", label: "Find us" },
  { to: "/track", label: "Track order" },
];

export default function SiteLayout() {
  const { business, home } = useSettings();
  const { count } = useCart();
  const { session, isStaff } = useAuth();
  const { reopen } = useConsent();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

  const link = ({ isActive }: { isActive: boolean }) =>
    `border-b-2 pb-0.5 text-sm font-bold ${isActive ? "border-sun-500 text-ink" : "border-transparent text-ink/75 hover:border-ink/40"}`;

  return (
    <div className="flex min-h-screen flex-col">
      {home.announcement && (
        <p className="bg-yolk px-4 py-1.5 text-center text-sm font-bold text-ink">{home.announcement}</p>
      )}
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Link to="/" className="leading-none" aria-label={`${business.name} home`}>
            <span className="block font-display text-2xl uppercase tracking-wide text-farm-900">Tshehla AgriHub</span>
            <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-kraft-dark">Gunyula Farm · Letsitele</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((n) => <NavLink key={n.to} to={n.to} className={link}>{n.label}</NavLink>)}
            <NavLink to={isStaff ? "/admin" : "/account"} className={link}>{session ? (isStaff ? "Admin" : "My account") : "Sign in"}</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <a href={whatsappLink(business)} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 text-sm font-bold text-[#1f8f4e] lg:flex">
              <WhatsAppIcon className="h-4 w-4" /> {business.phone}
            </a>
            <Link to="/basket" className="relative flex items-center gap-1.5 rounded-tag border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-ink hover:text-paper" aria-label={`Basket, ${count} items`}>
              <ShoppingBasket className="h-4 w-4" /> <span className="hidden sm:inline">Basket</span>
              {count > 0 && <span className="ml-0.5 min-w-5 rounded-full bg-sun-500 px-1.5 text-center text-xs text-white">{count}</span>}
            </Link>
            <button className="p-1 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="container-x flex flex-col border-t border-ink/10 py-2 md:hidden">
            {[...nav, { to: isStaff ? "/admin" : "/account", label: session ? (isStaff ? "Admin" : "My account") : "Sign in" }].map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `py-3 text-lg font-bold ${isActive ? "text-sun-500" : ""}`}>{n.label}</NavLink>
            ))}
            <a href={telLink(business.phone)} className="py-3 text-lg font-bold">Call {business.phone}</a>
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-16 border-t-2 border-ink bg-farm-950 text-paper/80">
        <div className="container-x grid gap-8 py-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-display text-3xl uppercase text-paper">Tshehla AgriHub</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed">
              {business.legal_name || business.name}, {business.address}. Call or WhatsApp{" "}
              <a className="font-bold text-yolk underline-offset-2 hover:underline" href={telLink(business.phone)}>{business.phone}</a>
              {business.alt_phone && <>, or <a className="font-bold text-yolk underline-offset-2 hover:underline" href={telLink(business.alt_phone)}>{business.alt_phone}</a></>}.
              {" "}Open {business.hours.replace(/^Mon/, "Monday").replace(" to Sat", " to Saturday")}.
            </p>
            <p className="mt-3 font-hand text-2xl text-yolk">Home of Tau Poultry chicks.</p>
          </div>
          <div className="text-sm">
            <p className="font-bold uppercase tracking-wider text-paper">The small print</p>
            <p className="mt-2 leading-7">
              <Link to="/privacy" className="hover:text-paper">Privacy</Link> ·{" "}
              <Link to="/terms" className="hover:text-paper">Terms</Link> ·{" "}
              <Link to="/returns" className="hover:text-paper">Orders & returns</Link> ·{" "}
              <Link to="/cookies" className="hover:text-paper">Cookies</Link> ·{" "}
              <Link to="/paia" className="hover:text-paper">PAIA</Link> ·{" "}
              <button onClick={reopen} className="hover:text-paper">Cookie settings</button>
            </p>
            <p className="mt-2 text-xs text-paper/50">
              © {new Date().getFullYear()} {business.legal_name || business.name}
              {business.registration_number && ` · Reg. no. ${business.registration_number}`} ·{" "}
              <Link to="/admin" className="hover:text-paper">Staff</Link>
            </p>
          </div>
        </div>
      </footer>

      <a href={whatsappLink(business)} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-[#25D366] text-white shadow-[3px_3px_0_0_#1d2a1f] transition hover:-translate-y-0.5">
        <WhatsAppIcon className="h-7 w-7" />
      </a>
      <CookieBanner />
    </div>
  );
}
