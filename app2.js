/* ---- نافذة التفاصيل ---- */
const dlg = $('dlg');
function openDetail(a) {
  setTile($('dTile'), a);
  $('dTitle').textContent = a.name;
  $('dCat').textContent = CAT_ONE[a.cat] || '';
  $('dDesc').textContent = a.desc || '';
  const dl = $('dList'); dl.textContent = '';
  [['المنصة', a.platform, true], ['الإصدار', a.version, true], ['يتطلب', a.minAndroid ? 'أندرويد ' + a.minAndroid + ' أو أحدث' : '', false], ['التحميلات', a.dl > 0 ? fmtN(a.dl) : '', true], ['التقييم', a.rN > 0 ? starsText(a) : '', true], ['الحجم', a.size, true], ['آخر تحديث', fmtDate(a.date), false]].forEach(([k, v, mono]) => {
    if (!v) return;
    dl.appendChild(el('dt', '', k)); dl.appendChild(el('dd', mono ? 'm' : '', v));
  });
  buildRate(a);
  const note = $('dNote');
  note.textContent = '';
  if (a.whatsNew) { note.appendChild(el('b', '', 'الجديد في هذا الإصدار: ')); note.appendChild(document.createTextNode(a.whatsNew)); }
  if (a.notes) { if (a.whatsNew) note.appendChild(document.createElement('br')); note.appendChild(el('b', '', 'ملاحظات: ')); note.appendChild(document.createTextNode(a.notes)); }
  note.hidden = !(a.whatsNew || a.notes);
  const get = $('dGet'); get.innerHTML = DL_ICON; get.appendChild(document.createTextNode('تحميل الملف'));
  get.href = dlUrl(a.url) || '#';
  get.onclick = (e) => { try { dlg.close(); } catch (x) { dlg.removeAttribute('open'); } startDownload(e, a); };
  $('dHost').textContent = hostOf(a.url) || 'تحميل مباشر';
  const pro = $('dPro'); const proUrl = a.pro ? safeUrl(a.pro.url) : null;
  if (proUrl) { pro.href = proUrl; pro.textContent = a.pro.label || 'النسخة المدفوعة'; pro.hidden = false; } else { pro.hidden = true; }
  try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
}
$('dClose').addEventListener('click', () => { try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); } });
dlg.addEventListener('click', (e) => { if (e.target === dlg) { try { dlg.close(); } catch (x) { dlg.removeAttribute('open'); } } });

/* ---- أدوات التصفية ---- */
let sugItems = [], sugIdx = -1;
function hideSug() { $('sug').hidden = true; $('search').setAttribute('aria-expanded', 'false'); sugIdx = -1; }
function setActive(i) {
  sugIdx = i;
  $('sug').querySelectorAll('li[role="option"]').forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
}
function pickSug(a) { $('search').value = a.name; state.q = a.name; hideSug(); render(); }
function renderSug() {
  const box = $('sug'); box.textContent = '';
  sugItems = suggestionList(state.q); sugIdx = -1;
  if (!sugItems.length) { hideSug(); return; }
  if (!state.q.trim()) { const h = el('li', 'hd', 'الأحدث'); h.setAttribute('role', 'presentation'); box.appendChild(h); }
  sugItems.forEach((a, i) => {
    const li = el('li'); li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
    const t = el('div', 'tile'); setTile(t, a); t.setAttribute('aria-hidden', 'true');
    const tx = el('div', 'sg-t');
    tx.appendChild(el('span', 'sg-n', a.name));
    tx.appendChild(el('span', 'sg-d', (CAT_ONE[a.cat] || '') + (a.desc ? ' · ' + a.desc : '')));
    li.appendChild(t); li.appendChild(tx);
    li.addEventListener('click', () => pickSug(a));
    li.addEventListener('mousemove', () => setActive(i));
    box.appendChild(li);
  });
  box.hidden = false; $('search').setAttribute('aria-expanded', 'true');
}
$('search').addEventListener('input', (e) => { state.q = e.target.value; render(); renderSug(); });
$('search').addEventListener('focus', renderSug);
$('search').addEventListener('blur', hideSug);
$('sug').addEventListener('mousedown', (e) => e.preventDefault());
$('search').addEventListener('keydown', (e) => {
  if ($('sug').hidden) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((sugIdx + 1) % sugItems.length); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((sugIdx - 1 + sugItems.length) % sugItems.length); }
  else if (e.key === 'Enter' && sugIdx >= 0) { e.preventDefault(); pickSug(sugItems[sugIdx]); }
  else if (e.key === 'Escape') { hideSug(); }
});
$('sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });

/* ---- المظهر ---- */
function effectiveTheme() {
  return document.documentElement.dataset.theme || 'dark';
}
$('themeBtn').addEventListener('click', () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('hub-theme', next); } catch (e) {}
});
try { const t = localStorage.getItem('hub-theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}

/* ---- صفحة الانتظار قبل التحميل ---- */
let gateTimer = null;
function gateOn() { return DEMO || hasAd(ADS.gate); }
function closeGate() {
  clearInterval(gateTimer);
  const g = $('gate'); try { g.close(); } catch (e) { g.removeAttribute('open'); }
}
function startDownload(e, a) {
  const u = dlUrl(a.url);
  if (!u || !gateOn()) return;
  e.preventDefault();
  openGate(a, u);
}
function openGate(a, u) {
  const g = $('gate'); $('gName').textContent = a.name;
  const box = $('gateAd'); box.textContent = '';
  if (hasAd(ADS.gate)) { box.classList.add('filled'); fillAd(box, ADS.gate); }
  else { box.classList.remove('filled'); box.appendChild(el('span', '', 'مساحة إعلانية')); }
  const go = $('gGo'); go.href = u; go.hidden = true;
  const direct = isFile(u);
  go.textContent = 'تحميل';
  if (direct) { go.setAttribute('download', ''); go.removeAttribute('target'); } else { go.removeAttribute('download'); go.target = '_blank'; }
  let n = 5; const say = () => { $('gCount').textContent = 'يظهر زر التحميل بعد ' + n + ' ثانية'; };
  say(); clearInterval(gateTimer);
  gateTimer = setInterval(() => {
    n--;
    if (n > 0) { say(); return; }
    clearInterval(gateTimer);
    $('gCount').textContent = 'انتهى الإعلان. اضغط «تحميل» لبدء التحميل.';
    go.hidden = false; go.focus();
  }, 1000);
  try { g.showModal(); } catch (x) { g.setAttribute('open', ''); }
}
$('gClose').addEventListener('click', closeGate);
$('gGo').addEventListener('click', () => { setTimeout(closeGate, 900); });
$('gate').addEventListener('close', () => clearInterval(gateTimer));
$('gate').addEventListener('click', (e) => { if (e.target === $('gate')) closeGate(); });

/* ---- أزرار التواصل ---- */
const IC_WA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8z"/><path d="M9 9.5c.5 2 2.5 4 5 5l1.2-1.2-2-1-.8.7c-.8-.4-1.5-1.100-1.900-1.900l.7-.8-1-2z"/></svg>';
const IC_MAIL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>';
function initContact() {
  const box = $('contactList'); box.textContent = '';
  const foot = $('footContact'); foot.textContent = '';
  const wa = String(CONTACT.whatsapp || '').replace(/\D/g, '');
  const em = String(CONTACT.email || '').trim();
  const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
  const waHref = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('مرحباً، أتواصل معكم من موقع نواة الظل');
  const mSub = 'استفسار من موقع نواة الظل';
  const mBody = ['السلام عليكم ورحمة الله وبركاته،', '', 'فريق نواة الظل المحترم،', '', 'أتواصل معكم عبر موقعكم بخصوص: (اكتب الموضوع هنا)', '',
    'التفاصيل:', '', '', 'اسم التطبيق (إن وجد): ', 'نوع الهاتف وإصدار أندرويد (إن كان الأمر مشكلة): ', '',
    'وتفضلوا بقبول فائق الاحترام والتقدير،', 'الاسم: '].join('\r\n');
  const fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  const mailHref = fine
    ? 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(em) + '&su=' + encodeURIComponent(mSub) + '&body=' + encodeURIComponent(mBody)
    : 'mailto:' + em + '?subject=' + encodeURIComponent(mSub) + '&body=' + encodeURIComponent(mBody);
  if (wa) {
    const a = el('a', 'btn ghost sm'); a.innerHTML = IC_WA; a.appendChild(document.createTextNode('واتساب'));
    a.href = waHref; a.target = '_blank'; a.rel = 'noopener noreferrer'; box.appendChild(a);
    const li = el('li'); const f = el('a', '', 'واتساب'); f.href = waHref; f.target = '_blank'; f.rel = 'noopener noreferrer'; li.appendChild(f); foot.appendChild(li);
  }
  if (mailOk) {
    const a = el('a', 'btn ghost sm'); a.innerHTML = IC_MAIL; a.appendChild(document.createTextNode('البريد الإلكتروني'));
    a.href = mailHref; if (fine) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } box.appendChild(a);
    const li = el('li'); const f = el('a', '', 'راسلنا بالبريد'); f.href = mailHref; if (fine) { f.target = '_blank'; f.rel = 'noopener noreferrer'; } li.appendChild(f); foot.appendChild(li);
  }
  if (!foot.children.length) foot.parentElement.hidden = true;
}

/* ---- رسالة التواصل + القائمة ---- */
function initMessage() {
  const form = $('msgForm'); const btn = $('mBtn'); const msg = $('mMsg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const key = String(ORDERS.web3formsKey || '').trim();
    const name = $('mName').value.trim(); const email = $('mEmail').value.trim();
    const subject = $('mSubject').value.trim(); const text = $('mText').value.trim();
    msg.className = 'msg full';
    if (!key) {
      const em = String(CONTACT.email || '').trim();
      if (em) window.location.href = 'mailto:' + em + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text + '\n\n' + name + ' - ' + email);
      return;
    }
    btn.disabled = true; btn.textContent = 'جارٍ الإرسال...';
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: key, subject: 'رسالة من موقع نواة الظل: ' + subject, from_name: 'نواة الظل', name: name, email: email, message: text })
    }).then((r) => r.json()).then((j) => {
      if (!j || !j.success) throw new Error('send failed');
      form.reset(); msg.textContent = 'وصلت رسالتك، شكراً لك. سنرد عليك قريباً.'; msg.classList.add('ok');
    }).catch(() => {
      msg.textContent = 'تعذّر الإرسال الآن. جرّب مرة أخرى أو راسلنا عبر واتساب.'; msg.classList.add('err');
    }).then(() => { btn.disabled = false; btn.textContent = 'إرسال الرسالة'; });
  });
}
function initMenu() {
  const b = $('menuBtn'); const m = $('menu');
  const set = (open) => { m.hidden = !open; b.setAttribute('aria-expanded', String(open)); };
  b.addEventListener('click', () => set(m.hidden));
  m.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
}

/* ---- الإعلانات ---- */
function safeSrc(u) { u = String(u || ''); return (/^https:\/\//i.test(u) || /^[\w\-./]+$/.test(u)) ? u : null; }
function hasAd(c) { return typeof c === 'string' ? c.trim().length > 0 : !!(c && safeSrc(c.src)); }
function fillAd(box, c) {
  if (typeof c === 'string') {
    try { const r = document.createRange(); r.selectNodeContents(box); box.appendChild(r.createContextualFragment(c.trim())); } catch (e) {}
    return;
  }
  const src = safeSrc(c.src); if (!src) return;
  let node;
  if (c.type === 'video') {
    node = document.createElement('video');
    node.src = src; node.muted = true; node.autoplay = true; node.loop = true; node.playsInline = true;
    node.setAttribute('muted', ''); node.setAttribute('playsinline', '');
  } else {
    node = document.createElement('img'); node.src = src; node.alt = c.alt || 'إعلان';
  }
  const link = safeUrl(c.href);
  if (link) { const a = el('a'); a.href = link; a.target = '_blank'; a.rel = 'sponsored noopener noreferrer'; a.appendChild(node); box.appendChild(a); }
  else box.appendChild(node);
}
function initAds() {
  document.querySelectorAll('.ad').forEach((box) => {
    if (box.dataset.slot === 'gate') return;
    const c = ADS[box.dataset.slot];
    if (hasAd(c)) { box.classList.add('filled'); fillAd(box, c); }
    else if (DEMO) box.appendChild(el('span', '', 'مساحة إعلانية'));
    else box.hidden = true;
  });
}

/* ---- طلب عمل ---- */
function showOrder(msg, sent) {
  const n = String(CONTACT.whatsapp || '').replace(/\D/g, '');
  const wa = $('orderWa');
  $('orderText').value = msg;
  wa.hidden = !n; if (n) wa.href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg);
  $('orderText').hidden = sent === true;
  $('orderActs').hidden = sent === true;
  $('orderAgain').hidden = sent !== true;
  $('orderTitle').textContent = sent === true ? 'وصل طلبك' : (sent === false ? 'لم يصل الطلب بعد' : 'طلبك جاهز');
  $('orderNote').className = 'msg' + (sent === true ? ' ok' : (sent === false ? ' err' : ''));
  $('orderNote').textContent = sent === true ? 'وصل طلبك إلينا، وسنتواصل معك على وسيلة التواصل التي كتبتها.'
    : (sent === false ? 'تعذّر الإرسال التلقائي. أرسل الطلب بنفسك عبر واتساب، أو انسخه.'
    : 'أرسل الطلب إلينا عبر واتساب، أو انسخه.');
  $('orderInfo').hidden = true; $('orderOut').hidden = false;
  $('orderOut').scrollIntoView({ block: 'nearest' });
}
function initOrder() {
  if (!String(ORDERS.web3formsKey || '').trim()) $('orderForm').querySelector('button[type="submit"]').textContent = 'جهّز الطلب';
  $('orderNew').addEventListener('click', () => { $('orderOut').hidden = true; $('orderInfo').hidden = false; $('orderForm').scrollIntoView({ block: 'nearest' }); });
  $('orderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = [
      'طلب تصميم موقع عبر موقع نواة الظل',
      'نوع الموقع: ' + $('oType').value,
      'الاسم: ' + $('oName').value.trim(),
      'وسيلة التواصل: ' + $('oContact').value.trim(),
      'التفاصيل: ' + $('oDesc').value.trim()
    ].filter(Boolean).join('\n');
    const key = String(ORDERS.web3formsKey || '').trim();
    if (!key) { showOrder(msg, null); return; }
    const btn = $('orderForm').querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'جارٍ الإرسال...';
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: key, subject: 'طلب تصميم موقع جديد - نواة الظل', from_name: 'نواة الظل', name: $('oName').value.trim(), message: msg })
    }).then((r) => r.json()).then((j) => {
      if (!j || !j.success) throw new Error((j && j.message) || 'send failed');
      $('orderForm').reset(); showOrder(msg, true);
    }).catch(() => showOrder(msg, false)).then(() => {
      btn.disabled = false; btn.textContent = key ? 'أرسل الطلب' : 'جهّز الطلب';
    });
  });
  $('orderCopy').addEventListener('click', () => copyText($('orderText').value, $('orderText')));
}


/* ---- تشغيل ---- */
render();
initAds();
initContact();
initMessage();
initMenu();
initOrder();
loadApps();
