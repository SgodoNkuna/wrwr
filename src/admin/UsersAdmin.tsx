import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import type { Role } from "../lib/types";
import { AdminOnly } from "./AdminLayout";
import { ErrorBox, PageHeader } from "./ui";

interface Row { id: string; email: string; full_name: string | null; created_at: string; roles: Role[] }

export default function UsersAdmin() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setRows((p.data ?? []).map((u) => ({ ...u, roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role as Role) })));
  };
  useEffect(() => { void load(); }, []);

  const toggle = async (u: Row, role: Role) => {
    setError(null);
    const has = u.roles.includes(role);
    if (has && u.id === session?.user.id && role === "admin" && !confirm("Remove your own admin access?")) return;
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: u.id, role });
    if (error) setError(error.message.includes("last admin") ? "You can't remove the last admin." : error.message);
    void load();
  };

  return (
    <AdminOnly>
      <PageHeader title="Users & roles" />
      <p className="mb-4 text-sm text-farm-950/60">
        New staff click <b>Request staff account</b> on the login page. They appear here with no access until you give them a role.
        <b> Editors</b> manage products, categories, services and enquiries. <b>Admins</b> can also change settings, manage users, delete records and view the audit log.
      </p>
      <ErrorBox error={error} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-farm-50 text-left text-xs uppercase tracking-wide text-farm-950/60"><tr><th className="p-3">User</th><th className="p-3">Joined</th><th className="p-3">Editor</th><th className="p-3">Admin</th></tr></thead>
          <tbody className="divide-y divide-farm-900/10">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="p-3"><p className="font-semibold">{u.full_name || "—"}</p><p className="text-xs text-farm-950/60">{u.email}</p></td>
                <td className="p-3">{new Date(u.created_at).toLocaleDateString("en-ZA")}</td>
                {(["editor", "admin"] as Role[]).map((r) => (
                  <td key={r} className="p-3"><input type="checkbox" className="h-4 w-4 accent-farm-700" checked={u.roles.includes(r)} onChange={() => toggle(u, r)} aria-label={`${r} role for ${u.email}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminOnly>
  );
}
