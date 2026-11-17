// Kult Dex: sign-in, the trading floor, and the flows that tie the screens to
// AI Arena's /v1/dex API (docs/dex/KULT_DEX_PLAN.md in 0g-AIArena).

import { createApi } from "./api.js";
import { createDemoApi } from "./demo.js";
import { Office, ROLE_COLORS, ROLE_SHORT } from "./world.js";
import { archetypePortrait } from "./office3d.js";
import { $, el, show, toast, toastError, busy, fmtPts, fmtCredits, fmtCountdown, fmtUsd, fmtR, fmtPct, fmtPrice, DIR_LABEL, lineIcon } from "./ui.js";
import * as V from "./views.js";
import { createTour } from "./tour.js";

const params = new URLSearchParams(location.search);
const demoMode = params.get("demo") === "0" ? null : params.get("demo");
// Kult World opens the game with the player's AI Arena token in the URL. Take
// it, then remove it from the address bar and history at once.
const handoff = params.get("jwt");
if (handoff) {
  params.delete("jwt"); params.delete("source");
  history.replaceState(null, "", `${location.pathname}${params.toString() ? `?${params}` : ""}${location.hash}`);
}

let api = demoMode ? createDemoApi({ fresh: demoMode === "fresh" }) : null;
const state = {
  cfg: {}, me: null, desk: null, signals: null, market: null, assets: null, talent: null, ledger: null,
  leaderboards: {}, lbKind: "weekly", room: null, view: "office", inOffice: false, scanning: false, verifyResult: null, chart: null
};
const canvas = $("office"), office = new Office(canvas);
if (params.has("debug")) window.kd = { office, state };

const ROLE_TITLE = { FLOW: "Flow Hunter", CHART: "Chart Reader", RISK: "Risk Officer", MACRO_RWA: "Macro & RWA Strategist", SENTIMENT: "Sentiment Scout", YIELD: "Yield Analyst", EXECUTION: "Execution Desk" };

// ------------------------------------------------------------------ shared context for views
const ctx = {
  state,
  go: (v) => setView(v),
  openSignal: (id) => openSignal(id),
  scan: (assetId) => runScan(assetId),
  lock: (id, btn, draft) => lockSignal(id, btn, draft),
  discard: (id, btn) => discard(id, btn),
  saveDraft: (id, draft, btn) => saveDraft(id, draft, btn),
  hire: (c, btn) => hire(c, btn),
  fire: (a, btn) => fire(a, btn),
  openAnalyst: (id) => openAnalyst(id),
  changeCeo: (id, btn) => changeCeo(id, btn),
  saveMandate: (m, btn) => saveMandate(m, btn),
  setAuto: (on, btn) => setAuto(on, btn),
  loadLeaders: (k) => loadLeaders(k),
  loadChart: (id, tf) => loadChart(id, tf),
  loadRoomBars: (tf) => loadRoomBars(tf),
  verify: (id) => verify(id),
  closeSheet: (id) => show(id, false),
  signOut: () => signOutEverywhere(),
  roleTitle: (r) => ROLE_TITLE[r] || r,
  universe: () => universe(),
  usSession: () => state.assets?.find((a) => a.hours === "us-equities")?.session || null,
  portrait: (analystId) => { const p = office.person(analystId); return p ? office.portraitOf(p.look) : office.portraitOf(office.lookFor(analystId)); },
  portraitFor: (key) => office.portraitOf(office.lookFor(key))
};

function universe() {
  const m = state.desk?.mandate;
  return (state.assets || []).filter((a) => a.tradeable && m?.classes.includes(a.class) && (!m.allow?.length || m.allow.includes(a.id)));
}

// ------------------------------------------------------------------ floor loop
function fit() {
  const box = $("stage").getBoundingClientRect();
  if (!box.width || !box.height) return;
  office.setInsets(stageInsets(box));
  office.resize(box.width, box.height);
}
function stageInsets(box) {
  if (getComputedStyle($("stage")).position !== "fixed") return { top: 0, right: 0, bottom: 0, left: 0 };
  const r = (id) => { const n = $(id); return n && !n.hidden && n.getClientRects().length ? n.getBoundingClientRect() : null; };
  const hud = r("hud"), feed = r("feed"), con = r("console"), nav = r("sidebar");
  const rail = nav && nav.right < box.left + box.width / 3 ? nav : null;
  const lows = [con, !rail ? nav : null].filter(Boolean).map((x) => x.top);
  return { top: hud ? hud.bottom - box.top + 6 : 0, right: feed ? box.right - feed.left + 6 : 0, bottom: lows.length ? box.bottom - Math.min(...lows) + 6 : 0, left: rail ? rail.right - box.left + 6 : 16 };
}
{ const ro = new ResizeObserver(() => { fit(); state.room?.redraw?.(); state.chart?.redraw?.(); }); for (const id of ["stage", "hud", "feed", "console", "sidebar"]) if ($(id)) ro.observe($(id)); }

const bubbles = new Map();
function say(id, text, ms = 4200) {
  const p = office.person(id);
  if (!p) return;
  bubbles.get(id)?.node.remove();
  const color = p.isCeo ? "var(--gold)" : ROLE_COLORS[p.role] || "var(--accent)";
  const node = el("div", { class: "bubble" }, el("b", { style: `color:${color}` }, p.isCeo ? `${p.name} · CEO` : p.name), text);
  $("bubbles").append(node);
  bubbles.set(id, { node, until: performance.now() + ms });
}
function placeBubbles(now) {
  const rect = canvas.getBoundingClientRect(), stage = $("stage").getBoundingClientRect(), k = rect.width / office.W;
  for (const [id, b] of bubbles) {
    const a = office.anchor(id);
    if (!a || now > b.until + 400) { b.node.remove(); bubbles.delete(id); continue; }
    if (now > b.until) b.node.classList.add("fade");
    b.node.style.left = `${rect.left - stage.left + a[0] * k}px`;
    b.node.style.top = `${rect.top - stage.top + a[1] * k - 4}px`;
  }
}
let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try {
    if (state.inOffice && $("stage").getClientRects().length) { office.update(dt); office.draw(); placeBubbles(now); }
    else for (const [id, b] of bubbles) if (now > b.until) { b.node.remove(); bubbles.delete(id); }
  } catch (e) { console.warn("[kult-dex] frame failed", e); }
}
requestAnimationFrame(tick);

const toOffice = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * office.W, ((e.clientY - r.top) / r.height) * office.H]; };
canvas.addEventListener("pointermove", (e) => {
  const [x, y] = toOffice(e), p = office.hit(x, y), d = p ? -1 : office.hitDesk(x, y);
  office.hoverDesk = d;
  canvas.style.cursor = p || d >= 0 ? "pointer" : "default";
  const tip = $("tooltip");
  if (p) {
    tip.textContent = p.isCeo ? `${p.name} · CEO` : `${p.name} · ${p.title}`;
    const s = $("stage").getBoundingClientRect();
    tip.style.left = `${e.clientX - s.left}px`; tip.style.top = `${e.clientY - s.top - 6}px`;
    tip.hidden = false;
  } else tip.hidden = true;
});
canvas.addEventListener("pointerleave", () => { $("tooltip").hidden = true; office.hoverDesk = -1; });
canvas.addEventListener("click", (e) => {
  if (state.scanning || office.dragged) return;
  const [x, y] = toOffice(e), p = office.hit(x, y);
  if (p?.isCeo) return setView("desk");
  if (p) return openAnalyst(p.id);
  if (office.hitDesk(x, y) >= 0) setView("talent");
});

// ------------------------------------------------------------------ feed
function log(who, text, color = "var(--accent)", cls = "", icon = null) {
  const list = $("log");
  list.querySelector(".empty")?.remove();
  const mark = icon ? lineIcon(icon, "feed-ico") : el("span", { class: "dot" });
  list.append(el("li", { class: cls, style: `--c:${color}` }, mark, el("div", {}, el("span", { class: "who" }, who), text)));
  while (list.children.length > 80) list.firstChild.remove();
  list.scrollTop = list.scrollHeight;
}
const logSystem = (text) => log("Desk", text, "var(--gold)", "system");

function setupIcons() {
  for (const slot of document.querySelectorAll(".ico-slot")) slot.replaceChildren(lineIcon(slot.dataset.icon));
  document.querySelector(".logo")?.replaceChildren(lineIcon("emblem", "logo-ico"));
}

// ------------------------------------------------------------------ sign-in
const SCREENS = ["entrance", "found", "no-agent"];
function showScreen(id) { show("booting", false); for (const s of SCREENS) show(s, s === id); }
function showEntrance(message) {
  state.inOffice = false;
  for (const id of ["hud", "sidebar", "stage", "console", "feed"]) show(id, false);
  for (const id of Object.values(PANELS)) show(id, false);
  show("sign-in", Boolean(state.cfg.privyAppId) && !api.demo);
  show("kult-browser-hint", !state.cfg.privyAppId);
  show("paste", ["localhost", "127.0.0.1"].includes(location.hostname) || params.has("dev"));
  $("entrance-error").textContent = message || "";
  show("entrance-error", Boolean(message));
  showScreen("entrance");
}

let privyApi = null;
async function loadPrivy() {
  if (privyApi !== null) return privyApi || null;
  privyApi = false;
  if (api.demo || !state.cfg.privyAppId) return null;
  try { const mod = await import("../privy/kult-privy.js"); privyApi = await mod.init({ appId: state.cfg.privyAppId, clientId: state.cfg.privyClientId || undefined }); }
  catch (e) { console.warn("[kult-dex] Privy login unavailable", e); privyApi = false; }
  return privyApi || null;
}
async function sessionFromPrivy(privy) { const { accessToken } = await privy.tokens(); return api.startSession(await api.arenaTokenFromPrivy(accessToken)); }

$("sign-in").addEventListener("click", async (ev) => {
  const btn = ev.currentTarget;
  show("entrance-error", false);
  busy(btn, true, "Signing in…");
  try {
    const privy = await loadPrivy();
    if (!privy) throw new Error("Sign-in isn't available here. Open Kult Dex from Kult World.");
    await privy.login();
    enter(await sessionFromPrivy(privy));
  } catch (e) {
    if (!/closed|exited|cancel/i.test(String(e?.message || e))) { $("entrance-error").textContent = e?.message || "Sign-in failed"; show("entrance-error"); }
  } finally { busy(btn, false); }
});
$("paste-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = $("paste-token").value.trim();
  if (!token) return;
  try { enter(await api.startSession(token)); } catch (err) { $("entrance-error").textContent = err.message; show("entrance-error"); }
});
async function signOutEverywhere() {
  api.signOut();
  try { await privyApi?.logout?.(); } catch { /* already out */ }
  location.href = location.pathname + (api.demo ? `?demo=${demoMode}` : "");
}
for (const b of document.querySelectorAll(".sign-out")) b.addEventListener("click", signOutEverywhere);

let expiring = false;
async function sessionExpired() {
  if (expiring) return;
  expiring = true;
  try { const privy = await loadPrivy(); if (privy?.authenticated) { await sessionFromPrivy(privy); toast("Session renewed."); expiring = false; return; } } catch { /* fall through */ }
  expiring = false;
  showEntrance("Your session ended. Sign in again, or reopen Kult Dex from Kult World.");
}

function enter(out) {
  state.me = { player: out.player, agents: out.agents || [] };
  if (out.desk) return enterFloor(out.desk);
  if (!state.me.agents.length) { $("no-agent-create").href = state.cfg.aiArenaUrl || "https://app.kult.games"; return showScreen("no-agent"); }
  showFound(state.me.agents);
}

const STYLE = { TACTICIAN: "swing trader, medium conviction", BERSERKER: "momentum, high turnover", DEFENDER: "capital preservation, likes T-bills", ASSASSIN: "event-driven, short horizons", SUPPORT: "diversified, follows risk", HYBRID: "balanced" };
function showFound(agents) {
  setTimeout(() => { if (!$("found").hidden) tour.offer("f-hello", forceTour); }, 400);
  $("found-player").textContent = state.me.player?.username || state.me.player?.walletAddress || "your KULT account";
  const list = $("found-agents");
  state.ceoPick = agents[0];
  const portrait = (a) => { const ph = el("span", { class: "ph" }); archetypePortrait("models/", a.archetype).then((c) => { if (c) ph.replaceWith(c); }); return ph; };
  list.replaceChildren(...agents.map((a) => {
    const b = el("button", { type: "button", class: "ceo-pick agent-pick", "aria-pressed": a === state.ceoPick ? "true" : "false", onclick: () => {
      for (const x of list.children) x.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-pressed", "true"); state.ceoPick = a;
    } }, portrait(a), el("b", {}, a.name), el("span", { class: "meta" }, [a.clan, String(a.archetype || "").toLowerCase(), a.eloRating ? `ELO ${a.eloRating}` : null].filter(Boolean).join(" · ")),
      el("span", { class: "meta style" }, STYLE[a.archetype] || ""));
    return b;
  }));
  showScreen("found");
  $("found-name").focus();
}
$("found-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("found-error"), btn = $("found-btn"), name = $("found-name").value.trim();
  err.hidden = true;
  if (!/^[A-Za-z0-9 '&.-]{3,32}$/.test(name)) { err.textContent = "Use 3–32 letters, numbers, spaces and ' & . -"; err.hidden = false; return; }
  if (!state.ceoPick) { err.textContent = "Pick your CEO."; err.hidden = false; return; }
  busy(btn, true, "Opening…");
  try { enterFloor(await api.openDesk(name, state.ceoPick.id), true); }
  catch (ex) { err.textContent = ex.message; err.hidden = false; }
  finally { busy(btn, false); }
});
$("no-agent-retry").addEventListener("click", async () => { try { enter(await api.me()); } catch (e) { toastError(e); } });

// ------------------------------------------------------------------ desk state
function applyDesk(d) {
  const prev = state.desk;
  state.desk = d;
  state.mandateDraft = null;
  $("agency-name").textContent = d.name;
  $("agency-sub").textContent = `${d.staff.length} analyst${d.staff.length === 1 ? "" : "s"} · ${d.desks} desks${d.autoMode ? " · auto" : ""}`;
  $("ceo-badge").textContent = `CEO ${d.ceo.name}${d.ceo.clan ? ` · ${d.ceo.clan}` : ""}`;
  $("bankroll").textContent = `${fmtUsd(d.paperBalance)} paper`;
  $("hud-level").textContent = d.level;
  $("hud-points").textContent = fmtPts(Math.round(d.points * 10) / 10);
  const prevAt = [0, 50, 150, 300, 500][d.level - 1] ?? 0;
  $("hud-level-bar").style.width = `${d.nextLevelAt ? Math.max(0, Math.min(100, ((d.points - prevAt) / (d.nextLevelAt - prevAt)) * 100)) : 100}%`;
  const credits = $("credits");
  credits.textContent = fmtCredits(d.credits);
  if (prev && prev.credits !== d.credits) { credits.parentElement.classList.remove("bump"); void credits.offsetWidth; credits.parentElement.classList.add("bump"); }
  office.setDesk({ ceo: { name: d.ceo.name, archetype: d.ceo.archetype }, staff: d.staff, desks: d.desks });
  if (prev && d.level > prev.level) { office.celebrate(5); office.confetti(); logSystem(`Level ${d.level}! A new desk is ready: ${d.desks} desks now.`); toast(`Level ${d.level}: +1 desk`); }
  V.renderConsole($("console"), ctx);
  if (state.view !== "office" && PANELS[state.view] && state.view !== "signal") renderView(state.view);
}

function applySignals(list) {
  const prev = new Map((state.signals || []).map((s) => [s.id, s]));
  state.signals = list;
  for (const s of list) {
    const was = prev.get(s.id)?.status;
    if (!was || was === s.status) continue;
    if (s.status === "OPEN" && s.entryPrice) log("Execution", `${s.asset.symbol} entry fixed at ${fmtPrice(s.entryPrice)} (5-minute average after the commitment).`, "#8fb6ff");
    if (s.status === "SETTLED") {
      const good = (s.r ?? 0) > 0;
      log("Settlement", `${s.asset.symbol} ${s.kind === "no-trade" ? "no-trade" : DIR_LABEL[s.direction].toLowerCase()} settled: ${fmtR(s.r)}${s.credits ? `, +${s.credits} credits` : ""}.`, good ? "#34d399" : "#ff6b7d", "", "signals");
      office.screen = { mode: "result", title: `${s.asset.symbol} ${DIR_LABEL[s.direction]}`, big: fmtR(s.r), good, lines: [s.exitReason === "target" ? "HIT THE TARGET" : s.exitReason === "stop" ? "STOPPED OUT" : "AT THE HORIZON"] };
      if (good) { office.celebrate(4); office.confetti(); }
      toast(`${s.asset.symbol} settled ${fmtR(s.r)}`);
      setTimeout(() => { if (office.screen.mode === "result") idleScreen(); }, 15_000);
    }
    if (s.status === "VOID") log("Desk", `${s.asset.symbol} call void: ${s.voidReason || "no price"}.`, "var(--red)", "error");
  }
  V.renderConsole($("console"), ctx);
  if (state.view === "signals") renderView("signals");
  if (state.view === "signal" && state.room?.signal) { const fresh = list.find((x) => x.id === state.room.signal.id); if (fresh && fresh.status !== state.room.signal.status) { state.room.signal = fresh; renderView("signal"); } }
}

function idleScreen() { office.screen = { mode: "idle" }; }

async function refreshAll() {
  try {
    const [d, s] = await Promise.all([api.desk(), api.mySignals()]);
    applyDesk(d); applySignals(s.signals);
  } catch (e) { if (e.status !== 401) console.warn("[kult-dex] refresh failed", e); }
}
async function refreshMarket() {
  try {
    state.market = await api.market();
    const pick = ["btc", "eth", "sol", "nvdax", "tslax", "paxg", "aaplx", "coinx", "okb", "hype", "spx", "xrp"];
    office.setTicker(pick.map((id) => state.market.assets.find((a) => a.id === id)).filter((a) => a?.price != null).map((a) => ({ symbol: a.symbol, price: a.price, change: a.change24h })));
    if (state.view === "markets") renderView("markets");
  } catch (e) { console.warn("[kult-dex] market failed", e); }
}

let pollTimer = null, marketTimer = null;
async function enterFloor(desk, fresh = false) {
  for (const s of SCREENS) show(s, false);
  show("booting", false);
  for (const id of ["hud", "sidebar", "stage", "console", "feed"]) show(id, true);
  state.inOffice = true;
  try { state.assets = (await api.assets()).assets; } catch { state.assets = []; }
  applyDesk(desk);
  fit(); requestAnimationFrame(fit);
  setView("office");
  logSystem(fresh ? `Welcome to ${desk.name}! ${fmtUsd(desk.paperBalance)} of paper money and ${fmtCredits(desk.credits)} credits. Hire analysts, then scan the board.` : `Welcome back to ${desk.name}.`);
  if (desk.credits < desk.payroll.weeklyTotal) logSystem(`Payday needs ${fmtCredits(desk.payroll.weeklyTotal)} credits and you have ${fmtCredits(desk.credits)}. Win calls before Monday.`);
  setTimeout(() => say("ceo", fresh ? "Welcome to the floor! Let's hire some analysts." : desk.staff.length ? "Morning, team. What's the tape saying?" : "Empty desks… let's find some analysts."), 700);
  try { applySignals((await api.mySignals()).signals); } catch (e) { if (e.status !== 401) { state.signals = []; toastError(e); } }
  refreshMarket();
  if (!tour.running) setTimeout(() => { if (state.inOffice && state.view === "office") tour.offer("o-hello", forceTour); }, 1500);
  clearInterval(pollTimer); clearInterval(marketTimer);
  pollTimer = setInterval(() => { if (document.visibilityState === "visible" && state.inOffice && !state.scanning) refreshAll(); }, 20_000);
  marketTimer = setInterval(() => { if (document.visibilityState === "visible" && state.inOffice) refreshMarket(); }, 60_000);
}

// ------------------------------------------------------------------ views
const PANELS = { signals: "signals-view", signal: "signal-view", markets: "markets-view", talent: "talent-view", leaders: "leaders-view", verify: "verify-view", desk: "desk-view" };
function setView(view) {
  state.view = view;
  document.body.classList.toggle("panel-open", view in PANELS);
  for (const [name, id] of Object.entries(PANELS)) show(id, name === view);
  const navView = view === "signal" ? "signals" : view;
  for (const b of document.querySelectorAll(".nav-item")) {
    const on = b.dataset.view === navView;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  }
  if (view === "office") { fit(); return; }
  renderView(view);
  $(PANELS[view]).scrollTop = 0;
  if (view === "talent") api.talent().then((t) => { state.talent = t; if (state.view === "talent") renderView("talent"); }).catch(toastError);
  if (view === "desk") api.ledger().then((l) => { state.ledger = l; if (state.view === "desk") renderView("desk"); }).catch(toastError);
  if (view === "leaders") loadLeaders(state.lbKind);
  if (view === "markets" && !state.market) refreshMarket();
  if (view === "signals") api.mySignals().then((s) => applySignals(s.signals)).catch(toastError);
}
function renderView(view) {
  const root = $(PANELS[view]);
  if (!root || !state.desk) return;
  ({ signals: V.renderSignals, signal: V.renderSignal, markets: V.renderMarkets, talent: V.renderTalent, leaders: V.renderLeaders, verify: V.renderVerify, desk: V.renderDesk })[view](root, ctx);
}
for (const b of document.querySelectorAll(".nav-item")) b.addEventListener("click", () => { if (!state.scanning) setView(b.dataset.view); });
for (const b of document.querySelectorAll("[data-view-link]")) b.addEventListener("click", () => setView(b.dataset.viewLink));
for (const b of document.querySelectorAll("[data-close]")) b.addEventListener("click", () => show(b.dataset.close, false));

async function loadLeaders(kind) {
  state.lbKind = kind;
  renderView("leaders");
  try { state.leaderboards[kind] = await api.leaderboard(kind); renderView("leaders"); } catch (e) { toastError(e); }
}

async function loadChart(assetId, tf) {
  const a = state.market?.assets.find((x) => x.id === assetId) || state.assets?.find((x) => x.id === assetId);
  state.chart = { assetId, symbol: a?.symbol || assetId, tf, data: null };
  renderView("markets");
  try { const data = await api.bars(assetId, tf); if (state.chart?.assetId === assetId) { state.chart.data = data; renderView("markets"); } } catch (e) { toastError(e); }
}

// Live countdowns everywhere (data-until), once a second.
setInterval(() => {
  for (const n of document.querySelectorAll("[data-until]")) {
    const left = Date.parse(n.dataset.until) - Date.now();
    n.textContent = `${n.dataset.prefix || ""}${left > 0 ? fmtCountdown(left) : "now"}`;
  }
}, 1000);

function confirmBox(title, text, yes = "Confirm") {
  return new Promise((resolve) => {
    $("confirm-title").textContent = title; $("confirm-text").textContent = text; $("confirm-yes").textContent = yes;
    show("confirm");
    const done = (v) => { show("confirm", false); $("confirm-yes").onclick = $("confirm-no").onclick = null; resolve(v); };
    $("confirm-yes").onclick = () => done(true); $("confirm-no").onclick = () => done(false);
  });
}

// ------------------------------------------------------------------ one signal
async function openSignal(id) {
  const s = state.signals?.find((x) => x.id === id);
  state.room = { signal: s || null, draft: null, bars: null, tf: s?.horizon === "4h" ? "5m" : "1h" };
  setView("signal");
  try {
    if (!s) { state.room.signal = (await api.signal(id)).signal; renderView("signal"); }
    loadRoomBars(state.room.tf);
  } catch (e) { toastError(e); setView("signals"); }
}
async function loadRoomBars(tf) {
  const s = state.room?.signal;
  if (!s) return;
  state.room.tf = tf;
  try { const b = await api.bars(s.assetId, tf); if (state.room?.signal?.id === s.id) { state.room.bars = b; renderView("signal"); } } catch (e) { if (state.room) { state.room.bars = null; renderView("signal"); } }
}

async function saveDraft(id, draft, btn) {
  busy(btn, true, "Saving…");
  try {
    const { signal } = await api.editSignal(id, draft);
    state.signals = state.signals.map((x) => (x.id === id ? signal : x));
    state.room = { ...state.room, signal, draft: null };
    renderView("signal"); V.renderConsole($("console"), ctx);
    toast("Draft saved.");
  } catch (e) { toastError(e); busy(btn, false); }
}

async function lockSignal(id, btn, draft) {
  const s = state.signals?.find((x) => x.id === id), dir = draft?.direction ?? (s?.kind === "no-trade" ? "flat" : s?.direction);
  if (!(await confirmBox(`Lock ${s ? `${s.asset.symbol} ${dir === "flat" ? "no trade" : (DIR_LABEL[dir] || dir).toLowerCase()}` : "this call"}?`, "Locking commits the call: it is hashed, chained to your last call and anchored on 0G. It can't be edited or deleted, and it counts on your record whatever happens.", "Lock & commit"))) return;
  busy(btn, true, "Committing…");
  try {
    if (draft) await api.editSignal(id, draft);
    const out = await api.lock(id);
    state.signals = state.signals.map((x) => (x.id === id ? out.signal : x));
    if (state.room?.signal?.id === id) { state.room.signal = out.signal; state.room.draft = null; }
    const sig = out.signal;
    log(`${state.desk.ceo.name} · CEO`, `Locked ${sig.kind === "no-trade" ? `no trade on ${sig.asset.symbol}` : `${DIR_LABEL[sig.direction].toLowerCase()} ${sig.asset.symbol} for ${sig.horizon}`}. Leaf ${out.leafHash.slice(0, 10)}…`, "var(--gold)", "", "lock");
    office.screen = { mode: "locked", title: sig.asset.symbol, dir: sig.kind === "no-trade" ? "FLAT" : DIR_LABEL[sig.direction], lines: [`LEAF ${out.leafHash.slice(0, 18)}`, "BATCH → 0G CHAIN", `ENTRY ${new Date(out.entryFrom).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} + 5 MIN`] };
    office.celebrate(2.5);
    say("ceo", "Committed. No take-backs now.", 3000);
    toast("Locked and committed.");
    V.renderConsole($("console"), ctx);
    if (state.view === "signal") renderView("signal");
    api.desk().then(applyDesk).catch(() => {});
  } catch (e) { toastError(e); busy(btn, false); }
}

async function discard(id, btn) {
  if (!(await confirmBox("Discard this draft?", "Drafts are never scored. Your analysts can scan again once they're free.", "Discard"))) return;
  busy(btn, true, "…");
  try {
    await api.discard(id);
    state.signals = state.signals.filter((x) => x.id !== id);
    idleScreen();
    V.renderConsole($("console"), ctx);
    setView("office");
  } catch (e) { toastError(e); busy(btn, false); }
}

// ------------------------------------------------------------------ the scan, played out on the floor
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function runScan(assetId) {
  if (state.scanning) return;
  state.scanning = true;
  setView("office");
  const staff = state.desk.staff.map((a) => office.person(a.id)).filter(Boolean);
  const target = assetId ? state.assets.find((a) => a.id === assetId)?.symbol : null;
  office.clearNotes();
  office.screen = { mode: "work", title: target ? `READING ${target}` : "SCANNING THE BOARD", lines: ["BRIEFING THE DESK"] };
  say("ceo", staff.length ? (target ? `Team, give me your reads on ${target}.` : "Team, scan the board. What's moving?") : "No analysts yet. I'll read the chart myself.", 3500);
  log(`${state.desk.ceo.name} · CEO`, target ? `Desk scan: ${target}.` : `Desk scan: ${universe().length} assets in the mandate.`, "var(--gold)");
  office.setAll("working");
  if (!staff.length) office.setState("ceo", "working");
  const chatter = setInterval(() => { const p = staff[Math.floor(Math.random() * staff.length)]; if (p) office.packet(p.id, ROLE_COLORS[p.role] || "#22d3ee"); }, 600);
  let i = 0;
  const lineTimer = setInterval(() => { const p = staff[i++ % Math.max(1, staff.length)]; office.screen.lines = [...office.screen.lines, p ? `${p.name.split(" ")[0]}: ${ROLE_SHORT[p.role] || "READING"}` : "CEO: CHART"].slice(-3); }, 900);
  let out;
  try { out = await api.scan(assetId || undefined); }
  catch (e) {
    clearInterval(chatter); clearInterval(lineTimer);
    office.setAll("idle"); office.setState("ceo", "idle"); idleScreen();
    state.scanning = false;
    if (e.retryAt) { state.desk.scanReadyAt = e.retryAt; V.renderConsole($("console"), ctx); }
    toastError(e); log("Desk", e.message, "var(--red)", "error");
    return;
  }
  clearInterval(chatter); clearInterval(lineTimer);
  office.setState("ceo", "idle");
  const s = out.signal;
  if (!assetId && out.scanned?.length > 1) log("Desk", `Strongest movers: ${out.scanned.slice(0, 4).map((x) => x.symbol).join(", ")}. Reading ${s.asset.symbol} in full.`, "var(--gold)");
  const skip = { on: false };
  $("console").replaceChildren(el("div", { class: "next-match" }, el("div", { class: "teams" }, `${s.asset.symbol} · ${s.asset.name}`), el("div", { class: "meta" }, "Your analysts are presenting…")), el("div", { class: "console-actions" }, el("button", { type: "button", class: "btn small", onclick: () => { skip.on = true; } }, "Skip to the call")));
  for (const r of s.reads) {
    const p = r.analystId && office.person(r.analystId);
    if (!skip.on && p) { office.visit(r.analystId, false); await wait(900); }
    if (p) { office.setState(r.analystId, r.view === "veto" ? "error" : "done"); office.packet(r.analystId, ROLE_COLORS[r.analyst] || "#22d3ee"); }
    office.addNote(ROLE_COLORS[r.analyst] || "#22d3ee");
    if (!skip.on && p) say(r.analystId, r.text, 3600);
    log(`${r.name} · ${ROLE_TITLE[r.analyst]}`, r.text, r.view === "veto" ? "var(--red)" : ROLE_COLORS[r.analyst]);
    if (!skip.on && p) await wait(1800);
  }
  office.home();
  office.screen = { mode: "call", title: s.asset.symbol, dir: s.kind === "no-trade" ? "FLAT" : DIR_LABEL[s.direction], lines: s.kind === "directional" ? [`${s.horizon} · TARGET ${fmtPct(s.targetPct, 1, false)} · STOP ${fmtPct(s.stopPct, 1, false)}`, `RISK ${s.riskPct}% · CONF ${Math.round(s.confidence * 100)}%`, "REVIEW, THEN LOCK"] : s.kind === "rotation" ? ["OUT OF THE ASSET", "INTO T-BILLS FOR 7 DAYS", "REVIEW, THEN LOCK"] : ["NOTHING CLEARS THE BAR", "STAYING FLAT IS A CALL TOO"] };
  say("ceo", s.rationale.replace(/^[^:]+?:\s*/, ""), 6500);
  log(`${state.desk.ceo.name} · CEO`, s.rationale, "var(--gold)");
  office.celebrate(2);
  state.signals = [s, ...(state.signals || [])];
  if (!skip.on) await wait(2400);
  state.scanning = false;
  api.desk().then(applyDesk).catch(() => {});
  V.renderConsole($("console"), ctx);
  openSignal(s.id);
  toast("Draft ready: edit it, then lock it.");
}

// ------------------------------------------------------------------ staff and desk settings
async function hire(c, btn) {
  const d = state.desk;
  if (!(await confirmBox(`Hire ${c.name}?`, `${c.title}, ${c.skill}★. Costs ${fmtCredits(c.hireCost)} credits now and ${fmtCredits(c.weeklySalary)} every Monday.${d.credits - c.hireCost < d.payroll.weeklyTotal + c.weeklySalary ? " Careful: you'd be short for payday." : ""}`, "Hire"))) return;
  busy(btn, true, "Hiring…");
  try {
    const out = await api.hire(c.candidateKey);
    if (state.talent) state.talent.candidates = state.talent.candidates.filter((x) => x.candidateKey !== c.candidateKey);
    applyDesk(out.desk);
    office.setState(out.analyst.id, "done");
    log(`${out.analyst.name} · ${out.analyst.title}`, `Joined the desk. ${out.analyst.reads}.`, ROLE_COLORS[out.analyst.role]);
    toast(`${out.analyst.name} joined your desk.`);
    renderView("talent");
    setTimeout(() => say(out.analyst.id, `Hi boss! ${out.analyst.style.charAt(0).toUpperCase()}${out.analyst.style.slice(1)}, reporting in.`, 3500), 400);
  } catch (e) { toastError(e); busy(btn, false); }
}
function openAnalyst(id) {
  const a = state.desk.staff.find((s) => s.id === id);
  if (!a) return;
  V.renderAnalyst($("analyst-body"), a, ctx);
  show("analyst-sheet");
}
async function fire(a, btn) {
  if (!(await confirmBox(`Let ${a.name} go?`, "Their desk is freed for someone new. There's no refund of the hiring cost.", "Let go"))) return;
  busy(btn, true, "…");
  try { const out = await api.fire(a.id); show("analyst-sheet", false); applyDesk(out.desk); logSystem(`${a.name} has left the desk.`); }
  catch (e) { toastError(e); busy(btn, false); }
}
async function changeCeo(agentId, btn) {
  if (agentId === state.desk.ceo.agentId) return;
  busy(btn, true, "…");
  try { applyDesk(await api.setCeo(agentId)); toast(`${state.desk.ceo.name} is your new CEO.`); say("ceo", "New boss on the floor!"); }
  catch (e) { toastError(e); } finally { busy(btn, false); }
}
async function saveMandate(m, btn) {
  busy(btn, true, "Saving…");
  try { applyDesk(await api.setMandate(m)); renderView("desk"); toast("Mandate saved: it applies to new calls."); }
  catch (e) { toastError(e); busy(btn, false); }
}
async function setAuto(on, btn) {
  busy(btn, true, "…");
  try { applyDesk(await api.setAuto(on)); renderView("desk"); log(`${state.desk.ceo.name} · CEO`, on ? "Auto-desk on: I'll scan and lock calls on my own, inside the mandate." : "Auto-desk off: I'll wait for you.", "var(--gold)"); }
  catch (e) { toastError(e); busy(btn, false); }
}

async function verify(id) {
  if (!id) return;
  state.verifyId = id;
  state.verifyResult = null;
  setView("verify");
  try { state.verifyResult = await api.verify(id); } catch (e) { state.verifyResult = { error: e.message }; }
  if (state.view === "verify") renderView("verify");
}

// ------------------------------------------------------------------ tutorial
const forceTour = params.has("tour");
const viewIs = (v) => state.view === v && state.inOffice;
const navSel = (v) => `#sidebar [data-view="${v}"]`;
const TOUR_LINES = {
  "f-hello": "Hi, I'm Nova, your KULT guide! Kult Dex is an AI trading desk: your AI Arena agent runs it, analysts read crypto and tokenized stocks, and real prices grade every call. Let's open yours.",
  "f-name": "Name your desk. Pick something people will remember: 3 to 32 letters.",
  "f-ceo": "Now pick your CEO. Its archetype is its trading style: a Berserker trades momentum, a Defender loves T-bills.",
  "f-go": "That's it. Open the desk! You start with $10,000 of paper money: nothing real ever moves.",
  "o-hello": "Welcome to your trading floor! Analysts work at these desks, the ticker runs live prices, and your CEO makes the call on the chart rug.",
  "o-hud": "Up top: your desk, level and points, the paper bankroll and your credits. Points only come from calls that settled against real prices.",
  "o-console": "This is your console. Scan the board and your analysts read the market their own way; the CEO drafts a call you can edit, then lock.",
  "o-feed": "The floor feed: every read, every lock, every settlement.",
  "o-talent-go": "First, staff up. Open Talent.",
  "o-talent": "A Chart Reader, a Flow Hunter and a Risk Officer are a solid first desk. The Risk Officer can veto a bad trade. Each has a weekly salary.",
  "o-markets-go": "Now open Markets.",
  "o-markets": "Live prices: crypto majors, tokenized US stocks that trade around the clock, gold, and the T-bill yield your desk can rotate into.",
  "o-signals": "Signals keeps every call. Once locked, a call is hashed and anchored on 0G: it can't be edited or deleted, losers included.",
  "o-verify": "Verify proves any call: the hash, the Merkle proof, the 0G anchor and the time it was made, before its entry price.",
  "o-leaders": "Records: every desk's settled calls, paper R with its range, calibration and drawdown. Records, not a ranking.",
  "o-desk": "Desk: your mandate, the auto-desk switch, your CEO and the ledger.",
  "o-office-go": "Back to the floor.",
  "o-done": "You're set. Hire a desk, scan the board and lock your first call. Good trading, boss!"
};
const tour = createTour({
  guide: { img: "art/nova.png", name: "NOVA" },
  lines: TOUR_LINES,
  doneKeys: () => [`kd.tour.v1.${String(state.me?.player?.id || "anon")}`],
  onFinish: () => { office.celebrate?.(4); toast("Tutorial complete. Welcome to Kult Dex!"); },
  steps: [
    { id: "f-hello", phase: "found", next: true, nextLabel: "Let's go", title: "Welcome to Kult Dex" },
    { id: "f-name", phase: "found", target: "#found-name", next: true, interactive: true },
    { id: "f-ceo", phase: "found", target: "#found-agents", next: true, interactive: true },
    { id: "f-go", phase: "found", target: "#found-btn", done: () => state.inOffice, doneDelay: 1200 },
    { id: "o-hello", phase: "office", next: true, quiet: () => !state.inOffice },
    { id: "o-hud", phase: "office", target: "#hud", next: true },
    { id: "o-console", phase: "office", target: "#console", next: true, skip: () => $("console").hidden },
    { id: "o-feed", phase: "office", target: "#feed", next: true, skip: () => !$("feed").getClientRects().length },
    { id: "o-talent-go", phase: "office", target: navSel("talent"), done: () => viewIs("talent") },
    { id: "o-talent", phase: "office", target: "#talent-view", next: true, lost: () => !viewIs("talent"), fallback: "o-talent-go" },
    { id: "o-markets-go", phase: "office", target: navSel("markets"), done: () => viewIs("markets") },
    { id: "o-markets", phase: "office", target: "#markets-view", next: true, lost: () => !viewIs("markets"), fallback: "o-markets-go" },
    { id: "o-signals", phase: "office", target: navSel("signals"), next: true },
    { id: "o-verify", phase: "office", target: navSel("verify"), next: true },
    { id: "o-leaders", phase: "office", target: navSel("leaders"), next: true },
    { id: "o-desk", phase: "office", target: navSel("desk"), next: true },
    { id: "o-office-go", phase: "office", target: navSel("office"), done: () => viewIs("office") },
    { id: "o-done", phase: "office", next: true, nextLabel: "Let's trade", last: true, title: "You run the desk now" }
  ]
});
$("tour-btn").addEventListener("click", () => { if (!state.scanning) { setView("office"); tour.start("o-hello"); } });

// ------------------------------------------------------------------ boot
async function boot() {
  try { state.cfg = await fetch("/config.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})); } catch { state.cfg = {}; }
  api ??= createApi({ apiUrl: state.cfg.apiUrl, onUnauthorized: () => sessionExpired() });
  ctx.api = api;
  document.body.classList.toggle("is-demo", Boolean(api.demo));
  setupIcons();
  try {
    if (api.demo) return enter(await api.startSession("demo"));
    if (handoff) return enter(await api.startSession(handoff));
    if (api.hasSession()) return enter(await api.me());
    const privy = await loadPrivy();
    if (privy?.authenticated) return enter(await sessionFromPrivy(privy));
  } catch (e) {
    return showEntrance(e.status === 401 ? "Your Kult session has expired. Sign in again, or reopen Kult Dex from Kult World." : e.message);
  }
  showEntrance();
}
boot();
