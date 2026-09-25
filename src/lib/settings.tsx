import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { BusinessSettings, HomeSettings, PaymentSettings, SecuritySettings } from "./types";

export const DEFAULT_BUSINESS: BusinessSettings = {
  name: "Tshehla AgriHub",
  tagline: "Nurture today's harvest, nurture tomorrow's growth.",
  phone: "068 828 9347",
  alt_phone: "083 798 6730",
  whatsapp: "27688289347",
  email: "",
  address: "Gunyula Farm 38, Letsitele, Limpopo, 0885",
  hours: "Mon to Sat, 07:00 to 17:00",
  map_query: "Letsitele, Limpopo",
  legal_name: "Tshehla AgriHub",
  registration_number: "",
  information_officer: "",
};

export const DEFAULT_HOME: HomeSettings = {
  hero_title: "Raised on Gunyula Farm",
  hero_subtitle: "Day-old chicks, cattle, goats, pigs and fresh veg from Letsitele. Order online or WhatsApp us, then collect at the farm.",
  announcement: "",
};

export const DEFAULT_PAYMENTS: PaymentSettings = {
  online_enabled: false,
  provider: "payfast",
  eft_enabled: true,
  cash_enabled: true,
  bank_name: "",
  account_name: "",
  account_number: "",
  branch_code: "",
  eft_note: "Use your order number as the payment reference and send proof of payment on WhatsApp.",
  delivery_note: "Collection is at the farm. Delivery can be arranged; we will confirm the cost on WhatsApp.",
  hold_hours: 48,
  cash_hold_hours: 72,
};

export const DEFAULT_SECURITY: SecuritySettings = { require_staff_mfa: false, two_person_approval: true, captcha_site_key: "" };

interface Ctx { business: BusinessSettings; home: HomeSettings; payments: PaymentSettings; security: SecuritySettings; reload: () => Promise<void> }
const SettingsCtx = createContext<Ctx>({ business: DEFAULT_BUSINESS, home: DEFAULT_HOME, payments: DEFAULT_PAYMENTS, security: DEFAULT_SECURITY, reload: async () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState(DEFAULT_BUSINESS);
  const [home, setHome] = useState(DEFAULT_HOME);
  const [payments, setPayments] = useState(DEFAULT_PAYMENTS);
  const [security, setSecurity] = useState(DEFAULT_SECURITY);

  const reload = async () => {
    const { data } = await supabase.from("site_settings").select("key, value");
    for (const row of data ?? []) {
      if (row.key === "business") setBusiness({ ...DEFAULT_BUSINESS, ...(row.value as object) });
      if (row.key === "home") setHome({ ...DEFAULT_HOME, ...(row.value as object) });
      if (row.key === "payments") setPayments({ ...DEFAULT_PAYMENTS, ...(row.value as object) });
      if (row.key === "security") setSecurity({ ...DEFAULT_SECURITY, ...(row.value as object) });
    }
  };

  useEffect(() => { void reload(); }, []);
  return <SettingsCtx.Provider value={{ business, home, payments, security, reload }}>{children}</SettingsCtx.Provider>;
}

export const useSettings = () => useContext(SettingsCtx);
