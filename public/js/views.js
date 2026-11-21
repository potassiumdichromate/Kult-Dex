// Kult Dex screens (everything outside the floor canvas). Each renderer gets
// the shared context from app.js: state, actions and helpers.

import {
  el, stars, fmtPts, fmtCredits, fmtCountdown, fmtAgo, fmtPrice, fmtUsd, fmtPct, fmtPctPoints, fmtR, shortHash,
  DIR_LABEL, STATUS_LABEL, HORIZON_LABEL, lineIcon
} from "./ui.js";
import { ROLE_COLORS } from "./world.js";
import { candleChart, sparkline } from "./chart.js";

const fill = (root, ...kids) => root.replaceChildren(...kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false));
const head = (eyebrow, title, ...right) => el("div", { class: "dash-head" },
  el("div", {}, el("p", { class: "eyebrow" }, eyebrow), el("h2", { class: "display" }, title)),
  right.length ? el("div", { class: "dash-controls" }, ...right) : null);
const section = (title, small, ...kids) => el("section", { class: "dash-section" }, el("h3", {}, title, small ? el("small", {}, small) : null), ...kids);
const stat = (k, v, c, sub) => el("div", { class: "stat", style: `--c:${c}` }, el("span", { class: "k" }, k), el("span", { class: "v" }, v), sub ? el("span", { class: "sub" }, sub) : null);
const tabs = (items, current, onPick, label) => el("div", { class: "filters", role: "group", "aria-label": label }, items.map(([k, text]) =>
  el("button", { type: "button", "aria-pressed": k === current ? "true" : "false", onclick: () => onPick(k) }, text)));
const roleChip = (role, title) => el("span", { class: "chip", style: `--c:${ROLE_COLORS[role] || "var(--accent)"}` }, el("i"), title);
const clan = (c) => (c ? el("span", { class: `clan ${c}` }, c) : null);
const dirPill = (s) => el("span", { class: `dir ${s.direction}` }, s.kind === "no-trade" ? "NO TRADE" : DIR_LABEL[s.direction] || s.direction);
const statusPill = (s) => el("span", { class: `status ${String(s.status).toLowerCase()}` }, s.status === "SETTLED" ? fmtR(s.r) : STATUS_LABEL[s.status] || s.status);
const viewPill = (v) => el("span", { class: `view ${v}` }, v === "veto" ? "VETO" : v.toUpperCase());
const DISCLAIMER = "Signals are produced by AI agents and are not investment advice. Past performance, even verified, does not predict future results. Kult Dex is paper trading: no real money moves.";
export const CLASS_TABS = [["all", "All"], ["crypto", "Crypto"], ["rwa-equity", "Tokenized stocks"], ["rwa", "Gold, index & T-bills"], ["meme", "Memes"]];

// ---------------------------------------------------------------- console (under the floor)
export function renderConsole(root, ctx) {
  const { state } = ctx, d = state.desk;
  if (!d) return fill(root);
  const draft = (state.signals || []).find((s) => s.status === "DRAFT");
  if (draft) {
    return fill(root,
      el("div", { class: "next-match" },
        el("p", { class: "eyebrow", style: "margin:0 0 4px" }, "The CEO's draft · not committed yet"),
        el("div", { class: "teams" }, dirPill(draft), " ", draft.asset.symbol, el("span", { class: "muted" }, ` · ${HORIZON_LABEL[draft.horizon]}`)),
        el("div", { class: "meta" }, draft.kind === "no-trade" ? draft.rationale.slice(0, 140) : `Target ${fmtPct(draft.targetPct, 2, false)} · stop ${fmtPct(draft.stopPct, 2, false)} · risk ${draft.riskPct}% · confidence ${Math.round(draft.confidence * 100)}%`)),
      el("div", { class: "console-actions" },
        el("button", { type: "button", class: "btn", onclick: () => ctx.openSignal(draft.id) }, "Review"),
        el("button", { type: "button", class: "btn primary", onclick: (e) => ctx.lock(draft.id, e.currentTarget) }, lineIcon("lock", "inline-ico"), "Lock & commit")));
  }
  const live = (state.signals || []).filter((s) => s.status === "LOCKED" || s.status === "OPEN");
  const ready = d.scanReadyAt ? Date.parse(d.scanReadyAt) : 0;
  const universe = ctx.universe();
  const pick = el("select", { "aria-label": "Asset to scan", id: "scan-pick" }, el("option", { value: "" }, "Scan the whole mandate"),
    universe.map((a) => el("option", { value: a.id, selected: state.scanPick === a.id || null }, `${a.symbol} · ${a.name}`)));
  pick.addEventListener("change", () => { state.scanPick = pick.value || null; });
  return fill(root,
    el("div", { class: "next-match" },
      el("p", { class: "eyebrow", style: "margin:0 0 4px" }, d.autoMode ? "Auto-desk is on" : "Your desk"),
      el("div", { class: "teams" }, live.length ? `${live.length} live call${live.length === 1 ? "" : "s"}` : "No live calls", el("span", { class: "muted" }, ` · ${d.lockedToday}/${d.dailyLockCap} locked today`)),
      el("div", { class: "meta" }, lineIcon("stopwatch", "inline-ico"),
        ready > Date.now() ? el("span", {}, "Analysts free in ", el("span", { class: "countdown", "data-until": d.scanReadyAt }, fmtCountdown(ready - Date.now()))) : "Analysts are ready",
        d.autoMode && d.nextAutoScanAt ? el("span", { class: "muted" }, " · next auto-scan in ", el("span", { "data-until": d.nextAutoScanAt }, fmtCountdown(Date.parse(d.nextAutoScanAt) - Date.now()))) : null)),
    el("div", { class: "console-actions" }, pick,
      el("button", { type: "button", class: "btn primary", id: "scan-btn", onclick: () => ctx.scan(state.scanPick) }, lineIcon("bolt", "inline-ico"), "Scan")));
}

// ---------------------------------------------------------------- signals
export function renderSignals(root, ctx) {
  const { state } = ctx, f = state.signalFilter || "live";
  const all = state.signals || [];
  const pickList = { live: all.filter((s) => s.status === "LOCKED" || s.status === "OPEN"), drafts: all.filter((s) => s.status === "DRAFT"), settled: all.filter((s) => s.status === "SETTLED"), void: all.filter((s) => s.status === "VOID") }[f];
  const counts = { live: 0, drafts: 0, settled: 0, void: 0 };
  for (const s of all) counts[s.status === "DRAFT" ? "drafts" : s.status === "SETTLED" ? "settled" : s.status === "VOID" ? "void" : "live"]++;
  fill(root,
    head("Your calls", "Signals", tabs([["live", `Live ${counts.live}`], ["drafts", `Drafts ${counts.drafts}`], ["settled", `Settled ${counts.settled}`], ["void", `Void ${counts.void}`]], f, (k) => { state.signalFilter = k; renderSignals(root, ctx); }, "Show")),
    el("p", { class: "muted small", style: "margin:0 0 6px" }, "Locked calls are committed: they can't be edited or deleted, and every one counts, losers included."),
    !state.signals ? el("p", { class: "muted" }, "Loading…") : !pickList.length ? el("p", { class: "empty-dash" }, f === "live" ? "No live calls. Scan the board from the floor." : f === "drafts" ? "No drafts." : f === "settled" ? "Nothing settled yet. A call settles at its target, its stop or its horizon." : "No void calls.")
      : el("div", { class: "list" }, pickList.map((s) => signalRow(s, ctx))));
}

function signalRow(s, ctx) {
  const until = s.status === "OPEN" || s.status === "LOCKED" ? s.endsAt : null;
  return el("button", { type: "button", class: "fx-row sig-row", onclick: () => ctx.openSignal(s.id) },
    el("div", { class: "when" }, el("b", {}, s.asset.symbol), s.asset.class.startsWith("rwa") ? "RWA" : s.asset.class),
    el("div", { style: "min-width:0" }, el("div", { class: "teams" }, dirPill(s), ` ${HORIZON_LABEL[s.horizon]}`, s.kind === "rotation" ? " · into T-bills" : ""),
      el("div", { class: "league" }, s.status === "SETTLED" ? `${s.exitReason === "target" ? "Hit the target" : s.exitReason === "stop" ? "Stopped out" : "At the horizon"} · ${fmtPctPoints(s.resultPct)}${s.credits ? ` · +${s.credits} credits` : ""}` : s.status === "VOID" ? s.voidReason || "Void" : s.status === "DRAFT" ? "Draft: review and lock" : s.entryPrice ? `Entry ${fmtPrice(s.entryPrice)}` : "Waiting for the entry window")),
    el("span", { class: `status ${s.status.toLowerCase()}`, ...(until ? { "data-until": until, "data-prefix": s.status === "OPEN" ? "Ends in " : "" } : {}) }, s.status === "SETTLED" ? fmtR(s.r) : STATUS_LABEL[s.status]),
    el("span", { class: "btn small go" }, s.status === "DRAFT" ? "Review" : "Open"));
}

// ---------------------------------------------------------------- one signal
export function renderSignal(root, ctx) {
  const { state } = ctx, s = state.room?.signal;
  if (!s) return fill(root, el("p", { class: "muted" }, "Loading the call…"));
  const back = el("div", { class: "dash-head" }, el("button", { type: "button", class: "btn small ghost", onclick: () => ctx.go("signals") }, "‹ Signals"), el("span"));
  const header = el("div", { class: "sig-head" },
    el("div", {}, el("div", { class: "sym display" }, s.asset.symbol), el("div", { class: "muted small" }, s.asset.name)),
    el("div", { class: "sig-call" }, dirPill(s), el("span", { class: "muted" }, HORIZON_LABEL[s.horizon]), statusPill(s)),
    s.quote ? el("div", { class: "sig-px" }, el("span", { class: "k" }, "Quote at scan"), el("b", {}, fmtPrice(s.quote))) : null);

  const reads = el("div", { class: "card" }, el("h3", {}, "Analyst reads", el("small", {}, `${s.reads.length} reads · numbers from code, never a model`)),
    s.reads.map((r) => el("div", { class: "report" },
      r.analystId ? ctx.portrait(r.analystId) : el("span", { class: "ph rules" }, r.analyst === "CHART" ? "CEO" : "§"),
      el("div", { style: "min-width:0" },
        el("div", {}, el("span", { class: "who" }, r.name), " ", roleChip(r.analyst, ctx.roleTitle(r.analyst)), " ", viewPill(r.view)),
        el("p", { class: "narr" }, r.text),
        r.analyst !== "RISK" && r.analyst !== "EXECUTION" && r.analyst !== "YIELD" ? el("div", { class: "scorebar", title: `score ${r.score} · weight ${r.weight}` }, el("i", { style: `--x:${(r.score + 1) * 50}%` })) : null,
        el("div", { class: "hashline" }, "inputs ", el("code", {}, shortHash(r.inputsHash)))))),
    el("div", { class: "summary" }, el("b", {}, "CEO's call"), s.rationale,
      el("div", { class: "muted small", style: "margin-top:6px" }, s.model?.provider === "0g-compute" ? `Worded by ${s.model.models.join(", ")} on 0G Compute${s.model.teeVerified ? " (TEE verified)" : ""}` : "Decided and worded by the desk's own code (deterministic)")));

  const right = [];
  if (s.status === "DRAFT") right.push(draftEditor(s, ctx));
  else right.push(timeline(s, ctx));
  if (s.status !== "DRAFT" || s.kind !== "no-trade") right.push(el("div", { class: "card" }, el("h3", {}, "Chart", el("small", {}, state.room.bars ? `${state.room.bars.source.split(":")[0]} · ${state.room.tf}` : "")),
    tabs([["5m", "5m"], ["1h", "1h"], ["1d", "1d"]], state.room.tf, (tf) => ctx.loadRoomBars(tf), "Timeframe"),
    el("canvas", { class: "chart", id: "room-chart" })));
  fill(root, back, header, el("div", { class: "room-grid" }, el("div", {}, reads), el("div", {}, right)));
  const c = root.querySelector("#room-chart");
  if (c && state.room.bars) {
    const e = s.entryPrice ?? s.quote, levels = [];
    if (e && s.kind === "directional") {
      const sign = s.direction === "short" ? -1 : 1;
      levels.push({ price: e, label: s.entryPrice ? "ENTRY" : "QUOTE", color: "#a5f3fc", dash: !s.entryPrice }, { price: e * (1 + sign * s.targetPct), label: "TGT", color: "#34d399", dash: true }, { price: e * (1 - sign * s.stopPct), label: "STOP", color: "#ff6b7d", dash: true });
    }
    if (s.exitPrice) levels.push({ price: s.exitPrice, label: "EXIT", color: "#f5c542" });
    requestAnimationFrame(() => { state.room.redraw = candleChart(c, state.room.bars.bars, { levels, tf: state.room.tf }); });
  }
}

function draftEditor(s, ctx) {
  const m = ctx.state.desk.mandate;
  const draft = ctx.state.room.draft ??= { direction: s.direction, horizon: s.horizon, riskPct: s.riskPct, targetPct: s.targetPct, stopPct: s.stopPct };
  const card = el("div", { class: "card" });
  const rerender = () => card.replaceWith(draftEditor(s, ctx));
  const dirty = () => ["direction", "horizon", "riskPct", "targetPct", "stopPct"].some((k) => draft[k] !== s[k]);
  const pctInput = (key, min, max, label) => el("label", { class: "num-ed" }, el("span", {}, label),
    el("input", { type: "number", step: "0.1", min, max, value: (draft[key] * 100).toFixed(2), oninput: (e) => { draft[key] = Number(e.target.value) / 100; } }), el("span", { class: "muted" }, "%"));
  const isRotation = s.kind === "rotation";
  card.append(
    el("h3", {}, "Your call", el("small", {}, s.edited || dirty() ? "edited draft" : "CEO's draft")),
    el("div", { class: "editor" },
      !isRotation ? el("div", { class: "ed-row" }, el("div", { class: "lab" }, "Direction"),
        el("div", { class: "seg", role: "group", "aria-label": "Direction" }, [["long", "Long"], ...(m.allowShort ? [["short", "Short"]] : []), ["flat", "No trade"]].map(([k, label]) =>
          el("button", { type: "button", "aria-pressed": draft.direction === k ? "true" : "false", onclick: () => { draft.direction = k; if (k !== "flat" && !draft.stopPct) { draft.stopPct = 0.02; draft.targetPct = 0.04; draft.riskPct = Math.min(1, m.maxRiskPct); } rerender(); } }, label))))
        : el("p", { class: "muted small" }, "A rotation moves the risk budget out of this asset into tokenized T-bills for 7 days. It settles at the horizon: T-bill carry minus what the asset did."),
      el("div", { class: "ed-row" }, el("div", { class: "lab" }, "Horizon"),
        el("div", { class: "seg", role: "group", "aria-label": "Horizon" }, m.horizons.map((h) => el("button", { type: "button", disabled: isRotation || null, "aria-pressed": draft.horizon === h ? "true" : "false", onclick: () => { draft.horizon = h; rerender(); } }, h)))),
      draft.direction !== "flat" ? [
        el("div", { class: "ed-row" }, el("div", { class: "lab" }, `Risk · max ${m.maxRiskPct}% of the paper bankroll`),
          el("div", { class: "risk-ed" }, el("input", { type: "range", min: "0.1", max: String(m.maxRiskPct), step: "0.05", value: String(draft.riskPct || 0.1), oninput: (e) => { draft.riskPct = Number(e.target.value); e.target.nextSibling.textContent = `${draft.riskPct.toFixed(2)}%`; } }), el("b", {}, `${Number(draft.riskPct || 0).toFixed(2)}%`))),
        !isRotation ? el("div", { class: "ed-row two" }, pctInput("targetPct", 0.3, 50, "Target"), pctInput("stopPct", 0.3, 20, "Stop")) : null
      ] : el("p", { class: "muted small" }, "No trade is a real call: it is committed and counts as 0R. Staying flat when nothing stands out is often the best signal."),
      el("div", { class: "lockbar" },
        el("button", { type: "button", class: "btn", disabled: !dirty() || null, onclick: (e) => ctx.saveDraft(s.id, draft, e.currentTarget) }, dirty() ? "Save changes" : "No changes"),
        el("button", { type: "button", class: "btn primary", onclick: (e) => ctx.lock(s.id, e.currentTarget, dirty() ? draft : null) }, lineIcon("lock", "inline-ico"), "Lock & commit"),
        el("button", { type: "button", class: "btn ghost", onclick: (e) => ctx.discard(s.id, e.currentTarget) }, "Discard"))),
    el("ol", { class: "how" },
      el("li", {}, "Lock hashes the whole call (asset, direction, sizes, every read) into a leaf and chains it to your last one."),
      el("li", {}, "Within a minute the leaf goes into a Merkle batch anchored on 0G Chain."),
      el("li", {}, "Entry is the average price over 5 minutes, starting 5 minutes after you lock, and only if the call is confirmed on 0G first. Not confirmed in time: the call is void, never entered late."),
      el("li", {}, "It settles at its target, its stop or its horizon, from the price source it locked. Drafts are never scored."),
      el("li", {}, "Simulated paper performance, not executable profit.")));
  return card;
}

function timeline(s, ctx) {
  const step = (done, title, detail, live) => el("li", { class: `${done ? "done" : ""} ${live ? "live" : ""}` }, el("b", {}, title), detail ? el("div", { class: "muted small" }, detail) : null);
  const now = Date.now();
  return el("div", { class: "card" }, el("h3", {}, "Life of the call", el("small", {}, s.lockedAt ? `locked ${fmtAgo(s.lockedAt)}` : "")),
    el("ol", { class: "timeline" },
      step(true, "Committed", el("span", {}, "leaf ", el("code", {}, shortHash(s.leafHash)), s.prevHash ? el("span", {}, " · after ", el("code", {}, shortHash(s.prevHash))) : " · the desk's first call")),
      step(!!s.batchId, s.batchId ? `In batch #${s.batchId}` : "Waiting for the next batch", s.batchId ? "Merkle root anchored on 0G Chain (see Verify)" : "Batches run every minute"),
      step(!!s.entryPrice || s.status === "SETTLED" || s.status === "VOID", s.kind === "no-trade" ? "No entry: staying flat" : s.entryPrice ? `Entry ${fmtPrice(s.entryPrice)}` : "Entry window",
        s.entryFrom ? `5-minute average from ${new Date(s.entryFrom).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : null, s.status === "LOCKED"),
      step(s.status === "SETTLED" || s.status === "VOID", s.status === "VOID" ? "Void" : s.status === "SETTLED" ? `Settled ${fmtR(s.r)}` : "Open",
        s.status === "SETTLED" ? `${s.exitReason === "target" ? "Hit the target" : s.exitReason === "stop" ? "Stopped out" : "Closed at the horizon"}${s.exitPrice ? ` at ${fmtPrice(s.exitPrice)}` : ""} · ${fmtPctPoints(s.resultPct)} after costs${s.credits ? ` · +${s.credits} credits` : ""}${s.review ? " · flagged: feeds disagreed" : ""}`
          : s.status === "VOID" ? s.voidReason : s.endsAt ? el("span", {}, "Horizon ends in ", el("span", { "data-until": s.endsAt }, fmtCountdown(Date.parse(s.endsAt) - now))) : null, s.status === "OPEN")),
    s.status === "SETTLED" ? el("p", { class: "muted small paper-label" }, "Simulated paper performance, not executable profit.") : null,
    el("div", { class: "actions" }, el("button", { type: "button", class: "btn", onclick: () => ctx.verify(s.id) }, lineIcon("verify", "inline-ico"), "Verify this call"),
      s.leafHash ? el("a", { class: "btn ghost", href: `/proof/${encodeURIComponent(s.id)}`, target: "_blank", rel: "noopener" }, "Public proof page ↗") : null,
      s.leafHash ? el("button", { type: "button", class: "btn ghost", onclick: () => ctx.shareCall(s) }, "Share call") : null));
}

// ---------------------------------------------------------------- markets
export function renderMarkets(root, ctx) {
  const { state } = ctx, m = state.market, f = state.marketFilter || "all";
  const rows = (m?.assets || []).filter((a) => f === "all" || (f === "rwa" ? ["rwa-commodity", "rwa-etf", "rwa-treasury"].includes(a.class) : a.class === f));
  const y = m?.yields;
  const chartCard = state.chart ? el("div", { class: "card chart-card" },
    el("h3", {}, `${state.chart.symbol} chart`, el("small", {}, state.chart.data ? `${state.chart.data.source} · ${state.chart.data.session?.label || ""}` : "loading…")),
    el("div", { class: "row", style: "justify-content:space-between;flex-wrap:wrap;gap:8px" },
      tabs([["5m", "5m"], ["1h", "1h"], ["1d", "1d"]], state.chart.tf, (tf) => ctx.loadChart(state.chart.assetId, tf), "Timeframe"),
      el("div", { class: "row" }, el("button", { type: "button", class: "btn small primary", onclick: () => ctx.scan(state.chart.assetId) }, lineIcon("bolt", "inline-ico"), `Scan ${state.chart.symbol}`), el("button", { type: "button", class: "btn small ghost", onclick: () => { state.chart = null; renderMarkets(root, ctx); } }, "Close"))),
    el("canvas", { class: "chart", id: "mk-chart" }),
    state.chart.data?.perp?.funding != null ? el("p", { class: "muted small" }, `Perp funding ${fmtPct(state.chart.data.perp.funding * 24 * 365, 1)} a year · open interest ${fmtUsd(state.chart.data.perp.openInterest)} · 24h volume ${fmtUsd(state.chart.data.perp.dayVolumeUsd)}`) : null) : null;
  fill(root,
    head("Live prices", "Markets", tabs(CLASS_TABS, f, (k) => { state.marketFilter = k; renderMarkets(root, ctx); }, "Asset class")),
    el("div", { class: "stats" },
      stat("Tokenized T-bills", y?.tbillApy != null ? `${y.tbillApy.toFixed(2)}%` : "—", "#ffe08a", "Ondo USDY, a year"),
      stat("Stablecoin lending", y?.lendApy != null ? `${y.lendApy.toFixed(2)}%` : "—", "#a5f3fc", "Aave v3 USDT, a year"),
      stat("US stock market", ctx.usSession()?.label || "—", "#b58cff", "tokenized stocks trade 24/7 on the reference perp")),
    chartCard,
    !m ? el("p", { class: "muted" }, "Loading prices…")
      : el("table", { class: "lb mk" },
        el("thead", {}, el("tr", {}, el("th", {}, "Asset"), el("th", { class: "num" }, "Price"), el("th", { class: "num" }, "24h"), el("th", { class: "num hide-sm" }, "7d"), el("th", { class: "hide-sm" }, "48h"), el("th", {}))),
        el("tbody", {}, rows.map((a) => el("tr", { class: a.price == null ? "dim" : null },
          el("td", {}, el("div", { class: "ag" }, a.symbol, a.session && a.hours === "us-equities" ? el("span", { class: `sess ${a.session.status}` }, a.session.status === "open" ? "US open" : a.session.status === "weekend" ? "weekend" : a.session.status) : null),
            el("div", { class: "ceo" }, a.name, a.classLabel ? ` · ${a.classLabel}` : "")),
          el("td", { class: "num" }, a.price == null ? (a.class === "rwa-treasury" ? "yield" : "—") : fmtPrice(a.price)),
          el("td", { class: `num ${a.change24h > 0 ? "up" : a.change24h < 0 ? "down" : ""}` }, a.change24h == null ? "" : fmtPct(a.change24h)),
          el("td", { class: `num hide-sm ${a.change7d > 0 ? "up" : a.change7d < 0 ? "down" : ""}` }, a.change7d == null ? "" : fmtPct(a.change7d)),
          el("td", { class: "hide-sm" }, a.spark ? sparkline(a.spark) : null),
          el("td", { class: "num" }, a.price != null ? el("button", { type: "button", class: "btn small", onclick: () => ctx.loadChart(a.id, "1h") }, "Chart") : null))))),
    m ? el("p", { class: "muted small" }, `Prices: ${[...new Set((m.assets || []).filter((a) => a.source).map((a) => a.source.split(":")[0]))].join(", ") || "—"}. Tokenized stocks use Hyperliquid's 24/7 HIP-3 perps as the reference price. Yields: ${y?.source || "—"}.`) : null,
    el("p", { class: "disclaimer small" }, DISCLAIMER));
  const c = root.querySelector("#mk-chart");
  if (c && state.chart?.data) requestAnimationFrame(() => { state.chart.redraw = candleChart(c, state.chart.data.bars, { tf: state.chart.tf }); });
}

// ---------------------------------------------------------------- talent
export function renderTalent(root, ctx) {
  const { state } = ctx, d = state.desk, t = state.talent;
  const full = d.staff.length >= d.desks, poor = d.credits < d.payroll.weeklyTotal;
  const notices = [];
  if (full) notices.push(el("p", { class: "notice" }, `All ${d.desks} desks are taken. Let someone go or level up for another desk${d.nextLevelAt ? ` (next level at ${fmtPts(d.nextLevelAt)} points)` : ""}.`));
  if (poor) notices.push(el("p", { class: "notice bad" }, `Payday is ${fmtCredits(d.payroll.weeklyTotal)} credits but you have ${fmtCredits(d.credits)}. Analysts you can't pay will quit.`));
  const missing = ["CHART", "FLOW", "RISK"].filter((r) => !d.staff.some((s) => s.role === r));
  const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} or ${xs.at(-1)}` : xs[0]);
  if (missing.length) notices.push(el("p", { class: "notice soft" }, `Without a ${list(missing.map((r) => ctx.roleTitle(r)))}, ${missing.includes("CHART") ? "your CEO reads the chart alone at 1★" : "your desk misses that read"}${missing.includes("RISK") ? "; only the basic desk rules guard against bad trades" : ""}.`));
  fill(root,
    head("Weekly pool", "Talent", el("span", { class: "chip" }, `Desks ${d.staff.length}/${d.desks}`), el("span", { class: "chip", style: "--c:var(--gold)" }, el("i"), `${fmtCredits(d.credits)} credits`)),
    ...notices,
    section("Your desk", `${fmtCredits(d.payroll.weeklyTotal)} credits/week · payday in ${fmtCountdown(Date.parse(d.payroll.nextDueAt) - Date.now())}`,
      el("div", { class: "staff-grid" },
        d.staff.map((s) => el("button", { type: "button", class: "staff-card", onclick: () => ctx.openAnalyst(s.id) },
          ctx.portrait(s.id) || el("span", { class: "ph" }),
          el("div", { style: "min-width:0" }, el("div", { style: "font-weight:600" }, s.name), el("div", { class: "muted small" }, s.title), stars(s.skill)))),
        Array.from({ length: Math.max(0, d.desks - d.staff.length) }, () => el("div", { class: "staff-card empty" }, "Empty desk")))),
    section("Candidates", t ? `${t.week} · new pool in ${fmtCountdown(Date.parse(t.refreshesAt) - Date.now())}` : "",
      !t ? el("p", { class: "muted" }, "Loading candidates…") : !t.candidates.length ? el("p", { class: "empty-dash" }, "You've hired everyone in this week's pool. A new pool arrives Monday.")
        : el("div", { class: "talent-grid" }, t.candidates.map((c) => {
          const why = full ? "Desks full" : d.credits < c.hireCost ? "Not enough credits" : null;
          return el("article", { class: "cand", style: `--c:${c.color}` },
            el("div", { class: "cand-top" }, ctx.portraitFor(c.candidateKey) || el("span", { class: "ph" }),
              el("div", { style: "min-width:0" }, el("div", { class: "name" }, c.name), roleChip(c.role, c.title), stars(c.skill))),
            el("div", { class: "style" }, `“${c.style}”`),
            el("div", { class: "reads small" }, c.reads),
            el("div", { class: "money" }, el("span", {}, "Hire ", el("b", {}, fmtCredits(c.hireCost))), el("span", {}, el("b", {}, fmtCredits(c.weeklySalary)), " / week")),
            el("button", { type: "button", class: "btn primary", disabled: why || null, title: why || `Hire ${c.name}`, onclick: (e) => ctx.hire(c, e.currentTarget) }, why || "Hire"));
        }))));
}

// ---------------------------------------------------------------- leaderboards
export function renderLeaders(root, ctx) {
  const { state } = ctx, kind = state.lbKind || "weekly", data = state.leaderboards?.[kind];
  const mine = state.desk?.standings?.[kind === "weekly" ? "weekly" : kind === "rwa" ? "rwa" : "allTime"];
  const band = (e) => (e.avgRLow == null || e.avgRHigh == null || e.settled < 2 ? "" : ` (${fmtR(e.avgRLow)} to ${fmtR(e.avgRHigh)})`);
  const table = (entries) => el("table", { class: "lb records" },
    el("thead", {}, el("tr", {}, el("th", {}, "Desk"), el("th", { class: "num" }, "Settled"), el("th", { class: "num" }, "Avg paper R"), el("th", { class: "num hide-sm" }, "Hit rate"), el("th", { class: "num hide-sm" }, "Brier"), el("th", { class: "num hide-sm" }, "Max drawdown"))),
    el("tbody", {}, entries.map((e) => el("tr", { class: e.me ? "me" : null },
      el("td", {}, el("div", { class: "ag" }, e.deskName, e.me ? " (you)" : ""), el("div", { class: "ceo" }, `CEO ${e.ceo?.name || "?"}`, clan(e.ceo?.clan))),
      el("td", { class: "num" }, `${e.settled}`, e.abstentions ? el("div", { class: "muted small" }, `${e.abstentions} no-trade`) : null),
      el("td", { class: "num" }, fmtR(e.avgR), el("div", { class: "muted small" }, band(e))),
      el("td", { class: "num hide-sm" }, e.hitRate == null ? "—" : `${Math.round(e.hitRate * 100)}%`),
      el("td", { class: "num hide-sm" }, e.brier == null ? "—" : e.brier.toFixed(3)),
      el("td", { class: "num hide-sm" }, e.maxDrawdown == null ? "—" : `${(e.maxDrawdown * 100).toFixed(1)}%`)))));
  fill(root,
    head(kind === "weekly" ? state.desk?.week || "This week" : kind === "rwa" ? "Real-world assets" : "Since launch", "Desk records",
      tabs([["weekly", "This week"], ["all-time", "All time"], ["rwa", "RWA"]], kind, (k) => ctx.loadLeaders(k), "Desk records")),
    el("div", { class: "stats" },
      stat("Your settled calls", mine ? String(mine.settled) : "0", "var(--accent)"),
      stat("Your avg paper R", mine ? fmtR(mine.avgR) : "—", "var(--gold)", mine && mine.avgRLow != null && mine.settled > 1 ? `${fmtR(mine.avgRLow)} to ${fmtR(mine.avgRHigh)}` : null),
      stat("Your Brier", mine?.brier == null ? "—" : mine.brier.toFixed(3), "#a5f3fc", "calibration: lower is better")),
    el("p", { class: "muted small" }, "Records, not a ranking. Each number stands on its own: average paper R with its 95% range, calibration (Brier), drawdown and how many calls settled, no-trades included. Desks choose different assets and times, so these are not a skill ranking. Simulated paper performance, not executable profit."),
    section("Desks", data ? "most settled calls first" : "",
      !data ? el("p", { class: "muted" }, "Loading…") : !data.records?.length ? el("p", { class: "empty-dash" }, "No desk has a settled call yet.") : table(data.records)));
}

// ---------------------------------------------------------------- verify
export function renderVerify(root, ctx) {
  const { state } = ctx, v = state.verifyResult;
  const input = el("input", { id: "verify-id", placeholder: "sig_…", value: state.verifyId || "", "aria-label": "Signal id", autocomplete: "off" });
  const form = el("form", { class: "row verify-form", onsubmit: (e) => { e.preventDefault(); ctx.verify(input.value.trim()); } }, input, el("button", { class: "btn primary", type: "submit" }, "Verify"));
  const check = (ok, label, detail) => el("li", { class: ok === true ? "ok" : ok === false ? "bad" : "na" }, el("span", { class: "mark" }, ok === true ? "✓" : ok === false ? "✗" : "–"), el("div", {}, el("b", {}, label), detail ? el("div", { class: "muted small" }, detail) : null));
  const recent = (state.signals || []).filter((s) => s.leafHash).slice(0, 8);
  fill(root,
    head("Proof", "Verify a call"),
    el("p", { class: "muted small" }, "Every locked call is a leaf in a Merkle tree whose root goes on 0G Chain. Check any call here, or with the steps below and no trust in Kult."),
    form,
    recent.length && !v ? section("Your recent calls", "", el("div", { class: "chips" }, recent.map((s) => el("button", { type: "button", class: "chip btnish", onclick: () => ctx.verify(s.id) }, `${s.asset.symbol} ${DIR_LABEL[s.direction] || ""} · ${s.id.slice(-8)}`)))) : null,
    !v ? null : v.error ? el("p", { class: "notice bad" }, v.error) : [
      el("div", { class: "card" },
        el("h3", {}, `${v.signal.asset.symbol} · ${v.signal.kind === "no-trade" ? "no trade" : DIR_LABEL[v.signal.direction]} ${v.signal.horizon}`, el("small", {}, v.desk ? `${v.desk.name} · CEO ${v.desk.ceoName}` : "")),
        el("ul", { class: "checks" },
          check(v.leafMatches, "The call is unchanged", el("span", {}, "keccak256 of its canonical JSON = ", el("code", {}, shortHash(v.recomputedLeaf)))),
          check(v.batch ? v.proofValid : null, v.batch ? `It is in batch #${v.batch.id}` : "Waiting for its batch", v.batch ? el("span", {}, "Merkle proof folds into root ", el("code", {}, shortHash(v.batch.root))) : "Batches run every minute"),
          onChainCheck(v, check),
          check(v.anchoredBeforeEntry, "Committed before its entry price", v.anchoredBeforeEntry == null
            ? (v.environment === "LOCAL" ? "Not anchored in this environment" : "Unverified until 0G Chain confirms the time")
            : `on 0G at ${new Date(v.batch.anchoredAt).toLocaleTimeString()} · entry from ${new Date(v.signal.entryFrom).toLocaleTimeString()}`),
          check(v.chainValid ?? null, "Chained to the desk's other calls", el("span", {}, v.chain.prev ? el("a", { href: "#", onclick: (e) => { e.preventDefault(); ctx.verify(v.chain.prev.id); } }, "‹ previous") : "the desk's first call", " · ", v.chain.next ? el("a", { href: "#", onclick: (e) => { e.preventDefault(); ctx.verify(v.chain.next.id); } }, "next ›") : "latest call"))),
        el("div", { class: "actions" },
          el("a", { class: "btn", href: `/proof/${encodeURIComponent(v.signal.id)}`, target: "_blank", rel: "noopener" }, "Public proof page ↗"),
          el("button", { type: "button", class: "btn ghost", onclick: async (e) => { try { await navigator.clipboard.writeText(`${location.origin}/proof/${encodeURIComponent(v.signal.id)}`); e.currentTarget.textContent = "Link copied"; } catch { /* no clipboard */ } } }, "Copy proof link"),
          el("button", { type: "button", class: "btn ghost", onclick: () => ctx.shareCall(v.signal) }, "Share call"))),
      v.signal.status === "VOID" ? el("div", { class: "card" }, el("h3", {}, "Void", el("small", {}, "no paper result")), el("p", {}, v.signal.voidReason || "Void"), el("p", { class: "muted small" }, "A void is logged in the desk's history. It has no P&L and does not count as a win or a loss.")) : null,
      v.policy ? el("div", { class: "card" }, el("h3", {}, "Rules it was locked with", el("small", {}, v.policy.version)),
        el("ul", { class: "rules" },
          el("li", {}, el("b", {}, "Price source: "), v.policy.priceSource, " (never another feed after lock)"),
          el("li", {}, el("b", {}, "Entry: "), v.policy.entry),
          el("li", {}, el("b", {}, "Exit: "), v.policy.exit, v.policy.sameBar === "stop" ? ". Target and stop in the same bar: the stop." : ""),
          el("li", {}, el("b", {}, "Costs: "), `${v.policy.costBps} bps, ${v.policy.costs.replace(/^costBps of the price, /, "")}`),
          el("li", {}, el("b", {}, "Void when: "), v.policy.voids.join("; "))),
        el("p", { class: "muted small" }, v.label || "Simulated paper performance, not executable profit.")) : null,
      v.signal.status === "SETTLED" ? el("div", { class: "card" }, el("h3", {}, "Settlement", el("small", {}, fmtR(v.signal.r))),
        settlementLines(v),
        el("p", { class: "muted small" }, "Simulated paper performance, not executable profit."),
        el("details", {}, el("summary", {}, "The full record, with every price it used"), el("pre", { class: "json" }, JSON.stringify(v.settlement, null, 2)))) : null,
      el("details", { class: "card" }, el("summary", {}, "The committed call (payload)"), el("pre", { class: "json" }, JSON.stringify(v.payload, null, 2))),
      v.proof ? el("details", { class: "card" }, el("summary", {}, "Merkle proof"), el("pre", { class: "json" }, JSON.stringify(v.proof, null, 2))) : null,
      el("div", { class: "card" }, el("h3", {}, "Check it yourself"), el("ol", { class: "how" }, v.howTo.map((h) => el("li", {}, h))))
    ]);
}

// ---------------------------------------------------------------- desk
export function renderDesk(root, ctx) {
  const { state } = ctx, d = state.desk, ledger = state.ledger, st = d.stats?.all;
  const prevAt = [0, 50, 150, 300, 500][d.level - 1] ?? 0;
  const pct = d.nextLevelAt ? Math.round(((d.points - prevAt) / (d.nextLevelAt - prevAt)) * 100) : 100;
  const m = state.mandateDraft ??= JSON.parse(JSON.stringify(d.mandate));
  const classes = [["crypto", "Crypto majors"], ["meme", "Memecoins (high risk)"], ["rwa-equity", "Tokenized stocks"], ["rwa-etf", "Tokenized index"], ["rwa-commodity", "Tokenized gold"], ["rwa-treasury", "T-bills (rotation leg)"]];
  const toggle = (arr, k) => (arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]);
  const rerender = () => renderDesk(root, ctx);
  const picker = el("select", { "aria-label": "Change CEO" }, (state.me?.agents || []).map((x) => el("option", { value: x.id, selected: x.id === d.ceo.agentId || null }, `${x.name} · ${x.clan || ""} · ${String(x.archetype || "").toLowerCase()}`)));
  fill(root,
    head("Desk", d.name),
    el("div", { class: "stats" },
      stat("Paper bankroll", fmtUsd(d.paperBalance), "var(--accent)", `from ${fmtUsd(d.startingBankroll)}`),
      stat("Credits", fmtCredits(d.credits), "var(--gold)"),
      stat("Points", fmtPts(Math.round(d.points * 10) / 10), "#a5f3fc"),
      stat("Settled", st ? String(st.settled) : "0", "#b58cff", st ? `${st.noTrades} no-trade` : null),
      stat("Hit rate", st?.hitRate != null ? `${Math.round(st.hitRate * 100)}%` : "—", "#34d399", st?.hitRate != null ? `95%: ${Math.round(st.hitLow * 100)}–${Math.round(st.hitHigh * 100)}%` : null),
      stat("Average R", st ? fmtR(st.avgR) : "—", "#ffe08a", st?.settled > 1 ? `95%: ${fmtR(st.avgRLow)} to ${fmtR(st.avgRHigh)}` : null),
      stat("Max drawdown", st ? fmtPct(st.maxDrawdown, 1, false) : "—", "#ff6b7d"),
      stat("Calibration (Brier)", st?.brier != null ? st.brier.toFixed(3) : "—", "#8fb6ff", "lower is better; 0.25 = a coin flip")),
    section("Next level", d.nextLevelAt ? `${fmtPts(d.points)} / ${fmtPts(d.nextLevelAt)} points · +1 desk` : "Top level: all 7 desks",
      el("div", { class: "bar", style: "height:12px" }, el("i", { style: `--c:var(--accent);width:${Math.max(0, Math.min(100, pct))}%` }))),
    section("Auto-desk", d.autoMode ? "on" : "off",
      el("div", { class: "auto-row" }, el("p", { class: "muted small", style: "margin:0" }, `Your CEO scans and locks calls on its own every ${["BERSERKER", "ASSASSIN"].includes(d.ceo.archetype) ? 2 : 4} hours, inside the mandate. It only commits trades, never no-trades.`),
        el("button", { type: "button", class: `btn ${d.autoMode ? "" : "primary"}`, onclick: (e) => ctx.setAuto(!d.autoMode, e.currentTarget) }, d.autoMode ? "Turn off" : "Turn on"))),
    section("Mandate", "applies to new calls",
      el("div", { class: "mandate" },
        el("div", { class: "ed-row" }, el("div", { class: "lab" }, "Universe"), el("div", { class: "chips" }, classes.map(([k, label]) => el("button", { type: "button", class: "chip btnish", "aria-pressed": m.classes.includes(k) ? "true" : "false", onclick: () => { m.classes = toggle(m.classes, k); rerender(); } }, label)))),
        el("div", { class: "ed-row" }, el("div", { class: "lab" }, "Horizons"), el("div", { class: "chips" }, ["4h", "24h", "7d"].map((h) => el("button", { type: "button", class: "chip btnish", "aria-pressed": m.horizons.includes(h) ? "true" : "false", onclick: () => { m.horizons = ["4h", "24h", "7d"].filter((x) => (x === h ? !m.horizons.includes(h) : m.horizons.includes(x))); rerender(); } }, HORIZON_LABEL[h])))),
        el("div", { class: "ed-row two" },
          el("label", { class: "num-ed" }, el("span", {}, "Max risk per call"), el("input", { type: "number", min: "0.25", max: "5", step: "0.25", value: m.maxRiskPct, oninput: (e) => { m.maxRiskPct = Number(e.target.value); } }), el("span", { class: "muted" }, "%")),
          el("label", { class: "num-ed" }, el("span", {}, "Max open calls"), el("input", { type: "number", min: "1", max: "10", step: "1", value: m.maxOpenSignals, oninput: (e) => { m.maxOpenSignals = Number(e.target.value); } }))),
        el("label", { class: "check" }, el("input", { type: "checkbox", checked: m.allowShort || null, onchange: (e) => { m.allowShort = e.target.checked; } }), " Allow short calls"),
        el("div", { class: "actions" }, el("button", { type: "button", class: "btn primary", onclick: (e) => ctx.saveMandate(m, e.currentTarget) }, "Save mandate")))),
    section("CEO", "your AI Arena agent",
      el("div", { class: "ceo-card" }, el("span", { class: "crown", "aria-hidden": "true" }, "♛"),
        el("div", { style: "min-width:0;flex:1" }, el("b", {}, d.ceo.name), clan(d.ceo.clan), el("div", { class: "muted small" }, `${String(d.ceo.archetype).toLowerCase()} · ${d.ceo.style} · trades when the desk's view clears ${d.ceo.threshold}`)),
        state.me?.agents?.length > 1 ? el("div", { class: "row" }, picker, el("button", { type: "button", class: "btn small", onclick: (e) => ctx.changeCeo(picker.value, e.currentTarget) }, "Make CEO")) : null)),
    section("Ledger", "last 100 entries",
      !ledger ? el("p", { class: "muted" }, "Loading…") : !ledger.entries.length ? el("p", { class: "empty-dash" }, "No credit activity yet.")
        : el("table", { class: "ledger" },
          el("thead", {}, el("tr", {}, el("th", {}, "When"), el("th", {}, "What"), el("th", { class: "amt" }, "Credits"), el("th", { class: "amt" }, "Balance"))),
          el("tbody", {}, ledger.entries.map((e) => el("tr", {},
            el("td", { class: "muted" }, fmtAgo(e.createdAt)),
            el("td", {}, { grant: "Opening grant", hire: "Hired an analyst", salary: "Weekly salaries", winnings: "Winning call" }[e.kind] || e.kind),
            el("td", { class: `amt ${e.delta < 0 ? "neg" : "pos"}` }, `${e.delta > 0 ? "+" : ""}${fmtCredits(e.delta)}`),
            el("td", { class: "amt" }, fmtCredits(e.balanceAfter))))))),
    el("p", { class: "disclaimer small" }, DISCLAIMER),
    el("div", { class: "actions" }, el("button", { type: "button", class: "btn ghost sign-out" }, "Sign out")));
  root.querySelector(".sign-out").addEventListener("click", ctx.signOut);
}

// ---------------------------------------------------------------- analyst card
export function renderAnalyst(root, a, ctx) {
  const pct = a.xpToNext ? Math.round((a.xp / a.xpToNext) * 100) : 100;
  fill(root,
    el("div", { class: "analyst-head" }, ctx.portrait(a.id) || el("span", { class: "ph" }),
      el("div", {}, el("h2", { class: "display", style: "margin:0 0 6px" }, a.name), roleChip(a.role, a.title), el("div", { style: "margin-top:6px" }, stars(a.skill)))),
    el("p", { class: "muted", style: "font-style:italic" }, `“${a.style}”`),
    el("dl", { class: "facts" },
      el("dt", {}, "Reads"), el("dd", {}, a.reads),
      el("dt", {}, "Salary"), el("dd", {}, `${fmtCredits(a.weeklySalary)} credits / week`),
      el("dt", {}, "Hired"), el("dd", {}, fmtAgo(a.hiredAt))),
    el("div", { class: "xp" }, el("div", { class: "muted small" }, a.xpToNext ? `XP ${a.xp} / ${a.xpToNext} to ${a.skill + 1} stars` : "Top skill: 5 stars"),
      el("div", { class: "bar" }, el("i", { style: `--c:var(--accent);width:${pct}%` }))),
    el("p", { class: "muted small" }, "Analysts earn XP when they back a call that wins; gatekeepers (risk, execution, yield) earn a little on every settled call. Higher skill weighs their read more."),
    el("div", { class: "actions" },
      el("button", { type: "button", class: "btn danger", onclick: (e) => ctx.fire(a, e.currentTarget) }, "Let go"),
      el("button", { type: "button", class: "btn primary", onclick: () => ctx.closeSheet("analyst-sheet") }, "Back to work")));
}

// ---------------------------------------------------------------- verify helpers
/** The on-chain check: green only when 0G Chain was read and holds the same root. */
function onChainCheck(v, check) {
  if (v.environment === "LOCAL") return check(null, "Not anchored: local or demo environment", "Nothing outside Kult vouches for this call, so it is never shown as anchored.");
  if (v.batch?.status !== "ANCHORED") return check(null, v.batch ? "Not on 0G Chain yet" : "Waiting for its batch", v.batch ? "Its batch is waiting for its anchor." : "Batches run every minute");
  const link = el("a", { href: v.batch.explorer, target: "_blank", rel: "noopener" }, `tx ${shortHash(v.batch.txHash)} ↗`);
  if (v.onChainMatches === true) return check(true, "The root is on 0G Chain", link);
  if (v.onChainMatches === false) return check(false, "The root on 0G Chain does not match", el("span", {}, v.chainRead === "missing" ? "SignalAnchor holds no root for this batch. " : "SignalAnchor holds a different root. ", link));
  return check(null, "Unverified: 0G Chain could not be read just now", el("span", {}, "Try again, or check it yourself: ", link));
}

function settlementLines(v) {
  const st = v.settlement || {}, en = st.entry || {}, ex = st.exit || {}, sig = v.signal;
  const when = (t) => (t ? new Date(t).toLocaleString() : "?");
  return el("ul", { class: "rules" },
    en.price != null ? el("li", {}, el("b", {}, "Entry: "), `${fmtPrice(en.price)}, the average of ${en.bars ?? "?"} one-minute closes from ${String(en.source || "").split(":")[0] || "?"}, ${when(en.window?.[0])} to ${when(en.window?.[1])}`) : null,
    ex.reason ? el("li", {}, el("b", {}, "Exit: "), `${ex.reason === "target" ? "target touched" : ex.reason === "stop" ? "stop touched" : "the horizon's last close"} at ${fmtPrice(sig.exitPrice)}, ${when(ex.at)}, ${String(ex.source || "").split(":")[0] || "?"} five-minute bars (${ex.observations?.rows?.length ?? "?"} kept)`) : null,
    ex.costBps != null ? el("li", {}, el("b", {}, "Costs: "), `${ex.costBps} bps on entry and on exit`) : null,
    el("li", {}, el("b", {}, "Result: "), `${fmtPctPoints(sig.resultPct)} on the paper position, ${fmtR(sig.r)} (R = result ÷ the stop distance)`),
    ex.crossCheck ? el("li", {}, el("b", {}, "Cross-check: "), `${String(ex.crossCheck.source).split(":")[0]} closed ${fmtPrice(ex.crossCheck.close)} on the exit bar (${ex.crossCheck.divergencePct.toFixed(2)}% apart)`) : null);
}
