import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Role } from "./types";

interface AuthState {
  session: Session | null;
  roles: Role[];
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (s: Session | null) => {
      setSession(s);
      if (!s) { setRoles([]); setLoading(false); return; }
      // UI hint only: every write is re-checked by RLS on the server.
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
      setRoles((data ?? []).map((r) => r.role as Role));
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setLoading(true); void load(s); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session, roles, loading,
    isAdmin: roles.includes("admin"),
    isStaff: roles.length > 0,
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
};
