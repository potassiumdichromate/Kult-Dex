// Kult share: one way to share a public link from every Kult experience.
//
//   KultShare.open({ url, title, text, heading, note })  opens the share card
//   KultShare.row(container, { url, title, text })         a compact share row
//
// The card shows the link, Copy, Share on X, the device's own share sheet
// (phones) and Open. It only ever shares a public URL that the caller passes;
// nothing is posted for the player. English and 中文 follow KULT World's
// language (localStorage "kultworld.lang", or ?lang=). The same file is copied
// into Kult Create, Kult Sports and Kult Dex.
(() => {
  'use strict';
  if (window.KultShare) return;
  const ZH = {
    'Share': '分享', 'Copy link': '复制链接', 'Copied': '已复制', 'Share on X': '分享到 X', 'Share…': '更多分享…', 'Open': '打开',
    'Anyone with this link can open it. No sign-in needed.': '任何拿到这个链接的人都能打开，无需登录。',
    'Close': '关闭', 'Copy the link above to share it.': '复制上面的链接即可分享。',
  };
  const lang = () => {
    try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'zh' || q === 'en') return q; } catch { /* no location */ }
    try { const s = localStorage.getItem('kultworld.lang'); if (s === 'zh' || s === 'en') return s; } catch { /* storage blocked */ }
    return /^zh/i.test(document.documentElement.lang || navigator.language || '') ? 'zh' : 'en';
  };
  const T = (s) => (lang() === 'zh' && ZH[s]) || s;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const absolute = (u) => { try { return new URL(u, location.href).href; } catch { return String(u || ''); } };
  const xIntent = (url, text) => `https://x.com/intent/post?${new URLSearchParams({ text: text || '', url })}`;

  const CSS = `
.kshare-back{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(8,10,14,.55)}
.kshare{width:min(440px,100%);border-radius:20px;padding:18px;background:var(--kshare-bg,#fff);color:var(--kshare-ink,#16202a);font:14px/1.45 Inter,system-ui,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.35);animation:kshare-in .25s ease}
@keyframes kshare-in{from{transform:translateY(8px);opacity:0}}
.kshare-head{display:flex;justify-content:space-between;gap:12px;align-items:start}
.kshare h3{margin:0 0 4px;font:700 18px "Chakra Petch",Inter,sans-serif}
.kshare p{margin:0 0 12px;color:var(--kshare-muted,#566270)}
.kshare-x{flex:none;width:32px;height:32px;border-radius:10px;border:1px solid var(--kshare-line,rgba(0,0,0,.12));background:transparent;color:inherit;font-size:18px;cursor:pointer}
.kshare-link{display:flex;gap:6px;margin:0 0 12px}
.kshare-link input{flex:1;min-width:0;height:42px;padding:0 12px;border-radius:12px;border:1px solid var(--kshare-line,rgba(0,0,0,.15));background:var(--kshare-field,#f3f5f7);color:inherit;font:13px ui-monospace,Menlo,monospace}
.kshare-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;padding:0 14px;border-radius:12px;border:1px solid var(--kshare-line,rgba(0,0,0,.14));background:var(--kshare-field,#f3f5f7);color:inherit;font:600 13.5px Inter,system-ui,sans-serif;cursor:pointer;text-decoration:none;white-space:nowrap}
.kshare-btn:hover{filter:brightness(.96)}
.kshare-btn.x{background:#0f1419;border-color:var(--kshare-xline,#0f1419);color:#fff}
.kshare-btn.main{background:var(--kshare-accent,#2f6fd6);border-color:transparent;color:#fff}
.kshare-btn svg{width:16px;height:16px;fill:currentColor}
.kshare-row{display:flex;flex-wrap:wrap;gap:8px}
.kshare-row .kshare-btn{flex:1}
.kshare small{display:block;margin-top:12px;color:var(--kshare-muted,#566270);font-size:12px}
.kshare-inline{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.kshare-inline .kshare-btn{height:34px;padding:0 11px;font-size:12.5px;border-radius:10px}
`;
  const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-7-6.2 7H1.4l8.1-9.3L1 2h7.1l4.9 6.4zm-1.2 18h1.9L7.4 4H5.3z"/></svg>';
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); };

  async function copy(url, btn) {
    try { await navigator.clipboard.writeText(url); }
    catch { const i = document.createElement('input'); i.value = url; document.body.append(i); i.select(); try { document.execCommand('copy'); } catch { /* nothing else to try */ } i.remove(); }
    if (btn) { const was = btn.textContent; btn.textContent = T('Copied'); setTimeout(() => { btn.textContent = was; }, 1600); }
  }
  function buttons(o, { main = true } = {}) {
    const url = absolute(o.url);
    const native = typeof navigator.share === 'function';
    return `<button type="button" class="kshare-btn ${main ? 'main' : ''}" data-k="copy">${T('Copy link')}</button>`
      + `<a class="kshare-btn x" data-k="x" href="${esc(xIntent(url, o.text || o.title))}" target="_blank" rel="noopener">${X_ICON}${T('Share on X')}</a>`
      + (native ? `<button type="button" class="kshare-btn" data-k="native">${T('Share…')}</button>` : '')
      + `<a class="kshare-btn" data-k="open" href="${esc(url)}" target="_blank" rel="noopener">${T('Open')}</a>`;
  }
  function wire(root, o) {
    const url = absolute(o.url);
    root.querySelector('[data-k="copy"]')?.addEventListener('click', (e) => copy(url, e.currentTarget));
    root.querySelector('[data-k="native"]')?.addEventListener('click', () => navigator.share({ title: o.title || document.title, text: o.text || '', url }).catch(() => {}));
  }

  function open(o = {}) {
    if (!o.url) return;
    style(); close();
    const url = absolute(o.url);
    const back = document.createElement('div'); back.className = 'kshare-back'; back.id = 'kshare';
    back.innerHTML = `<div class="kshare" role="dialog" aria-modal="true" aria-labelledby="kshare-title"><div class="kshare-head"><div><h3 id="kshare-title">${esc(o.heading || T('Share'))}</h3>${o.title ? `<p>${esc(o.title)}</p>` : ''}</div><button type="button" class="kshare-x" aria-label="${T('Close')}">×</button></div>
      <div class="kshare-link"><input readonly value="${esc(url)}" aria-label="Link" data-no-i18n></div>
      <div class="kshare-row">${buttons(o)}</div>
      <small>${esc(o.note || T('Anyone with this link can open it. No sign-in needed.'))}</small></div>`;
    for (const [k, v] of Object.entries(o.theme || {})) back.style.setProperty('--kshare-' + k, v);
    document.body.append(back);
    wire(back, o);
    const input = back.querySelector('input'); input.addEventListener('focus', () => input.select());
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    back.querySelector('.kshare-x').onclick = close;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey); back._off = () => document.removeEventListener('keydown', onKey);
    back.querySelector('[data-k="copy"]').focus();
  }
  function close() { const b = document.getElementById('kshare'); if (b) { b._off?.(); b.remove(); } }
  function row(container, o = {}) {
    if (!container || !o.url) return;
    style();
    container.classList.add('kshare-inline');
    for (const [k, v] of Object.entries(o.theme || {})) container.style.setProperty('--kshare-' + k, v);
    container.innerHTML = buttons(o, { main: false });
    wire(container, o);
  }
  // A dark theme for the night experiences (Sports, Dex).
  const NIGHT = { bg: '#161029', ink: '#f1edff', muted: '#b3a9da', field: 'rgba(255,255,255,0.06)', line: 'rgba(255,255,255,0.16)', accent: '#ff4fa3', xline: 'rgba(255,255,255,0.22)' };
  window.KultShare = { open, close, row, NIGHT, xIntent: (url, text) => xIntent(absolute(url), text) };
})();
