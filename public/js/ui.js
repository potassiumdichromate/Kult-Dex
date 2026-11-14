// Small DOM and formatting helpers shared by the Kult Dex screens.

export const $ = (id) => document.getElementById(id);

export function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style") node.style.cssText = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid !== null && kid !== undefined && kid !== false) node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return node;
}

export const show = (id, on = true) => { const n = typeof id === "string" ? $(id) : id; if (n) n.hidden = !on; };

let toastTimer = null;
export function toast(message, bad = false, correlationId = null) {
  const t = $("toast");
  t.replaceChildren(...[el("span", {}, message), correlationId ? el("span", { class: "muted small" }, ` (ref ${String(correlationId).slice(0, 8)})`) : null].filter(Boolean));
  t.className = bad ? "bad" : "";
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, bad ? 6000 : 3500);
}
export const toastError = (e) => toast(e?.message || "Something went wrong", true, e?.correlationId);

export function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || "Working…"; btn.disabled = true; }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
}

// ---------------------------------------------------------------- numbers & time
export const fmtPts = (p) => { const n = Number(p || 0); return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }); };
export const fmtCredits = (c) => Number(c || 0).toLocaleString();
export function fmtCountdown(ms) {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${s % 60}s`;
}
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export function fmtDay(iso) {
  const d = new Date(iso), today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - today) / 864e5);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}
export const fmtAgo = (iso) => {
  const s = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 1000));
  return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`;
};

export function stars(n) {
  const k = Math.max(0, Math.min(5, Number(n) || 0));
  return el("span", { class: "stars", title: `${k} of 5 stars`, "aria-label": `${k} of 5 stars` }, "★".repeat(k), el("span", { class: "off" }, "★".repeat(5 - k)));
}

// ---------------------------------------------------------------- trading
export const fmtPrice = (p) => (p == null || !Number.isFinite(Number(p)) ? "—" : Number(p) >= 1000 ? Number(p).toLocaleString("en-US", { maximumFractionDigits: 2 }) : Number(p) >= 1 ? Number(p).toFixed(Number(p) >= 100 ? 2 : 3) : Number(p).toPrecision(4));
export const fmtUsd = (n) => (n == null ? "—" : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
export const fmtPct = (x, d = 2, signed = true) => (x == null ? "—" : `${signed && x > 0 ? "+" : ""}${(x * 100).toFixed(d)}%`);
export const fmtPctPoints = (x, d = 2) => (x == null ? "—" : `${x > 0 ? "+" : ""}${Number(x).toFixed(d)}%`);
export const fmtR = (r) => (r == null ? "—" : `${r > 0 ? "+" : ""}${Number(r).toFixed(2)}R`);
export const shortHash = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "—");
export const DIR_LABEL = { long: "LONG", short: "SHORT", flat: "NO TRADE", rotate: "ROTATE" };
export const STATUS_LABEL = { DRAFT: "Draft", LOCKED: "Committed", OPEN: "Open", SETTLED: "Settled", VOID: "Void" };
export const HORIZON_LABEL = { "4h": "4 hours", "24h": "24 hours", "7d": "7 days" };

// Line icons (24x24, stroked in the current colour).
export const ICONS = {
  office: '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M10 21v-5h4v5"/><path d="M9 10h.01M15 10h.01"/>',
  signals: '<path d="M4 18 9 12l4 3 7-9"/><path d="M15 6h5v5"/><path d="M4 21h16"/>',
  markets: '<path d="M6 4v16M6 8h-2v6h2M12 6v12M12 9h-2v5h2M18 3v15M18 6h-2v8h2"/>',
  talent: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a7 7 0 0 1 14 0v1"/><path d="M19 8v6M16 11h6"/>',
  leaders: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  verify: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  desk: '<rect x="3" y="5" width="18" height="11" rx="2"/><path d="M8 21h8M12 16v5"/><path d="m7 12 3-3 2 2 4-4"/>',
  emblem: '<path d="M4 17 9 11l4 3 7-8"/><path d="M15 6h5v5"/><circle cx="12" cy="12" r="10"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  stopwatch: '<circle cx="12" cy="14" r="8"/><path d="M12 14V10M10 2h4M12 2v4M19 7l1.5-1.5"/>',
  chain: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'
};
export function lineIcon(name, cls = "ico") {
  const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("class", cls); svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = ICONS[name] || ICONS.emblem;
  return svg;
}
