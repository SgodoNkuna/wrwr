import { NavLink, Outlet } from "react-router-dom";
import { ClipboardList, FolderTree, Home, Inbox, LogOut, Package, Settings, ShieldCheck, Users, Wrench } from "lucide-react";
import { useAuth } from "../lib/auth";
import Login from "./Login";
import { usePageMeta } from "../lib/usePageMeta";

const links = [
  { to: "/admin", label: "Dashboard", icon: Home, end: true },
  { to: "/admin/enquiries", label: "Enquiries", icon: Inbox },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { to: "/admin/settings", label: "Site settings", icon: Settings, admin: true },
  { to: "/admin/users", label: "Users & roles", icon: Users, admin: true },
  { to: "/admin/audit", label: "Audit log", icon: ClipboardList, admin: true },
];

export default function AdminLayout() {
  const { session, loading, isStaff, isAdmin, roles, signOut } = useAuth();
  usePageMeta("Admin", "Staff area", { noindex: true });

  if (loading) return <div className="flex min-h-screen items-center justify-center text-farm-950/60">Loading…</div>;
  if (!session) return <Login />;
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
    <div className="flex min-h-screen flex-col bg-farm-50 md:flex-row">
      <aside className="bg-farm-950 text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
        <div className="flex items-center justify-between p-4 md:block">
          <NavLink to="/" className="font-display text-lg">Tshehla <span className="text-sun-400">Admin</span></NavLink>
          <p className="text-xs text-white/50 md:mt-1">{session.user.email} · {roles.join(", ")}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {links.filter((l) => !l.admin || isAdmin).map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-sun-500 text-white" : "text-white/75 hover:bg-white/10"}`}>
              <l.icon className="h-4 w-4" />{l.label}
            </NavLink>
          ))}
          <button onClick={signOut} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 md:mt-4"><LogOut className="h-4 w-4" />Sign out</button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <p className="card p-6 text-sm">Only admins can access this page.</p>;
}
