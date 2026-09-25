import { useEffect, useState } from "react";
import { formatDate } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { DataRequest } from "../lib/types";
import { ErrorBox, PageHeader } from "./ui";
import { requestApproval } from "../lib/approvals";

const KIND: Record<string, string> = { access: "Wants a copy of their data", correction: "Wants data corrected", deletion: "Wants account & data deleted", objection: "Objects to processing" };

/** POPIA data-subject requests from customers. Respond within 30 days. */
export default function PrivacyAdmin() {
  const [items, setItems] = useState<DataRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const anonymise = async (r: DataRequest) => {
    if (!r.user_id) return setError("This request isn't linked to an account; anonymise by cellphone from Customers instead.");
    try { const msg = await requestApproval("anonymise_customer", r.user_id, `Anonymise ${r.email}'s orders and messages and delete their account?`); if (msg) setNote(msg); }
    catch (e) { setError((e as Error).message); }
  };
  const load = async () => {
    const { data } = await supabase.from("data_requests").select("*").order("created_at", { ascending: false });
    setItems((data as DataRequest[]) ?? []);
  };
  useEffect(() => { void load(); }, []);
  const update = async (id: string, v: Partial<DataRequest>) => {
    const { error } = await supabase.from("data_requests").update(v).eq("id", id);
    if (error) setError(error.message); else void load();
  };

  return (
    <>
      <PageHeader title="Privacy requests" />
      <div className="mb-4 space-y-1 text-sm text-ink/70">
        <p>Customers send these from <b>My account → Privacy</b>. POPIA expects a response within a reasonable time; aim for under 30 days.</p>
        <p><b>Deletion:</b> use <b>Anonymise &amp; delete account</b>. After a second admin approves it, their name, contact details, notes and messages are removed from orders and enquiries (amounts are kept for tax records), old audit snapshots are cleared, and the login is deleted.</p>
      </div>
      <ErrorBox error={error} />
      {note && <p className="mb-4 rounded-tag bg-farm-100 px-3 py-2 text-sm text-farm-800">{note}</p>}
      {items.length === 0 && <p className="card p-6 text-sm text-ink/70">No requests.</p>}
      <div className="space-y-3">
        {items.map((r) => {
          const overdue = r.status !== "done" && r.status !== "rejected" && Date.now() - new Date(r.created_at).getTime() > 25 * 864e5;
          return (
            <div key={r.id} className={`card p-4 ${overdue ? "border-l-4 border-l-sun-500" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{KIND[r.kind]}</p>
                  <p className="text-xs text-ink/70">{r.email} · {formatDate(r.created_at)}{overdue && " · due soon"}</p>
                </div>
                <select value={r.status} className="input w-auto py-1"
                  onChange={(e) => update(r.id, { status: e.target.value as DataRequest["status"], resolved_at: ["done", "rejected"].includes(e.target.value) ? new Date().toISOString() : null })}>
                  <option value="open">open</option><option value="in_progress">in progress</option><option value="done">done</option><option value="rejected">rejected</option>
                </select>
              </div>
              {r.details && <p className="mt-2 text-sm">{r.details}</p>}
              {r.kind === "deletion" && r.status !== "done" && <button className="btn-outline mt-2 px-3 py-1.5 text-red-700" onClick={() => anonymise(r)}>Anonymise &amp; delete account…</button>}
              <textarea defaultValue={r.admin_notes ?? ""} rows={2} maxLength={2000} className="input mt-2" placeholder="What was done (saved when you click away)"
                onBlur={(e) => e.target.value !== (r.admin_notes ?? "") && update(r.id, { admin_notes: e.target.value })} />
            </div>
          );
        })}
      </div>
    </>
  );
}
