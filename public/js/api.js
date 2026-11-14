// Kult Dex API client (AI Arena's /v1/dex, docs/dex/KULT_DEX_PLAN.md §11).
// Locally and by default the browser goes through this site's /api proxy
// (server.mjs), which forwards to the AI Arena gateway. The AI Arena login is
// traded once for a 12-hour Dex session, kept in sessionStorage.

const KEY = "kultdex.session";

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || body?.message || `Request failed (${status})`);
    this.status = status;
    this.body = body || {};
    this.retryAt = body?.retryAt || null;
  }
}

function load() {
  try { const s = JSON.parse(sessionStorage.getItem(KEY) || "null"); return s && Date.parse(s.expiresAt) > Date.now() + 60_000 ? s : null; }
  catch { return null; }
}

export function createApi({ onUnauthorized, apiUrl } = {}) {
  const BASE = `${apiUrl || "/api"}/v1/dex`;
  let session = load();

  async function request(method, path, body, { auth = true } = {}) {
    const headers = { accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (auth && session) headers.authorization = `Bearer ${session.token}`;
    let res;
    try {
      res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, { error: "You're offline or Kult Dex can't be reached." });
    }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      const err = new ApiError(res.status, data);
      if (res.status === 401 && auth && session) { session = null; try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } onUnauthorized?.(err); }
      throw err;
    }
    return data;
  }
  const q = (params) => {
    const s = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString();
    return s ? `?${s}` : "";
  };

  return {
    demo: false,
    hasSession: () => Boolean(session),
    signOut() { session = null; try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } },

    // AI Arena token (from Kult World, or a Privy login) → Dex session (+ /me).
    async startSession(aiArenaToken) {
      const out = await request("POST", "/session", { aiArenaToken }, { auth: false });
      session = { token: out.token, expiresAt: out.expiresAt };
      try { sessionStorage.setItem(KEY, JSON.stringify(session)); } catch { /* private mode */ }
      return out;
    },
    // Privy access token → AI Arena token (server-side exchange, see server.mjs).
    async arenaTokenFromPrivy(accessToken) {
      let res;
      try {
        res = await fetch("/arena/auth/privy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessToken }) });
      } catch { throw new ApiError(0, { error: "AI Arena can't be reached right now." }); }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.accessToken) throw new ApiError(res.status, { error: data?.error || "AI Arena could not verify your login." });
      return data.accessToken;
    },

    info: () => request("GET", "/info", undefined, { auth: false }),
    me: () => request("GET", "/me"),
    openDesk: (name, ceoAgentId, mandate) => request("POST", "/desks", { name, ceoAgentId, ...(mandate && { mandate }) }),
    desk: () => request("GET", "/desks/me"),
    setMandate: (m) => request("PUT", "/desks/me/mandate", m),
    setAuto: (on) => request("PUT", "/desks/me/auto", { on }),
    setCeo: (agentId) => request("PUT", "/desks/me/ceo", { agentId }),
    ledger: () => request("GET", "/desks/me/ledger"),

    talent: () => request("GET", "/talent"),
    hire: (candidateKey) => request("POST", "/staff", { candidateKey }),
    fire: (id) => request("DELETE", `/staff/${encodeURIComponent(id)}`),

    scan: (assetId) => request("POST", "/desks/me/scan", assetId ? { assetId } : {}),
    mySignals: (params) => request("GET", `/signals${q({ mine: 1, limit: 100, ...params })}`),
    signals: (params) => request("GET", `/signals${q(params)}`, undefined, { auth: false }),
    signal: (id) => request("GET", `/signals/${encodeURIComponent(id)}`),
    editSignal: (id, body) => request("PUT", `/signals/${encodeURIComponent(id)}`, body),
    discard: (id) => request("DELETE", `/signals/${encodeURIComponent(id)}`),
    lock: (id) => request("POST", `/signals/${encodeURIComponent(id)}/lock`),
    verify: (id) => request("GET", `/verify/${encodeURIComponent(id)}`, undefined, { auth: false }),

    leaderboard: (kind) => request("GET", `/leaderboards/${kind}`),
    assets: () => request("GET", "/assets", undefined, { auth: false }),
    market: () => request("GET", "/market", undefined, { auth: false }),
    bars: (assetId, tf) => request("GET", `/market/${encodeURIComponent(assetId)}/bars${q({ tf })}`, undefined, { auth: false })
  };
}
