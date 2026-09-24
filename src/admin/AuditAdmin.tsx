import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { AdminOnly } from "./AdminLayout";
import { PageHeader } from "./ui";

interface Log { id: number; actor_email: string | null; action: string; table_name: string; record_id: string | null; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string }

const diff = (a: Log["old_data"], b: Log["new_data"]) => {
  if (!a || !b) return null;
  return Object.keys(b).filter((k) => k !== "updated_at" && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
};

export default function AuditAdmin() {
  const [logs, setLogs] = useState<Log[]>([]);
  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => setLogs(data ?? []));
  }, []);

  return (
    <AdminOnly>
      <PageHeader title="Audit log" />
      <p className="mb-4 text-sm text-farm-950/60">Every change made by staff is recorded automatically by the database and can't be edited or deleted. Showing the latest 200.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-farm-50 text-left text-xs uppercase tracking-wide text-farm-950/60"><tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">What</th></tr></thead>
          <tbody className="divide-y divide-farm-900/10">
            {logs.map((l) => {
              const rec = l.new_data ?? l.old_data;
              const changed = diff(l.old_data, l.new_data);
              return (
                <tr key={l.id}>
                  <td className="whitespace-nowrap p-3 text-xs">{new Date(l.created_at).toLocaleString("en-ZA")}</td>
                  <td className="p-3 text-xs">{l.actor_email ?? "system"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${l.action === "delete" ? "bg-red-100 text-red-700" : l.action === "insert" ? "bg-farm-100 text-farm-800" : "bg-sun-400/20 text-sun-600"}`}>{l.action}</span></td>
                  <td className="p-3 text-xs"><b>{l.table_name}</b> · {String(rec?.name ?? rec?.key ?? rec?.role ?? l.record_id ?? "")}{changed && changed.length > 0 && <span className="text-farm-950/60"> · changed: {changed.join(", ")}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminOnly>
  );
}
