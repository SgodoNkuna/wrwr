import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Role } from "../lib/types";
import { AdminOnly } from "./AdminLayout";
import { requestApproval } from "../lib/approvals";
import { ErrorBox, PageHeader } from "./ui";

interface Row { id: string; email: string; full_name: string | null; created_at: string; roles: Role[] }

export default function UsersAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setRows((p.data ?? []).map((u) => ({ ...u, roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role as Role) })));
  };
  useEffect(() => { void load(); }, []);

  const [note, setNote] = useState<string | null>(null);
  const toggle = async (u: Row, role: Role) => {
    setError(null); setNote(null);
    const has = u.roles.includes(role);
    if (role === "admin") {
      try {
        const msg = await requestApproval(has ? "revoke_admin" : "grant_admin", u.id, `${has ? "Remove" : "Give"} admin access for ${u.email}?`);
        if (msg) setNote(msg);
      } catch (e) { setError((e as Error).message); }
      return;
    }
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: u.id, role });
    if (error) setError(error.message.includes("last admin") ? "You can't remove the last admin." : error.message);
    void load();
  };

  return (
    <AdminOnly>
      <PageHeader title="Users & roles" />
      <p className="mb-4 text-sm text-ink/70">
        New staff click <b>Request staff account</b> on the login page. They appear here with no access until you give them a role.
        <b> Editors</b> manage products, categories, services and enquiries. <b>Admins</b> can also change settings and payments, manage users and view the audit log. Giving or removing <b>admin</b> access needs a second admin to approve it.
      </p>
      <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 accent-farm-700" /> Also show customers and people waiting for access</label>
      <ErrorBox error={error} />
      {note && <p className="mb-4 rounded-tag bg-farm-100 px-3 py-2 text-sm text-farm-800">{note}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-farm-50 text-left text-xs uppercase tracking-wide text-ink/70"><tr><th className="p-3">User</th><th className="p-3">Joined</th><th className="p-3">Editor</th><th className="p-3">Admin</th></tr></thead>
          <tbody className="divide-y divide-farm-900/10">
            {rows.filter((u) => showAll || u.roles.length > 0).map((u) => (
              <tr key={u.id}>
                <td className="p-3"><p className="font-semibold">{u.full_name || "—"}</p><p className="text-xs text-ink/70">{u.email}</p></td>
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
