import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Bell, BellRing, ClipboardList, CreditCard, FolderTree, Home, Inbox, KeyRound, LogOut, Package, PawPrint, Receipt, Settings, ShieldCheck, Stamp, UserRound, Users, Wrench, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import Login from "./Login";
import { usePageMeta } from "../lib/usePageMeta";
import { supabase } from "../lib/supabase";
import { useSettings } from "../lib/settings";
import SecurityAdmin, { MfaChallenge } from "./SecurityAdmin";
import { useStaffAlerts } from "./useStaffAlerts";

const groups = [
  { title: "", links: [{ to: "/admin", label: "Dashboard", icon: Home, end: true }] },
  { title: "Sales", links: [
    { to: "/admin/orders", label: "Orders", icon: Receipt },
    { to: "/admin/enquiries", label: "Enquiries", icon: Inbox },
    { to: "/admin/customers", label: "Customers", icon: UserRound },
  ] },
  { title: "Catalogue", links: [
    { to: "/admin/products", label: "Products & stock", icon: Package },
    { to: "/admin/animals", label: "Livestock listings", icon: PawPrint },
    { to: "/admin/categories", label: "Categories", icon: FolderTree },
    { to: "/admin/services", label: "Services", icon: Wrench },
  ] },
  { title: "Settings", links: [
    { to: "/admin/approvals", label: "Approvals", icon: Stamp, admin: true },
    { to: "/admin/payments", label: "Payments", icon: CreditCard, admin: true },
    { to: "/admin/settings", label: "Site settings", icon: Settings, admin: true },
    { to: "/admin/users", label: "Users & roles", icon: Users, admin: true },
    { to: "/admin/privacy", label: "Privacy requests", icon: ShieldCheck },
    { to: "/admin/audit", label: "Audit log", icon: ClipboardList, admin: true },
    { to: "/admin/security", label: "My security", icon: KeyRound },
  ] },
];

export default function AdminLayout() {
  const { session, loading, isStaff, isAdmin, roles, signOut } = useAuth();
  const { security } = useSettings();
  usePageMeta("Admin", "Staff area", { noindex: true });
  const [aal, setAal] = useState<{ current: string | null; next: string | null; hasFactor: boolean } | null>(null);
  useEffect(() => {
    if (!session) { setAal(null); return; }
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) =>
      setAal({ current: data?.currentLevel ?? null, next: data?.nextLevel ?? null, hasFactor: data?.nextLevel === "aal2" }));
  }, [session]);
  const needsCode = Boolean(aal && aal.next === "aal2" && aal.current !== "aal2");
  const mustEnrol = Boolean(isStaff && aal && security.require_staff_mfa && !aal.hasFactor);
  const { alerts, dismiss, clearUnread } = useStaffAlerts(isStaff && !needsCode && !mustEnrol);
  const [notifyPerm, setNotifyPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "denied");

  if (loading || (session && !aal)) return <div className="flex min-h-screen items-center justify-center text-ink/70">Loading…</div>;
  if (!session) return <Login />;
  if (needsCode) return <MfaChallenge onSignOut={signOut} />;
  if (mustEnrol) return (
    <div className="min-h-screen bg-[#f3f1ea] p-4 md:p-10">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 rounded-tag border-l-4 border-l-sun-500 bg-white p-4 text-sm">The owner requires <b>two-step sign-in</b> for all staff. Set it up below to continue.</p>
        <SecurityAdmin />
        <button onClick={signOut} className="btn-outline mt-6">Sign out</button>
      </div>
    </div>
  );
  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-md p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-sun-500" />
          <h1 className="mt-3 text-2xl">Awaiting access</h1>
          <p className="mt-2 text-sm text-farm-950/70">You're signed in as <b>{session.user.email}</b>, but you don't have a staff role yet. Ask an admin to grant you access.</p>
          <button onClick={signOut} className="btn-outline mt-6">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f1ea] md:flex-row">
      <aside className="bg-farm-950 text-paper md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto">
        <div className="flex items-center justify-between p-4 md:block">
          <NavLink to="/" className="font-display text-2xl uppercase">Tshehla <span className="text-yolk">Admin</span></NavLink>
          <p className="text-xs text-white/50 md:mt-1">{session.user.email} · {roles.join(", ")}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible">
          {groups.map((g) => (
            <div key={g.title || "top"} className="flex gap-1 md:mt-3 md:flex-col">
              {g.title && <p className="hidden px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-paper/70 md:block">{g.title}</p>}
              {g.links.filter((l) => !("admin" in l) || isAdmin).map((l) => (
                <NavLink key={l.to} to={l.to} end={"end" in l}
                  className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-tag px-3 py-2 text-sm font-bold ${isActive ? "bg-yolk text-ink" : "text-paper/75 hover:bg-white/10"}`}>
                  <l.icon className="h-4 w-4" />{l.label}
                </NavLink>
              ))}
            </div>
          ))}
          {notifyPerm === "default" && (
            <button onClick={() => Notification.requestPermission().then(setNotifyPerm)} className="flex shrink-0 items-center gap-2 rounded-tag px-3 py-2 text-sm text-paper/75 hover:bg-white/10 md:mt-4"><Bell className="h-4 w-4" />Turn on desktop alerts</button>
          )}
          <button onClick={signOut} className="flex shrink-0 items-center gap-2 rounded-tag px-3 py-2 text-sm text-paper/75 hover:bg-white/10 md:mt-4"><LogOut className="h-4 w-4" />Sign out</button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8" onClick={clearUnread}><Outlet /></main>
      <div className="fixed right-4 top-4 z-[70] w-80 max-w-[calc(100vw-2rem)] space-y-2" aria-live="polite">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start gap-3 border-2 border-ink bg-white p-3 shadow-[3px_3px_0_0_#1d2a1f]">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
            <Link to={a.to} onClick={() => dismiss(a.id)} className="min-w-0 flex-1">
              <p className="font-bold">{a.title}</p><p className="truncate text-sm text-ink/70">{a.body}</p>
            </Link>
            <button onClick={() => dismiss(a.id)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <p className="card p-6 text-sm">Only admins can access this page.</p>;
}
