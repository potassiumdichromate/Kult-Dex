// Small canvas charts for Kult Dex: a candlestick chart with price levels
// (entry, target, stop) and a hover crosshair, and sparklines. No library.

const UP = "#34d399", DOWN = "#ff6b7d", GRID = "rgba(165, 243, 252, 0.08)", AXIS = "#7fa9b3";
const MONO = '"JetBrains Mono", ui-monospace, monospace';

function fit(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), r = canvas.getBoundingClientRect();
  const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const g = canvas.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}

const fmt = (p) => (p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 1 ? p.toFixed(2) : p.toPrecision(3));

/**
 * Candles with optional levels: [{ price, label, color, dash }].
 * Returns a redraw function (call it after a resize).
 */
export function candleChart(canvas, bars, { levels = [], tf = "1h" } = {}) {
  let hover = -1;
  const draw = () => {
    const { g, w, h } = fit(canvas);
    g.clearRect(0, 0, w, h);
    if (!bars?.length) { g.fillStyle = AXIS; g.font = `13px ${MONO}`; g.fillText("No bars", 12, 22); return; }
    const padR = 64, padB = 22, padT = 10, cw = w - padR, ch = h - padB - padT;
    const show = bars.slice(-Math.max(20, Math.floor(cw / 7)));
    let hi = Math.max(...show.map((b) => b.h)), lo = Math.min(...show.map((b) => b.l));
    for (const l of levels) if (l.price) { hi = Math.max(hi, l.price); lo = Math.min(lo, l.price); }
    const pad = (hi - lo) * 0.06 || hi * 0.01; hi += pad; lo -= pad;
    const y = (p) => padT + (1 - (p - lo) / (hi - lo)) * ch, step = cw / show.length, bw = Math.max(1, step * 0.62);
    g.strokeStyle = GRID; g.lineWidth = 1; g.font = `11px ${MONO}`; g.fillStyle = AXIS; g.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) { const p = lo + ((hi - lo) * i) / 4, yy = y(p); g.beginPath(); g.moveTo(0, yy); g.lineTo(cw, yy); g.stroke(); g.fillText(fmt(p), cw + 6, yy); }
    show.forEach((b, i) => {
      const x = i * step + step / 2, up = b.c >= b.o;
      g.strokeStyle = g.fillStyle = up ? UP : DOWN;
      g.beginPath(); g.moveTo(x, y(b.h)); g.lineTo(x, y(b.l)); g.stroke();
      const top = y(Math.max(b.o, b.c)), bot = y(Math.min(b.o, b.c));
      g.fillRect(x - bw / 2, top, bw, Math.max(1, bot - top));
    });
    // Time axis: a few labels.
    g.fillStyle = AXIS; g.textBaseline = "top";
    for (let i = 0; i < show.length; i += Math.ceil(show.length / 5)) {
      const d = new Date(show[i].t), label = tf === "1d" ? d.toLocaleDateString([], { day: "numeric", month: "short" }) : d.toLocaleString([], { hour: "2-digit", minute: "2-digit", ...(tf === "1h" ? { day: "numeric" } : {}) });
      g.fillText(label, i * step, h - padB + 6);
    }
    for (const l of levels) {
      if (!l.price) continue;
      const yy = y(l.price); g.strokeStyle = l.color; g.setLineDash(l.dash ? [6, 4] : []); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, yy); g.lineTo(cw, yy); g.stroke(); g.setLineDash([]);
      g.fillStyle = l.color; g.fillRect(cw, yy - 9, padR, 18); g.fillStyle = "#021018"; g.textBaseline = "middle"; g.font = `bold 10px ${MONO}`;
      g.fillText(`${l.label} ${fmt(l.price)}`.slice(0, 11), cw + 3, yy);
    }
    const last = show[show.length - 1], ly = y(last.c);
    g.fillStyle = last.c >= last.o ? UP : DOWN; g.fillRect(cw, ly - 9, padR, 18); g.fillStyle = "#021018"; g.font = `bold 11px ${MONO}`; g.textBaseline = "middle"; g.fillText(fmt(last.c), cw + 4, ly);
    if (hover >= 0 && hover < show.length) {
      const b = show[hover], x = hover * step + step / 2;
      g.strokeStyle = "rgba(236, 254, 255, 0.35)"; g.beginPath(); g.moveTo(x, padT); g.lineTo(x, padT + ch); g.stroke();
      const text = `${new Date(b.t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}  O ${fmt(b.o)}  H ${fmt(b.h)}  L ${fmt(b.l)}  C ${fmt(b.c)}`;
      g.font = `11px ${MONO}`; const tw = g.measureText(text).width + 12;
      g.fillStyle = "rgba(2, 16, 24, 0.9)"; g.fillRect(6, 4, tw, 20); g.fillStyle = "#ecfeff"; g.textBaseline = "middle"; g.fillText(text, 12, 14);
    }
    canvas._layout = { step, n: show.length };
  };
  canvas.onpointermove = (e) => { const r = canvas.getBoundingClientRect(), L = canvas._layout; if (!L) return; hover = Math.floor((e.clientX - r.left) / L.step); draw(); };
  canvas.onpointerleave = () => { hover = -1; draw(); };
  draw();
  return draw;
}

export function sparkline(values, { w = 96, h = 28 } = {}) {
  const c = document.createElement("canvas");
  c.className = "spark"; c.style.width = `${w}px`; c.style.height = `${h}px`;
  const dpr = Math.min(2, window.devicePixelRatio || 1); c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext("2d"); g.scale(dpr, dpr);
  if (!values?.length) return c;
  const hi = Math.max(...values), lo = Math.min(...values), up = values[values.length - 1] >= values[0];
  const x = (i) => (i / (values.length - 1)) * (w - 2) + 1, y = (v) => h - 2 - ((v - lo) / (hi - lo || 1)) * (h - 4);
  const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, up ? "rgba(52, 211, 153, 0.35)" : "rgba(255, 107, 125, 0.35)"); grad.addColorStop(1, "rgba(0,0,0,0)");
  g.beginPath(); values.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)))); g.lineTo(x(values.length - 1), h); g.lineTo(x(0), h); g.closePath(); g.fillStyle = grad; g.fill();
  g.beginPath(); values.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)))); g.strokeStyle = up ? UP : DOWN; g.lineWidth = 1.5; g.stroke();
  return c;
}
