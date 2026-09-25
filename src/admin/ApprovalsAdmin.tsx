import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { ACTION_LABEL } from "../lib/approvals";
import { supabase } from "../lib/supabase";
import type { PendingApproval } from "../lib/types";
import { AdminOnly } from "./AdminLayout";
import { ErrorBox, PageHeader } from "./ui";

const PILL: Record<string, string> = {
  pending: "bg-yolk text-ink", executed: "bg-farm-700 text-white", rejected: "bg-ink/10 text-ink/80",
  failed: "bg-red-700 text-white", expired: "bg-ink/10 text-ink/70",
};

/** Two-person approval: one admin asks, a different admin approves. */
export default function ApprovalsAdmin() {
  const { session } = useAuth();
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("pending_approvals").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) setError(error.message);
    setItems((data as PendingApproval[]) ?? []);
  };
  useEffect(() => { void load(); }, []);

  const decide = async (a: PendingApproval, approve: boolean) => {
    const note = window.prompt(approve ? `Approve: ${a.summary}\n\nOptional note:` : `Reject: ${a.summary}\n\nWhy? (optional)`, "");
    if (note === null) return;
    setBusy(a.id); setError(null);
    const { data, error } = await supabase.rpc("decide_approval", { p_id: a.id, p_approve: approve, p_note: note || null });
    setBusy(null);
    if (error) return setError(error.message);
    const row = data as PendingApproval;
    if (row.status === "failed") setError(`It was approved but couldn't be carried out: ${row.result}`);
    void load();
  };

  const pending = items.filter((a) => a.status === "pending");
  const done = items.filter((a) => a.status !== "pending");

  return (
    <AdminOnly>
      <PageHeader title="Approvals" />
      <p className="mb-4 max-w-3xl text-sm text-ink/70">
        High-risk actions (giving or removing admin access, deleting or refunding an order, anonymising a customer) need a <b>second admin</b> to approve them.
        You can't approve your own request. If there is only one admin, they can approve their own request only after signing in with a verification code (Admin → My security).
      </p>
      <ErrorBox error={error} />
      <h2 className="mb-2 font-sans text-lg font-bold normal-case">Waiting ({pending.length})</h2>
      {pending.length === 0 && <p className="card mb-6 p-5 text-sm text-ink/70">Nothing waiting for approval.</p>}
      <div className="mb-8 space-y-3">
        {pending.map((a) => {
          const mine = a.requested_by === session?.user.id;
          return (
            <div key={a.id} className="card border-l-4 border-l-yolk p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/70">{ACTION_LABEL[a.action]}</p>
              <p className="mt-1 font-bold">{a.summary}</p>
              <p className="mt-1 text-sm">Reason: {a.reason}</p>
              <p className="mt-1 text-xs text-ink/70">Asked by {a.requested_by_email} · {new Date(a.created_at).toLocaleString("en-ZA")} · expires after 7 days</p>
              <div className="mt-3 flex gap-2">
                <button disabled={busy === a.id} className="btn-green px-3 py-1.5" onClick={() => decide(a, true)}>{mine ? "Approve (needs a second admin)" : "Approve"}</button>
                <button disabled={busy === a.id} className="btn-outline px-3 py-1.5" onClick={() => decide(a, false)}>{mine ? "Withdraw" : "Reject"}</button>
              </div>
            </div>
          );
        })}
      </div>
      <h2 className="mb-2 font-sans text-lg font-bold normal-case">History</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f3f1ea] text-left text-xs uppercase tracking-wide text-ink/70"><tr><th className="p-3">Request</th><th className="p-3">Asked by</th><th className="p-3">Decided by</th><th className="p-3">Outcome</th></tr></thead>
          <tbody className="divide-y divide-ink/10">
            {done.length === 0 && <tr><td colSpan={4} className="p-5 text-center text-ink/70">No decisions yet.</td></tr>}
            {done.map((a) => (
              <tr key={a.id}>
                <td className="p-3"><p className="font-bold">{a.summary}</p><p className="text-xs text-ink/70">{a.reason}</p></td>
                <td className="p-3 text-xs">{a.requested_by_email}<br />{new Date(a.created_at).toLocaleString("en-ZA")}</td>
                <td className="p-3 text-xs">{a.decided_by_email ?? "—"}{a.decided_at && <><br />{new Date(a.decided_at).toLocaleString("en-ZA")}</>}{a.decision_note && <><br /><i>{a.decision_note}</i></>}</td>
                <td className="p-3"><span className={`rounded-tag px-2 py-0.5 text-xs font-bold ${PILL[a.status]}`}>{a.status}</span>{a.result && <p className="mt-1 text-xs text-ink/70">{a.result}</p>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminOnly>
  );
}
