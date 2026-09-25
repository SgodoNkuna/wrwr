import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPassword({ next = "/admin" }: { next?: string }) {
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password"));
    if (pw !== String(f.get("confirm"))) return setErr("Passwords don't match.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setErr(error.message);
    nav(next);
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-farm-950 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <h1 className="text-2xl">Set a new password</h1>
        <input name="password" type="password" minLength={10} required placeholder="New password (10+ chars)" className="input" autoComplete="new-password" />
        <input name="confirm" type="password" minLength={10} required placeholder="Confirm password" className="input" autoComplete="new-password" />
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full">Update password</button>
      </form>
    </div>
  );
}
