// Self-hosting server (used by the Docker image). No dependencies.
// - Serves the built site from dist/ with SPA fallback
// - Applies the same security headers as Vercel (read from vercel.json, one source of truth)
// - Link previews for chat apps (server/share.mjs)
// - /healthz for container health checks
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";
import { BOT_UA, isShareable, renderShare } from "./share.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8080);
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
const SECURITY_HEADERS = Object.fromEntries(
  (vercel.headers.find((h) => h.source === "/(.*)")?.headers ?? [])
    .filter((h) => !(h.key === "Strict-Transport-Security" && SITE_URL.startsWith("http://")))
    .map((h) => [h.key, h.value]));

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
  ".woff": "font/woff", ".woff2": "font/woff2",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".svg", ".json", ".txt", ".xml"]);

async function sendFile(req, res, file, status = 200) {
  const ext = extname(file);
  let body = await readFile(file);
  const headers = { ...SECURITY_HEADERS, "Content-Type": TYPES[ext] ?? "application/octet-stream" };
  headers["Cache-Control"] = file.includes(`${DIST}/assets/`) ? "public, max-age=31536000, immutable" : ext === ".html" ? "no-cache" : "public, max-age=3600";
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "") && body.length > 1024) {
    body = gzipSync(body); headers["Content-Encoding"] = "gzip"; headers["Vary"] = "Accept-Encoding";
  }
  res.writeHead(status, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, SECURITY_HEADERS); return res.end(); }
    const url = new URL(req.url, "http://x");
    const path = decodeURIComponent(url.pathname);
    if (path === "/healthz") { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end("ok"); }

    if (BOT_UA.test(req.headers["user-agent"] ?? "") && isShareable(path) && path !== "/" && SUPABASE_URL) {
      const { status, html } = await renderShare(path, { siteUrl: SITE_URL, supabaseUrl: SUPABASE_URL, anonKey: ANON_KEY });
      res.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600" });
      return res.end(req.method === "HEAD" ? undefined : html);
    }

    const file = normalize(join(DIST, path));
    if (!file.startsWith(DIST)) { res.writeHead(400); return res.end(); } // path traversal guard
    const info = await stat(file).catch(() => null);
    if (info?.isFile()) return sendFile(req, res, file);
    if (extname(path) && !path.endsWith(".html")) { res.writeHead(404, SECURITY_HEADERS); return res.end("Not found"); }
    return sendFile(req, res, join(DIST, "index.html")); // SPA route
  } catch (err) {
    console.error(err);
    res.writeHead(500); res.end("Server error");
  }
});

server.listen(PORT, () => console.log(`Tshehla AgriHub listening on :${PORT} (site ${SITE_URL})`));
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close(() => process.exit(0)));
