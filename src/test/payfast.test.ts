import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

// The edge-function helpers read Deno.env; give them an empty one in Node.
let pf: typeof import("../../supabase/functions/_shared/payfast");
beforeAll(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = { env: { get: () => undefined } };
  pf = await import("../../supabase/functions/_shared/payfast");
});

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

describe("PayFast signature", () => {
  it("encodes spaces as + and appends the passphrase", () => {
    const fields: Array<[string, string]> = [["merchant_id", "10000100"], ["merchant_key", "46f0cd694581a"], ["amount", "100.00"], ["item_name", "Test Item"]];
    expect(pf.pfSignature(fields, "jt7NOE43FZPn")).toBe(
      md5("merchant_id=10000100&merchant_key=46f0cd694581a&amount=100.00&item_name=Test+Item&passphrase=jt7NOE43FZPn"));
  });

  it("skips blank fields and any existing signature", () => {
    const fields: Array<[string, string]> = [["merchant_id", "1"], ["email_address", ""], ["amount", "5.00"], ["signature", "abc"]];
    expect(pf.pfSignature(fields)).toBe(md5("merchant_id=1&amount=5.00"));
  });

  it("parses an ITN body keeping field order", () => {
    const parsed = pf.parseOrderedForm("m_payment_id=x&pf_payment_id=1&payment_status=COMPLETE&item_name=Order+TA-1");
    expect(parsed.map(([k]) => k)).toEqual(["m_payment_id", "pf_payment_id", "payment_status", "item_name"]);
    expect(parsed[3][1]).toBe("Order TA-1");
  });

  it("treats payments as not configured without merchant keys", () => {
    expect(pf.payfastConfig().configured).toBe(false);
    expect(pf.payfastConfig().processUrl).toContain("sandbox.payfast.co.za");
  });
});
