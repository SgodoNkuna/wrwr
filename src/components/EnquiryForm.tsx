import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Product } from "../lib/types";

export default function EnquiryForm({ products, defaultProductId }: { products?: Product[]; defaultProductId?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    // Honeypot: real users never see or fill this field.
    if (f.get("website")) { setState("sent"); return; }
    setError(null);
    setState("sending");
    const { error } = await supabase.from("enquiries").insert({
      name: String(f.get("name")).trim(),
      phone: String(f.get("phone")).trim(),
      email: String(f.get("email") || "").trim() || null,
      quantity: String(f.get("quantity") || "").trim() || null,
      message: String(f.get("message")).trim(),
      product_id: (f.get("product_id") as string) || defaultProductId || null,
      consent: f.get("consent") === "on",
    });
    if (error) {
      setState("idle");
      setError(error.message.includes("Too many") || error.message.includes("lot of enquiries") || error.message.includes("Consent")
        ? error.message
        : "Please check your details (a valid phone number is required) and try again.");
      return;
    }
    setState("sent");
  };

  if (state === "sent") {
    return (
      <div className="card flex flex-col items-center p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-farm-600" />
        <h3 className="mt-3 text-xl">Thank you!</h3>
        <p className="mt-1 text-sm text-farm-950/70">We've received your enquiry and will get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="eq-name">Name *</label><input id="eq-name" name="name" required minLength={2} maxLength={100} className="input" /></div>
        <div><label className="label" htmlFor="eq-phone">Phone *</label><input id="eq-phone" name="phone" type="tel" required pattern="\+?[0-9 \(\)\-]{9,20}" maxLength={20} placeholder="e.g. 071 234 5678" className="input" /></div>
        <div><label className="label" htmlFor="eq-email">Email</label><input id="eq-email" name="email" type="email" maxLength={200} className="input" /></div>
        <div><label className="label" htmlFor="eq-qty">Quantity</label><input id="eq-qty" name="quantity" maxLength={60} placeholder="e.g. 2 boxes" className="input" /></div>
      </div>
      {products && !defaultProductId && (
        <div>
          <label className="label" htmlFor="eq-product">Product</label>
          <select id="eq-product" name="product_id" className="input" defaultValue="">
            <option value="">General enquiry</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div><label className="label" htmlFor="eq-msg">Message *</label><textarea id="eq-msg" name="message" required minLength={2} maxLength={2000} rows={4} className="input" /></div>
      <label className="flex items-start gap-2 text-xs text-farm-950/70">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-farm-700" />
        <span>I agree that Tshehla AgriHub may use my details to respond to this enquiry, as described in the <Link to="/privacy" className="font-semibold text-farm-700 underline">Privacy Policy</Link>. *</span>
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-primary w-full">{state === "sending" ? "Sending…" : "Send enquiry"}</button>
    </form>
  );
}
