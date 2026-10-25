#!/usr/bin/env python3
"""
Upgrade script for github.com/eytangut/quotebook

Run from the ROOT of your local clone:

    python3 upgrade_quotebook.py

Adds (without touching main.js / render.js / analyze.js / i18n.js):
  js/enhance.js        draft autosave, char/word counter, saved-quote search,
                       export sizes (4:5, 1:1, 9:16), copy image / copy text,
                       keyboard shortcuts, canvas alt text
  css/enhance.css      styles for the above + focus rings + reduced motion
  sw.js, manifest.webmanifest, icon.svg   installable, works offline (PWA)
  .github/workflows/check.yml             CI: syntax-checks every JS module
  index.html           meta/SEO/OG tags, ARIA live regions, loads the new files
  README.md            documents the extras

Safe to re-run: our own files are overwritten, index.html/README are only
patched once. Review with `git diff`, then commit and push.
"""
import sys
from pathlib import Path

root = Path.cwd()
if not (root / "index.html").exists() or not (root / "js" / "main.js").exists():
    sys.exit("Run this from the quotebook repo root (index.html and js/main.js not found).")


def write(rel, text):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text.lstrip("\n"), encoding="utf-8")
    print(f"  wrote {rel}")


# --------------------------------------------------------------------------- JS
write("js/enhance.js", r'''
// Quotebook extras. Layered on top of main.js; relies only on the DOM ids in index.html.
const $ = id => document.getElementById(id);
const q = $('q'), b = $('b'), a = $('a'), cv = $('cv'), list = $('list');
if (!q || !cv || !list) throw new Error('enhance.js: expected elements missing');

const T = {
  en: {search: 'Search saved quotes…', size: 'Image size', portrait: 'Portrait 4:5', square: 'Square 1:1',
       story: 'Story 9:16', dl: 'Download', copyImg: 'Copy image', copyTxt: 'Copy text',
       copied: 'Copied', failed: 'Could not copy', chars: 'characters', words: 'words'},
  he: {search: 'חיפוש בציטוטים שמורים…', size: 'גודל תמונה', portrait: 'לאורך 4:5', square: 'ריבוע 1:1',
       story: 'סטורי 9:16', dl: 'הורדה', copyImg: 'העתקת תמונה', copyTxt: 'העתקת טקסט',
       copied: 'הועתק', failed: 'ההעתקה נכשלה', chars: 'תווים', words: 'מילים'},
};
const isHe = () => !!$('lang') && $('lang').textContent.includes('English');
const t = k => T[isHe() ? 'he' : 'en'][k];

/* ---------- toast ---------- */
const toastEl = Object.assign(document.createElement('div'), {id: 'qb-toast'});
toastEl.setAttribute('role', 'status');
toastEl.setAttribute('aria-live', 'polite');
document.body.append(toastEl);
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1800);
}

/* ---------- counter ---------- */
const count = Object.assign(document.createElement('div'), {id: 'qcount', className: 'info'});
q.after(count);
function updateCount() {
  const s = q.value.trim();
  const w = s ? s.split(/\s+/).length : 0;
  count.textContent = `${q.value.length} ${t('chars')} · ${w} ${t('words')}`;
}

/* ---------- draft autosave ---------- */
const KEY = 'qb.draft';
const readDraft = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
function writeDraft() {
  try {
    const d = {q: q.value, b: b.value, a: a.value};
    (d.q || d.b || d.a) ? localStorage.setItem(KEY, JSON.stringify(d)) : localStorage.removeItem(KEY);
  } catch {}
}
const fire = el => el.dispatchEvent(new Event('input', {bubbles: true}));
const draft = readDraft();
if (draft && !q.value && !b.value && !a.value) {
  q.value = draft.q || ''; b.value = draft.b || ''; a.value = draft.a || '';
  [q, b, a].forEach(fire);
}
[q, b, a].forEach(el => el.addEventListener('input', writeDraft));
$('save')?.addEventListener('click', () => setTimeout(() => {
  if (!q.value) { try { localStorage.removeItem(KEY); } catch {} }
}, 50));

/* ---------- canvas alt text ---------- */
cv.setAttribute('role', 'img');
let altTimer;
function updateAlt() {
  clearTimeout(altTimer);
  altTimer = setTimeout(() => cv.setAttribute('aria-label', q.value.trim() || 'Quote image preview'), 250);
}

/* ---------- search saved quotes ---------- */
const search = Object.assign(document.createElement('input'), {id: 'lsearch', type: 'search'});
search.setAttribute('dir', 'auto');
list.before(search);
function applyFilter() {
  const s = search.value.trim().toLowerCase();
  for (const el of list.children) el.hidden = !!s && !el.textContent.toLowerCase().includes(s);
  search.hidden = list.children.length < 4 && !s;
}
new MutationObserver(applyFilter).observe(list, {childList: true});
search.addEventListener('input', applyFilter);

/* ---------- export sizes, copy image/text ---------- */
const SIZES = {portrait: [1080, 1350], square: [1080, 1080], story: [1080, 1920]};
const bar = document.createElement('div');
bar.className = 'btns'; bar.id = 'qb-extra';
bar.innerHTML = `
  <label class="qb-size"><span data-ek="size"></span>
    <select id="qb-fmt">${Object.keys(SIZES).map(k => `<option value="${k}" data-ek="${k}"></option>`).join('')}</select></label>
  <button id="qb-dl" data-ek="dl"></button>
  <button id="qb-copyimg" data-ek="copyImg"></button>
  <button id="qb-copytxt" data-ek="copyTxt"></button>`;
(document.querySelector('.btns') || q).after(bar);
const fmtSel = $('qb-fmt');
try { fmtSel.value = localStorage.getItem('qb.fmt') || 'portrait'; } catch {}
fmtSel.addEventListener('change', () => { try { localStorage.setItem('qb.fmt', fmtSel.value); } catch {} });

function compose(kind) {
  const [w, h] = SIZES[kind];
  if (w === cv.width && h === cv.height) return cv;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const cover = Math.max(w / cv.width, h / cv.height);
  g.filter = 'blur(40px)';                                   // ignored on browsers without ctx.filter
  g.drawImage(cv, (w - cv.width * cover) / 2, (h - cv.height * cover) / 2, cv.width * cover, cv.height * cover);
  g.filter = 'none';
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, w, h);
  const fit = Math.min(w / cv.width, h / cv.height);
  g.drawImage(cv, (w - cv.width * fit) / 2, (h - cv.height * fit) / 2, cv.width * fit, cv.height * fit);
  return c;
}
const blobOf = kind => new Promise(res => compose(kind).toBlob(res, 'image/png'));
const slug = () => (q.value.normalize().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 30)) || 'quote';

async function download() {
  const kind = fmtSel.value, blob = await blobOf(kind);
  if (!blob) return toast(t('failed'));
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), {href: url, download: `${slug()}-${kind}.png`}).click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function copyImage() {
  try {
    const blob = await blobOf(fmtSel.value);
    await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
    toast(t('copied'));
  } catch { toast(t('failed')); }
}
async function copyText() {
  const s = q.value.trim();
  if (!s) return;
  const who = [a.value.trim(), b.value.trim()].filter(Boolean).join(', ');
  try { await navigator.clipboard.writeText(`“${s}”${who ? ' — ' + who : ''}`); toast(t('copied')); }
  catch { toast(t('failed')); }
}
$('qb-dl').addEventListener('click', download);
$('qb-copyimg').addEventListener('click', copyImage);
$('qb-copytxt').addEventListener('click', copyText);

/* ---------- shortcuts ---------- */
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
  if (mod && e.key === 'Enter') { e.preventDefault(); $('save')?.click(); }
  else if (e.altKey && !mod && e.code === 'KeyN') { e.preventDefault(); $('shuf')?.click(); }
  else if (e.altKey && !mod && e.code === 'KeyD') { e.preventDefault(); download(); }
  else if (e.key === '/' && !mod && !typing && !search.hidden) { e.preventDefault(); search.focus(); }
});

/* ---------- labels follow the language toggle ---------- */
function relabel() {
  document.querySelectorAll('[data-ek]').forEach(el => { el.textContent = t(el.dataset.ek); });
  search.placeholder = t('search');
  updateCount();
}
$('lang')?.addEventListener('click', () => setTimeout(relabel, 0));
q.addEventListener('input', () => { updateCount(); updateAlt(); });
relabel(); updateAlt(); applyFilter();

/* ---------- offline support ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
''')

# -------------------------------------------------------------------------- CSS
write("css/enhance.css", r'''
#list [hidden], #lsearch[hidden] { display: none !important; }
#lsearch {
  width: 100%; box-sizing: border-box; margin: .5em 0; padding: .55em .8em;
  font: inherit; color: inherit; background: transparent;
  border: 1px solid rgba(128,128,128,.45); border-radius: 8px;
}
#qcount { margin: .25em 0 .5em; font-size: .8em; opacity: .65; text-align: end; }
#qb-extra { align-items: center; margin-top: .5em; }
#qb-extra .qb-size { display: inline-flex; gap: .5em; align-items: center; font-size: .9em; }
#qb-extra select { font: inherit; padding: .35em .5em; border-radius: 6px; }
#qb-toast {
  position: fixed; left: 50%; bottom: 1.5rem; transform: translate(-50%, 1rem);
  padding: .55em 1.1em; border-radius: 999px; background: #1e2327; color: #fff;
  font-size: .9rem; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; z-index: 50;
}
#qb-toast.on { opacity: 1; transform: translate(-50%, 0); }
:focus-visible { outline: 2px solid #6aa9ff; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
''')

# ------------------------------------------------------------------ PWA + icons
write("sw.js", r'''
// Stale-while-revalidate for same-origin files so the app opens offline.
// Bump V to force-clear old caches after a big change.
const V = 'qb-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(['./', 'index.html'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })
                        .catch(() => hit || Response.error());
    return hit || net;
  }));
});
''')

write("manifest.webmanifest", '''{
  "name": "Quotebook",
  "short_name": "Quotebook",
  "description": "Save quotes and turn them into mood-matched images, on-device.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#1e2327",
  "theme_color": "#1e2327",
  "icons": [{"src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"}]
}
''')

write("icon.svg", '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="#1e2327"/>
<text x="256" y="360" font-family="Georgia,serif" font-size="360" text-anchor="middle" fill="#e9c46a">&#8220;</text>
</svg>
''')

write(".github/workflows/check.yml", '''name: check
on: [push, pull_request]
jobs:
  syntax:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Syntax-check every JS module
        run: |
          for f in $(find js sw.js -name '*.js'); do
            cp "$f" /tmp/check.mjs
            node --check /tmp/check.mjs || { echo "Syntax error in $f"; exit 1; }
          done
''')

# ------------------------------------------------------------------- index.html
def patch(s, old, new, label):
    if old in s:
        return s.replace(old, new, 1)
    print(f"  ! skipped {label} (pattern not found)")
    return s

html_path = root / "index.html"
html = html_path.read_text(encoding="utf-8")
if "enhance.js" in html:
    print("  index.html already patched")
else:
    html = patch(html, "<title>Quotebook</title>", """<title>Quotebook</title>
<meta name="description" content="Save quotes in English or Hebrew and turn them into mood-matched images, entirely on-device.">
<meta name="theme-color" content="#1e2327">
<meta property="og:title" content="Quotebook">
<meta property="og:description" content="Turn quotes into mood-matched images, entirely on-device.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">""", "head meta")
    html = patch(html, '<link rel="stylesheet" href="css/style.css">',
                 '<link rel="stylesheet" href="css/style.css">\n<link rel="stylesheet" href="css/enhance.css">', "css link")
    html = patch(html, '<div id="st"></div>', '<div id="st" role="status" aria-live="polite"></div>', "status region")
    html = patch(html, '<div id="toast"></div>', '<div id="toast" role="status" aria-live="polite"></div>', "toast region")
    html = patch(html, '<script type="module" src="js/main.js"></script>',
                 '<script type="module" src="js/main.js"></script>\n<script type="module" src="js/enhance.js"></script>', "script tag")
    html_path.write_text(html, encoding="utf-8")
    print("  patched index.html")

# ---------------------------------------------------------------------- README
readme_path = root / "README.md"
marker = "## Extras (enhance.js)"
readme = readme_path.read_text(encoding="utf-8") if readme_path.exists() else ""
if marker in readme:
    print("  README already patched")
else:
    readme += f"""

{marker}

Layered on top of the core app; removing `js/enhance.js` and its `<script>` tag restores the original behaviour.

- **Draft autosave**: the quote/book/author fields survive a reload.
- **Counter**, **search** over saved quotes (appears once you have 4+).
- **Export sizes**: Portrait 4:5, Square 1:1, Story 9:16 (blurred fill), plus **copy image** and **copy text**.
- **Shortcuts**: `Ctrl/Cmd+Enter` save, `Alt+N` new look, `Alt+D` download, `/` search.
- **Offline / installable**: `sw.js` + `manifest.webmanifest` (bump `V` in `sw.js` to clear caches).
- **CI**: `.github/workflows/check.yml` syntax-checks every module on push.
"""
    readme_path.write_text(readme, encoding="utf-8")
    print("  patched README.md")

print("\nDone. Next: python3 -m http.server, test at http://localhost:8000, then git add -A && git commit && git push")
