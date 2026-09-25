// Vercel function: link previews for chat apps and crawlers (see server/share.mjs).
// vercel.json routes only bot user-agents here; people get the normal app.
import { renderShare, isShareable } from "../server/share.mjs";

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.searchParams.get("path") || "/";
  if (!isShareable(path)) { res.statusCode = 404; return res.end("Not found"); }
  const { status, html } = await renderShare(path, {
    siteUrl: process.env.SITE_URL || `https://${req.headers.host}`,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
  });
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
  res.setHeader("X-Robots-Tag", "noarchive");
  res.end(html);
}
