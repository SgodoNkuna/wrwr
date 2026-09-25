import { createContext, useContext, useState, type ReactNode } from "react";

// Only strictly-necessary storage is used without consent (the staff login session).
// "accepted" unlocks third-party embeds that set cookies (Google Maps).
export type ConsentChoice = "accepted" | "rejected" | null;
const KEY = "tshehla-cookie-consent-v1";

const read = (): ConsentChoice => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch { return null; }
};

interface Ctx { choice: ConsentChoice; open: boolean; setChoice: (c: Exclude<ConsentChoice, null>) => void; reopen: () => void }
const ConsentCtx = createContext<Ctx | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ConsentChoice>(read);
  const [open, setOpen] = useState(choice === null);
  const setChoice = (c: Exclude<ConsentChoice, null>) => {
    try { localStorage.setItem(KEY, c); } catch { /* storage blocked: keep in memory */ }
    setChoiceState(c);
    setOpen(false);
  };
  return <ConsentCtx.Provider value={{ choice, open, setChoice, reopen: () => setOpen(true) }}>{children}</ConsentCtx.Provider>;
}

export const useConsent = () => {
  const ctx = useContext(ConsentCtx);
  if (!ctx) throw new Error("useConsent outside ConsentProvider");
  return ctx;
};
