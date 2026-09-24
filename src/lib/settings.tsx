import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { BusinessSettings, HomeSettings } from "./types";

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
};

export const DEFAULT_HOME: HomeSettings = {
  hero_title: "Quality livestock & fresh produce from Letsitele",
  hero_subtitle: "Cattle, goats, pigs, poultry and farm-fresh vegetables, raised with care on Gunyula Farm.",
  announcement: "",
};

interface Ctx { business: BusinessSettings; home: HomeSettings; reload: () => Promise<void> }
const SettingsCtx = createContext<Ctx>({ business: DEFAULT_BUSINESS, home: DEFAULT_HOME, reload: async () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState(DEFAULT_BUSINESS);
  const [home, setHome] = useState(DEFAULT_HOME);

  const reload = async () => {
    const { data } = await supabase.from("site_settings").select("key, value");
    for (const row of data ?? []) {
      if (row.key === "business") setBusiness({ ...DEFAULT_BUSINESS, ...(row.value as object) });
      if (row.key === "home") setHome({ ...DEFAULT_HOME, ...(row.value as object) });
    }
  };

  useEffect(() => { void reload(); }, []);
  return <SettingsCtx.Provider value={{ business, home, reload }}>{children}</SettingsCtx.Provider>;
}

export const useSettings = () => useContext(SettingsCtx);
