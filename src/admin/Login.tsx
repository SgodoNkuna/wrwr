import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password") ?? "");
    setBusy(true); setMsg(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      // Generic message: don't reveal whether the email exists.
      if (error) setMsg({ ok: false, text: "Incorrect email or password." });
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: String(f.get("full_name")) } } });
      setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Account created. Confirm your email if asked, then an admin must grant you access." });
    } else {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/reset` });
      setMsg({ ok: true, text: "If that email has an account, a reset link is on its way." });
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-farm-950 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <div>
          <h1 className="text-2xl">Staff {mode === "signup" ? "sign up" : mode === "reset" ? "password reset" : "login"}</h1>
          <p className="text-sm text-ink/70">Tshehla AgriHub admin</p>
        </div>
        {mode === "signup" && <div><label className="label" htmlFor="full_name">Full name</label><input id="full_name" name="full_name" required maxLength={100} className="input" /></div>}
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
        {mode !== "reset" && (
          <div><label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={mode === "signup" ? 10 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="input" />
            {mode === "signup" && <p className="mt-1 text-xs text-ink/70">At least 10 characters.</p>}
          </div>
        )}
        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-farm-50 text-farm-800" : "bg-red-50 text-red-700"}`} role="alert">{msg.text}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</button>
        <div className="flex justify-between text-xs font-semibold text-farm-700">
          {mode !== "signin" ? <button type="button" onClick={() => setMode("signin")}>Back to sign in</button> : <button type="button" onClick={() => setMode("signup")}>Request staff account</button>}
          {mode === "signin" && <button type="button" onClick={() => setMode("reset")}>Forgot password?</button>}
        </div>
        <a href="/" className="block text-center text-xs text-ink/70 hover:underline">← Back to website</a>
      </form>
    </div>
  );
}
