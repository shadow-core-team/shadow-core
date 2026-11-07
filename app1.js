const CATS = { game: 'ألعاب', tool: 'برامج', util: 'أدوات' };
const CAT_ONE = { game: 'لعبة', tool: 'برنامج', util: 'أداة' };
const CAT_META = {
  game: { desc: 'ترفيه وتسلية لوقت فراغك', icon: '<path d="M6 11h4M8 9v4"/><circle cx="15.5" cy="10.5" r=".8" fill="currentColor"/><circle cx="17.5" cy="12.5" r=".8" fill="currentColor"/><path d="M7 6h10a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4c-1.5 0-2-.5-3-2h-4c-1 1.5-1.5 2-3 2a4 4 0 0 1-4-4v-3a4 4 0 0 1 4-4z"/>' },
  tool: { desc: 'أدوات مفيدة لهاتفك', icon: '<path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2-2z"/>' },
  util: { desc: 'أدوات صغيرة تسهّل مهامك', icon: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12h8M12 8v8"/>' }
};
const $ = (id) => document.getElementById(id);
const state = { cat: 'all', q: '', member: 'all', sort: 'new' };
const STORE_KEY = 'hub-custom-v1';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function dlUrl(u) {
  u = String(u || '').trim();
  const abs = safeUrl(u); if (abs) return abs;
  return (/^[\w\-./]+\.(apk|xapk|apks|aab|zip|exe)$/i.test(u) && !u.includes('..') && !u.startsWith('/')) ? u : null;
}
function isFile(u) { return /\.(apk|xapk|apks|aab|zip|exe)(\?|#|$)/i.test(String(u || '')); }
function safeUrl(u) { try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch (e) { return null; } }
function hostOf(u) { try { return new URL(u).hostname; } catch (e) { return ''; } }
function first(s) { return Array.from(String(s || '?'))[0]; }
function hue(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.codePointAt(0)) % 360; return h; }
function tileBg(name) { const h = hue(name); return 'linear-gradient(135deg, hsl(' + h + ' 70% 58%), hsl(' + ((h + 40) % 360) + ' 70% 40%))'; }
function fmtDate(d) {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (e) { return d || ''; }
}
function toast(msg) {
  const t = $('toast'); t.querySelector('span').textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1800);
}
function copyText(text, fallbackEl) {
  const done = () => toast('تم النسخ');
  const fail = () => { if (fallbackEl) { fallbackEl.focus(); fallbackEl.select(); } toast('حدّد النص وانسخه يدوياً'); };
  let ok = false;
  try {
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(t); t.focus(); t.select(); t.setSelectionRange(0, text.length);
    ok = document.execCommand('copy'); t.remove();
  } catch (e) { ok = false; }
  if (ok) { done(); return; }
  try { navigator.clipboard.writeText(text).then(done, fail); } catch (e) { fail(); }
}

/* ---- قراءة التطبيقات من apps.json ---- */
let custom = [];
function allApps() { return APPS.concat(custom); }
function cleanApp(a) {
  if (!a || typeof a !== 'object' || !a.name || !dlUrl(a.url)) return null;
  const s = (v) => (v == null ? '' : String(v));
  return { id: s(a.id || a.name), name: s(a.name), cat: CATS[a.cat] ? a.cat : 'tool', platform: s(a.platform || 'Android'),
    version: s(a.version), size: s(a.size), date: s(a.date), url: s(a.url), desc: s(a.desc), notes: s(a.notes), minAndroid: s(a.minAndroid), rAvg: 0, rN: 0, whatsNew: s(a.whatsNew), dl: 0, kw: s(a.kw), icon: safeSrc(a.icon) ? s(a.icon) : '' };
}
function loadApps() {
  fetch('apps.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((list) => { if (Array.isArray(list)) { custom = list.filter((x) => x && !x.hidden).map(cleanApp).filter(Boolean); render(); loadCounts(); loadRatings(); } })
    .catch(() => {});
}
/* ---- عدد التحميلات: يُقرأ من GitHub Releases (حقيقي، بدون خادم) ---- */
function fmtN(n) { try { return Number(n).toLocaleString('ar-EG-u-nu-latn'); } catch (e) { return String(n); } }
function repoOf(u) { const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\//i.exec(String(u || '')); return m ? m[1] + '/' + m[2] : null; }
function applyCounts(map) {
  let any = false;
  custom.forEach((a) => { const n = map[a.url]; if (typeof n === 'number') { a.dl = n; any = true; } });
  if (any) render();
}
function loadCounts() {
  const repos = Array.from(new Set(custom.map((a) => repoOf(a.url)).filter(Boolean)));
  repos.forEach((r) => {
    const key = 'sc-dl-' + r; let map = null;
    try { const c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 600000) map = c.m; } catch (e) {}
    if (map) { applyCounts(map); return; }
    fetch('https://api.github.com/repos/' + r + '/releases?per_page=100', { headers: { Accept: 'application/vnd.github+json' } })
      .then((x) => (x.ok ? x.json() : Promise.reject()))
      .then((rels) => {
        const m = {};
        rels.forEach((rl) => (rl.assets || []).forEach((as) => { m[as.browser_download_url] = as.download_count || 0; }));
        try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), m: m })); } catch (e) {}
        applyCounts(m);
      }).catch(() => {});
  });
}
/* ---- التقييمات (Firestore REST، بدون مكتبات) ---- */
function ratingsOn() { return !!(String(RATINGS.projectId || '').trim() && String(RATINGS.apiKey || '').trim()); }
function fsBase() { return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(RATINGS.projectId.trim()) + '/databases/(default)/documents'; }
function devId() {
  try { let d = localStorage.getItem('sc-dev'); if (!d) { d = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('sc-dev', d); } return d; }
  catch (e) { return 'anon'; }
}
function myStars(a) { try { return Number(localStorage.getItem('sc-r-' + a.id)) || 0; } catch (e) { return 0; } }
function starsText(a) { return '★ ' + a.rAvg.toFixed(1) + ' (' + fmtN(a.rN) + ')'; }
function fetchRating(a) {
  const body = { structuredAggregationQuery: {
    structuredQuery: { from: [{ collectionId: 'ratings' }], where: { fieldFilter: { field: { fieldPath: 'app' }, op: 'EQUAL', value: { stringValue: a.id } } } },
    aggregations: [{ alias: 'n', count: {} }, { alias: 'avg', avg: { field: { fieldPath: 'stars' } } }] } };
  return fetch(fsBase() + ':runAggregationQuery?key=' + encodeURIComponent(RATINGS.apiKey.trim()), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((j) => {
      const f = (j && j[0] && j[0].result && j[0].result.aggregateFields) || {};
      const n = Number(f.n && f.n.integerValue) || 0;
      const v = f.avg ? Number(f.avg.doubleValue != null ? f.avg.doubleValue : f.avg.integerValue) : 0;
      a.rN = n; a.rAvg = n ? (v || 0) : 0;
    }).catch(() => {});
}
function loadRatings() {
  if (!ratingsOn()) return;
  Promise.all(custom.slice(0, 40).map(fetchRating)).then(() => render());
}
function sendRating(a, n) {
  const key = encodeURIComponent(a.id).replace(/%/g, '_') + '__' + devId();
  return fetch(fsBase() + '/ratings/' + key + '?key=' + encodeURIComponent(RATINGS.apiKey.trim()), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { app: { stringValue: a.id }, stars: { integerValue: String(n) } } })
  }).then((r) => { if (!r.ok) throw new Error('rate'); try { localStorage.setItem('sc-r-' + a.id, String(n)); } catch (e) {} });
}
function buildRate(a) {
  const box = $('dRate'); box.textContent = '';
  if (!ratingsOn()) { box.hidden = true; return; }
  box.hidden = false;
  const head = el('div', 'rate-t', a.rN ? 'تقييم الزوار: ' + starsText(a) : 'لا توجد تقييمات بعد. كن أول من يقيّم');
  const row = el('div', 'rate-s'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'قيّم التطبيق');
  const draw = (cur) => {
    row.textContent = '';
    for (let i = 1; i <= 5; i++) {
      const b = el('button', 'star' + (i <= cur ? ' on' : ''), '★'); b.type = 'button'; b.setAttribute('aria-label', i + ' من 5');
      b.addEventListener('click', () => {
        row.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        sendRating(a, i).then(() => { toast('شكراً لتقييمك'); return fetchRating(a); })
          .catch(() => toast('تعذّر إرسال التقييم الآن'))
          .then(() => { draw(myStars(a)); head.textContent = a.rN ? 'تقييم الزوار: ' + starsText(a) : head.textContent; render(); });
      });
      row.appendChild(b);
    }
  };
  draw(myStars(a));
  box.appendChild(head); box.appendChild(row);
  const hint = el('div', 'rate-h'); box.appendChild(hint);
  const hintText = () => { hint.textContent = myStars(a) ? 'تقييمك الحالي ' + myStars(a) + ' من 5، يمكنك تغييره.' : 'اضغط على النجمة لتقييم التطبيق من 1 إلى 5.'; };
  hintText(); row.addEventListener('click', () => setTimeout(hintText, 700));
}
function setTile(t, a) {
  t.textContent = ''; t.style.background = tileBg(a.name);
  if (a.icon && safeSrc(a.icon)) { const im = document.createElement('img'); im.src = a.icon; im.alt = ''; im.loading = 'lazy'; t.appendChild(im); t.style.background = 'var(--surface-2)'; }
  else t.textContent = first(a.name);
}

/* ---- عرض الأعمال ---- */
/* SEARCH-START */
const AR_DIAC = /[\u064B-\u065F\u0670\u0640]/g;
function norm(x) {
  return String(x || '').toLowerCase().replace(AR_DIAC, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
}
function words(x) { return norm(x).split(/[^\p{L}\p{N}]+/u).filter(Boolean); }
function variants(w) {
  const bases = [w];
  if (w.length > 3 && w.startsWith('ال')) bases.push(w.slice(2));
  bases.slice().forEach((b) => { if (b.length > 3 && 'يتنوبلفك'.includes(b[0])) bases.push(b.slice(1)); });
  const out = new Set(bases);
  bases.forEach((b) => { ['ات', 'ون', 'ين', 'ان', 'ها', 'ه', 'ي'].forEach((suf) => { if (b.length > suf.length + 2 && b.endsWith(suf)) out.add(b.slice(0, -suf.length)); }); });
  return Array.from(out).filter((v) => v.length >= 2);
}
const SYN = [
  ['حذف', 'مسح', 'ازاله', 'تنظيف', 'نظف', 'تفريغ'],
  ['ملف', 'ملفات'],
  ['لعبه', 'العاب', 'لعب'],
  ['برنامج', 'برامج', 'اداه', 'ادوات'],
  ['صوره', 'صور', 'تصوير'],
  ['مهام', 'تذكير', 'تنظيم'],
  ['مصاريف', 'ميزانيه', 'حسابات', 'نقود']
].map((g) => g.map((w) => variants(norm(w))));
function expand(q) {
  const qv = variants(q); const set = new Set(qv);
  SYN.forEach((g) => { if (g.some((vs) => vs.some((v) => qv.includes(v)))) g.forEach((vs) => vs.forEach((v) => set.add(v))); });
  return Array.from(set);
}
function queryTokens(q) { return words(q).filter((w) => w.length >= 2).map(expand); }
function flat(text) { const out = []; words(text).forEach((w) => variants(w).forEach((v) => out.push(v))); return out; }
function indexOf(a) {
  const nameV = flat(a.name);
  const allV = nameV.concat(flat([a.desc, a.kw, CAT_ONE[a.cat], 'تطبيق اندرويد'].join(' ')));
  return { nameV: nameV, allV: allV };
}
function scoreApp(a, toks) {
  const ix = indexOf(a); let s = 0;
  for (const t of toks) {
    if (t.some((x) => ix.nameV.some((h) => h.includes(x)))) { s += 3; continue; }
    if (!t.some((x) => ix.allV.some((h) => h.includes(x)))) return -1;
    s += 1;
  }
  return s;
}
function suggestionList(q) {
  const toks = queryTokens(q);
  const list = allApps().map((a) => [a, toks.length ? scoreApp(a, toks) : 0]).filter((x) => x[1] >= 0);
  list.sort((x, y) => (y[1] - x[1]) || (y[0].date || '').localeCompare(x[0].date || ''));
  return list.slice(0, 6).map((x) => x[0]);
}
/* SEARCH-END */

function visible() {
  const toks = queryTokens(state.q);
  const scored = [];
  allApps().forEach((a) => {
    if (state.cat !== 'all' && a.cat !== state.cat) return;
    if (state.member !== 'all' && a.author !== state.member) return;
    const sc = toks.length ? scoreApp(a, toks) : 0;
    if (sc < 0) return;
    scored.push([a, sc]);
  });
  const by = state.sort === 'name'
    ? (a, b) => a.name.localeCompare(b.name, 'ar')
    : state.sort === 'pop'
      ? (a, b) => (b.dl - a.dl) || (b.date || '').localeCompare(a.date || '')
    : state.sort === 'old'
      ? (a, b) => (a.date || '').localeCompare(b.date || '')
      : (a, b) => (b.date || '').localeCompare(a.date || '');
  scored.sort((x, y) => (y[1] - x[1]) || by(x[0], y[0]));
  return scored.map((x) => x[0]);
}

const DL_ICON = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3v10"/><path d="M5.5 9L10 13.5 14.5 9"/><path d="M4 16.5h12"/></svg>';

function tag(text, extra) { const t = el('span', 'tag' + (extra ? ' ' + extra : ''), text); return t; }

function card(a) {
  const c = el('article', 'card');
  const head = el('div', 'ch');
  const tile = el('div', 'tile'); setTile(tile, a); tile.setAttribute('aria-hidden', 'true');
  const ct = el('div', 'ct');
  ct.appendChild(el('h3', '', a.name));
  ct.appendChild(el('div', 'cat', CAT_ONE[a.cat] || ''));
  head.appendChild(tile); head.appendChild(ct);
  c.appendChild(head);
  if (a.desc) c.appendChild(el('p', 'desc', a.desc));
  const spec = el('div', 'spec');
  spec.appendChild(tag(a.platform));
  if (a.version) spec.appendChild(tag('v' + a.version));
  if (a.size) spec.appendChild(tag(a.size));
  if (a.rN > 0) spec.appendChild(tag(starsText(a)));
  if (a.dl > 0) spec.appendChild(tag(fmtN(a.dl) + ' تحميل'));
  if (a.pro) spec.appendChild(tag('Pro', 'pro'));
  c.appendChild(spec);
  const foot = el('div', 'cf');
  const acts = el('div', 'acts');
  const get = el('a', 'btn sm'); get.innerHTML = DL_ICON; get.appendChild(document.createTextNode('تحميل'));
  get.href = dlUrl(a.url) || '#'; get.target = '_blank'; get.rel = 'noopener noreferrer';
  get.addEventListener('click', (e) => startDownload(e, a));
  const more = el('button', 'btn ghost sm', 'التفاصيل'); more.type = 'button';
  more.addEventListener('click', () => openDetail(a));
  acts.appendChild(get); acts.appendChild(more);
  foot.appendChild(acts);
  c.appendChild(foot);
  return c;
}

function renderCats() {
  const box = $('catCards'); box.textContent = '';
  const apps = allApps();
  Object.keys(CATS).filter((k) => apps.some((a) => a.cat === k)).forEach((k) => {
    const m = CAT_META[k] || { desc: '', icon: '<circle cx="12" cy="12" r="8"/>' };
    const c = el('button', 'cat-card'); c.type = 'button';
    const ic = el('div', 'ico'); ic.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + m.icon + '</svg>';
    c.appendChild(ic); c.appendChild(el('h3', '', CATS[k]));
    const n = apps.filter((a) => a.cat === k).length;
    c.appendChild(el('p', '', m.desc));
    c.appendChild(el('span', 'cnt', n === 1 ? 'تطبيق واحد' : n === 2 ? 'تطبيقان' : n <= 10 ? n + ' تطبيقات' : n + ' تطبيقاً'));
    c.addEventListener('click', () => {
      state.cat = k; state.q = ''; $('search').value = ''; render();
      $('apps').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    box.appendChild(c);
  });
}

function renderChips() {
  const box = $('chips'); box.textContent = '';
  const apps = allApps();
  const defs = [['all', 'الكل', apps.length]].concat(Object.keys(CATS).map((k) => [k, CATS[k], apps.filter((a) => a.cat === k).length]).filter((x) => x[2] > 0));
  defs.forEach(([key, label, n]) => {
    const b = el('button', 'chip'); b.type = 'button';
    b.setAttribute('aria-pressed', String(state.cat === key));
    b.appendChild(document.createTextNode(label));
    b.appendChild(el('span', 'n', String(n)));
    b.addEventListener('click', () => { state.cat = key; render(); });
    box.appendChild(b);
  });
}

function render() {
  const has = allApps().length > 0;
  const multi = Object.keys(CATS).filter((k) => allApps().some((a) => a.cat === k)).length >= 2;
  $('soon').hidden = has; $('appTools').hidden = !has; $('cats').hidden = !(has && multi); $('chips').hidden = !multi;
  document.querySelectorAll('a[href="#cats"]').forEach((x) => { x.hidden = !(has && multi); });
  renderChips();
  renderCats();
  const list = visible();
  const grid = $('grid'); grid.textContent = '';
  list.forEach((a) => grid.appendChild(card(a)));
  $('empty').hidden = list.length > 0 || !has;
  $('resCount').textContent = 'عرض ' + list.length + ' من ' + allApps().length;
}

