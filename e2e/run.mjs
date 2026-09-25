// End-to-end + accessibility checks against a built site, with Supabase mocked.
// Usage:  npm run build && npx vite preview --port 4173 &  node e2e/run.mjs [baseUrl] [screenshotDir]
// Env:    CHROMIUM_PATH=/path/to/chrome (optional; defaults to Playwright's browser)
//         E2E_VIA_CURL=1 fetches the site through curl (for sandboxes whose browser can't reach it directly)
// Exits non-zero if any check fails, the page logs an error, or axe finds serious/critical issues.
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const base = process.argv[2] || "http://localhost:4173";
const shots = process.argv[3] || null;
if (shots) mkdirSync(shots, { recursive: true });
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const now = Date.now();
const iso = (daysAgo) => new Date(now - daysAgo * 864e5).toISOString();

// ── Mock data (mirrors supabase/test-data/seed_test_data.sql) ────────────
const cats = [
  { id: "c1", slug: "poultry", name: "Poultry & Birds", description: "Day-old broiler chicks, Brahma chickens, turkeys, geese, ducks and ostriches.", sort_order: 1, published: true },
  { id: "c2", slug: "livestock", name: "Livestock", description: "Healthy cattle, goats and pigs raised on the farm in Letsitele.", sort_order: 2, published: true },
  { id: "c3", slug: "fresh-produce", name: "Fresh Produce", description: "Farm-fresh vegetables picked in season.", sort_order: 3, published: true },
];
const P = (id, cat, slug, name, unit, price, show, orderable, extra = {}) => ({
  id, category_id: cat, slug, name, summary: `${name} from Gunyula Farm.`, description: `${name} raised on the farm.`,
  image_url: slug === "broiler-chicks" ? "/images/tau-poultry-broilers.jpg" : `/images/test/${slug}.jpg`, unit, price_cents: price, show_price: show,
  in_stock: true, featured: false, published: true, highlights: [], sort_order: 1, orderable, stock_qty: null, max_per_order: 20,
  updated_at: iso(0), price_updated_at: iso(2), categories: { slug: cats.find((c) => c.id === cat).slug, name: cats.find((c) => c.id === cat).name }, ...extra,
});
const products = [
  P("p1", "c1", "broiler-chicks", "Broiler Chicks (Tau Poultry)", "Box of 100 chicks", 120000, true, true, { stock_qty: 40, highlights: ["Healthy & strong", "Fully vaccinated"] }),
  P("p2", "c1", "brahma-chickens", "Brahma Chickens", "Per bird", 25000, true, true, { stock_qty: 6 }),
  P("p3", "c1", "turkeys", "Turkeys", "Per bird", 45000, true, true),
  P("p4", "c1", "geese", "Geese", "Per bird", 35000, false, false),
  P("p5", "c1", "ducks", "Ducks", "Per bird", 15000, true, true),
  P("p6", "c1", "ostriches", "Ostriches", "Per bird", 450000, false, false, { in_stock: false }),
  P("p7", "c2", "cattle", "Cattle", "Per animal", 1200000, false, false),
  P("p8", "c2", "goats", "Goats", "Per animal", 180000, true, false),
  P("p9", "c2", "pigs", "Pigs", "Per animal", 250000, false, false),
  P("p10", "c3", "green-peppers", "Green Peppers", "Per crate / bag", 18000, true, true),
  P("p11", "c3", "green-beans", "Green Beans", "Per crate / bag", 15000, true, true),
];
const animals = [
  { id: "a1", product_id: "p7", tag: "TEST-C014", title: "Bonsmara heifer", breed: "Bonsmara", sex: "female", age_months: 18, weight_kg: 320, quantity: 1, price_cents: 1250000, show_price: true, status: "available", image_url: "/images/test/cattle.jpg", notes: "TEST listing.", published: true, sort_order: 1 },
  { id: "a2", product_id: "p7", tag: "TEST-C009", title: "Brahman cow", breed: "Brahman", sex: "female", age_months: 48, weight_kg: 510, quantity: 1, price_cents: 1450000, show_price: true, status: "reserved", image_url: "/images/test/cattle.jpg", notes: null, published: true, sort_order: 2 },
  { id: "a3", product_id: "p9", tag: "TEST-P101", title: "Large White weaners", breed: "Large White", sex: "mixed", age_months: 2, weight_kg: 12, quantity: 10, price_cents: 90000, show_price: true, status: "available", image_url: "/images/test/pigs.jpg", notes: null, published: true, sort_order: 1 },
].map((a) => ({ ...a, products: { name: products.find((p) => p.id === a.product_id).name, slug: products.find((p) => p.id === a.product_id).slug } }));
const settings = [
  { key: "business", value: { name: "Tshehla AgriHub", tagline: "", phone: "068 828 9347", alt_phone: "083 798 6730", whatsapp: "27688289347", email: "info@tshehla-agrihub.co.za", address: "Gunyula Farm 38, Letsitele, Limpopo, 0885", hours: "Mon to Sat, 07:00 to 17:00", map_query: "Letsitele, Limpopo", legal_name: "Tshehla AgriHub", registration_number: "(to be confirmed)", information_officer: "(owner name to be confirmed)" } },
  { key: "home", value: { hero_title: "Raised on Gunyula Farm", hero_subtitle: "Day-old chicks, cattle, goats, pigs and fresh veg from Letsitele. Order online or WhatsApp us, then collect at the farm.", announcement: "TEST SITE: prices and photos are dummy values for testing only." } },
  { key: "payments", value: { online_enabled: false, provider: "payfast", eft_enabled: true, cash_enabled: true, bank_name: "", account_name: "", account_number: "", branch_code: "", eft_note: "Use your order number as the payment reference.", delivery_note: "Collection is at the farm.", hold_hours: 48, cash_hold_hours: 72 } },
  { key: "security", value: { require_staff_mfa: false, two_person_approval: true, captcha_site_key: "" } },
];
const seed = [
  ["TA-TEST-00001", 0, "Thabo Test", "eft", "unpaid", "new", [["p1", 2]], "collect", 0],
  ["TA-TEST-00002", 0, "Lerato Test", "cash", "unpaid", "new", [["p10", 3], ["p11", 2]], "delivery", 25000],
  ["TA-TEST-00003", 1, "Sipho Test", "eft", "paid", "confirmed", [["p1", 5]], "collect", 0],
  ["TA-TEST-00004", 2, "Naledi Test", "cash", "unpaid", "ready", [["p2", 2], ["p5", 4]], "collect", 0],
  ["TA-TEST-00005", 3, "Pieter Test", "eft", "paid", "completed", [["p1", 3]], "collect", 0],
  ["TA-TEST-00008", 7, "Anna Test", "eft", "unpaid", "cancelled", [["p1", 4]], "collect", 0],
  ["TA-TEST-00012", 13, "Customer Test", "eft", "paid", "completed", [["p1", 1]], "collect", 0],
];
const orders = seed.map(([ref, d, name, method, pay, status, lines, fulfilment, delivery], i) => {
  const items = lines.map(([pid, q], k) => { const p = products.find((x) => x.id === pid); return { id: i * 10 + k, product_id: pid, product_name: p.name, unit: p.unit, unit_price_cents: p.price_cents, quantity: q, line_total_cents: p.price_cents * q }; });
  const sub = items.reduce((s, x) => s + x.line_total_cents, 0);
  return { id: `o${i + 1}`, reference: ref, customer_id: ref === "TA-TEST-00012" ? "cust-1" : null, customer_name: name, phone: `07${i} 111 00${10 + i}`, email: null,
    fulfilment, delivery_address: fulfilment === "delivery" ? "12 Main Rd, Tzaneen" : null, notes: null, subtotal_cents: sub, delivery_cents: delivery, total_cents: sub + delivery,
    payment_method: method, payment_status: pay, payment_reference: null, paid_at: pay === "paid" ? iso(d) : null, status, admin_notes: null, is_test: true, created_at: iso(d), order_items: items };
});
const profiles = [
  { id: "admin-1", email: "admin.test@example.com", full_name: "Test Admin", phone: null, created_at: iso(20) },
  { id: "cust-1", email: "customer.test@example.com", full_name: "Customer Test", phone: "082 555 0123", created_at: iso(15) },
];
const approvals = [];
const audit = [{ id: 1, actor_email: "admin.test@example.com", action: "update", table_name: "products", record_id: "p1", old_data: { name: "Broiler Chicks (Tau Poultry)", price_cents: 110000 }, new_data: { name: "Broiler Chicks (Tau Poultry)", price_cents: 120000 }, created_at: iso(1) }];

// ── Supabase mock ────────────────────────────────────────────────────────
const sent = { orders: [], approvals: [] };
let user = null;
function session(u) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(now / 1000) + 3600;
  const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, role: "authenticated", aal: "aal1", exp, email: u.email })}.sig`;
  return { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r",
    user: { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: {}, user_metadata: {}, factors: [], created_at: iso(10) } };
}
async function mockSupabase(route) {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname;
  const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
  const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  if (path.startsWith("/auth/v1/token")) {
    const { email } = req.postDataJSON() ?? {};
    const u = email === "admin.test@example.com" ? { id: "admin-1", email, role: "admin" } : email === "customer.test@example.com" ? { id: "cust-1", email, role: null } : null;
    if (!u) return json({ error: "invalid_grant", error_description: "Invalid login credentials" }, 400);
    user = u;
    return json(session(u));
  }
  if (path.startsWith("/auth/v1/logout")) { user = null; return route.fulfill({ status: 204 }); }
  if (path.startsWith("/auth/v1/user")) return user ? json(session(user).user) : json({}, 401);
  if (path.startsWith("/functions/v1/payfast-checkout")) return json({ configured: false, enabled: false, sandbox: true });

  const table = path.replace("/rest/v1/", "");
  if (table === "rpc/place_order") {
    const body = req.postDataJSON(); sent.orders.push(body);
    const total = body.p_items.reduce((s, it) => s + products.find((p) => p.id === it.product_id).price_cents * it.quantity, 0);
    const ref = "TA-260925-AB12C";
    orders.unshift({ ...orders[0], id: "o-new", reference: ref, customer_name: body.p_customer.name, phone: body.p_customer.phone, subtotal_cents: total, delivery_cents: 0, total_cents: total,
      payment_method: body.p_customer.payment_method, payment_status: "unpaid", status: "new", created_at: new Date().toISOString(),
      order_items: body.p_items.map((it, k) => { const p = products.find((x) => x.id === it.product_id); return { id: 900 + k, product_name: p.name, unit: p.unit, quantity: it.quantity, line_total_cents: p.price_cents * it.quantity }; }) });
    return json([{ order_id: "o-new", reference: ref, total_cents: total, payment_method: body.p_customer.payment_method }]);
  }
  if (table === "rpc/track_order") {
    const body = req.postDataJSON();
    const o = orders.find((x) => x.reference === body.p_reference);
    return json(o && body.p_phone.replace(/\D/g, "").slice(-9) === o.phone.replace(/\D/g, "").slice(-9)
      ? [{ ...o, items: o.order_items.map((i) => ({ name: i.product_name, unit: i.unit, quantity: i.quantity, line_total_cents: i.line_total_cents })) }] : []);
  }
  if (table === "rpc/request_approval") {
    const b = req.postDataJSON(); sent.approvals.push(b);
    const row = { id: `ap${approvals.length + 1}`, action: b.p_action, target_id: b.p_target, summary: `${b.p_action} ${b.p_target}`, reason: b.p_reason, status: "pending",
      requested_by: user?.id, requested_by_email: user?.email, decided_by: null, decided_by_email: null, decision_note: null, result: null, created_at: new Date().toISOString(), decided_at: null };
    approvals.unshift(row);
    return json(row);
  }
  if (table === "enquiries" && req.method() === "POST") return route.fulfill({ status: 201, body: "" });
  if (req.method() === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": "0-0/1" } });

  const staff = Boolean(user?.role);
  let rows = {
    categories: cats, products, animals, site_settings: settings, services: [],
    enquiries: staff ? [{ id: "e1", product_id: "p7", name: "Lerato Test", phone: "072 222 0002", email: null, message: "TEST: Looking for 2 heifers.", quantity: "2", status: "new", admin_notes: null, consent_at: iso(1), created_at: iso(1), products: { name: "Cattle" } }] : [],
    orders: staff ? orders : orders.filter((o) => o.customer_id === user?.id),
    user_roles: staff ? [{ user_id: user.id, role: user.role }] : [],
    profiles: user ? (staff ? profiles : profiles.filter((p) => p.id === user.id)) : [],
    pending_approvals: staff ? approvals : [], audit_logs: staff ? audit : [], data_requests: [], payment_events: [],
  }[table] ?? [];
  for (const [k, v] of url.searchParams) {
    if (["select", "order", "limit", "offset"].includes(k)) continue;
    const m = /^(eq|neq)\.(.*)$/.exec(v);
    if (m) rows = rows.filter((r) => (m[1] === "eq" ? String(r[k]) === m[2] : String(r[k]) !== m[2]));
  }
  if (url.searchParams.get("stock_qty")) rows = rows.filter((r) => r.stock_qty != null && r.stock_qty <= 10);
  return json(single ? rows[0] ?? null : rows);
}

// ── Harness ──────────────────────────────────────────────────────────────
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const checks = {};
const axe = {};
const check = (name, value) => { checks[name] = value; };

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport });
  await ctx.route("**/*.supabase.co/**", mockSupabase);
  await ctx.routeWebSocket(/supabase\.co\/realtime/, () => { /* swallow realtime traffic */ });
  await ctx.route("**/maps.google.com/**", (r) => r.fulfill({ status: 200, body: "<body></body>", contentType: "text/html" }));
  if (process.env.E2E_VIA_CURL) await ctx.route(base + "/**", viaCurl);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${p.url()}: ${e.message}`));
  p.on("console", (m) => {
    const t = m.text();
    if ((m.type() === "error" || /Content Security Policy/i.test(t)) && !/ERR_FAILED|WebSocket|realtime/i.test(t)) errors.push(`${p.url()}: ${t}`);
  });
  p.on("dialog", (d) => d.accept(d.type() === "prompt" ? "E2E test reason" : undefined));
  return p;
}
// Single-page app: every route serves the same HTML, so cache one copy per asset path.
const curlCache = new Map();
async function viaCurl(route) {
  const u = new URL(route.request().url());
  const key = /\.[a-z0-9]+$/i.test(u.pathname) ? u.pathname : "/";
  if (!curlCache.has(key)) curlCache.set(key, execFileSync("curl", ["-sS", "--retry", "6", "--retry-all-errors", "--retry-delay", "2", "-D", "-", base + key], { maxBuffer: 20e6 }));
  const res = curlCache.get(key);
  const sep = res.indexOf("\r\n\r\n", res.lastIndexOf("HTTP/"));
  const head = res.subarray(0, sep).toString();
  const headers = Object.fromEntries(head.split("\r\n").filter((l) => l.includes(":") && !l.startsWith("HTTP")).map((l) => [l.slice(0, l.indexOf(":")).toLowerCase(), l.slice(l.indexOf(":") + 1).trim()]));
  for (const h of ["content-encoding", "content-length", "transfer-encoding"]) delete headers[h];
  return route.fulfill({ status: Number(/HTTP\/[\d.]+ (\d+)/.exec(head.slice(head.lastIndexOf("HTTP/")))[1]), headers, body: res.subarray(sep + 4) });
}

async function scan(p, name) {
  // Inject via DevTools (not a <script> tag) so the site's strict CSP stays fully in force.
  if (!(await p.evaluate(() => "axe" in window))) await p.evaluate(axeSource);
  const r = await p.evaluate(async () => await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa"] }));
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  axe[name] = bad.map((v) => `${v.impact} ${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
}
const shot = async (p, name) => shots && p.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
const go = (p, path) => p.goto(base + path, { waitUntil: "networkidle" });

// ── Public journey ───────────────────────────────────────────────────────
const d = await newPage({ width: 1280, height: 860 });
await go(d, "/");
check("cookie banner shown", await d.locator("text=A quick word on cookies").isVisible());
await scan(d, "home");
await d.click("button:has-text('Essential only')");
check("hero title", (await d.locator("h1").first().innerText()).includes("GUNYULA"));
check("price board shows animal count", (await d.locator(".chalkboard >> text=available").count()) > 0);
check("sold-out struck through", (await d.locator(".chalkboard .line-through").count()) === 1);
await shot(d, "home");

await go(d, "/products/broiler-chicks");
await d.click("button[aria-label=More]"); await d.click("button[aria-label=More]");
await d.click("button:has-text('Add to basket')");
check("basket badge 3", (await d.locator("header a[href='/basket']").innerText()).includes("3"));
await scan(d, "product");

await go(d, "/products/cattle");
check("livestock: no basket button", (await d.locator("button:has-text('Add to basket')").count()) === 0);
check("livestock: animals listed", await d.waitForSelector("text=TAG TEST-C014", { timeout: 5000 }).then(() => true).catch(() => false));
check("livestock: reserved stamp", (await d.locator("text=Reserved").count()) > 0);
await scan(d, "livestock");
await shot(d, "livestock");

await go(d, "/checkout");
check("online payment disabled", await d.locator("input[name=payment]").first().isDisabled());
await d.fill("#co-name", "Sipho Test"); await d.fill("#co-phone", "071 234 5678");
await d.locator("label:has-text('EFT (bank transfer)')").click();
await scan(d, "checkout");
await d.click("button:has-text('Place order')");
check("blocked without consent boxes", sent.orders.length === 0);
await d.check("input[name=terms]"); await d.check("input[name=consent]");
await d.click("button:has-text('Place order')");
await d.waitForURL("**/order/TA-260925-AB12C");
await d.waitForSelector("text=Pay by EFT");
check("order payload has no prices", !JSON.stringify(sent.orders[0].p_items).includes("price") && sent.orders[0].p_items[0].quantity === 3);
check("basket cleared", !(await d.locator("header a[href='/basket']").innerText()).includes("3"));
await scan(d, "order-confirmation");

await go(d, "/track");
await d.fill("#tr-ref", "TA-TEST-00002"); await d.fill("#tr-phone", "071 111 0011");
await d.click("button:has-text('Show my order')");
check("track shows delivery line", await d.waitForSelector("td:has-text('Delivery')", { timeout: 5000 }).then(() => true).catch(() => false));
await go(d, "/track");
await d.fill("#tr-ref", "TA-TEST-00002"); await d.fill("#tr-phone", "082 000 0000");
await d.click("button:has-text('Show my order')");
check("track refuses wrong phone", await d.waitForSelector("[role=alert]", { timeout: 5000 }).then(() => true).catch(() => false));
await scan(d, "track");

for (const path of ["/products", "/about", "/contact", "/privacy", "/terms", "/returns", "/cookies", "/paia"]) {
  await go(d, path);
  await scan(d, path);
}

// ── Customer ─────────────────────────────────────────────────────────────
await go(d, "/account");
await scan(d, "account-signin");
await d.fill("#ac-email", "customer.test@example.com"); await d.fill("#ac-pw", "x");
await d.click("form button:has-text('Sign in')");
check("customer sees own order", await d.waitForSelector("text=TA-TEST-00012", { timeout: 8000 }).then(() => true).catch(() => false));
await scan(d, "account");
await d.click("button:has-text('Sign out')");

// ── Staff ────────────────────────────────────────────────────────────────
await go(d, "/admin");
await d.fill("#email", "admin.test@example.com"); await d.fill("#password", "x");
await d.click("form button:has-text('Sign in')");
await d.waitForSelector("text=Orders per day");
check("dashboard chart bars", (await d.locator("figure svg rect[role=img]").count()) === 14);
await scan(d, "admin-dashboard");
await shot(d, "admin-dashboard");

await go(d, "/admin/orders?open=o2");
await d.waitForSelector("text=Delivery charge");
check("order modal: delivery charge editor", (await d.locator("input[aria-label='Delivery charge in Rand']").count()) === 1);
await d.click("button:has-text('Request deletion')");
check("delete goes to approval", await d.waitForSelector("text=Request sent", { timeout: 5000 }).then(() => sent.approvals[0]?.p_action === "delete_order").catch(() => false));
await scan(d, "admin-orders");

await go(d, "/admin/approvals");
check("approvals page lists request", await d.waitForSelector("text=E2E test reason", { timeout: 5000 }).then(() => true).catch(() => false));
await scan(d, "admin-approvals");
await shot(d, "admin-approvals");

await go(d, "/admin/audit");
await d.selectOption("#au-table", "products");
check("audit filter", await d.waitForSelector("text=changed: price_cents", { timeout: 5000 }).then(() => true).catch(() => false));
await scan(d, "admin-audit");

await go(d, "/admin/security");
check("security page", (await d.locator("button:has-text('Set up two-step sign-in')").count()) === 1);
await scan(d, "admin-security");

await go(d, "/admin/animals");
check("livestock admin rows", (await d.locator("tbody tr").count()) === 3);
await scan(d, "admin-animals");

await go(d, "/admin/payments");
check("payments: turnstile + hold settings", (await d.locator("text=I'm human").count()) > 0 && (await d.locator("#pay-hold").count()) === 1);
await scan(d, "admin-payments");

// ── Mobile ───────────────────────────────────────────────────────────────
const m = await newPage({ width: 390, height: 844 });
await go(m, "/");
check("mobile: no horizontal scroll", await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await shot(m, "home-mobile");
await browser.close();

// ── Report ───────────────────────────────────────────────────────────────
const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const axeFailures = Object.entries(axe).filter(([, v]) => v.length);
console.log(`\n${Object.keys(checks).length - failed.length}/${Object.keys(checks).length} checks passed · ${Object.keys(axe).length} pages scanned by axe`);
for (const k of failed) console.log(`  FAIL ${k}`);
for (const [page, v] of axeFailures) for (const line of v) console.log(`  AXE  ${page}: ${line}`);
for (const e of errors) console.log(`  ERROR ${e}`);
process.exit(failed.length || axeFailures.length || errors.length ? 1 : 0);
