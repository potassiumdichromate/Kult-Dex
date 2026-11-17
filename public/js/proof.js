// Kult Dex public proof page: /proof/<signal id>. No sign-in.
//
// The service's answer is only the starting point. This page recomputes the
// call's hash, folds its Merkle proof and reads SignalAnchor on 0G Chain
// itself, from the browser. A check it cannot back with evidence says
// "unverified", never a green tick.

const app = document.getElementById("app");
const E = window.ethers;
const PAPER = "Simulated paper performance, not executable profit.";

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) k === "class" ? (n.className = v) : n.setAttribute(k, v);
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
};
const when = (t) => (t ? new Date(t).toLocaleString() : "—");
const price = (n) => (n == null ? "—" : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: Number(n) < 10 ? 4 : 2 })}`);
const short = (h) => (h ? `${String(h).slice(0, 10)}…${String(h).slice(-6)}` : "—");
const check = (ok, title, why) => el("li", { class: ok === true ? "ok" : ok === false ? "bad" : "na" }, el("span", { class: "mark" }, ok === true ? "✓" : ok === false ? "✗" : "?"), el("div", {}, el("b", {}, title), why ? el("div", { class: "why" }, why) : null));

/** Canonical JSON, exactly as Kult Dex commits it: keys sorted, no whitespace, undefined dropped. */
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : canonicalJson(v))).join(",")}]`;
  return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
}
const hashPair = (a, b) => { const [x, y] = BigInt(a) < BigInt(b) ? [a, b] : [b, a]; return E.keccak256(E.concat([E.getBytes(x), E.getBytes(y)])); };
const fold = (leaf, proof) => proof.reduce((h, p) => hashPair(h, p), leaf);

const id = decodeURIComponent(location.pathname.split("/proof/")[1] || new URLSearchParams(location.search).get("id") || "").trim();

async function main() {
  if (!id) return app.replaceChildren(el("p", {}, "No call id in this link."));
  let cfg = {};
  try { cfg = await fetch("/config.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})); } catch { /* defaults */ }
  const res = await fetch(`${cfg.apiUrl || "/api"}/v1/dex/verify/${encodeURIComponent(id)}`);
  const v = await res.json().catch(() => ({}));
  if (res.status === 410) return app.replaceChildren(el("div", { class: "card" }, el("h1", {}, "This proof was withdrawn"), el("p", { class: "note" }, "The owner withdrew this public page. Copies already shared cannot be recalled, and the commitment already on 0G Chain cannot be erased.")));
  if (!res.ok) return app.replaceChildren(el("div", { class: "card" }, el("h1", {}, "No such call"), el("p", { class: "note" }, v.error || `The proof service answered ${res.status}.`)));

  const s = v.signal, p = v.payload || {}, pol = v.policy;
  const dirWord = s.kind === "no-trade" ? "No trade (abstain)" : s.kind === "rotation" ? `Rotate out of ${s.asset.symbol} into T-bills` : `${String(s.direction).toUpperCase()} ${s.asset.symbol}`;

  // ---------------------------------------------------------------- independent checks
  const checks = el("ul", { class: "checks" }, el("li", {}, el("span", { class: "why" }, "Checking in your browser…")));
  const runChecks = async () => {
    const out = [];
    const leaf = E.keccak256(E.toUtf8Bytes(canonicalJson(p)));
    out.push(check(leaf === v.leafHash, "The committed call is unchanged", `keccak256 of its canonical JSON, computed here: ${short(leaf)}`));
    if (v.batch && v.proof) {
      const root = fold(v.leafHash, v.proof);
      out.push(check(root.toLowerCase() === String(v.batch.root).toLowerCase(), `It is in batch #${v.batch.id}`, `Merkle proof folded here into ${short(root)}`));
    } else out.push(check(null, "Not in a batch yet", "Batches run every minute."));

    let chainTime = null;
    if (v.environment === "LOCAL") out.push(check(null, "Not anchored: local or demo environment", "Nothing outside Kult vouches for this call."));
    else if (v.batch?.status !== "ANCHORED" || !v.anchor?.contract) out.push(check(null, "Not on 0G Chain yet", "The batch is waiting for its anchor."));
    else {
      try {
        const provider = new E.JsonRpcProvider(v.anchor.rpc || "https://evmrpc.0g.ai", v.anchor.chainId || 16661, { staticNetwork: true });
        const c = new E.Contract(v.anchor.contract, ["function roots(uint64 batchId) view returns (bytes32 root, uint64 anchoredAt)"], provider);
        const [root, at] = await Promise.race([c.roots(v.batch.id), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10_000))]);
        const same = String(root).toLowerCase() === String(v.batch.root).toLowerCase();
        chainTime = same ? Number(at) * 1000 : null;
        out.push(check(same, same ? "The root is on 0G Chain" : "The root on 0G Chain does not match",
          el("span", {}, `read from SignalAnchor ${short(v.anchor.contract)} on chain ${v.anchor.chainId || 16661} at ${when(Number(at) * 1000)} · `, el("a", { href: v.batch.explorer, target: "_blank", rel: "noopener" }, "transaction ↗"))));
      } catch (e) { out.push(check(null, "Unverified: 0G Chain could not be read from this browser", el("span", {}, `${e.message} · `, el("a", { href: v.batch.explorer, target: "_blank", rel: "noopener" }, "check the transaction ↗")))); }
    }
    out.push(check(chainTime && s.entryFrom ? chainTime <= Date.parse(s.entryFrom) : null, "Committed before its entry window",
      chainTime ? `on 0G ${when(chainTime)} · entry window from ${when(s.entryFrom)}` : "Unverified until 0G Chain confirms the time"));
    out.push(check(v.chainValid ?? null, "Chained to the desk's other calls", p.prevHash ? `names the previous call ${short(p.prevHash)}` : "the desk's first call"));
    checks.replaceChildren(...out);
  };

  // ---------------------------------------------------------------- the page
  const reads = (p.reads || []).filter((r) => ["CHART", "FLOW", "RISK", "MARKET"].includes(r.analyst) || r.name);
  const st = v.settlement || {}, en = st.entry || {}, ex = st.exit || {};
  app.replaceChildren(...[
    el("header", {}, el("img", { src: "/art/kult-logo.svg", alt: "" }), el("div", {}, el("b", {}, "Kult Dex proof"), el("div", { class: "sub" }, v.desk ? `${v.desk.name} · CEO ${v.desk.ceoName}` : ""))),
    el("div", { class: "card" },
      el("h1", {}, `${dirWord} · ${s.horizon}`),
      el("div", { class: "sub" }, `Call ${s.id} · ${s.status === "SETTLED" ? `settled ${s.r >= 0 ? "+" : ""}${Number(s.r).toFixed(2)}R` : s.status === "VOID" ? "void" : s.status.toLowerCase()}`),
      el("span", { class: "label" }, PAPER)),
    el("section", { class: "card" }, el("h2", {}, "Checked in your browser"), checks),
    el("section", { class: "card" }, el("h2", {}, "The decision"),
      el("dl", {},
        el("dt", {}, "Locked"), el("dd", {}, when(s.lockedAt)),
        el("dt", {}, "Entry window"), el("dd", {}, `${when(s.entryFrom)} → ${when(s.entryTo)}`),
        el("dt", {}, "Horizon ends"), el("dd", {}, when(s.endsAt)),
        s.kind === "directional" ? [el("dt", {}, "Target / stop"), el("dd", {}, `${(s.targetPct * 100).toFixed(2)}% / ${(s.stopPct * 100).toFixed(2)}%`)] : null,
        el("dt", {}, "Confidence"), el("dd", {}, p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "—"),
        el("dt", {}, "Rationale"), el("dd", {}, p.rationale || "—")),
      reads.length ? el("div", { class: "reads", style: "margin-top:12px" }, reads.map((r) => el("p", {}, el("b", {}, `${r.name || r.analyst} (${r.analyst.toLowerCase()}): `), r.text))) : null),
    pol ? el("section", { class: "card" }, el("h2", {}, `Rules locked with the call · ${pol.version}`),
      el("dl", {},
        el("dt", {}, "Price source"), el("dd", {}, `${pol.priceSource} (never another feed after lock)`),
        el("dt", {}, "Entry"), el("dd", {}, pol.entry),
        el("dt", {}, "Exit"), el("dd", {}, `${pol.exit}. Target and stop in one bar: the stop.`),
        el("dt", {}, "Costs"), el("dd", {}, `${pol.costBps} bps on entry and on exit`),
        el("dt", {}, "Void when"), el("dd", {}, pol.voids.join("; ")))) : el("section", { class: "card" }, el("h2", {}, "Rules"), el("p", { class: "note" }, "This call was locked before rules were committed with each call (v1); it was settled by the rules then in force.")),
    s.status === "VOID" ? el("section", { class: "card" }, el("h2", {}, "Void"), el("p", {}, s.voidReason || "Void"), el("p", { class: "note" }, "A void has no P&L. It stays in the desk's history.")) : null,
    s.status === "SETTLED" ? el("section", { class: "card" }, el("h2", {}, "How it was settled"),
      el("dl", {},
        el("dt", {}, "Entry"), el("dd", {}, en.price != null ? `${price(en.price)}: average of ${en.bars} one-minute closes, ${String(en.source || "").split(":")[0]}` : "—"),
        el("dt", {}, "Exit"), el("dd", {}, `${price(s.exitPrice)}: ${ex.reason === "target" ? "target touched" : ex.reason === "stop" ? "stop touched" : "last close in the horizon"}, ${when(ex.at)}`),
        el("dt", {}, "Costs"), el("dd", {}, ex.costBps != null ? `${ex.costBps} bps each way` : "—"),
        el("dt", {}, "Result"), el("dd", {}, `${s.resultPct >= 0 ? "+" : ""}${Number(s.resultPct).toFixed(2)}% · ${Number(s.r).toFixed(2)}R`),
        el("dt", {}, "Prices kept"), el("dd", {}, `${en.observations?.rows?.length ?? 0} entry bars, ${ex.observations?.rows?.length ?? 0} settlement bars (in the record below)`)),
      el("p", { class: "note" }, PAPER)) : null,
    el("details", { class: "card" }, el("summary", {}, "The committed call (payload)"), el("pre", {}, JSON.stringify(p, null, 2))),
    st.entry ? el("details", { class: "card" }, el("summary", {}, "The settlement record, with every price used"), el("pre", {}, JSON.stringify(st, null, 2))) : null,
    v.proof ? el("details", { class: "card" }, el("summary", {}, "Merkle proof"), el("pre", {}, JSON.stringify({ leaf: v.leafHash, proof: v.proof, root: v.batch?.root }, null, 2))) : null,
    el("p", { class: "note" }, "This page proves what this desk committed for this call, and when. The owner chose to share it; it says nothing about whether the desk's other calls exist or were all shared.")].filter(Boolean));
  if (!E) checks.replaceChildren(check(null, "Unverified: the checking library did not load", "Reload the page."));
  else runChecks().catch((e) => checks.replaceChildren(check(null, "Unverified", e.message)));
}
main().catch((e) => app.replaceChildren(el("p", {}, e.message)));
