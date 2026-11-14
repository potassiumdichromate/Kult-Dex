// Kult Dex web server (no dependencies).
//
// - Serves the game from public/.
// - /api/v1/dex/*     -> AI Arena's /v1/dex API (AI_ARENA_API_URL, the gateway, or
//                        DEX_API_URL to talk to dex-desk-service directly). The
//                        gateway only accepts browser calls from its own site, so
//                        the game's calls run server to server through here.
// - /arena/auth/privy -> AI Arena's POST /v1/auth/privy, which turns a Privy login
//                        into an AI Arena token (then the game trades it for a
//                        12-hour Dex session at /v1/dex/session).
// - /config.json      -> public settings for the page (Privy app id, links).

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const PORT = Number(process.env.PORT || 4600);
const AI_ARENA_API_URL = (process.env.AI_ARENA_API_URL || "https://aiarena-gateway.kult.games").replace(/\/$/, "");
const DEX_API_URL = (process.env.DEX_API_URL || AI_ARENA_API_URL).replace(/\/$/, "");
const PUBLIC_CONFIG = JSON.stringify({
  apiUrl: (process.env.PUBLIC_API_URL || "").replace(/\/$/, "") || null,
  privyAppId: process.env.PRIVY_APP_ID || null,
  privyClientId: process.env.PRIVY_CLIENT_ID || null,
  aiArenaUrl: process.env.AI_ARENA_APP_URL || "https://app.kult.games",
  kultWorldUrl: process.env.KULT_WORLD_URL || "https://world.kult.games"
});
// The page links its CSS and scripts under /v/<build>/ so every deploy has new
// URLs and no cache can keep an old floor. The page itself is never cached.
const BUILD = (process.env.RENDER_GIT_COMMIT || "").slice(0, 12) || Date.now().toString(36);
const PAGE = readFileSync(join(ROOT, "index.html"), "utf8")
  .replace(/(<(?:link|script)\b[^>]*\b(?:href|src)=")(?![a-z]+:|\/|\?|#)([^"]+")/g, `$1v/${BUILD}/$2`);
const DEMO = (() => { const v = String(process.env.DEMO_MODE || "").trim().toLowerCase(); return v === "fresh" ? "fresh" : ["1", "true", "on", "yes"].includes(v) ? "1" : null; })();
const MAX_BODY = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 90_000; // scans read live markets; the API can be cold on Render

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp", ".woff2": "font/woff2", ".glb": "model/gltf-binary"
};
// The page URL can carry the player's AI Arena token (?jwt=…): never leak it in
// a Referer, and only let the sites in FRAME_ANCESTORS frame the game.
const SECURITY_HEADERS = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  ...(process.env.FRAME_ANCESTORS ? { "Content-Security-Policy": `frame-ancestors ${process.env.FRAME_ANCESTORS}` } : {})
};

function send(res, status, body, headers = {}) { res.writeHead(status, { ...SECURITY_HEADERS, ...headers }); res.end(body); }
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });

async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("Request too large"), { status: 413 });
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function proxy(req, res, target) {
  const headers = { accept: "application/json" };
  for (const h of ["authorization", "content-type", "x-correlation-id"]) if (req.headers[h]) headers[h] = req.headers[h];
  const fwd = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (fwd) headers["x-forwarded-for"] = fwd; // per-player rate limits upstream
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
  let upstream;
  try { upstream = await fetch(target, { method: req.method, headers, body, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), redirect: "manual" }); }
  catch { return json(res, 503, { error: "Kult Dex is waking up or unreachable. Try again in a moment." }); }
  const out = { "Cache-Control": "no-store" };
  for (const h of ["content-type", "x-correlation-id", "retry-after"]) { const v = upstream.headers.get(h); if (v) out[h] = v; }
  send(res, upstream.status, Buffer.from(await upstream.arrayBuffer()), out);
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith("/")) rel += "index.html";
  if (rel === "/index.html") return send(res, 200, req.method === "HEAD" ? undefined : PAGE, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store" });
  const v = /^\/v\/([^/]+)(\/.*)$/.exec(rel);
  if (v) rel = v[2];
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT + sep) && file !== ROOT) return send(res, 403, "Forbidden");
  let info;
  try { info = await stat(file); } catch { info = null; }
  if (!info?.isFile()) {
    if (!extname(rel)) return serveStatic(req, res, "/");
    return send(res, 404, "Not found", { "Content-Type": "text/plain" });
  }
  const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
  const cache = /[\\/]privy[\\/]chunks[\\/]/.test(file) || v?.[1] === BUILD ? "public, max-age=31536000, immutable" : "no-cache";
  const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  if (req.headers["if-none-match"] === etag) return send(res, 304, undefined, { ETag: etag, "Cache-Control": cache });
  send(res, 200, req.method === "HEAD" ? undefined : await readFile(file), { "Content-Type": type, "Cache-Control": cache, ETag: etag });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const p = url.pathname;
    if (p === "/health") return json(res, 200, { ok: true, service: "kult-dex" });
    if (p === "/config.json") return send(res, 200, PUBLIC_CONFIG, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    if (p === "/arena/auth/privy") {
      if (req.method !== "POST") return json(res, 405, { error: "Use POST" });
      return await proxy(req, res, `${AI_ARENA_API_URL}/v1/auth/privy`);
    }
    if (p.startsWith("/api/v1/dex/") || p === "/api/v1/dex") return await proxy(req, res, `${DEX_API_URL}${p.slice(4)}${url.search}`);
    if (p.startsWith("/api/")) return json(res, 404, { error: "Unknown API path" });
    if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "Not allowed" });
    if (DEMO && (p === "/" || p === "/index.html") && !url.searchParams.has("demo")) {
      const q = new URLSearchParams(url.search); q.set("demo", DEMO);
      return send(res, 302, undefined, { Location: `/?${q}`, "Cache-Control": "no-store" });
    }
    return await serveStatic(req, res, p);
  } catch (e) {
    if (!res.headersSent) json(res, e.status || 500, { error: e.status ? e.message : "Something went wrong" });
  }
}).listen(PORT, () => console.log(`[kult-dex] http://localhost:${PORT} (api ${DEX_API_URL})`));
