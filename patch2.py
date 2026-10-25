#!/usr/bin/env python3
"""
Patch #2 for github.com/eytangut/quotebook: full PWA + local-filesystem storage.

Run from the ROOT of your clone (after, or without, the first patch):

    python3 pwa_storage_patch.py

Adds
  js/offline.js     classic script loaded first in <head>. It:
                    - intercepts model downloads (huggingface.co / hf.co and
                      onnx wasm from jsdelivr) and stores them as real files via
                      the File System Access API; later loads read the files
                      back, so the model survives cache clears
                    - mirrors your saved quotes (localStorage) to
                      quotebook-data.json, with rolling backups, and restores
                      them automatically if the browser data was wiped
                    - falls back to the browser-private file system (OPFS) when no
                      folder is chosen or the browser can't pick folders
                    - adds a "Storage & backup" panel (choose folder, save now,
                      restore, copy cached model to folder, install app)
  css/offline.css   panel styles
  sw.js             v2: offline app shell, CDN scripts cached, offline navigation
  manifest.webmanifest + icon-192.png / icon-512.png   installable on Chrome/Edge/Android
  index.html, README.md   patched once (safe to re-run)

Assumes quotes live in localStorage. If your saved quotes don't show up in
quotebook-data.json, tell me where main.js stores them and I'll adapt it.
"""
import struct
import sys
import zlib
from pathlib import Path

root = Path.cwd()
if not (root / "index.html").exists() or not (root / "js" / "main.js").exists():
    sys.exit("Run this from the quotebook repo root (index.html and js/main.js not found).")


def write(rel, text):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text.lstrip("\n"), encoding="utf-8")
    print(f"  wrote {rel}")


# ----------------------------------------------------------------- js/offline.js
write("js/offline.js", r'''
// Quotebook offline storage. Classic script: must run BEFORE main.js (it patches fetch/localStorage).
(() => {
  'use strict';
  try { localStorage.length; } catch { return; }

  const DATA = 'quotebook-data.json', KEEP = 10;
  const ownKey = k => String(k).startsWith('qb.');
  const P = Storage.prototype, oSet = P.setItem, oRem = P.removeItem, oClr = P.clear;

  // Decided synchronously, before main.js can write anything: was this browser profile empty?
  let wasEmpty = true;
  for (let i = 0; i < localStorage.length; i++) if (!ownKey(localStorage.key(i))) { wasEmpty = false; break; }

  const S = {root: null, mode: 'none', pending: null, hold: true};

  /* ---------- tiny IndexedDB store for the folder handle ---------- */
  const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open('qb-fs', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('h');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const idbGet = async k => { const d = await idb(); return new Promise(res => { const r = d.transaction('h').objectStore('h').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); };
  const idbSet = async (k, v) => { const d = await idb(); return new Promise(res => { const tx = d.transaction('h', 'readwrite'); v === undefined ? tx.objectStore('h').delete(k) : tx.objectStore('h').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => res(); }); };
  const opfs = async () => { try { return await navigator.storage.getDirectory(); } catch { return null; } };

  /* ---------- file helpers (work on a folder or on OPFS alike) ---------- */
  async function dirAt(parts, create) { let d = S.root; for (const p of parts) d = await d.getDirectoryHandle(p, {create}); return d; }
  async function openFile(parts) {
    try { const d = await dirAt(parts.slice(0, -1), false); return await (await d.getFileHandle(parts[parts.length - 1])).getFile(); }
    catch { return null; }
  }
  async function writeTo(parts, data) {
    const d = await dirAt(parts.slice(0, -1), true);
    const w = await (await d.getFileHandle(parts[parts.length - 1], {create: true})).createWritable();
    if (data instanceof ReadableStream) await data.pipeTo(w);   // pipeTo closes the writable (or aborts it on error)
    else { await w.write(data); await w.close(); }
  }
  async function copyDir(src, dst) {
    for await (const [name, h] of src.entries()) {
      if (h.kind === 'directory') await copyDir(h, await dst.getDirectoryHandle(name, {create: true}));
      else {
        let exists = true;
        try { await dst.getFileHandle(name); } catch { exists = false; }
        if (!exists || name === DATA) await (await h.getFile()).stream().pipeTo(await (await dst.getFileHandle(name, {create: true})).createWritable());
      }
    }
  }
  async function stats(dir) {
    let n = 0, b = 0;
    for await (const [, h] of dir.entries()) {
      if (h.kind === 'directory') { const s = await stats(h); n += s.n; b += s.b; } else { n++; b += (await h.getFile()).size; }
    }
    return {n, b};
  }

  /* ---------- model files: hosts we persist ---------- */
  const HOST_RE = /(^|\.)(huggingface\.co|hf\.co|jsdelivr\.net)$/;
  function modelParts(u) {
    let x; try { x = new URL(u, location.href); } catch { return null; }
    if (!HOST_RE.test(x.hostname)) return null;
    const segs = x.pathname.split('/')
      .map(s => { try { return decodeURIComponent(s); } catch { return s; } })
      .map(s => s.replace(/[\\:*?"<>|]/g, '_'))
      .filter(s => s && s !== '.' && s !== '..');
    return segs.length ? ['models', x.hostname, ...segs] : null;
  }
  const mime = n => /\.json$/.test(n) ? 'application/json' : /\.wasm$/.test(n) ? 'application/wasm'
    : /\.m?js$/.test(n) ? 'text/javascript' : /\.txt$/.test(n) ? 'text/plain' : 'application/octet-stream';

  /* ---------- startup: choose backend, maybe restore ---------- */
  const ready = (async () => {
    try {
      const h = await idbGet('dir');
      if (h && await h.queryPermission({mode: 'readwrite'}) === 'granted') { S.root = h; S.mode = 'folder'; }
      else { if (h) S.pending = h; S.root = await opfs(); S.mode = S.root ? 'opfs' : 'none'; }
    } catch { S.root = await opfs(); S.mode = S.root ? 'opfs' : 'none'; }
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
    if (wasEmpty && S.root && !sessionStorage.getItem('qb.restored')) {
      const snap = await readSnap();
      if (snap && Object.keys(snap.data).length) {
        applySnap(snap);
        try { sessionStorage.setItem('qb.restored', '1'); } catch {}
        location.reload();
        return;                                  // keep S.hold = true; the reload starts fresh
      }
    }
    S.hold = false;
  })();

  /* ---------- fetch wrapper: serve model files from disk, save new ones ---------- */
  const nativeFetch = window.fetch.bind(window);
  const inflight = new Set();
  window.fetch = async function (input, init) {
    let parts = null, hit = null;
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      const hasRange = new Headers((init && init.headers) || (input && input.headers) || {}).has('range');
      if (method === 'GET' && !hasRange) parts = modelParts(url);
      if (parts) { await ready; if (S.root) hit = await openFile(parts); else parts = null; }
    } catch { parts = null; }
    if (hit) return new Response(hit.stream(), {status: 200, headers: {'content-type': mime(parts[parts.length - 1]), 'content-length': String(hit.size)}});
    const res = await nativeFetch(input, init);
    if (parts && res.ok && res.status === 200 && res.body) {
      const key = parts.join('/');
      if (!inflight.has(key)) {
        inflight.add(key);
        writeTo(parts, res.clone().body).catch(() => {}).finally(() => { inflight.delete(key); refresh(); });
      }
    }
    return res;
  };

  /* ---------- copy anything the browser already cached (from before a folder existed) ---------- */
  async function syncCache() {
    if (!S.root || !window.caches) return 0;
    let n = 0;
    for (const name of await caches.keys()) {
      if (name.startsWith('qb-')) continue;
      const c = await caches.open(name);
      for (const req of await c.keys()) {
        const parts = modelParts(req.url);
        if (!parts || await openFile(parts)) continue;
        const res = await c.match(req);
        if (res && res.body) { await writeTo(parts, res.body); n++; }
      }
    }
    return n;
  }

  /* ---------- quotes data: mirror localStorage to quotebook-data.json ---------- */
  const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  function snapshot() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!ownKey(k)) data[k] = localStorage.getItem(k); }
    return {app: 'quotebook', version: 1, savedAt: new Date().toISOString(), data};
  }
  async function readSnap() {
    const f = await openFile([DATA]);
    if (!f) return null;
    try { const j = JSON.parse(await f.text()); return j && j.data ? j : null; } catch { return null; }
  }
  function applySnap(snap) {
    const rm = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!ownKey(k)) rm.push(k); }
    rm.forEach(k => oRem.call(localStorage, k));
    for (const [k, v] of Object.entries(snap.data)) oSet.call(localStorage, k, v);
  }
  let backedUp = false;
  async function prune() {
    try {
      const d = await dirAt(['backups'], false), names = [];
      for await (const [n, h] of d.entries()) if (h.kind === 'file') names.push(n);
      names.sort();
      for (const n of names.slice(0, Math.max(0, names.length - KEEP))) await d.removeEntry(n);
    } catch {}
  }
  async function saveData(force) {
    await ready;
    if (!S.root || S.hold) return false;
    if (!backedUp || force) {                    // keep what earlier sessions left behind
      backedUp = true;
      const old = await openFile([DATA]);
      if (old) { await writeTo(['backups', `quotebook-${stamp()}.json`], old); await prune(); }
    }
    await writeTo([DATA], new Blob([JSON.stringify(snapshot(), null, 1)]));
    refresh();
    return true;
  }
  let timer;
  function schedule() { clearTimeout(timer); timer = setTimeout(() => saveData().catch(() => {}), 1500); }
  const touch = (self, k) => { if (self === localStorage && !(k && ownKey(k))) schedule(); };
  P.setItem = function (k, v) { oSet.call(this, k, v); touch(this, String(k)); };
  P.removeItem = function (k) { oRem.call(this, k); touch(this, String(k)); };
  P.clear = function () { oClr.call(this); touch(this); };
  addEventListener('pagehide', () => { clearTimeout(timer); saveData().catch(() => {}); });

  /* ---------- UI ---------- */
  const T = {
    en: {stTitle: 'Storage & backup', pick: 'Choose folder…', grant: 'Reconnect folder', saveNow: 'Save now',
         restore: 'Restore from folder', syncModel: 'Copy cached model to folder', forget: 'Disconnect folder',
         install: 'Install app', saveTo: 'Saving to', w_folder: 'folder', w_opfs: 'browser-private storage',
         w_none: 'unavailable', models: 'model files', lastSaved: 'data saved', never: 'not yet',
         needPerm: 'Folder needs permission again', saved: 'Saved', failed: 'Action failed',
         unsup: 'This browser can’t pick folders; using private storage', nofile: 'No backup file found',
         confirmRestore: 'Replace the current quotes with the copy in the folder?', synced: '{n} files copied'},
    he: {stTitle: 'אחסון וגיבוי', pick: 'בחירת תיקייה…', grant: 'חיבור מחדש לתיקייה', saveNow: 'שמירה עכשיו',
         restore: 'שחזור מהתיקייה', syncModel: 'העתקת המודל השמור לתיקייה', forget: 'ניתוק התיקייה',
         install: 'התקנה כאפליקציה', saveTo: 'נשמר ב', w_folder: 'תיקייה', w_opfs: 'אחסון פרטי של הדפדפן',
         w_none: 'לא זמין', models: 'קבצי מודל', lastSaved: 'נתונים נשמרו', never: 'עדיין לא',
         needPerm: 'התיקייה דורשת אישור מחדש', saved: 'נשמר', failed: 'הפעולה נכשלה',
         unsup: 'הדפדפן לא תומך בבחירת תיקייה; משתמשים באחסון פרטי', nofile: 'לא נמצא קובץ גיבוי',
         confirmRestore: 'להחליף את הציטוטים הנוכחיים בעותק שבתיקייה?', synced: 'הועתקו {n} קבצים'},
  };
  const isHe = () => { const l = document.getElementById('lang'); return !!l && l.textContent.includes('English'); };
  const t = k => T[isHe() ? 'he' : 'en'][k];
  const fmtSize = b => b > 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.ceil(b / 1e3) + ' KB';
  const $ = id => document.getElementById(id);
  let panel, deferredInstall, last = '';

  function toast(msg) {
    let el = $('qb-toast');
    if (!el) { el = Object.assign(document.createElement('div'), {id: 'qb-toast'}); el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200);
  }
  async function refresh() {
    if (!panel || !panel.open) return;
    try {
      await ready;
      let s = {n: 0, b: 0};
      try { s = await stats(await dirAt(['models'], false)); } catch {}
      const snap = S.root ? await readSnap() : null;
      last = snap ? new Date(snap.savedAt).toLocaleString() : t('never');
      const where = S.mode === 'folder' ? `${t('w_folder')} “${S.root.name}”` : t('w_' + S.mode);
      $('qb-stat').textContent = `${t('saveTo')}: ${where} · ${t('models')}: ${s.n} (${fmtSize(s.b)}) · ${t('lastSaved')}: ${last}` + (S.pending ? ` · ${t('needPerm')}` : '');
      $('qb-grant').hidden = !S.pending;
      $('qb-forget').hidden = S.mode !== 'folder' && !S.pending;
      $('qb-install').hidden = !deferredInstall;
    } catch {}
  }
  function relabel() {
    if (!panel) return;
    panel.querySelectorAll('[data-sk]').forEach(el => { el.textContent = t(el.dataset.sk); });
    refresh();
  }
  async function useFolder(handle) {
    const old = S.root;
    S.root = handle; S.mode = 'folder'; S.pending = null;
    await idbSet('dir', handle);
    if (old && S.mode === 'folder') { try { await copyDir(old, handle); } catch {} }   // migrate what is already stored
    await syncCache().catch(() => {});
    await saveData(true).catch(() => {});
  }
  const guard = fn => async () => { try { await fn(); } catch (e) { if (!e || e.name !== 'AbortError') toast(t('failed')); } refresh(); };

  function build() {
    panel = document.createElement('details');
    panel.id = 'qb-storage';
    panel.innerHTML = `<summary data-sk="stTitle"></summary><p id="qb-stat" class="info"></p><div class="btns">
      <button id="qb-pick" data-sk="pick"></button><button id="qb-grant" data-sk="grant" hidden></button>
      <button id="qb-save" data-sk="saveNow"></button><button id="qb-restore" data-sk="restore"></button>
      <button id="qb-sync" data-sk="syncModel"></button><button id="qb-forget" data-sk="forget" hidden></button>
      <button id="qb-install" data-sk="install" hidden></button></div>`;
    (document.querySelector('main section') || document.body).append(panel);
    panel.addEventListener('toggle', refresh);

    $('qb-pick').onclick = guard(async () => {
      if (!window.showDirectoryPicker) return toast(t('unsup'));
      const picked = await showDirectoryPicker({id: 'quotebook', mode: 'readwrite'});
      await useFolder(await picked.getDirectoryHandle('Quotebook', {create: true}));
      toast(t('saved'));
    });
    $('qb-grant').onclick = guard(async () => {
      if (await S.pending.requestPermission({mode: 'readwrite'}) === 'granted') { await useFolder(S.pending); toast(t('saved')); }
    });
    $('qb-save').onclick = guard(async () => { await saveData(true); toast(t('saved')); });
    $('qb-restore').onclick = guard(async () => {
      const snap = await readSnap();
      if (!snap) return toast(t('nofile'));
      if (!confirm(t('confirmRestore'))) return;
      applySnap(snap); location.reload();
    });
    $('qb-sync').onclick = guard(async () => toast(t('synced').replace('{n}', await syncCache())));
    $('qb-forget').onclick = guard(async () => {
      await idbSet('dir', undefined); S.pending = null; S.root = await opfs(); S.mode = S.root ? 'opfs' : 'none';
    });
    $('qb-install').onclick = guard(async () => { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } });
    const lang = $('lang'); if (lang) lang.addEventListener('click', () => setTimeout(relabel, 0));
    relabel();
  }
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; refresh(); });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', build) : build();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
''')

write("css/offline.css", r'''
#qb-storage { margin: 1.2em 0; padding: .6em .9em; border: 1px solid rgba(128,128,128,.4); border-radius: 8px; }
#qb-storage summary { cursor: pointer; font-weight: 600; }
#qb-storage .info { font-size: .85em; opacity: .75; margin: .6em 0; overflow-wrap: anywhere; }
#qb-storage [hidden] { display: none !important; }
#qb-toast {
  position: fixed; left: 50%; bottom: 1.5rem; transform: translate(-50%, 1rem);
  padding: .55em 1.1em; border-radius: 999px; background: #1e2327; color: #fff;
  font-size: .9rem; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; z-index: 50;
}
#qb-toast.on { opacity: 1; transform: translate(-50%, 0); }
''')

# --------------------------------------------------------------------------- sw.js
write("sw.js", r'''
// v2: offline app shell + cached CDN scripts. Model files are handled by js/offline.js (File System API).
// Bump V to force-clear old caches after a big change.
const V = 'qb-v2';
const CDN = /(^|\.)(jsdelivr\.net|esm\.sh|unpkg\.com|cdnjs\.cloudflare\.com|skypack\.dev)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(['./', 'index.html'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('qb-') && k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin === location.origin) {
    // stale-while-revalidate; navigations fall back to the cached shell when offline
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })
        .catch(async () => hit || (r.mode === 'navigate' ? await c.match('index.html') : null) || Response.error());
      return hit || net;
    }));
  } else if (CDN.test(u.hostname) && !r.headers.has('range')) {
    // versioned CDN files are effectively immutable: cache-first
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(r);
      if (hit) return hit;
      const res = await fetch(r);
      if (res.ok || res.type === 'opaque') c.put(r, res.clone());
      return res;
    }));
  }
});
''')

# ------------------------------------------------------------ manifest and icons
write("manifest.webmanifest", '''{
  "id": "./",
  "name": "Quotebook",
  "short_name": "Quotebook",
  "description": "Save quotes and turn them into mood-matched images, on-device.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "categories": ["productivity", "lifestyle"],
  "background_color": "#1e2327",
  "theme_color": "#1e2327",
  "icons": [
    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
    {"src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"}
  ]
}
''')

if not (root / "icon.svg").exists():
    write("icon.svg", '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="#1e2327"/>
<text x="256" y="360" font-family="Georgia,serif" font-size="360" text-anchor="middle" fill="#e9c46a">&#8220;</text>
</svg>
''')


def make_png(n):
    """Dependency-free RGBA PNG: dark rounded square with a gold quote mark."""
    bg, gold, ss, rad = (30, 35, 39), (233, 196, 106), 2, n * 0.22

    def in_bg(x, y):
        cx, cy = min(max(x, rad), n - rad), min(max(y, rad), n - rad)
        return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad

    def in_gold(x, y):
        r, cy = 0.11 * n, 0.46 * n
        for cx in (0.36 * n, 0.64 * n):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                return True
            if cx - r <= x <= cx - 0.02 * n and cy <= y <= cy + 0.2 * n:
                return True
        return False

    raw = bytearray()
    for py in range(n):
        raw.append(0)
        for px in range(n):
            b = g = 0
            for sy in range(ss):
                for sx in range(ss):
                    x, y = px + (sx + .5) / ss, py + (sy + .5) / ss
                    if in_bg(x, y):
                        b += 1
                        g += in_gold(x, y)
            if b == 0:
                raw += b"\x00\x00\x00\x00"
                continue
            k = g / b
            raw += bytes([round(gold[i] * k + bg[i] * (1 - k)) for i in range(3)]) + bytes([round(255 * b / (ss * ss))])

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


for size in (192, 512):
    (root / f"icon-{size}.png").write_bytes(make_png(size))
    print(f"  wrote icon-{size}.png")

# ------------------------------------------------------------------- index.html
html_path = root / "index.html"
html = html_path.read_text(encoding="utf-8")
if "offline.js" in html:
    print("  index.html already patched")
else:
    head_add = '<link rel="stylesheet" href="css/offline.css">\n<script src="js/offline.js"></script>\n</head>'
    if "</head>" in html:
        html = html.replace("</head>", head_add, 1)
        if 'rel="manifest"' not in html:
            html = html.replace("<title>", '<meta name="theme-color" content="#1e2327">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="icon-192.png">\n<title>', 1)
        else:
            html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icon-192.png">', 1)
        html_path.write_text(html, encoding="utf-8")
        print("  patched index.html")
    else:
        print("  ! could not find </head> in index.html; add the two lines from this script by hand")

# ----------------------------------------------------------------------- README
readme_path = root / "README.md"
marker = "## Offline & local storage"
readme = readme_path.read_text(encoding="utf-8") if readme_path.exists() else ""
if marker in readme:
    print("  README already patched")
else:
    readme += f"""

{marker}

`js/offline.js` (a classic script loaded before `main.js`) persists the AI model and your quotes to real files.

- **Model**: downloads from Hugging Face / jsDelivr are saved as files and read back on later visits, so clearing the browser cache doesn't force a re-download.
- **Quotes**: localStorage is mirrored to `quotebook-data.json` (plus up to 10 rolling backups in `backups/`) and restored automatically if the browser data disappears.
- **Where**: open *Storage & backup* and choose a folder (Chrome/Edge desktop, File System Access API). Without a folder, or in browsers that can't pick one, the browser-private file system (OPFS) is used.
- **Installable**: `sw.js` + `manifest.webmanifest` + icons. Bump `V` in `sw.js` to clear old app caches.
"""
    readme_path.write_text(readme, encoding="utf-8")
    print("  patched README.md")

print("\nDone. Test: python3 -m http.server, open http://localhost:8000, open 'Storage & backup', choose a folder, reload and watch the model load from disk.")
