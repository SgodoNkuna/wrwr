import { useEffect, useState } from "react";
import { downloadCsv } from "../lib/csv";
import { supabase } from "../lib/supabase";
import { AdminOnly } from "./AdminLayout";
import { PageHeader } from "./ui";

interface Log { id: number; actor_email: string | null; action: string; table_name: string; record_id: string | null; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string }

const TABLES = ["orders", "products", "animals", "categories", "services", "enquiries", "site_settings", "user_roles", "pending_approvals", "data_requests"];
const PAGE = 100;

const diff = (a: Log["old_data"], b: Log["new_data"]) =>
  !a || !b ? null : Object.keys(b).filter((k) => k !== "updated_at" && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const describe = (l: Log) => {
  const rec = l.new_data ?? l.old_data;
  return String(rec?.reference ?? rec?.name ?? rec?.tag ?? rec?.summary ?? rec?.key ?? rec?.role ?? l.record_id ?? "");
};

export default function AuditAdmin() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [who, setWho] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);

  const query = () => {
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });
    if (table) q = q.eq("table_name", table);
    if (action) q = q.eq("action", action);
    if (who.trim()) q = q.ilike("actor_email", `%${who.trim()}%`);
    if (from) q = q.gte("created_at", `${from}T00:00:00+02:00`);
    if (to) q = q.lte("created_at", `${to}T23:59:59+02:00`);
    return q;
  };
  useEffect(() => {
    query().range(page * PAGE, page * PAGE + PAGE).then(({ data }) => {
      setLogs(((data as Log[]) ?? []).slice(0, PAGE));
      setMore((data ?? []).length > PAGE);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, action, who, from, to, page]);

  const exportCsv = async () => {
    const { data } = await query().limit(5000);
    downloadCsv(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["When", "Who", "Action", "Table", "Record", "What", "Changed fields"],
      ...((data as Log[]) ?? []).map((l) => [new Date(l.created_at).toLocaleString("en-ZA"), l.actor_email ?? "system", l.action, l.table_name, l.record_id, describe(l), diff(l.old_data, l.new_data)?.join(" ") ?? ""]),
    ]);
  };
  const reset = (f: () => void) => { f(); setPage(0); };

  return (
    <AdminOnly>
      <PageHeader title="Audit log" action={<button onClick={exportCsv} className="btn-outline py-1.5">Export CSV</button>} />
      <p className="mb-4 text-sm text-ink/70">Every change made by staff is recorded by the database and can't be edited or deleted. Kept for 36 months.</p>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div><label className="label" htmlFor="au-table">Area</label>
          <select id="au-table" className="input py-1.5" value={table} onChange={(e) => reset(() => setTable(e.target.value))}>
            <option value="">Everything</option>{TABLES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select></div>
        <div><label className="label" htmlFor="au-action">Action</label>
          <select id="au-action" className="input py-1.5" value={action} onChange={(e) => reset(() => setAction(e.target.value))}>
            <option value="">Any</option><option value="insert">insert</option><option value="update">update</option><option value="delete">delete</option>
          </select></div>
        <div><label className="label" htmlFor="au-who">Who (email)</label><input id="au-who" className="input py-1.5" value={who} onChange={(e) => reset(() => setWho(e.target.value))} placeholder="e.g. admin" /></div>
        <div><label className="label" htmlFor="au-from">From</label><input id="au-from" type="date" className="input py-1.5" value={from} onChange={(e) => reset(() => setFrom(e.target.value))} /></div>
        <div><label className="label" htmlFor="au-to">To</label><input id="au-to" type="date" className="input py-1.5" value={to} onChange={(e) => reset(() => setTo(e.target.value))} /></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f3f1ea] text-left text-xs uppercase tracking-wide text-ink/70"><tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">What</th></tr></thead>
          <tbody className="divide-y divide-ink/10">
            {logs.length === 0 && <tr><td colSpan={4} className="p-5 text-center text-ink/70">Nothing matches.</td></tr>}
            {logs.map((l) => {
              const changed = diff(l.old_data, l.new_data);
              return (
                <tr key={l.id}>
                  <td className="whitespace-nowrap p-3 text-xs">{new Date(l.created_at).toLocaleString("en-ZA")}</td>
                  <td className="p-3 text-xs">{l.actor_email ?? "system"}</td>
                  <td className="p-3"><span className={`rounded-tag px-2 py-0.5 text-xs font-bold ${l.action === "delete" ? "bg-red-100 text-red-800" : l.action === "insert" ? "bg-farm-100 text-farm-800" : "bg-yolk/30 text-ink"}`}>{l.action}</span></td>
                  <td className="p-3 text-xs"><b>{l.table_name}</b> · {describe(l)}{changed && changed.length > 0 && <span className="text-ink/70"> · changed: {changed.join(", ")}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-outline px-3 py-1">← Newer</button>
        <span>Page {page + 1}</span>
        <button disabled={!more} onClick={() => setPage(page + 1)} className="btn-outline px-3 py-1">Older →</button>
      </div>
    </AdminOnly>
  );
}
