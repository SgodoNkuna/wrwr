// Vercel cron (daily, see vercel.json): one tiny read so the free-plan Supabase
// project never counts as inactive and gets paused.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) { res.statusCode = 401; return res.end("Unauthorized"); }
  const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/products?select=id&limit=1`, {
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY },
  });
  res.statusCode = r.ok ? 200 : 502;
  res.setHeader("Cache-Control", "no-store");
  res.end(r.ok ? "ok" : `supabase ${r.status}`);
}
