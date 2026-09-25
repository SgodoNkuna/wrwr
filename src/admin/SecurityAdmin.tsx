import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import { ErrorBox, PageHeader, Toggle } from "./ui";
import { requestApproval } from "../lib/approvals";

interface Factor { id: string; friendly_name?: string; factor_type: string; status: string; created_at: string }

/** Each staff member manages their own authenticator app here; admins also set staff-wide rules. */
export default function SecurityAdmin() {
  const { isAdmin } = useAuth();
  const { security, reload } = useSettings();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(((data?.all ?? []) as Factor[]).filter((f) => f.factor_type === "totp"));
  };
  useEffect(() => { void load(); }, []);

  const start = async () => {
    setError(null); setMsg(null);
    // Clear any half-finished enrolment first.
    for (const f of factors.filter((f) => f.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toLocaleDateString("en-ZA")}` });
    if (error) return setError(error.message);
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!enrolling) return;
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.id, code });
    if (error) return setError("That code didn't work. Check the time on your phone is correct and try the newest code.");
    setEnrolling(null); setMsg("Two-step sign-in is on. From now on you'll enter a code from your app when you sign in."); void load();
  };

  const remove = async (f: Factor) => {
    if (!confirm("Turn off two-step sign-in for your account?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
    if (error) setError(error.message.includes("aal2") ? "Sign in with your code first, then you can remove it." : error.message); else void load();
  };

  const setRule = async (patch: Partial<typeof security>) => {
    setError(null);
    const { error } = await supabase.from("site_settings").upsert({ key: "security", value: { ...security, ...patch } });
    if (error && patch.two_person_approval === false && /approv/i.test(error.message)) {
      try { const m = await requestApproval("disable_two_person", "security", "Switch off two-person approval?"); if (m) setMsg(m); }
      catch (e) { setError((e as Error).message); }
      return;
    }
    if (error) return setError(error.message);
    await reload();
  };

  const verified = factors.filter((f) => f.status === "verified");
  return (
    <>
      <PageHeader title="My security" />
      <ErrorBox error={error} />
      {msg && <p className="mb-4 rounded-tag bg-farm-100 px-3 py-2 text-sm text-farm-800">{msg}</p>}

      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-sans text-lg font-bold normal-case"><ShieldCheck className="h-5 w-5 text-farm-700" /> Two-step sign-in</h2>
        <p className="text-sm text-ink/70">After your password, you also type a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator or Authy). Someone who steals your password still can't get in.</p>
        {verified.length > 0 ? (
          <ul className="text-sm">
            {verified.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 border-t border-ink/10 py-2">
                <span><b>On</b> · {f.friendly_name ?? "Authenticator app"} · added {new Date(f.created_at).toLocaleDateString("en-ZA")}</span>
                <button onClick={() => remove(f)} className="text-xs font-bold text-red-700 underline">Remove</button>
              </li>
            ))}
          </ul>
        ) : !enrolling && <button onClick={start} className="btn-green">Set up two-step sign-in</button>}

        {enrolling && (
          <form onSubmit={verify} className="grid gap-4 border-t border-ink/10 pt-4 sm:grid-cols-[auto_1fr]">
            <img src={enrolling.qr} alt="QR code for your authenticator app" className="h-44 w-44 border border-ink/10 bg-white p-2" />
            <div className="space-y-2 text-sm">
              <p><b>1.</b> Open your authenticator app and scan this code.</p>
              <p className="text-ink/70">Can't scan? Enter this key instead: <code className="break-all font-mono">{enrolling.secret}</code></p>
              <p><b>2.</b> Type the 6-digit code it shows:</p>
              <div className="flex gap-2">
                <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required className="input w-36 font-mono text-lg tracking-widest" aria-label="6-digit code" />
                <button className="btn-primary">Turn on</button>
              </div>
            </div>
          </form>
        )}
      </section>

      {isAdmin && (
        <section className="card mt-6 space-y-3 p-5">
          <h2 className="font-sans text-lg font-bold normal-case">Rules for all staff</h2>
          <Toggle label="Require two-step sign-in for every staff member" checked={security.require_staff_mfa} onChange={(v) => setRule({ require_staff_mfa: v })} />
          <p className="text-xs text-ink/70">When on, staff without an authenticator can only reach this page until they set one up. Set yours up first.</p>
          <Toggle label="Two-person approval for high-risk actions" checked={security.two_person_approval} onChange={(v) => setRule({ two_person_approval: v })} />
          <p className="text-xs text-ink/70">Recommended. Turning it off needs a second admin's approval while there is more than one admin.</p>
        </section>
      )}
    </>
  );
}

/** Shown after password sign-in when the account has an authenticator: asks for the 6-digit code. */
export function MfaChallenge({ onSignOut }: { onSignOut: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.find((f) => f.status === "verified");
    if (!factor) { setBusy(false); return setError("No authenticator found on this account."); }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (error) setError("That code didn't work. Try the newest code in your app.");
    // Success fires an auth state change; the admin reloads at AAL2.
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-farm-950 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border-2 border-ink bg-paper p-8">
        <h1 className="text-4xl text-farm-900">Enter your code</h1>
        <p className="text-sm text-ink/70">Open your authenticator app and type the 6-digit code for Tshehla AgriHub.</p>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required autoFocus className="input text-center font-mono text-2xl tracking-[0.4em]" aria-label="6-digit code" />
        {error && <p className="text-sm font-bold text-sun-600" role="alert">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? "Checking…" : "Continue"}</button>
        <button type="button" onClick={onSignOut} className="w-full text-sm font-bold underline">Sign out</button>
      </form>
    </div>
  );
}
