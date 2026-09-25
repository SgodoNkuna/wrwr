import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { StatusTrail } from "../components/OrderView";
import { useAuth } from "../lib/auth";
import { formatDate, formatRand, PAYMENT_STATUS_LABEL } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { DataRequest, Enquiry, Order, Profile } from "../lib/types";
import { usePageMeta } from "../lib/usePageMeta";

export default function Account() {
  const { session, loading, isStaff } = useAuth();
  usePageMeta("My account", "Your Tshehla AgriHub orders and details.", { noindex: true });
  if (loading) return <div className="container-x py-16 text-ink/70">Loading…</div>;
  if (!session) return <CustomerAuth />;
  if (isStaff) return (
    <div className="container-x py-16">
      <h1 className="text-5xl text-farm-900">You're signed in as staff</h1>
      <Link to="/admin" className="btn-green mt-6">Go to the admin</Link>
    </div>
  );
  return <CustomerDashboard userId={session.user.id} />;
}

function CustomerAuth() {
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password") ?? "");
    setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: "That email and password don't match." });
    } else if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/account`, data: { full_name: String(f.get("full_name")).trim(), phone: String(f.get("phone")).trim() } },
      });
      if (error) setMsg({ ok: false, text: error.message });
      else if (!data.session) setMsg({ ok: true, text: "Almost done: check your email and click the link to confirm your account." });
    } else {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account/reset` });
      setMsg({ ok: true, text: "If that email has an account, we've sent a reset link." });
    }
    setBusy(false);
  };

  return (
    <div className="container-x grid gap-12 py-12 md:grid-cols-2">
      <div>
        <h1 className="text-6xl text-farm-900">{mode === "up" ? "Open an account" : mode === "reset" ? "Reset password" : "Sign in"}</h1>
        <p className="mt-3 max-w-md text-ink/75">
          You don't need an account to order. With one, your details are filled in for you and you can see all your orders in one place.
        </p>
        <p className="mt-6 font-hand text-2xl text-ink/70">Staff? Use the <Link to="/admin" className="underline">staff login</Link>.</p>
      </div>
      <form onSubmit={submit} className="space-y-4 border-2 border-ink bg-white p-6">
        {mode === "up" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="ac-name">Name *</label><input id="ac-name" name="full_name" required minLength={2} maxLength={100} className="input" autoComplete="name" /></div>
            <div><label className="label" htmlFor="ac-phone">Cellphone *</label><input id="ac-phone" name="phone" type="tel" required pattern="\+?[0-9 \(\)\-]{9,20}" className="input" autoComplete="tel" /></div>
          </div>
        )}
        <div><label className="label" htmlFor="ac-email">Email *</label><input id="ac-email" name="email" type="email" required className="input" autoComplete="email" /></div>
        {mode !== "reset" && (
          <div><label className="label" htmlFor="ac-pw">Password *</label>
            <input id="ac-pw" name="password" type="password" required minLength={mode === "up" ? 10 : 1} className="input" autoComplete={mode === "up" ? "new-password" : "current-password"} />
            {mode === "up" && <p className="mt-1 text-xs text-ink/70">At least 10 characters.</p>}
          </div>
        )}
        {mode === "up" && (
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-farm-800" />
            <span>I agree to the <Link to="/terms" target="_blank" className="font-bold underline">Terms</Link> and that my details are used as described in the <Link to="/privacy" target="_blank" className="font-bold underline">Privacy Policy</Link>.</span></label>
        )}
        {msg && <p className={`px-3 py-2 text-sm font-bold ${msg.ok ? "bg-farm-100 text-farm-800" : "bg-sun-500/10 text-sun-600"}`} role="alert">{msg.text}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? "One moment…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}</button>
        <div className="flex justify-between text-sm font-bold">
          {mode === "in" ? <button type="button" onClick={() => setMode("up")} className="underline underline-offset-4">Open an account</button>
            : <button type="button" onClick={() => setMode("in")} className="underline underline-offset-4">Back to sign in</button>}
          {mode === "in" && <button type="button" onClick={() => setMode("reset")} className="underline underline-offset-4">Forgot password?</button>}
        </div>
      </form>
    </div>
  );
}

const TABS = ["Orders", "Messages", "My details", "Privacy"] as const;

function CustomerDashboard({ userId }: { userId: string }) {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Orders");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [requests, setRequests] = useState<DataRequest[]>([]);

  const load = async () => {
    const [p, o, e, r] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
      supabase.from("enquiries").select("*, products(name)").order("created_at", { ascending: false }),
      supabase.from("data_requests").select("*").order("created_at", { ascending: false }),
    ]);
    setProfile(p.data as Profile | null);
    setOrders((o.data as Order[]) ?? []);
    setEnquiries((e.data as Enquiry[]) ?? []);
    setRequests((r.data as DataRequest[]) ?? []);
  };
  useEffect(() => { void load(); }, [userId]);

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-hand text-3xl text-farm-700">Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</p>
          <h1 className="text-6xl text-farm-900">My account</h1>
        </div>
        <button onClick={signOut} className="btn-outline">Sign out</button>
      </div>
      <div className="mt-6 flex gap-6 border-b-2 border-ink" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-0.5 border-b-4 pb-2 font-display text-xl uppercase ${tab === t ? "border-sun-500" : "border-transparent text-ink/70"}`}>{t}</button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "Orders" && <OrdersTab orders={orders} />}
        {tab === "Messages" && <MessagesTab enquiries={enquiries} />}
        {tab === "My details" && profile && <DetailsTab profile={profile} onSaved={load} />}
        {tab === "Privacy" && profile && <PrivacyTab profile={profile} orders={orders} enquiries={enquiries} requests={requests} onSent={load} />}
      </div>
    </div>
  );
}

function OrdersTab({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return <p className="font-hand text-3xl text-ink/70">No orders yet. <Link to="/products" className="underline">Have a look at what's for sale.</Link></p>;
  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id} className="border-2 border-ink bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link to={`/order/${o.reference}`} className="font-display text-2xl uppercase hover:text-sun-500">{o.reference}</Link>
            <span className="font-display text-2xl">{formatRand(o.total_cents)}</span>
          </div>
          <p className="text-sm text-ink/70">{formatDate(o.created_at)} · {o.order_items?.map((i) => `${i.quantity} × ${i.product_name}`).join(", ")} · {PAYMENT_STATUS_LABEL[o.payment_status]}</p>
          <div className="mt-2"><StatusTrail status={o.status} /></div>
        </li>
      ))}
    </ul>
  );
}

function MessagesTab({ enquiries }: { enquiries: Enquiry[] }) {
  if (enquiries.length === 0) return <p className="text-ink/70">Questions you send us while signed in will show here.</p>;
  return (
    <ul className="divide-y-2 divide-ink/10 border-y-2 border-ink">
      {enquiries.map((e) => (
        <li key={e.id} className="py-3">
          <p className="text-sm text-ink/70">{formatDate(e.created_at)} · {e.products?.name ?? "General"} · {e.status === "new" ? "Waiting for us" : e.status === "contacted" ? "We've replied" : "Closed"}</p>
          <p className="mt-1">{e.message}</p>
        </li>
      ))}
    </ul>
  );
}

function DetailsTab({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("profiles").update({ full_name: String(f.get("full_name")).trim(), phone: String(f.get("phone")).trim() || null }).eq("id", profile.id);
    setMsg(error ? "Please check your cellphone number." : "Saved.");
    if (!error) onSaved();
  };
  return (
    <form onSubmit={save} className="max-w-lg space-y-4">
      <div><p className="label">Email</p><p className="font-bold">{profile.email}</p></div>
      <div><label className="label" htmlFor="d-name">Name</label><input id="d-name" name="full_name" defaultValue={profile.full_name ?? ""} maxLength={100} className="input" /></div>
      <div><label className="label" htmlFor="d-phone">Cellphone</label><input id="d-phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} pattern="\+?[0-9 \(\)\-]{9,20}" className="input" /></div>
      {msg && <p className="text-sm font-bold">{msg}</p>}
      <button className="btn-green">Save</button>
    </form>
  );
}

function PrivacyTab({ profile, orders, enquiries, requests, onSent }: { profile: Profile; orders: Order[]; enquiries: Enquiry[]; requests: DataRequest[]; onSent: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), profile, orders, enquiries, privacy_requests: requests }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tshehla-agrihub-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const request = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("data_requests").insert({ kind: String(f.get("kind")), details: String(f.get("details") || "") || null, email: profile.email });
    setMsg(error ? error.message : "Sent. We'll respond within 30 days, usually much sooner.");
    if (!error) { e.currentTarget.reset(); onSent(); }
  };

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div>
        <h2 className="text-3xl">Your information</h2>
        <p className="mt-2 text-ink/75">Download a copy of everything linked to your account: your details, orders and messages.</p>
        <button onClick={download} className="btn-green mt-4">Download my data</button>
        {requests.length > 0 && (
          <>
            <h3 className="mt-8 text-2xl">Your requests</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {requests.map((r) => <li key={r.id}>{formatDate(r.created_at)}: <b>{r.kind}</b> · {r.status.replace("_", " ")}</li>)}
            </ul>
          </>
        )}
      </div>
      <form onSubmit={request} className="space-y-4 border-2 border-ink bg-white p-5">
        <h2 className="text-3xl">Ask us to…</h2>
        <select name="kind" className="input" defaultValue="deletion">
          <option value="deletion">Delete my account and information</option>
          <option value="correction">Correct my information</option>
          <option value="objection">Stop using my information</option>
          <option value="access">Tell me what information you hold</option>
        </select>
        <textarea name="details" rows={3} maxLength={2000} className="input" placeholder="Anything we should know (optional)" />
        <p className="text-xs text-ink/70">We keep order records for 5 years because tax law requires it, even if you ask us to delete your account. See the <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
        {msg && <p className="text-sm font-bold">{msg}</p>}
        <button className="btn-primary">Send request</button>
      </form>
    </div>
  );
}
