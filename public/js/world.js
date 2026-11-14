// The Kult Dex trading floor: a glowing 3D isometric desk (see office3d.js for
// the scene, shared with Kult Create and Kult Sports; keep the copies in sync).
// The CEO (the player's own agent model) stands on a chart rug in front of the
// big screen. Desks follow the desk level (3 to 7); each analyst sits at a desk
// whose props show their role, empty desks invite a hire, and a ticker wall
// scrolls live prices along the back wall.
import * as THREE from "three";
import { OfficeScene, M, FONT, box, canvasTex, LOOKS, hash, lightPool } from "./office3d.js";

const SLOTS = [[4.6, 8.8], [7.0, 8.8], [9.8, 8.8], [4.6, 4.8], [7.4, 4.8], [2.2, 8.8], [12.2, 8.8]];
const LAYOUT = { aisles: [1.7, 6.6, 10.4], corridorX: 13.55, ceoHome: [6.75, 1.95] };
const seatOf = (d) => [d.x - 0.75, d.y - 0.8];
const LOOK_NAMES = Object.keys(LOOKS);

export const ROLE_COLORS = { FLOW: "#34e3ff", CHART: "#ffc845", RISK: "#ff6b7d", MACRO_RWA: "#b58cff", SENTIMENT: "#7dffb2", YIELD: "#ffe08a", EXECUTION: "#8fb6ff" };
export const ROLE_SHORT = { FLOW: "FLOWS", CHART: "CHARTS", RISK: "RISK", MACRO_RWA: "MACRO", SENTIMENT: "FUNDING", YIELD: "YIELD", EXECUTION: "ROUTING" };

const THEME = {
  bg: "#020f17", slab: "#06202c", edge: "#22d3ee", accents: ["#22d3ee", "#f5c542"],
  floor: ["#1f2a33", "#232f39", "#26333d", "#1c262e"],
  wall: "#0b3346", wallDark: "#04161f", wallTop: "#22d3ee", trim: "#a5f3fc",
  sky: ["#031520", "#0a3346"], cityLights: ["#f5c542", "#fff1b8", "#22d3ee", "#a5f3fc"],
  screenLight: "#22d3ee", neon: [["KULT", "#22d3ee"], ["DEX", "#f5c542"]],
  rug: "#06222e", rugInner: "#0b3a4c", rugEdge: "#67e8f9",
  desk: "#e6f4f6", deskPanel: "#0b2a36", chair: "#123642", counter: "#0d2c38",
  key: "#ffe2b0", fill: ["#a5f3fc", "#03141c"], rim: "#67e8f9",
  confetti: ["#22d3ee", "#f5c542", "#67e8f9", "#ffffff", "#34d399", "#ffe08a"],
  models: "models/"
};

const hireTex = (hot) => canvasTex(256, 96, (g, W, H) => {
  g.fillStyle = hot ? "#22d3ee" : "rgba(2, 16, 24, 0.88)"; g.strokeStyle = "#a5f3fc"; g.lineWidth = 5;
  g.shadowColor = "#22d3ee"; g.shadowBlur = hot ? 24 : 12;
  g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 40); g.fill(); g.stroke(); g.shadowBlur = 0;
  g.font = `700 44px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = hot ? "#021018" : "#bff6ff";
  g.fillText(window.kultI18n ? window.kultI18n.t("+ HIRE") : "+ HIRE", W / 2, H / 2 + 2);
});

// A small candlestick chart, drawn deterministically from a seed (desk screens).
function candles(g, W, H, seed, up = "#34d399", down = "#ff6b7d") {
  let p = 50 + (seed % 20), x = 14;
  const n = 14, w = (W - 28) / n;
  for (let i = 0; i < n; i++) {
    const r = Math.sin(seed * 7.1 + i * 1.9) * 9 + 1.5, o = p, c = p + r;
    const hi = Math.max(o, c) + 4, lo = Math.min(o, c) - 4, y = (v) => H - 14 - ((v - 20) / 80) * (H - 28);
    g.strokeStyle = g.fillStyle = c >= o ? up : down; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + w / 2, y(hi)); g.lineTo(x + w / 2, y(lo)); g.stroke();
    g.fillRect(x + 3, y(Math.max(o, c)), w - 6, Math.max(3, Math.abs(y(o) - y(c))));
    p = c; x += w;
  }
}

export class Office extends OfficeScene {
  constructor(canvas) {
    super(canvas, THEME, LAYOUT);
    this.desks = [];
    this.deskViews = [];
    this.hoverDesk = -1;
    this.hireTex = [hireTex(false), hireTex(true)];
    this.ticker = [];
    this.addPodium(5.5, 1.3);
    this.addPlant(0.7, 11.3); this.addPlant(13.3, 0.7); this.addPlant(0.7, 4.3, 0.8);
    this.addCooler(0.6, 0.6);
    this.addCoffee(13.0, 10.8);
    this.addBull(0.55, 7.95);
    this.buildTickerWall();
  }

  // The CEO's rug: a candlestick chart woven into a dark trading pit.
  paintRug(g, W, H) {
    g.fillStyle = "#04212c"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(103, 232, 249, 0.18)"; g.lineWidth = 2;
    for (let x = 0; x < W; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.save(); g.translate(40, 30); candles(g, W - 80, H - 60, 11, "#34d399", "#ff6b7d"); g.restore();
    g.strokeStyle = "#f5c542"; g.lineWidth = 6; g.shadowColor = "#f5c542"; g.shadowBlur = 12;
    g.beginPath(); for (let i = 0; i <= 20; i++) { const x = 40 + (i / 20) * (W - 80), y = H * 0.72 - i * 9 - Math.sin(i * 0.8) * 18; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.shadowBlur = 0; g.strokeStyle = "rgba(240, 255, 255, 0.85)"; g.lineWidth = 6; g.strokeRect(20, 20, W - 40, H - 40);
  }

  // A gold bull on a plinth against the left wall.
  addBull(x, y) {
    const g = new THREE.Group(); g.position.set(x, 0, y); this.scene.add(g);
    g.add(box(0.6, 0.7, 1.1, M.std("#0b2430", { roughness: 0.4, metalness: 0.4 }), 0, 0.35, 0));
    g.add(box(0.62, 0.03, 1.12, M.glow("#f5c542", 2.2), 0, 0.71, 0));
    const gold = M.std("#f5c542", { metalness: 0.9, roughness: 0.22, emissive: "#7a5200", emissiveIntensity: 0.7 });
    const bull = new THREE.Group(); bull.position.set(0, 0.72, 0); bull.rotation.y = Math.PI / 2; g.add(bull);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), gold); body.scale.set(1.6, 1, 0.9); body.position.y = 0.36; bull.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), gold); head.position.set(0.38, 0.42, 0); head.scale.set(1.2, 0.9, 0.9); bull.add(head);
    for (const z of [-0.08, 0.08]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 8), gold); horn.position.set(0.42, 0.55, z * 1.4); horn.rotation.z = -0.6; horn.rotation.x = z > 0 ? -0.6 : 0.6; bull.add(horn);
    }
    for (const [lx, lz] of [[-0.2, -0.1], [-0.2, 0.1], [0.2, -0.1], [0.2, 0.1]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.26, 8), gold); leg.position.set(lx, 0.13, lz); bull.add(leg); }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), gold); tail.position.set(-0.38, 0.42, 0); tail.rotation.z = 1.1; bull.add(tail);
    const pool = lightPool("#f5c542", 1.4, 0.35); pool.position.set(0, 0.73, 0); g.add(pool);
    const spot = new THREE.PointLight("#ffd36b", 1.6, 3, 2); spot.position.set(0.4, 1.8, 0); g.add(spot);
  }

  // A scrolling LED ticker along the back wall, fed by setTicker().
  buildTickerWall() {
    const W = 2048, H = 96;
    this.tickerCanvas = document.createElement("canvas"); this.tickerCanvas.width = W; this.tickerCanvas.height = H;
    this.tickerTex = new THREE.CanvasTexture(this.tickerCanvas); this.tickerTex.colorSpace = THREE.SRGBColorSpace;
    this.tickerTex.wrapS = THREE.RepeatWrapping;
    const len = 12.6, h = 0.32;
    this.scene.add(box(len + 0.1, h + 0.08, 0.06, M.std("#031018", { roughness: 0.3, metalness: 0.5 }), 0.7 + len / 2, 3.02, 0.04));
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshBasicMaterial({ map: this.tickerTex, color: new THREE.Color(1.4, 1.4, 1.4) }));
    strip.position.set(0.7 + len / 2, 3.02, 0.075); this.scene.add(strip);
    // Along the left wall too.
    const side = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.8, h), new THREE.MeshBasicMaterial({ map: this.tickerTex, color: new THREE.Color(1.3, 1.3, 1.3) }));
    side.rotation.y = Math.PI / 2; side.position.set(0.075, 3.02, 1.2 + len * 0.4); this.scene.add(side);
    this.paintTicker();
    let last = 0;
    this.anims.push((t) => { this.tickerTex.offset.x = (t * 0.035) % 1; if (t - last > 5) { last = t; this.paintTicker(); } });
  }

  setTicker(rows) { this.ticker = (rows || []).filter((r) => r.price != null); this.paintTicker(); }

  paintTicker() {
    const c = this.tickerCanvas, g = c.getContext("2d"), W = c.width, H = c.height;
    g.fillStyle = "#020a10"; g.fillRect(0, 0, W, H);
    g.font = `700 54px ${FONT}`; g.textBaseline = "middle";
    const rows = this.ticker.length ? this.ticker : [{ symbol: "KULT DEX", price: null, change: null, text: "CONNECTING TO MARKETS" }];
    let x = 20;
    while (x < W) {
      for (const r of rows) {
        const up = (r.change ?? 0) >= 0;
        g.fillStyle = "#e6fbff"; g.fillText(r.symbol, x, H / 2); x += g.measureText(r.symbol).width + 16;
        const p = r.text || fmt(r.price);
        g.fillStyle = "#a5f3fc"; g.fillText(p, x, H / 2); x += g.measureText(p).width + 14;
        if (r.change != null) { const ch = `${up ? "▲" : "▼"} ${(Math.abs(r.change) * 100).toFixed(2)}%`; g.fillStyle = up ? "#34d399" : "#ff6b7d"; g.fillText(ch, x, H / 2); x += g.measureText(ch).width; }
        g.fillStyle = "#f5c542"; g.fillText("  ◆  ", x, H / 2); x += g.measureText("  ◆  ").width;
        if (x > W) break;
      }
    }
    this.tickerTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- desk
  // ceo: { name, archetype }; staff: Analyst[]; desks: number of desks.
  setDesk({ ceo, staff = [], desks = 3 }) {
    const n = Math.max(0, Math.min(7, desks));
    if (n !== this.desks.length) this.buildDesks(n);
    for (const d of this.desks) d.analystId = null;
    const used = new Set(), keep = new Set(["ceo"]);
    staff.slice(0, this.desks.length).forEach((a, i) => {
      let k = hash(a.id) % LOOK_NAMES.length;
      while (used.has(LOOK_NAMES[k]) && used.size < LOOK_NAMES.length) k = (k + 1) % LOOK_NAMES.length;
      used.add(LOOK_NAMES[k]);
      const d = this.desks[i], seat = seatOf(d), prev = this.people.get(a.id);
      d.analystId = a.id; keep.add(a.id);
      const person = { ...a, specialty: a.role };
      if (prev && prev.desk === d && prev.look === LOOK_NAMES[k]) { Object.assign(prev, person); return; }
      if (prev) this.unembody(prev);
      const p = {
        ...person, look: LOOK_NAMES[k], isCeo: false, desk: d, seat, x: seat[0], y: seat[1], path: [], walking: false, facing: 1,
        state: prev?.state || "idle", stateAt: prev?.stateAt || 0, phase: (hash(a.id) % 100) / 100 * Math.PI * 2
      };
      this.people.set(a.id, p);
      this.embody(p);
    });
    for (const [id, p] of this.people) if (!keep.has(id)) { this.unembody(p); this.people.delete(id); }
    for (const d of this.desks) this.dressDesk(d);
    const arch = String(ceo?.archetype || "hybrid").toLowerCase(), prevCeo = this.people.get("ceo");
    if (prevCeo && this.ceoArchetype === arch) { prevCeo.name = ceo?.name || "CEO"; return; }
    this.ceoArchetype = arch;
    if (prevCeo) this.unembody(prevCeo);
    const c = {
      id: "ceo", name: ceo?.name || "CEO", isCeo: true, desk: null,
      x: prevCeo?.x ?? LAYOUT.ceoHome[0], y: prevCeo?.y ?? LAYOUT.ceoHome[1], path: prevCeo?.path || [], walking: false, facing: 1,
      state: prevCeo?.state || "idle", stateAt: prevCeo?.stateAt || 0, phase: 1.3
    };
    this.people.set("ceo", c);
    this.embody(c);
  }

  buildDesks(n) {
    for (const d of this.desks) this.scene.remove(d.view.group, d.view.chair, d.props, d.hire, d.hitBox);
    this.desks = SLOTS.slice(0, n).map(([x, y], slot) => {
      const d = { slot, x, y, analystId: null };
      d.view = this.addDesk(x, y, { ledColor: "#0e3a48", seat: seatOf(d) });
      d.props = new THREE.Group(); this.scene.add(d.props);
      d.hire = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.hireTex[0], transparent: true, depthTest: false }));
      d.hire.scale.set(0.95, 0.36, 1); d.hire.renderOrder = 10; this.scene.add(d.hire);
      d.hitBox = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2), M.hidden()); d.hitBox.position.set(x - 0.2, 0.8, y - 0.4); d.hitBox.userData.desk = d; this.scene.add(d.hitBox);
      return d;
    });
    this.deskViews = this.desks.map((d) => ({ screen: d.view.screen, person: () => d.analystId && this.people.get(d.analystId) }));
  }

  dressDesk(d) {
    const p = d.analystId && this.people.get(d.analystId), color = p ? ROLE_COLORS[p.role] || "#22d3ee" : "#0e3a48";
    if (d.dressed === `${d.analystId}|${p?.role}`) return;
    d.dressed = `${d.analystId}|${p?.role}`;
    d.view.led.material = M.glow(color, p ? 2.6 : 1.2);
    d.view.glow.material.color.set(color);
    d.props.clear();
    d.hire.visible = !p;
    if (p) this.deskProp(d, p.role, color, hash(p.id));
  }

  // A second screen and a small prop for the analyst's role.
  deskProp(d, role, color, seed) {
    const g = d.props; g.position.set(d.x + 0.45, 0.77, d.y + 0.05);
    const tablet = (w, h, draw, tilt = -0.9) => {
      const t = new THREE.Group(); t.rotation.x = tilt;
      t.add(box(w + 0.03, h + 0.03, 0.02, M.std("#04121a", { roughness: 0.3 }), 0, 0, 0));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTex(256, Math.round(256 * h / w), draw), color: new THREE.Color(1.3, 1.3, 1.3) }));
      s.position.z = 0.012; t.add(s); t.position.y = h / 2 * Math.sin(-tilt) + 0.02; g.add(t);
    };
    const dark = (c, W, H) => { c.fillStyle = "#03121a"; c.fillRect(0, 0, W, H); };
    switch (role) {
      case "CHART": tablet(0.4, 0.26, (c, W, H) => { dark(c, W, H); candles(c, W, H, seed); }); break;
      case "FLOW": tablet(0.38, 0.24, (c, W, H) => { dark(c, W, H); [0.7, 0.4, 0.85, 0.3, 0.6, 0.9].forEach((v, i) => { c.fillStyle = i % 3 === 1 ? "#ff6b7d" : "#34e3ff"; c.fillRect(16 + i * 38, H - 12 - v * (H - 30), 26, v * (H - 30)); }); }); break;
      case "RISK": {
        const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 6), M.glow("#ff6b7d", 1.6)); shield.rotation.x = Math.PI / 2; shield.position.set(0, 0.16, 0); g.add(shield);
        g.add(box(0.03, 0.14, 0.03, M.metal("#3a4a52"), 0, 0.07, 0));
        tablet(0.3, 0.2, (c, W, H) => { dark(c, W, H); c.font = `700 40px ${FONT}`; c.fillStyle = "#ff6b7d"; c.fillText("VETO", 30, H / 2 + 14); }, -1.1);
        break;
      }
      case "MACRO_RWA": {
        const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), M.std("#b58cff", { flatShading: true, emissive: "#3a1f6a", emissiveIntensity: 0.8 })); globe.position.y = 0.2; g.add(globe);
        g.add(box(0.03, 0.09, 0.03, M.metal("#3a4a52"), 0, 0.05, 0), box(0.14, 0.015, 0.14, M.metal("#3a4a52"), 0, 0.008, 0));
        this.anims.push((t) => { globe.rotation.y = t * 0.6; });
        break;
      }
      case "SENTIMENT": tablet(0.34, 0.22, (c, W, H) => { dark(c, W, H); c.strokeStyle = "#7dffb2"; c.lineWidth = 10; c.beginPath(); c.arc(W / 2, H - 10, H * 0.6, Math.PI, Math.PI * 1.75); c.stroke(); c.strokeStyle = "#ff6b7d"; c.beginPath(); c.arc(W / 2, H - 10, H * 0.6, Math.PI * 1.75, Math.PI * 2); c.stroke(); c.strokeStyle = "#fff"; c.lineWidth = 5; c.beginPath(); c.moveTo(W / 2, H - 10); c.lineTo(W / 2 + 40, H - 70); c.stroke(); }); break;
      case "YIELD": {
        const gold = M.std("#f5c542", { metalness: 0.85, roughness: 0.25, emissive: "#7a5200", emissiveIntensity: 0.6 });
        for (let i = 0; i < 3; i++) g.add(box(0.2, 0.05, 0.1, gold, 0, 0.03 + i * 0.055, (i % 2) * 0.02));
        tablet(0.3, 0.2, (c, W, H) => { dark(c, W, H); c.font = `700 34px ${FONT}`; c.fillStyle = "#ffe08a"; c.fillText("T-BILL", 24, 60); c.fillStyle = "#a5f3fc"; c.fillText("APY", 24, 110); }, -1.1);
        break;
      }
      case "EXECUTION": tablet(0.36, 0.22, (c, W, H) => { dark(c, W, H); c.strokeStyle = "#8fb6ff"; c.lineWidth = 6; c.beginPath(); c.moveTo(20, H - 20); c.bezierCurveTo(W * 0.3, 10, W * 0.6, H, W - 20, 24); c.stroke(); c.fillStyle = "#f5c542"; c.beginPath(); c.arc(W - 20, 24, 10, 0, Math.PI * 2); c.fill(); }); break;
      default: break;
    }
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.12, 14), M.std(color)); mug.position.set(0.32, 0.06, -0.15); g.add(mug);
  }

  // ---------------------------------------------------------------- people
  person(id) { return this.people.get(id); }
  setState(id, state) { const p = this.people.get(id); if (p) { p.state = state; p.stateAt = this.t; } }
  setAll(state) { for (const p of this.people.values()) if (!p.isCeo) { p.state = state; p.stateAt = this.t; } }
  visit(id, back = true) {
    const ceo = this.people.get("ceo"), target = this.people.get(id);
    if (!ceo || !target || target.isCeo) return;
    ceo.lookAt = null;
    this.walkTo(ceo, [target.desk.x - 0.4, target.desk.y + 1.0], () => {
      ceo.lookAt = [target.seat[0], target.seat[1]];
      if (back) setTimeout(() => this.home(), 1400);
    });
  }
  home() { const ceo = this.people.get("ceo"); if (ceo) { ceo.lookAt = null; this.walkTo(ceo, LAYOUT.ceoHome); } }
  lookFor(id) { return LOOK_NAMES[hash(id) % LOOK_NAMES.length]; }
  hitDesk(x, y) {
    const hits = this.pick(x, y, this.desks.filter((d) => !d.analystId).map((d) => d.hitBox));
    return hits[0]?.object.userData.desk.slot ?? -1;
  }

  update(dt) {
    super.update(dt);
    for (const d of this.desks) {
      if (!d.hire.visible) continue;
      const [sx, sy] = seatOf(d);
      d.hire.position.set(sx, 1.45 + Math.sin(this.t * 2.6 + d.slot) * 0.05, sy);
      d.hire.material.map = this.hireTex[this.hoverDesk === d.slot ? 1 : 0];
    }
  }

  // ---------------------------------------------------------------- the big screen
  // idle: market pulse; work: the scan; call: the CEO's draft; locked: committed; result: settled.
  paintScreen() {
    const c = this.screenCanvas, s = c.getContext("2d"), S = this.screen, CW = 156, CH = 66;
    s.setTransform(c.width / CW, 0, 0, c.height / CH, 0, 0);
    const bg = s.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, "#04283a"); bg.addColorStop(1, "#020c13");
    s.fillStyle = bg; s.fillRect(0, 0, CW, CH);
    s.textBaseline = "top";
    const text = (str, x, y, color, size = 6.5, weight = 600) => { s.font = `${weight} ${size}px ${FONT}`; s.fillStyle = color; s.fillText(String(window.kultI18n ? window.kultI18n.t(String(str)) : str).toUpperCase(), x, y); };
    const fit = (str, n) => (str.length > n ? `${str.slice(0, n - 1)}.` : str);
    const blink = Math.floor(this.t * 1.5) % 2;
    if (S.mode === "work") {
      text("DESK SCAN", 5, 4, "#f5c542", 8, 700);
      text(fit(S.title || "", 30), 5, 16, "#ecfeff", 7);
      (S.lines || []).slice(-3).forEach((l, i) => text(fit(l, 32), 5, 27 + i * 8, "#9dc4cc", 6));
      s.fillStyle = "#0b3a4c"; s.beginPath(); s.roundRect(5, 56, 146, 5, 2.5); s.fill();
      s.fillStyle = "#22d3ee"; s.beginPath(); s.roundRect(5, 56, Math.max(5, Math.round(146 * ((this.t * 0.35) % 1))), 5, 2.5); s.fill();
    } else if (S.mode === "call" || S.mode === "locked") {
      text(S.mode === "locked" ? "COMMITTED ON 0G" : "CEO'S CALL", 5, 4, S.mode === "locked" ? "#67e8f9" : "#f5c542", 8, 700);
      const col = S.dir === "LONG" ? "#34d399" : S.dir === "SHORT" ? "#ff6b7d" : S.dir === "ROTATE" ? "#ffe08a" : "#9dc4cc";
      text(fit(S.title || "", 14), 5, 15, "#ecfeff", 12, 700);
      text(S.dir || "", 100, 17, col, 10, 700);
      (S.lines || []).slice(0, 3).forEach((l, i) => text(fit(l, 32), 5, 33 + i * 8, "#ecfeff", 6));
    } else if (S.mode === "result") {
      text("SETTLED", 5, 4, "#67e8f9", 8, 700);
      text(fit(S.title || "", 30), 5, 16, "#ecfeff", 7);
      text(S.big || "", 5, 28, S.good ? "#34d399" : "#ff6b7d", 15, 700);
      (S.lines || []).slice(0, 1).forEach((l) => text(fit(l, 32), 5, 52, "#f5c542", 6));
    } else {
      text("KULT DEX", 5, 4, "#22d3ee", 11, 700);
      const rows = this.ticker.slice(0, 4);
      if (rows.length) {
        rows.forEach((r, i) => {
          const y = 19 + i * 9, up = (r.change ?? 0) >= 0;
          text(r.symbol, 5, y, "#ecfeff", 6.5, 700);
          text(fmt(r.price), 50, y, "#a5f3fc", 6.5);
          text(`${up ? "+" : ""}${((r.change ?? 0) * 100).toFixed(2)}%`, 110, y, up ? "#34d399" : "#ff6b7d", 6.5, 700);
        });
        text(blink ? "READY TO SCAN_" : "READY TO SCAN", 5, 57, "#67e8f9", 5.5);
      } else text(blink ? "CONNECTING TO MARKETS_" : "CONNECTING TO MARKETS", 5, 30, "#9dc4cc", 7);
    }
    s.fillStyle = "rgba(0,0,0,0.14)";
    for (let y = 0; y < CH; y += 1.5) s.fillRect(0, y, CW, 0.4);
  }
}

function fmt(p) {
  if (p == null) return "—";
  return p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 1 ? p.toFixed(2) : p.toPrecision(3);
}
