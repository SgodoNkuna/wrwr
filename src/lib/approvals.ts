import { supabase } from "./supabase";
import type { ApprovalAction, PendingApproval } from "./types";

/** Asks for a reason, then files a two-person approval request. Returns a message for the UI. */
export async function requestApproval(action: ApprovalAction, target: string, what: string): Promise<string | null> {
  const reason = window.prompt(`${what}\n\nThis needs a second admin to approve it. Why are you doing this?`);
  if (reason === null) return null;
  const { data, error } = await supabase.rpc("request_approval", { p_action: action, p_target: target, p_reason: reason });
  if (error) throw new Error(error.message);
  const row = data as PendingApproval;
  return row.status === "executed"
    ? "Done (two-person approval is switched off)."
    : "Request sent. Another admin must approve it under Admin → Approvals.";
}

export const ACTION_LABEL: Record<ApprovalAction, string> = {
  grant_admin: "Give admin access", revoke_admin: "Remove admin access", delete_order: "Delete order",
  refund_order: "Refund order", anonymise_customer: "Anonymise customer", disable_two_person: "Switch off two-person approval",
};
