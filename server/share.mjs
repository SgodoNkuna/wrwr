// Link-preview pages for chat and social apps (WhatsApp, Facebook, X, Slack, Telegram…). Search engines
// are deliberately excluded: they run JavaScript, and serving them different HTML would count as cloaking.
// These bots don't run JavaScript, so without this every shared product link previews as the homepage.
// Used by the Vercel function (api/share.js) and the Docker server (server/index.mjs).

export const BOT_UA = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|Slackbot|LinkedInBot|TelegramBot|Discordbot|SkypeUriPreview|Pinterest|redditbot/i;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rand = (cents) => "R" + (cents / 100).toLocaleString("en-ZA", { maximumFractionDigits: cents % 100 ? 2 : 0 });

const SITE_NAME = "Tshehla AgriHub";
const DEFAULT = {
  title: "Tshehla AgriHub | Livestock, Poultry & Fresh Produce in Letsitele",
  description: "Day-old chicks, cattle, goats, pigs and fresh veg from Gunyula Farm, Letsitele, Limpopo. Order online or WhatsApp us.",
  image: "/images/tau-poultry-broilers.jpg",
};
const PAGES = {
  "/products": { title: "What's for sale | Tshehla AgriHub", description: "Broiler chicks, Brahma chickens, turkeys, ducks, cattle, goats, pigs, green peppers and green beans from Letsitele." },
  "/about": { title: "The farm | Tshehla AgriHub", description: "A family farm at Gunyula Farm 38, Letsitele, Limpopo. Home of Tau Poultry chicks." },
  "/contact": { title: "Find us | Tshehla AgriHub", description: "WhatsApp or call 068 828 9347, or visit Gunyula Farm 38, Letsitele, Limpopo." },
};

export function isShareable(pathname) {
  return pathname === "/" || pathname in PAGES || /^\/products\/[a-z0-9-]{1,80}$/.test(pathname);
}

async function fetchProduct(slug, supabaseUrl, anonKey, fetchImpl) {
  const url = `${supabaseUrl}/rest/v1/products?select=name,summary,description,image_url,unit,price_cents,show_price,in_stock&published=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`;
  const res = await fetchImpl(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, signal: AbortSignal.timeout(4000) });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

/** Returns { status, html } for a shareable path. */
export async function renderShare(pathname, { siteUrl, supabaseUrl, anonKey, fetchImpl = fetch }) {
  const base = siteUrl.replace(/\/$/, "");
  let meta = { ...DEFAULT, ...(PAGES[pathname] ?? {}) };
  let status = 200;
  const m = pathname.match(/^\/products\/([a-z0-9-]{1,80})$/);
  if (m) {
    const p = await fetchProduct(m[1], supabaseUrl, anonKey, fetchImpl).catch(() => null);
    if (!p) { status = 404; meta = { ...DEFAULT, title: `Not found | ${SITE_NAME}` }; }
    else {
      const price = p.show_price && p.price_cents != null ? `${rand(p.price_cents)}${p.unit ? ` (${p.unit.toLowerCase()})` : ""}` : "Ask us for a price";
      meta = {
        title: `${p.name} | ${SITE_NAME}`,
        description: `${price}${p.in_stock ? "" : " · currently sold out"}. ${p.summary ?? p.description ?? ""} Gunyula Farm, Letsitele.`.trim(),
        image: p.image_url || DEFAULT.image,
        price: p.show_price && p.price_cents != null ? (p.price_cents / 100).toFixed(2) : null,
      };
    }
  }
  const image = /^https?:\/\//.test(meta.image) ? meta.image : base + meta.image;
  const url = base + pathname;
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${meta.price ? "product" : "website"}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="en_ZA">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
${meta.price ? `<meta property="product:price:amount" content="${meta.price}">\n<meta property="product:price:currency" content="ZAR">` : ""}
</head><body><h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p><p><a href="${esc(url)}">${esc(url)}</a></p></body></html>`;
  return { status, html };
}
