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
