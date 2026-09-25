// PayFast helpers (server only). Signature rules: https://developers.payfast.co.za/docs#step_2_signature
import { createHash } from "node:crypto";

export const env = (k: string) => Deno.env.get(k) ?? "";

export const payfastConfig = () => {
  const merchantId = env("PAYFAST_MERCHANT_ID");
  const merchantKey = env("PAYFAST_MERCHANT_KEY");
  const sandbox = env("PAYFAST_SANDBOX") !== "false";
  const host = sandbox ? "sandbox.payfast.co.za" : "www.payfast.co.za";
  return {
    configured: Boolean(merchantId && merchantKey),
    merchantId,
    merchantKey,
    passphrase: env("PAYFAST_PASSPHRASE"),
    sandbox,
    processUrl: `https://${host}/eng/process`,
    validateUrl: `https://${host}/eng/query/validate`,
  };
};

// PayFast encodes spaces as "+" and uses uppercase hex escapes.
const pfEncode = (v: string) =>
  encodeURIComponent(v).replace(/%20/g, "+").replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export function pfSignature(fields: Array<[string, string]>, passphrase?: string) {
  const parts = fields
    .filter(([k, v]) => k !== "signature" && v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${pfEncode(String(v).trim())}`);
  let qs = parts.join("&");
  if (passphrase) qs += `&passphrase=${pfEncode(passphrase)}`;
  return createHash("md5").update(qs).digest("hex");
}

/** Parse form-urlencoded body keeping field order (needed for ITN signature checks). */
export function parseOrderedForm(body: string): Array<[string, string]> {
  return body.split("&").filter(Boolean).map((pair) => {
    const i = pair.indexOf("=");
    const dec = (s: string) => decodeURIComponent(s.replace(/\+/g, " "));
    return [dec(i >= 0 ? pair.slice(0, i) : pair), dec(i >= 0 ? pair.slice(i + 1) : "")];
  });
}

export const cors = {
  "Access-Control-Allow-Origin": env("SITE_URL") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
