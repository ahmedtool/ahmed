'use strict';
/* =========================================================
   ميزان — التشغيل: الدخول، التنقل، لوحة الأوامر، البيانات التجريبية
   ========================================================= */

const NAV = [
  ['الرئيسية', [['dash', 'لوحة التحكم', 'home'], ['ops', 'مركز العمليات', 'bolt']]],
  ['المحاسبة العامة', [['accounts', 'دليل الحسابات', 'tree'], ['journal', 'دفتر اليومية', 'book'], ['je-new', 'قيد يومية جديد', 'plus'], ['ledger', 'كشف حساب', 'list']]],
  ['المبيعات والمشتريات', [['sales', 'المبيعات', 'file'], ['customers', 'العملاء', 'users'], ['purchases', 'المشتريات', 'truck'], ['suppliers', 'الموردون', 'users'], ['items', 'المخزون', 'box']]],
  ['الخزينة', [['vouchers', 'سندات القبض والصرف', 'swap'], ['cheques', 'الشيكات', 'card']]],
  ['الأصول والموظفون', [['assets', 'الأصول الثابتة', 'building'], ['employees', 'الموظفون والرواتب', 'person']]],
  ['التقارير', [['reports', 'مركز التقارير', 'chart'], ['rep-tb', 'ميزان المراجعة', 'scale'], ['rep-is', 'قائمة الدخل', 'chart'], ['rep-bs', 'المركز المالي', 'building']]],
  ['النظام', [['log', 'سجل العمليات', 'clock'], ['settings', 'الإعدادات', 'sliders']]],
];
const NAV_PARENT = { 'inv-new': p => (['purchase', 'pret'].includes(p.kind) ? 'purchases' : 'sales'), 'item-card': () => 'items' };

/* ---------- التوجيه ---------- */
function go(pg, params = {}) {
  if (!PAGES[pg]) pg = 'dash';
  R.page = pg; R.params = { ...params };
  render();
  window.scrollTo(0, 0);
  $('#app').classList.remove('nav-open');
  if (!IN_FRAME) try { history.replaceState(null, '', '#' + pg); } catch (e) { /* تجاهل */ }
}
function render() {
  const P = PAGES[R.page];
  const main = $('#main');
  try {
    main.innerHTML = P.render(R.params);
    if (P.after) P.after(R.params);
  } catch (err) {
    console.error(err);
    main.innerHTML = head('حدث خطأ') + `<div class="card"><p>تعذّر عرض الصفحة: ${esc(err.message)}</p>${goBtn('dash', 'العودة للوحة التحكم', null, 'pri')}</div>`;
  }
  document.title = `${P.title} · ميزان`;
  const active = NAV_PARENT[R.page] ? NAV_PARENT[R.page](R.params) : R.page.startsWith('rep-') && !$(`#nav [data-go="${R.page}"]`) ? 'reports' : R.page;
  $$('#nav [data-go]').forEach(a => a.classList.toggle('on', a.dataset.go === active));
}
function refresh() {
  if (!DB || $('#app').hidden) return;
  renderShell();
  const P = PAGES[R.page];
  if (P.onRefresh) { P.onRefresh(); return; }
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
function renderShell() {
  $('#sideCompany').textContent = DB.settings.company;
  $('#demoBar').hidden = !DB.demo;
}

/* ---------- الدخول والخروج ---------- */
function showLogin() {
  $('#app').hidden = true; $('#login').hidden = false;
  $('#loginPass').value = ''; $('#loginErr').hidden = true;
  $('#loginHint').hidden = DB.settings.pass !== '1234';
  if (matchMedia('(pointer:fine)').matches) setTimeout(() => $('#loginPass').focus(), 50);
}
function showApp() {
  $('#login').hidden = true; $('#app').hidden = false;
  renderShell();
  let start = 'dash';
  try { const h = location.hash.slice(1); if (PAGES[h] && !['inv-new', 'item-card'].includes(h)) start = h; } catch (e) { /* تجاهل */ }
  go(start);
}
let _fails = 0;
function login(e) {
  e.preventDefault();
  const v = $('#loginPass').value.replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d));
  if (v === DB.settings.pass) { _fails = 0; pref.sset('auth', '1'); showApp(); return; }
  _fails++;
  const err = $('#loginErr');
  err.textContent = _fails >= 3 ? `كلمة المرور غير صحيحة (${digits(_fails)} محاولات). كلمة المرور المؤقتة هي 1234 ما لم تُغيَّر.` : 'كلمة المرور غير صحيحة';
  err.hidden = false;
  $('#loginCard').classList.remove('shake'); void $('#loginCard').offsetWidth; $('#loginCard').classList.add('shake');
  $('#loginPass').select();
}
function logout() { pref.sset('auth', null); closeModal(); closePalette(); showLogin(); }

/* ---------- المظهر ---------- */
function toggleTheme() {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  pref.set('theme', root.dataset.theme);
}

/* ---------- لوحة الأوامر (Ctrl+K) ---------- */
let _palSel = 0, _palItems = [];
function openPalette() {
  if ($('#app').hidden) return;
  $('#palette').hidden = false; $('#palInput').value = ''; palFilter(); $('#palInput').focus();
}
function closePalette() { $('#palette').hidden = true; }
function palFilter() {
  const q = normAr($('#palInput').value.trim()).split(/\s+/).filter(Boolean);
  const pages = Object.entries(PAGES).filter(([id]) => !['inv-new', 'item-card'].includes(id)).map(([id, P]) => ({ t: 'page', id, name: P.title, cat: 'صفحة' }));
  const all = [...pages, ...OPS.map(o => ({ t: 'op', id: o.id, name: o.name, cat: CAT_NAME[o.cat] }))];
  const score = x => { const n = normAr(x.name); return q.every(w => n.includes(w)) ? (n.startsWith(q[0]) ? 0 : 1) : 2; };
  _palItems = (q.length ? all.filter(x => { const s = normAr(x.name + ' ' + x.cat); return q.every(w => s.includes(w)); }).map((x, i) => [score(x), i, x]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(r => r[2]) : all.slice(0, 0).concat(pages.slice(0, 6), OPS.filter(o => ['inv-sale', 'inv-purchase', 'rv-cust', 'pv-gen', 'je-new', 'dep-run', 'payroll-run', 'vat-settle'].includes(o.id)).map(o => ({ t: 'op', id: o.id, name: o.name, cat: CAT_NAME[o.cat] })))).slice(0, 60);
  _palSel = 0;
  $('#palList').innerHTML = _palItems.length ? _palItems.map((x, i) => `<button type="button" class="pal-item${i ? '' : ' on'}" data-i="${i}">${icon(x.t === 'page' ? 'arrow' : OPS_BY_ID.get(x.id)?.calc ? 'calc' : 'bolt')}<span>${esc(x.name)}</span><small>${esc(x.cat)}</small></button>`).join('') : '<p class="empty">لا توجد نتائج</p>';
  $('#palCount').textContent = q.length ? `${digits(_palItems.length)} نتيجة` : `${digits(OPS_COUNT)} عملية — اكتب للبحث`;
}
function palPick(i) {
  const x = _palItems[i]; if (!x) return;
  closePalette();
  if (x.t === 'page') go(x.id); else runOp(x.id);
}
function palMove(d) {
  const items = $$('#palList .pal-item'); if (!items.length) return;
  _palSel = (_palSel + d + items.length) % items.length;
  items.forEach((b, i) => b.classList.toggle('on', i === _palSel));
  items[_palSel].scrollIntoView({ block: 'nearest' });
}

/* ---------- الأحداث العامة ---------- */
ACT.csv = () => { const t = $('#main table'); if (!t) return toast('لا يوجد جدول للتصدير', 'err'); download(`${PAGES[R.page].title}-${today()}.csv`, tableToCSV(t), 'text/csv'); };
ACT.print = () => window.print();
ACT.range = t => {
  const d = today(), m0 = d.slice(0, 8) + '01', q = Math.floor((+d.slice(5, 7) - 1) / 3) * 3 + 1;
  const r = { month: [m0, d], lastmonth: [addMonths(m0, -1), dayBefore(m0)], quarter: [d.slice(0, 5) + String(q).padStart(2, '0') + '-01', d], year: [yearStart(), d], all: ['', d] }[t.dataset.r];
  go(R.page, { ...R.params, from: r[0], to: r[1] });
};
function bindGlobal() {
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-go],[data-op],[data-act],[data-close]');
    if (!t) { if (e.target.id === 'modal') closeModal(); if (e.target.id === 'palette') closePalette(); return; }
    if (t.hasAttribute('data-close')) { closeModal(); return; }
    if (t.dataset.go) {
      const inModal = t.closest('#modal'); if (inModal) closeModal();
      go(t.dataset.go, t.dataset.params ? JSON.parse(t.dataset.params) : {}); return;
    }
    if (t.dataset.op) { const pre = t.dataset.preset ? JSON.parse(t.dataset.preset) : {}; if (t.closest('#modal')) closeModal(); runOp(t.dataset.op, pre); return; }
    if (t.dataset.act && ACT[t.dataset.act]) { if (t.closest('#modal') && t.dataset.act === 'je-view') closeModal(); ACT[t.dataset.act](t, e); }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-filter]'); if (!f) return;
    e.preventDefault();
    const p = { ...R.params };
    $$('input,select', f).forEach(el => { if (!el.name) return; p[el.name] = el.type === 'checkbox' ? (el.checked ? el.value : '') : el.value; });
    go(R.page, p);
  });
  document.addEventListener('change', e => { const el = e.target; if (el.matches('form[data-filter] select, form[data-filter] input[type=date], form[data-filter] input[type=checkbox]')) el.form.requestSubmit(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#palette').hidden ? openPalette() : closePalette(); return; }
    if (e.key === 'Escape') { if (!$('#confirm').hidden) $('#confirmCancel').click(); else if (!$('#palette').hidden) closePalette(); else if (!$('#modal').hidden) closeModal(); else $('#app').classList.remove('nav-open'); }
    if (!$('#palette').hidden) {
      if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); } else if (e.key === 'Enter') { e.preventDefault(); palPick(_palSel); }
    }
  });
  $('#palInput').addEventListener('input', palFilter);
  $('#palList').addEventListener('click', e => { const b = e.target.closest('.pal-item'); if (b) palPick(+b.dataset.i); });
  $('#searchBtn').onclick = openPalette;
  $('#menuBtn').onclick = () => $('#app').classList.toggle('nav-open');
  $('#scrim').onclick = () => $('#app').classList.remove('nav-open');
  $('#themeBtn').onclick = toggleTheme;
  $('#logoutBtn').onclick = logout;
  $('#loginForm').onsubmit = login;
  $('#demoClear').onclick = () => runOp('reset');
}
function buildNav() {
  $('#nav').innerHTML = NAV.map(([g, items]) => `<div class="nav-g"><span class="nav-gt">${g}</span>${items.map(([id, l, ic]) => `<button type="button" class="nav-i" data-go="${id}">${icon(ic)}<span>${l}</span>${id === 'ops' ? `<b class="nav-count">${digits(OPS_COUNT)}</b>` : ''}</button>`).join('')}</div>`).join('');
  $$('[data-i]').forEach(el => { if (el.tagName === 'I') el.outerHTML = icon(el.dataset.i); });
}

/* ---------- البيانات التجريبية ---------- */
function loadDemo() {
  let s = 20261020;
  const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), pick = a => a[Math.floor(rnd() * a.length)];
  const keep = DB ? { pass: DB.settings.pass, digits: DB.settings.digits } : {};
  setDB(freshDB());
  Object.assign(DB.settings, keep, { company: 'مؤسسة النموذج للتجارة', taxNo: '300000000000003', address: 'الرياض — حي العليا', phone: '+966 11 000 0000' });
  DB.demo = true;
  Store.hold = true;
  const t = today(), m0 = t.slice(0, 8) + '01', start = addMonths(m0, -5), tDay = +t.slice(8, 10);
  DB.settings.fyStart = start.slice(0, 4) + '-01-01';
  const day = (ms, d) => { const dd = ms === m0 ? Math.min(d, tDay) : Math.min(d, +monthEnd(ym(ms)).slice(8, 10)); return ms.slice(0, 8) + String(dd).padStart(2, '0'); };
  const J = (date, desc, lines, src = 'op') => postJE({ date, desc, src, lines });
  const tryDo = f => { try { return f(); } catch (e) { return null; } };
  try {
    J(start, 'إيداع رأس المال عند التأسيس', [{ acc: '1102', debit: 450000 }, { acc: '1101', debit: 50000 }, { acc: '3101', credit: 500000 }], 'opening');
    ['شركة الأفق للمقاولات', 'مؤسسة النخبة التجارية', 'متجر الواحة', 'شركة البيان للتقنية', 'مطاعم السنبلة', 'مكتب الرواد الهندسي'].forEach((n, i) => DB.customers.push({ id: 'c' + i, code: 'C' + String(++DB.seq.cust).padStart(3, '0'), name: n, phone: '05' + String(50000000 + i * 1234567).slice(0, 8), city: pick(['الرياض', 'جدة', 'الدمام', 'مكة المكرمة']), taxNo: i % 2 ? '' : '3100' + (123456789 + i * 1111) + '03', limit: 60000 }));
    ['شركة التوريدات المتحدة', 'مصنع الجودة للورق', 'مؤسسة الإمداد السريع', 'الشركة الوطنية للإلكترونيات'].forEach((n, i) => DB.suppliers.push({ id: 's' + i, code: 'S' + String(++DB.seq.supp).padStart(3, '0'), name: n, phone: '05' + String(60000000 + i * 2345678).slice(0, 8), city: pick(['الرياض', 'جدة', 'الدمام']), limit: 0 }));
    [['ورق تصوير A4', 'كرتون', 'قرطاسية', 85, 135, 25], ['حبر طابعة ليزر', 'حبة', 'مستلزمات طباعة', 180, 295, 10], ['شاشة ٢٤ بوصة', 'حبة', 'إلكترونيات', 520, 799, 5], ['لوحة مفاتيح لاسلكية', 'حبة', 'إلكترونيات', 65, 115, 10],
      ['فأرة لاسلكية', 'حبة', 'إلكترونيات', 35, 69, 15], ['كرسي مكتبي', 'حبة', 'أثاث', 340, 595, 6], ['ملفات علاقي', 'درزن', 'قرطاسية', 18, 35, 30], ['آلة حاسبة مكتبية', 'حبة', 'قرطاسية', 42, 79, 10]]
      .forEach(([n, u, c, cost, price, min], i) => DB.items.push({ id: 'i' + i, code: 'P' + String(++DB.seq.item).padStart(4, '0'), name: n, unit: u, cat: c, cost, price, min, qty: 0 }));
    [['أحمد سالم الدوسري', 'مدير المبيعات', 6000, 1500], ['محمد عبدالله العتيبي', 'محاسب', 4500, 1125], ['سارة فهد القحطاني', 'مسؤولة مشتريات', 4000, 1000], ['خالد ناصر الزهراني', 'أمين مستودع', 3500, 875]]
      .forEach(([n, j, b, h], i) => DB.employees.push({ id: 'e' + i, code: 'E' + String(++DB.seq.emp).padStart(3, '0'), name: n, job: j, idNo: '', hire: addMonths(start, -12 * (i + 1)), basic: b, housing: h, transport: 400, other: 0, gosi: 9.75, active: true }));
    const addAsset = (name, accC, cost, life, date) => { const je = J(date, 'شراء أصل ثابت: ' + name, [{ acc: accC, debit: cost }, { acc: '1108', debit: r2(cost * 0.15) }, { acc: '1102', credit: r2(cost * 1.15) }], 'asset'); DB.assets.push({ id: uid(), code: 'FA' + String(++DB.seq.asset).padStart(3, '0'), name, acc: accC, cost, salvage: 0, life, method: 'sl', date, accDep: 0, status: 'active', deps: {}, je: je.id }); };
    addAsset('أثاث المعرض والمكاتب', '1204', 45000, 5, day(start, 3));
    addAsset('أجهزة حاسب ونقاط بيع', '1206', 24000, 4, day(start, 4));
    addAsset('سيارة توصيل', '1203', 85000, 5, day(addMonths(start, 1), 10));
    for (let k = 0; k < 6; k++) {
      const ms = addMonths(start, k), cur = ms === m0, mk = ym(ms);
      for (let n = 0; n < 2; n++) {
        const sel = DB.items.filter((_, i) => i % 2 === n && !(cur && n));
        if (!sel.length) continue;
        tryDo(() => saveInvoice('purchase', { date: day(ms, 2 + n * 9), party: 's' + ((k + n) % 4), pay: n ? '1102' : 'credit', vat: true, disc: 0, lines: sel.map(it => ({ item: it.id, qty: it.min * ri(k ? 7 : 9, k ? 10 : 11), price: it.cost })) }));
      }
      const nSales = cur ? Math.max(3, Math.round(tDay * 0.7)) : ri(19, 24);
      for (let n = 0; n < nSales; n++) {
        const avail = DB.items.filter(it => it.qty > 2);
        if (!avail.length) break;
        const lines = []; const used = new Set();
        for (let l = 0; l < ri(1, 3); l++) { const it = pick(avail); if (used.has(it.id)) continue; used.add(it.id); lines.push({ item: it.id, qty: Math.min(Math.floor(it.qty / 2), ri(Math.ceil(it.min / 2), it.min * 3)), price: it.price }); }
        const credit = rnd() < 0.55;
        tryDo(() => saveInvoice('sale', { date: day(ms, ri(k ? 1 : 12, 28)), party: credit || rnd() < 0.5 ? 'c' + ri(0, 5) : '', pay: credit ? 'credit' : pick(['1101', '1102']), vat: true, disc: rnd() < 0.2 ? 50 : 0, lines }));
      }
      if (!cur || tDay >= 15) {
        DB.customers.forEach(c => { const b = partyBal('c:' + c.id); if (b > 500) tryDo(() => saveVoucher('rv', { date: day(ms, ri(15, 26)), amount: r2(b * (rnd() < 0.5 ? 0.7 : 0.5)), cash: '1102', acc: '1103', party: c.id, desc: '' })); });
        DB.suppliers.forEach(s2 => { const b = -partyBal('s:' + s2.id); if (b > 500) tryDo(() => saveVoucher('pv', { date: day(ms, ri(16, 27)), amount: r2(b * 0.8), cash: '1102', acc: '2101', party: s2.id, desc: '' })); });
      }
      J(day(ms, 1), `سداد إيجار المعرض لشهر ${monthName(mk)}`, [{ acc: '5202', debit: 6000, cc: 'CC02' }, { acc: '1108', debit: 900 }, { acc: '1102', credit: 6900 }]);
      if (!cur || tDay >= 12) {
        const el = ri(900, 1500); J(day(ms, 12), `فاتورة الكهرباء والمياه — ${monthName(mk)}`, [{ acc: '5203', debit: el, cc: 'CC01' }, { acc: '1108', debit: r2(el * 0.15) }, { acc: '1101', credit: r2(el * 1.15) }]);
        J(day(ms, 12), `فاتورة الاتصالات والإنترنت — ${monthName(mk)}`, [{ acc: '5204', debit: 450, cc: 'CC01' }, { acc: '1108', debit: 67.5 }, { acc: '1101', credit: 517.5 }]);
      }
      if (k % 2 === 1) J(day(ms, 8), 'حملة إعلانية على وسائل التواصل', [{ acc: '5207', debit: 3500, cc: 'CC02' }, { acc: '1108', debit: 525 }, { acc: '1102', credit: 4025 }]);
      if (k === 2) J(day(ms, 20), 'صيانة أجهزة التكييف', [{ acc: '5206', debit: 1800 }, { acc: '1108', debit: 270 }, { acc: '1101', credit: 2070 }]);
      if (!cur) {
        tryDo(() => OPS_BY_ID.get('payroll-run').run({ month: mk, payNow: true, pay: '1102' }));
        tryDo(() => OPS_BY_ID.get('dep-run').run({ month: mk }));
        if (rnd() < 0.7) J(monthEnd(mk), 'إيداع فائض الصندوق في البنك', [{ acc: '1102', debit: 15000 }, { acc: '1101', credit: 15000 }]);
      }
      if (k === 3) { const inv = DB.invoices.find(i => i.kind === 'sale' && i.pay === 'credit' && i.date >= ms); if (inv) tryDo(() => saveInvoice('sret', { date: day(ms, 25), party: inv.party, pay: 'credit', vat: true, disc: 0, lines: [{ item: inv.lines[0].item, qty: 1, price: inv.lines[0].price }] })); }
      if (k === 4) tryDo(() => saveInvoice('pret', { date: day(ms, 14), party: 's1', pay: 'credit', vat: true, disc: 0, lines: [{ item: 'i0', qty: 5, price: 85 }] }));
    }
    const due = (n) => addDays(t, n);
    const part = (p, f) => Math.round(Math.abs(partyBal(p)) * f / 100) * 100;
    const topC = DB.customers.map(c => 'c:' + c.id).sort((a, b) => partyBal(b) - partyBal(a));
    const topS = DB.suppliers.map(c => 's:' + c.id).sort((a, b) => partyBal(a) - partyBal(b));
    if (part(topC[0], 0.5) > 0) tryDo(() => OPS_BY_ID.get('chq-in').run({ chqNo: '104522', bank: 'مصرف الراجحي', party: topC[0].slice(2), amount: part(topC[0], 0.5), date: addDays(t, -12), due: due(6) }));
    if (part(topC[1], 0.5) > 0) tryDo(() => OPS_BY_ID.get('chq-in').run({ chqNo: '558120', bank: 'البنك الأهلي', party: topC[1].slice(2), amount: part(topC[1], 0.5), date: addDays(t, -30), due: due(-2) }));
    if (part(topS[0], 0.6) > 0) tryDo(() => OPS_BY_ID.get('chq-out').run({ chqNo: '000731', bank: '1102', party: topS[0].slice(2), amount: part(topS[0], 0.6), date: addDays(t, -6), due: due(4) }));
    tryDo(() => saveInvoice('quote', { date: t, party: 'c4', pay: 'credit', vat: true, disc: 100, lines: [{ item: 'i2', qty: 3, price: 699 }, { item: 'i3', qty: 3, price: 99 }] }));
    const y = t.slice(0, 4);
    [['4101', 1500000], ['5201', 260000], ['5202', 72000], ['5203', 16000], ['5207', 15000], ['5204', 6000]].forEach(([a, v]) => DB.budgets.push({ acc: a, year: y, amount: v }));
    const ci = DB.items.find(i => i.id === 'i5'); if (ci && ci.qty > ci.min) { const q = ci.qty - Math.max(1, ci.min - 2); tryDo(() => saveInvoice('sale', { date: t, party: 'c1', pay: 'credit', vat: true, disc: 0, lines: [{ item: 'i5', qty: q, price: ci.price }] })); }
  } finally { Store.hold = false; }
  DB.log = DB.log.slice(0, 40);
  commit('تحميل البيانات التجريبية');
}

/* ---------- الإقلاع ---------- */
function boot() {
  const th = pref.get('theme'); if (th === 'dark' || th === 'light') document.documentElement.dataset.theme = th;
  const saved = Store.load();
  if (saved && saved.accounts && saved.settings) {
    const base = freshDB();
    for (const k of Object.keys(base)) if (saved[k] === undefined) saved[k] = base[k];
    saved.seq = { ...base.seq, ...saved.seq };
    setDB(saved);
  } else { setDB(freshDB()); loadDemo(); }
  buildNav();
  bindGlobal();
  if (pref.sget('auth') === '1') showApp(); else showLogin();
}
document.addEventListener('DOMContentLoaded', boot);
