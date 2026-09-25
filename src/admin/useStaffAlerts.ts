import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export interface Alert { id: string; title: string; body: string; to: string }

/** Live alerts for new orders, enquiries and approval requests (Supabase Realtime; RLS applies). */
export function useStaffAlerts(enabled: boolean) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const baseTitle = useRef(document.title);

  useEffect(() => {
    if (!enabled) return;
    const push = (a: Alert) => {
      setAlerts((prev) => [a, ...prev].slice(0, 4));
      setUnread((n) => n + 1);
      beep();
      if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        try { new Notification(a.title, { body: a.body, tag: a.id }); } catch { /* ignore */ }
      }
    };
    const channel = supabase.channel("staff-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, ({ new: o }) => {
        if (o.is_test) return;
        push({ id: `o${o.id}`, title: `New order ${o.reference}`, body: `${o.customer_name} · ${o.payment_method}`, to: `/admin/orders?open=${o.id}` });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "enquiries" }, ({ new: e }) =>
        push({ id: `e${e.id}`, title: `New enquiry from ${e.name}`, body: String(e.message).slice(0, 80), to: "/admin/enquiries" }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pending_approvals" }, ({ new: p }) =>
        push({ id: `a${p.id}`, title: "Approval needed", body: p.summary, to: "/admin/approvals" }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled]);

  useEffect(() => {
    document.title = unread ? `(${unread}) ${baseTitle.current}` : baseTitle.current;
    const clear = () => { if (!document.hidden) setUnread(0); };
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
  }, [unread]);

  return { alerts, dismiss: (id: string) => setAlerts((a) => a.filter((x) => x.id !== id)), clearUnread: () => setUnread(0) };
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.value = 880; gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.18);
  } catch { /* autoplay blocked until the page has been clicked */ }
}
