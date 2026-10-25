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
