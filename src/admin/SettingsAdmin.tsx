import { useEffect, useState, type FormEvent } from "react";
import { useSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import type { BusinessSettings, HomeSettings } from "../lib/types";
import { AdminOnly } from "./AdminLayout";
import { ErrorBox, PageHeader } from "./ui";

const bizFields: [keyof BusinessSettings, string][] = [
  ["name", "Business name"], ["tagline", "Tagline"], ["phone", "Phone"], ["alt_phone", "Alternative phone"],
  ["whatsapp", "WhatsApp number (e.g. 27688289347)"], ["email", "Email"], ["address", "Address"],
  ["hours", "Opening hours"], ["map_query", "Map search (Google Maps)"],
  ["legal_name", "Registered business name (legal pages)"], ["registration_number", "Company / CIPC registration number"],
  ["information_officer", "POPIA Information Officer (name)"],
];
const homeFields: [keyof HomeSettings, string][] = [
  ["hero_title", "Homepage headline"], ["hero_subtitle", "Homepage sub-heading"], ["announcement", "Top announcement bar (leave empty to hide)"],
];

export default function SettingsAdmin() {
  const { business, home, reload } = useSettings();
  const [biz, setBiz] = useState(business);
  const [hm, setHm] = useState(home);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  useEffect(() => { setBiz(business); setHm(home); }, [business, home]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setOk(false);
    const { error } = await supabase.from("site_settings").upsert([{ key: "business", value: biz }, { key: "home", value: hm }]);
    if (error) return setError(error.message);
    await reload(); setOk(true);
  };

  return (
    <AdminOnly>
      <PageHeader title="Site settings" />
      <form onSubmit={save} className="space-y-6">
        <ErrorBox error={error} />
        {ok && <p className="rounded-lg bg-farm-100 px-3 py-2 text-sm text-farm-800">Settings saved. The website updates immediately.</p>}
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-xl sm:col-span-2">Business details</h2>
          {bizFields.map(([k, label]) => (
            <label key={k} className="block"><span className="label">{label}</span><input className="input" maxLength={200} value={biz[k]} onChange={(e) => setBiz({ ...biz, [k]: e.target.value })} /></label>
          ))}
        </section>
        <section className="card grid gap-4 p-5">
          <h2 className="text-xl">Homepage</h2>
          {homeFields.map(([k, label]) => (
            <label key={k} className="block"><span className="label">{label}</span><input className="input" maxLength={300} value={hm[k]} onChange={(e) => setHm({ ...hm, [k]: e.target.value })} /></label>
          ))}
        </section>
        <button className="btn-primary">Save settings</button>
      </form>
    </AdminOnly>
  );
}
