// The offline Kult Dex demo (?demo=1, or ?demo=fresh to start at "Open your
// desk"). An in-memory copy of the /v1/dex API with SAMPLE prices: a seeded
// random walk around recent levels, labelled as demo data everywhere. Nothing
// here is a real price, a real track record or a real commitment.

const H = 3600e3, NOW0 = Date.now();
const ASSETS = [
  ["btc", "BTC", "Bitcoin", "crypto", 68400], ["eth", "ETH", "Ether", "crypto", 1930], ["sol", "SOL", "Solana", "crypto", 78.4],
  ["bnb", "BNB", "BNB", "crypto", 631], ["xrp", "XRP", "XRP", "crypto", 1.01], ["okb", "OKB", "OKB (X Layer gas)", "crypto", 46],
  ["link", "LINK", "Chainlink", "crypto", 9.8], ["hype", "HYPE", "Hyperliquid", "crypto", 71.9], ["doge", "DOGE", "Dogecoin", "meme", 0.064],
  ["paxg", "PAXG", "Pax Gold (1 oz)", "rwa-commodity", 3876], ["nvdax", "NVDAx", "NVIDIA (tokenized)", "rwa-equity", 161.5],
  ["tslax", "TSLAx", "Tesla (tokenized)", "rwa-equity", 388.4], ["aaplx", "AAPLx", "Apple (tokenized)", "rwa-equity", 355.7],
  ["coinx", "COINx", "Coinbase (tokenized)", "rwa-equity", 126.7], ["mstrx", "MSTRx", "Strategy (tokenized)", "rwa-equity", 110.2],
  ["spx", "SPX", "S&P 500 (HIP-3 index perp)", "rwa-etf", 7543], ["usdy", "USDY", "Ondo US Dollar Yield", "rwa-treasury", null]
].map(([id, symbol, name, cls, base]) => ({ id, symbol, name, class: cls, base, hours: cls === "rwa-equity" || cls === "rwa-etf" ? "us-equities" : "24/7", tradeable: cls !== "rwa-treasury" }));
const CLASS_LABEL = { crypto: "Crypto majors", meme: "Memecoins (high risk)", "rwa-equity": "Tokenized stocks", "rwa-etf": "Tokenized indexes", "rwa-commodity": "Tokenized gold", "rwa-treasury": "Tokenized T-bills" };
const ROLES = {
  FLOW: ["Flow Hunter", "#34e3ff", "Buying vs selling volume and volume surges"], CHART: ["Chart Reader", "#ffc845", "Trend, breakouts, momentum and volatility"],
  RISK: ["Risk Officer", "#ff6b7d", "Liquidity, volatility, stale data and market hours. Can veto a trade"], MACRO_RWA: ["Macro & RWA Strategist", "#b58cff", "US market session, weekend gaps, stock vs crypto divergence, risk regime"],
  SENTIMENT: ["Sentiment Scout", "#7dffb2", "Crowd positioning from perp funding"], YIELD: ["Yield Analyst", "#ffe08a", "T-bill fund yield vs stablecoin lending"], EXECUTION: ["Execution Desk", "#8fb6ff", "Whether the call is tradeable at its size"]
};

const hashStr = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
// Deterministic sample path: smooth waves plus a slow drift, per asset.
function px(a, t) {
  const k = hashStr(a.id), x = t / H;
  return a.base * (1 + 0.012 * Math.sin(x / 5 + k) + 0.006 * Math.sin(x / 1.3 + k * 2) + 0.0025 * Math.sin(x * 3.1 + k) + ((k % 7) - 3) * 0.0004 * (x - NOW0 / H));
}
function bars(a, tf, n) {
  const step = { "5m": 300e3, "1h": H, "1d": 24 * H }[tf] || H, end = Math.floor(Date.now() / step) * step - step;
  return Array.from({ length: n }, (_, i) => {
    const t = end - (n - 1 - i) * step, o = px(a, t), c = px(a, t + step);
    return { t, o, c, h: Math.max(o, c) * 1.0015, l: Math.min(o, c) * 0.9985, v: 100 + (hashStr(`${a.id}${t}`) % 80) };
  });
}
const usSession = () => {
  const d = new Date(), day = d.getUTCDay(), m = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (day === 0 || day === 6) return { status: "weekend", label: "Weekend: US markets closed", nextOpen: "Monday 09:30 New York" };
  return m >= 14 * 60 + 30 && m < 21 * 60 ? { status: "open", label: "US market open", nextOpen: null } : { status: "closed", label: "US market closed", nextOpen: "09:30 New York" };
};
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return `0x${[...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`; }
const err = (status, error) => Object.assign(new Error(error), { status, body: { error } });
const iso = (t) => new Date(t).toISOString();

export function createDemoApi({ fresh = false } = {}) {
  const me = { player: { id: "demo-player", username: "Demo trader", walletAddress: "0xdemo" }, agents: [{ id: "agent-demo-1", name: "Neon Warden", clan: "ZEROG", archetype: "TACTICIAN", eloRating: 1240 }, { id: "agent-demo-2", name: "Iron Vault", clan: "OKX", archetype: "DEFENDER", eloRating: 1105 }] };
  let desk = null, seq = 0, chain = null;
  const signals = [], ledger = [], batches = [];
  const credit = (delta, kind, ref) => { desk.credits += delta; ledger.unshift({ id: `l${++seq}`, kind, delta, balanceAfter: desk.credits, ref, createdAt: iso(Date.now()) }); };
  const view = () => {
    const settled = signals.filter((s) => s.status === "SETTLED"), trades = settled.filter((s) => s.kind !== "no-trade");
    const avgR = settled.length ? settled.reduce((a, s) => a + (s.r || 0), 0) / settled.length : 0, hits = trades.filter((s) => s.r > 0).length;
    const st = settled.length ? { settled: settled.length, trades: trades.length, noTrades: settled.length - trades.length, hitRate: trades.length ? hits / trades.length : null, hitLow: 0, hitHigh: 1, avgR, avgRLow: avgR - 0.5, avgRHigh: avgR + 0.5, maxDrawdown: 0.02, brier: 0.22 } : null;
    const level = desk.points >= 50 ? 2 : 1;
    return {
      ...desk, level, desks: 2 + level, nextLevelAt: level === 1 ? 50 : 150, staff: desk.staff,
      payroll: { weeklyTotal: desk.staff.reduce((a, s) => a + s.weeklySalary, 0), nextDueAt: iso(Date.now() + 3 * 864e5) },
      stats: { week: st, all: st }, standings: { weekly: st ? { rank: null, points: desk.points, settled: st.settled, ranked: false, needed: Math.max(0, 30 - st.settled) } : null, allTime: null, rwa: null },
      openSignals: signals.filter((s) => s.status === "LOCKED" || s.status === "OPEN").length, drafts: signals.filter((s) => s.status === "DRAFT").length,
      lockedToday: signals.filter((s) => s.lockedAt).length, dailyLockCap: 12, scanReadyAt: desk.lastScanAt ? iso(desk.lastScanAt + 20e3) : null, week: "demo"
    };
  };
  const tick = () => {
    const now = Date.now();
    for (const s of signals) {
      if (s.status === "LOCKED" && now >= Date.parse(s.entryTo)) {
        s.status = "OPEN"; s.batchId = s.batchId ?? 1; const a = ASSETS.find((x) => x.id === s.assetId);
        s.entryPrice = a.base ? px(a, now) : null; s.openedAt = iso(now);
      }
      if (s.status === "OPEN" && now >= Date.parse(s.endsAt)) {
        const a = ASSETS.find((x) => x.id === s.assetId), exit = a.base ? px(a, now) : null;
        const ret = s.kind === "no-trade" || !exit ? 0 : (s.direction === "short" ? -1 : 1) * (exit / s.entryPrice - 1) * 30;
        s.r = s.kind === "no-trade" ? 0 : Math.max(-1, Math.min(s.targetPct / s.stopPct, ret / s.stopPct));
        s.resultPct = s.r * s.stopPct * 100; s.exitPrice = exit; s.exitReason = s.r >= s.targetPct / s.stopPct ? "target" : s.r <= -1 ? "stop" : "horizon";
        s.status = "SETTLED"; s.settledAt = iso(now); s.hit = s.r > 0; s.credits = s.r > 0 ? Math.min(300, Math.round(s.r * 100)) : 0;
        if (s.credits) credit(s.credits, "winnings", s.id);
        desk.points = Math.max(0, desk.points + s.r * 20); desk.paperBalance *= 1 + (s.r * s.riskPct) / 100;
      }
    }
  };
  const open = (name, agent) => {
    desk = {
      id: "desk-demo", name, ceo: { agentId: agent.id, name: agent.name, archetype: agent.archetype, clan: agent.clan, style: agent.archetype === "DEFENDER" ? "Capital preservation, likes the T-bill leg" : "Swing, medium conviction", threshold: 0.18, horizon: "24h" },
      credits: 1000, paperBalance: 10000, startingBankroll: 10000, points: 0, autoMode: false, status: "ACTIVE", chainHead: null, lastScanAt: null, nextAutoScanAt: null,
      mandate: { classes: ["crypto", "rwa-equity", "rwa-commodity", "rwa-treasury"], allow: [], horizons: ["4h", "24h", "7d"], maxRiskPct: 1.5, maxOpenSignals: 5, allowShort: false }, staff: []
    };
    credit(1000, "grant", "founding"); desk.credits = 1000;
  };
  if (!fresh) {
    open("Neon Capital (demo)", me.agents[0]);
    for (const [i, role] of ["CHART", "FLOW", "RISK"].entries()) desk.staff.push({ id: `an-${role}`, role, title: ROLES[role][0], name: ["Ava Vega", "Kenji Park", "Mira Novak"][i], skill: [3, 2, 3][i], xp: 40, xpToNext: [300, 200, 300][i], style: ["loves a clean breakout", "follows the money, not the headlines", "checks the exits before the entry"][i], weeklySalary: [65, 50, 65][i], hiredAt: iso(NOW0 - 2 * 864e5), color: ROLES[role][1], reads: ROLES[role][2] });
  }
  const pool = () => ["CHART", "FLOW", "RISK", "MACRO_RWA", "YIELD", "SENTIMENT"].map((role, i) => ({ candidateKey: `demo:${i}:${role}`, role, title: ROLES[role][0], name: ["Leo Tanaka", "Zara Iyer", "Theo Bauer", "Nia Okafor", "Omar Reyes", "Isla Quinn"][i], skill: [2, 3, 1, 3, 2, 4][i], style: ["trades the trend until it bends", "counts every bid on the tape", "says no more often than yes", "trades the weekend gap", "compares every yield to T-bills", "fades the crowd when it gets loud"][i], hireCost: 120 + 80 * [2, 3, 1, 3, 2, 4][i], weeklySalary: 20 + 15 * [2, 3, 1, 3, 2, 4][i], color: ROLES[role][1], reads: ROLES[role][2] })).filter((c) => !desk.staff.some((s) => s.candidateKey === c.candidateKey));

  function reads(a) {
    const b = bars(a, "1h", 60), ch = b[b.length - 1].c / b[b.length - 25].c - 1, up = ch >= 0;
    const r = (analyst, name, analystId, view, score, text) => ({ analyst, name, analystId, view, score, confidence: 0.6, weight: 0.8, text, facts: {}, inputsHash: `0x${hashStr(analyst + a.id + Date.now()).toString(16).padStart(64, "0")}` });
    const out = [];
    const chart = desk.staff.find((s) => s.role === "CHART"), flow = desk.staff.find((s) => s.role === "FLOW"), risk = desk.staff.find((s) => s.role === "RISK");
    out.push(r("CHART", chart?.name || "CEO (own read)", chart?.id || null, up ? "bullish" : "bearish", up ? 0.45 : -0.4, `${up ? "Uptrend" : "Downtrend"}: ${a.symbol} ${(ch * 100).toFixed(2)}% over 24h on the demo tape. RSI ${up ? 61 : 41}.`));
    if (flow) out.push(r("FLOW", flow.name, flow.id, up ? "bullish" : "neutral", up ? 0.3 : 0, `${up ? "Buyers" : "Sellers"} led the last 24h on the demo tape: ${up ? 62 : 55}% of volume.`));
    for (const s of desk.staff.filter((x) => ["MACRO_RWA", "SENTIMENT", "YIELD"].includes(x.role))) out.push(r(s.role, s.name, s.id, "neutral", 0.05, s.role === "YIELD" ? "Tokenized T-bills pay 3.75% vs 3.56% for stablecoin lending (demo figures)." : s.role === "MACRO_RWA" ? `${a.hours === "us-equities" ? usSession().label : "Trades 24/7"}. No macro stress in the demo.` : "Funding is balanced on the demo tape."));
    out.push(r("RISK", risk?.name || "Desk rules", risk?.id || null, "neutral", 0, "Cleared: liquidity, fresh data, enough history (demo checks)."));
    out.push(r("EXECUTION", "Desk rules", null, "neutral", 0, "Tradeable: about 6 bps slippage and 10 bps fees (demo estimate)."));
    return { list: out, up, ch };
  }

  return {
    demo: true,
    hasSession: () => true,
    signOut() {},
    async startSession() { return { token: "demo", expiresAt: iso(Date.now() + 12 * H), ...(await this.me()) }; },
    async me() { tick(); return { ...me, desk: desk ? view() : null }; },
    async info() { return { service: "kult-dex (demo)", anchor: { configured: false } }; },
    async openDesk(name, agentId) { if (desk) throw err(409, "You already run a desk"); open(name, me.agents.find((a) => a.id === agentId) || me.agents[0]); return view(); },
    async desk() { tick(); return view(); },
    async setMandate(m) { desk.mandate = { ...desk.mandate, ...m }; return view(); },
    async setAuto(on) { desk.autoMode = on; desk.nextAutoScanAt = on ? iso(Date.now() + 4 * H) : null; return view(); },
    async setCeo(id) { const a = me.agents.find((x) => x.id === id); Object.assign(desk.ceo, { agentId: a.id, name: a.name, archetype: a.archetype, clan: a.clan }); return view(); },
    async ledger() { return { entries: ledger }; },
    async talent() { return { week: "demo week", refreshesAt: iso(Date.now() + 3 * 864e5), candidates: pool() }; },
    async hire(key) {
      const c = pool().find((x) => x.candidateKey === key);
      if (desk.staff.length >= view().desks) throw err(409, "Every desk is taken");
      if (desk.credits < c.hireCost) throw err(409, "Not enough credits");
      const a = { id: `an-${++seq}`, role: c.role, title: c.title, name: c.name, skill: c.skill, xp: 0, xpToNext: c.skill >= 5 ? null : 100 * c.skill, style: c.style, weeklySalary: c.weeklySalary, hiredAt: iso(Date.now()), color: c.color, reads: c.reads, candidateKey: key };
      desk.staff.push(a); credit(-c.hireCost, "hire", key);
      return { analyst: a, desk: view() };
    },
    async fire(id) { desk.staff = desk.staff.filter((s) => s.id !== id); return { desk: view() }; },
    async scan(assetId) {
      if (desk.lastScanAt && Date.now() - desk.lastScanAt < 20e3) throw Object.assign(err(429, "Your analysts are still on the last scan"), { retryAt: iso(desk.lastScanAt + 20e3) });
      if (signals.some((s) => s.status === "DRAFT")) throw err(409, "Lock or discard a draft first");
      const busy = new Set(signals.filter((s) => ["DRAFT", "LOCKED", "OPEN"].includes(s.status)).map((s) => s.assetId));
      const pickable = ASSETS.filter((a) => a.tradeable && desk.mandate.classes.includes(a.class) && !busy.has(a.id));
      const a = assetId ? ASSETS.find((x) => x.id === assetId) : pickable[Math.floor(Math.random() * pickable.length)];
      if (!a) throw err(409, "Every asset in your mandate already has a live call");
      desk.lastScanAt = Date.now();
      const { list, up } = reads(a), stop = a.class === "crypto" ? 0.018 : 0.012;
      const s = {
        id: `sig_demo${++seq}`, deskId: desk.id, assetId: a.id, asset: { symbol: a.symbol, name: a.name, class: a.class }, kind: up ? "directional" : "no-trade", direction: up ? "long" : "flat", horizon: "24h", status: "DRAFT",
        confidence: up ? 0.62 : 0, riskPct: up ? 1.2 : 0, targetPct: up ? stop * 2 : 0, stopPct: up ? stop : 0, quote: a.base ? px(a, Date.now()) : null, reads: list, notes: [], composite: up ? 0.38 : -0.2,
        rationale: up ? `${desk.ceo.name} goes long ${a.symbol} for 24h: target ${(stop * 200).toFixed(2)}%, stop ${(stop * 100).toFixed(2)}%. The chart and the flows agree (demo tape).` : `${desk.ceo.name} stays flat on ${a.symbol}: the desk leans short and the mandate is long only (demo tape).`,
        model: { provider: "deterministic", models: [], teeVerified: false }, createdAt: iso(Date.now()), edited: false, decidedBy: "ceo", credits: 0
      };
      signals.unshift(s);
      return { signal: s, scanned: pickable.slice(0, 4).map((x) => ({ assetId: x.id, symbol: x.symbol, score: 0.4 })) };
    },
    async mySignals() { tick(); return { signals: signals.map((s) => ({ ...s })) }; },
    async signals() { tick(); return { signals: signals.filter((s) => s.status !== "DRAFT") }; },
    async signal(id) { tick(); const s = signals.find((x) => x.id === id); if (!s) throw err(404, "Signal not found"); return { signal: { ...s } }; },
    async editSignal(id, b) { const s = signals.find((x) => x.id === id); Object.assign(s, b, { edited: true }); if (b.direction) s.kind = b.direction === "flat" ? "no-trade" : "directional"; return { signal: { ...s } }; },
    async discard(id) { signals.splice(signals.findIndex((x) => x.id === id), 1); return { ok: true }; },
    async lock(id) {
      const s = signals.find((x) => x.id === id), now = Date.now();
      s.leafHash = await sha(JSON.stringify({ ...s, chain })); s.prevHash = chain; chain = s.leafHash;
      // The demo speeds time up: entry in 10 seconds, settlement after a minute.
      Object.assign(s, { status: "LOCKED", lockedAt: iso(now), entryFrom: iso(now + 5e3), entryTo: iso(now + 10e3), endsAt: iso(now + 70e3), batchId: (batches.push(s.id), 1) });
      desk.chainHead = chain;
      return { signal: { ...s }, leafHash: s.leafHash, batchEta: iso(now + 5e3), entryFrom: s.entryFrom };
    },
    async verify(id) {
      tick();
      const s = signals.find((x) => x.id === id && x.leafHash);
      if (!s) throw err(404, "No committed signal with that id");
      return {
        signal: { ...s }, desk: { name: desk.name, ceoName: desk.ceo.name }, payload: { demo: true, note: "Demo calls are hashed locally and never anchored.", id: s.id, asset: s.asset, direction: s.direction },
        leafHash: s.leafHash, recomputedLeaf: s.leafHash, leafMatches: true, batch: { id: 1, root: s.leafHash, status: "LOCAL", leafCount: batches.length }, proof: [], proofValid: true, onChainMatches: null, anchoredBeforeEntry: null,
        chain: { prev: s.prevHash ? { id: signals.find((x) => x.leafHash === s.prevHash)?.id } : null, next: signals.find((x) => x.prevHash === s.leafHash) ? { id: signals.find((x) => x.prevHash === s.leafHash).id } : null },
        settlement: s.status === "SETTLED" ? { demo: true, exit: { reason: s.exitReason, price: s.exitPrice } } : null,
        howTo: ["This is the demo: nothing here is anchored. In the real game every call is a leaf in a Merkle batch anchored on 0G Chain."]
      };
    },
    async leaderboard(kind) { return { kind, period: "demo", minRanked: 30, ranked: [], provisional: desk ? [{ rank: null, deskId: desk.id, deskName: desk.name, ceo: { name: desk.ceo.name, clan: desk.ceo.clan }, points: desk.points, settled: signals.filter((s) => s.status === "SETTLED").length, trades: 0, hitRate: null, avgR: 0, maxDrawdown: 0, brier: null, me: true }] : [] }; },
    async assets() { return { assets: ASSETS.map((a) => ({ ...a, classLabel: CLASS_LABEL[a.class], session: a.hours === "us-equities" ? usSession() : { status: "open", label: "Trades 24/7" }, signalOnly: true })) }; },
    async market() {
      return {
        assets: ASSETS.map((a) => {
          if (!a.base) return { ...a, classLabel: CLASS_LABEL[a.class], price: null };
          const b = bars(a, "1h", 170), last = b[b.length - 1].c;
          return { ...a, classLabel: CLASS_LABEL[a.class], session: a.hours === "us-equities" ? usSession() : null, price: last, change24h: last / b[b.length - 25].c - 1, change7d: last / b[0].c - 1, spark: b.slice(-48).map((x) => x.c), source: "demo:sample" };
        }),
        yields: { tbillApy: 3.75, lendApy: 3.56, source: "demo figures" }
      };
    },
    async bars(id, tf) { const a = ASSETS.find((x) => x.id === id); return { assetId: id, tf, source: "demo:sample prices", bars: bars(a, tf, 120), perp: null, session: a.hours === "us-equities" ? usSession() : { status: "open", label: "Trades 24/7" } }; }
  };
}
