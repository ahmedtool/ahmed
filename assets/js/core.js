'use strict';
/* =========================================================
   ميزان — النواة: أدوات عامة، التخزين، محرك القيد المزدوج
   ========================================================= */

/* ---------- أدوات عامة ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const IN_FRAME = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const s = String(v ?? '').replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d)).replace(/٫/g, '.').replace(/[,٬\s]/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
const r2 = n => { n = num(n); return Math.round(n * 100 + (n >= 0 ? 1e-7 : -1e-7)) / 100; };
const r4 = n => Math.round(num(n) * 10000) / 10000;
const sum = (arr, f = x => x) => arr.reduce((s, x) => s + num(f(x)), 0);

/* ---------- تنسيق الأرقام والتواريخ ---------- */
const _nf = {};
function nf(d) {
  const loc = (typeof DB !== 'undefined' && DB && DB.settings.digits === 'arab') ? 'ar-SA-u-nu-arab' : 'en-US';
  const k = loc + d;
  return _nf[k] || (_nf[k] = new Intl.NumberFormat(loc, { minimumFractionDigits: d, maximumFractionDigits: d }));
}
const f2 = n => nf(2).format(r2(n));
const f0 = n => nf(0).format(Math.round(num(n)));
const fN = (n, d = 2) => nf(d).format(num(n));
const pct = (n, d = 2) => (num(n) < 0 ? '\u2066' + fN(n, d) + '٪\u2069' : fN(n, d) + '٪');
const money = n => { n = r2(n); return `<span class="n${n < 0 ? ' neg' : ''}" dir="ltr">${f2(n)}</span>`; };
const amt = n => r2(n) ? money(n) : '<span class="n zero">—</span>';
const cur = () => DB.settings.currency;
const digits = s => (DB.settings.digits === 'arab' ? String(s).replace(/\d/g, d => AR_DIGITS[d]) : String(s));

function today() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
const fdate = s => (s ? digits(s) : '');
const ym = s => String(s).slice(0, 7);
function addDays(s, n) { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function addMonths(s, n) { const d = new Date(s + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); }
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthName = s => { const [y, m] = String(s).split('-'); return MONTHS[+m - 1] + ' ' + digits(y); };
const monthEnd = s => { const [y, m] = s.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
function hijri(s) {
  try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura' + (DB.settings.digits === 'arab' ? '' : '-nu-latn'), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(s + 'T12:00:00Z')); }
  catch (e) { return ''; }
}
const yearStart = () => (DB.settings.fyStart || today().slice(0, 4) + '-01-01');

/* ---------- تفقيط المبالغ ---------- */
function tafqeet(amount, curName = 'ريال', subName = 'هللة') {
  amount = r2(Math.abs(num(amount)));
  if (amount >= 1e15) return 'المبلغ أكبر من الحد المسموح';
  const int = Math.floor(amount), frac = Math.round((amount - int) * 100);
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hund = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const scales = [null, ['ألف', 'ألفان', 'آلاف', 'ألفاً'], ['مليون', 'مليونان', 'ملايين', 'مليوناً'], ['مليار', 'ملياران', 'مليارات', 'ملياراً'], ['تريليون', 'تريليونان', 'تريليونات', 'تريليوناً']];
  const u1000 = n => {
    const h = Math.floor(n / 100), r = n % 100, parts = [];
    if (h) parts.push(hund[h]);
    if (r) parts.push(r < 20 ? ones[r] : (r % 10 ? ones[r % 10] + ' و' + tens[Math.floor(r / 10)] : tens[r / 10]));
    return parts.join(' و');
  };
  const words = n => {
    if (n === 0) return 'صفر';
    const groups = [];
    for (let s = 0; n > 0; s++) {
      const g = n % 1000; n = Math.floor(n / 1000);
      if (!g) continue;
      if (s === 0) { groups.unshift(u1000(g)); continue; }
      const sc = scales[s], r = g % 100;
      if (g === 1) groups.unshift(sc[0]);
      else if (g === 2) groups.unshift(sc[1]);
      else groups.unshift(u1000(g) + ' ' + (r >= 3 && r <= 10 ? sc[2] : r >= 11 ? sc[3] : sc[0]));
    }
    return groups.join(' و');
  };
  return `فقط ${words(int)} ${curName}` + (frac ? ` و${words(frac)} ${subName}` : '') + ' لا غير';
}

/* ---------- دليل الحسابات الافتراضي ---------- */
// [الرمز، الاسم، النوع، الأب، نقدي؟]  الأنواع: A أصول، L خصوم، E حقوق ملكية، R إيرادات، X مصروفات
const COA = [
  ['1', 'الأصول', 'A', ''], ['11', 'الأصول المتداولة', 'A', '1'],
  ['1101', 'الصندوق', 'A', '11', 1], ['1102', 'البنك', 'A', '11', 1], ['1103', 'العملاء (ذمم مدينة)', 'A', '11'],
  ['1104', 'المخزون', 'A', '11'], ['1105', 'أوراق القبض (شيكات واردة)', 'A', '11'], ['1106', 'مصروفات مدفوعة مقدماً', 'A', '11'],
  ['1107', 'إيرادات مستحقة', 'A', '11'], ['1108', 'ضريبة القيمة المضافة - مدخلات', 'A', '11'], ['1109', 'سلف الموظفين', 'A', '11'],
  ['1110', 'العهد النقدية', 'A', '11'], ['1111', 'استثمارات قصيرة الأجل', 'A', '11'], ['1112', 'مخصص الديون المشكوك فيها', 'A', '11'],
  ['1113', 'دفعات مقدمة للموردين', 'A', '11'],
  ['12', 'الأصول الثابتة', 'A', '1'], ['1201', 'الأراضي', 'A', '12'], ['1202', 'المباني', 'A', '12'], ['1203', 'السيارات', 'A', '12'],
  ['1204', 'الأثاث والمفروشات', 'A', '12'], ['1205', 'الآلات والمعدات', 'A', '12'], ['1206', 'أجهزة الحاسب الآلي', 'A', '12'], ['1209', 'مجمع الإهلاك', 'A', '12'],
  ['13', 'الأصول غير الملموسة', 'A', '1'], ['1301', 'الشهرة', 'A', '13'], ['1302', 'البرامج والتراخيص', 'A', '13'],
  ['2', 'الخصوم', 'L', ''], ['21', 'الخصوم المتداولة', 'L', '2'],
  ['2101', 'الموردون (ذمم دائنة)', 'L', '21'], ['2102', 'أوراق الدفع (شيكات صادرة)', 'L', '21'], ['2103', 'مصروفات مستحقة', 'L', '21'],
  ['2104', 'إيرادات مقدمة', 'L', '21'], ['2105', 'ضريبة القيمة المضافة - مخرجات', 'L', '21'], ['2106', 'رواتب مستحقة', 'L', '21'],
  ['2107', 'قروض قصيرة الأجل', 'L', '21'], ['2108', 'التأمينات الاجتماعية المستحقة', 'L', '21'], ['2109', 'توزيعات أرباح مستحقة', 'L', '21'],
  ['2110', 'دفعات مقدمة من العملاء', 'L', '21'], ['2111', 'الزكاة وضريبة الدخل المستحقة', 'L', '21'],
  ['22', 'الخصوم طويلة الأجل', 'L', '2'], ['2201', 'قروض طويلة الأجل', 'L', '22'], ['2202', 'مخصص مكافأة نهاية الخدمة', 'L', '22'], ['2203', 'السندات المصدرة', 'L', '22'],
  ['3', 'حقوق الملكية', 'E', ''], ['31', 'رأس المال والاحتياطيات', 'E', '3'],
  ['3101', 'رأس المال', 'E', '31'], ['3102', 'جاري المالك (المسحوبات)', 'E', '31'], ['3103', 'الاحتياطي النظامي', 'E', '31'],
  ['3104', 'الأرباح المحتجزة', 'E', '31'], ['3105', 'الأرصدة الافتتاحية', 'E', '31'],
  ['4', 'الإيرادات', 'R', ''], ['41', 'إيرادات النشاط', 'R', '4'],
  ['4101', 'إيرادات المبيعات', 'R', '41'], ['4102', 'مردودات ومسموحات المبيعات', 'R', '41'], ['4103', 'الخصم المسموح به', 'R', '41'], ['4104', 'إيرادات الخدمات', 'R', '41'],
  ['42', 'إيرادات أخرى', 'R', '4'], ['4201', 'إيرادات متنوعة', 'R', '42'], ['4202', 'إيرادات فوائد وعوائد', 'R', '42'], ['4203', 'أرباح بيع أصول', 'R', '42'],
  ['4204', 'الخصم المكتسب', 'R', '42'], ['4205', 'إيرادات الإيجار', 'R', '42'], ['4206', 'أرباح فروقات العملة', 'R', '42'],
  ['5', 'المصروفات', 'X', ''], ['51', 'تكلفة المبيعات', 'X', '5'], ['5101', 'تكلفة البضاعة المباعة', 'X', '51'], ['5102', 'تلف وعجز المخزون', 'X', '51'],
  ['52', 'المصروفات التشغيلية', 'X', '5'],
  ['5201', 'الرواتب والأجور', 'X', '52'], ['5202', 'الإيجار', 'X', '52'], ['5203', 'الكهرباء والمياه', 'X', '52'], ['5204', 'الاتصالات والإنترنت', 'X', '52'],
  ['5205', 'القرطاسية والمطبوعات', 'X', '52'], ['5206', 'الصيانة والإصلاح', 'X', '52'], ['5207', 'الدعاية والإعلان', 'X', '52'], ['5208', 'مصروف الإهلاك', 'X', '52'],
  ['5209', 'النقل والمواصلات', 'X', '52'], ['5210', 'الديون المعدومة', 'X', '52'], ['5211', 'مصروف مخصص الديون المشكوك فيها', 'X', '52'], ['5212', 'التأمين', 'X', '52'],
  ['5213', 'الرسوم الحكومية', 'X', '52'], ['5214', 'المصروفات البنكية', 'X', '52'], ['5215', 'مصروف الفوائد (تكلفة التمويل)', 'X', '52'], ['5216', 'الضيافة والنظافة', 'X', '52'],
  ['5217', 'السفر والانتقالات', 'X', '52'], ['5218', 'حصة المنشأة في التأمينات الاجتماعية', 'X', '52'], ['5219', 'مكافأة نهاية الخدمة', 'X', '52'], ['5220', 'خسائر بيع أصول', 'X', '52'],
  ['5221', 'خسائر فروقات العملة', 'X', '52'], ['5222', 'الزكاة وضريبة الدخل', 'X', '52'], ['5223', 'مصروفات متنوعة', 'X', '52'], ['5224', 'عجز الصندوق', 'X', '52'],
  ['5225', 'إطفاء الأصول غير الملموسة', 'X', '52'], ['5226', 'العمولات', 'X', '52'], ['5227', 'الأتعاب المهنية', 'X', '52'],
];
const TYPE_NAMES = { A: 'أصول', L: 'خصوم', E: 'حقوق ملكية', R: 'إيرادات', X: 'مصروفات' };
const SYS_CODES = new Set(COA.map(a => a[0]));

/* ---------- التخزين ---------- */
const STORE_KEY = 'mizan_db_v1';
const Store = {
  mem: null,
  load() { try { const s = localStorage.getItem(STORE_KEY); if (s) return JSON.parse(s); } catch (e) { /* تخزين غير متاح */ } return this.mem; },
  hold: false,
  save(db) { this.mem = db; if (this.hold) return; try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* تخزين غير متاح */ } },
};
const pref = {
  get(k, d = null) { try { const v = localStorage.getItem('mizan_' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mizan_' + k, v); } catch (e) { /* تجاهل */ } },
  sget(k) { try { return sessionStorage.getItem('mizan_' + k); } catch (e) { return pref._s[k] || null; } },
  sset(k, v) { pref._s[k] = v; try { v === null ? sessionStorage.removeItem('mizan_' + k) : sessionStorage.setItem('mizan_' + k, v); } catch (e) { /* تجاهل */ } },
  _s: {},
};

function freshDB() {
  return {
    v: 1, ver: 0, demo: false,
    settings: { company: 'مؤسستي التجارية', taxNo: '', address: '', phone: '', currency: 'ر.س', curName: 'ريال', subName: 'هللة', vat: 15, pass: '1234', digits: 'latn', fyStart: today().slice(0, 4) + '-01-01', lockDate: '' },
    accounts: COA.map(([code, name, type, parent, cash]) => ({ code, name, type, parent, grp: code.length < 4, cash: !!cash })),
    journals: [], customers: [], suppliers: [], employees: [], items: [], moves: [], invoices: [], vouchers: [], cheques: [],
    assets: [], payrolls: [], costCenters: [{ code: 'CC01', name: 'الإدارة العامة' }, { code: 'CC02', name: 'المبيعات' }, { code: 'CC03', name: 'المستودعات' }],
    budgets: [], log: [],
    seq: { je: 0, sale: 0, sret: 0, purchase: 0, pret: 0, quote: 0, rv: 0, pv: 0, chq: 0, cust: 0, supp: 0, emp: 0, item: 0, asset: 0 },
  };
}

let DB = null;
let GEN = 0; // عدّاد يُبطل الذاكرة المؤقتة عند أي تغيير
function setDB(db) { DB = db; GEN++; for (const k in _nf) delete _nf[k]; }
function commit(msg) {
  GEN++; DB.ver = (DB.ver || 0) + 1;
  if (msg) { DB.log.unshift({ t: Date.now(), d: msg }); if (DB.log.length > 1500) DB.log.length = 1500; }
  Store.save(DB);
}
const _memo = { gen: -1, m: new Map() };
function memo(key, fn) {
  if (_memo.gen !== GEN) { _memo.gen = GEN; _memo.m.clear(); }
  if (!_memo.m.has(key)) _memo.m.set(key, fn());
  return _memo.m.get(key);
}

/* ---------- الحسابات ---------- */
const accMap = () => memo('accMap', () => new Map(DB.accounts.map(a => [a.code, a])));
const acc = code => accMap().get(code);
const accName = code => acc(code)?.name || code;
const accLabel = code => `${digits(code)} · ${accName(code)}`;
const kids = () => memo('kids', () => {
  const m = new Map();
  for (const a of DB.accounts) { if (!m.has(a.parent)) m.set(a.parent, []); m.get(a.parent).push(a); }
  for (const l of m.values()) l.sort((x, y) => x.code.localeCompare(y.code, 'en', { numeric: true }));
  return m;
});
const isGroup = code => !!acc(code)?.grp;
const leaves = () => memo('leaves', () => DB.accounts.filter(a => !a.grp).sort((x, y) => x.code.localeCompare(y.code, 'en', { numeric: true })));
const cashAccs = () => memo('cash', () => leaves().filter(a => a.cash));
const isDebitNature = code => { const t = acc(code)?.type; return t === 'A' || t === 'X'; };
function isUnder(code, anc) { for (let c = code; c; c = acc(c)?.parent) if (c === anc) return true; return false; }
function accTree() {
  return memo('tree', () => {
    const out = [];
    const walk = (p, depth) => (kids().get(p) || []).forEach(a => { out.push({ a, depth }); walk(a.code, depth + 1); });
    walk('', 0);
    return out;
  });
}
function nextChildCode(parent) {
  const ch = (kids().get(parent) || []).map(a => a.code);
  const len = parent.length >= 2 ? parent.length + 2 : parent.length + 1;
  let n = 1;
  for (; ; n++) {
    const c = parent + String(n).padStart(len - parent.length, '0');
    if (!ch.includes(c) && !acc(c)) return c;
  }
}

/* ---------- الأطراف (عملاء، موردون، موظفون) ---------- */
const PARTY_ACC = { '1103': 'c', '2110': 'c', '2101': 's', '1113': 's', '1109': 'e' };
const partyList = t => (t === 'c' ? DB.customers : t === 's' ? DB.suppliers : DB.employees);
const partyName = p => { if (!p) return ''; const [t, id] = p.split(':'); return partyList(t).find(x => x.id === id)?.name || '—'; };
function partyTotals() {
  return memo('ptot', () => {
    const m = new Map();
    for (const j of DB.journals) for (const l of j.lines) if (l.party) {
      let t = m.get(l.party); if (!t) m.set(l.party, t = { d: 0, c: 0 });
      t.d += l.debit; t.c += l.credit;
    }
    return m;
  });
}
const partyBal = p => { const t = partyTotals().get(p); return t ? r2(t.d - t.c) : 0; };

/* ---------- محرك الأرصدة ---------- */
function totals(from = '', to = '') {
  return memo(`tot|${from}|${to}`, () => {
    const m = new Map();
    for (const j of DB.journals) {
      if ((from && j.date < from) || (to && j.date > to)) continue;
      for (const l of j.lines) { let t = m.get(l.acc); if (!t) m.set(l.acc, t = { d: 0, c: 0 }); t.d += l.debit; t.c += l.credit; }
    }
    const rolled = new Map();
    for (const [code, t] of m) {
      for (let c = code; c; c = acc(c)?.parent) { let r = rolled.get(c); if (!r) rolled.set(c, r = { d: 0, c: 0 }); r.d += t.d; r.c += t.c; }
    }
    return rolled;
  });
}
/** رصيد الحساب حسب طبيعته (موجب = طبيعي) */
function bal(code, from, to) { const t = totals(from, to).get(code); if (!t) return 0; return r2(isDebitNature(code) ? t.d - t.c : t.c - t.d); }
/** صافي (مدين − دائن) */
function rawBal(code, from, to) { const t = totals(from, to).get(code); return t ? r2(t.d - t.c) : 0; }
const dayBefore = d => addDays(d, -1);
const profit = (from, to) => r2(bal('4', from, to) - bal('5', from, to));
const cashTotal = to => r2(sum(cashAccs(), a => rawBal(a.code, '', to)));

/* ---------- القيود ---------- */
const SRC_NAMES = { manual: 'يدوي', opening: 'افتتاحي', op: 'عملية', sale: 'مبيعات', sret: 'مرتجع مبيعات', purchase: 'مشتريات', pret: 'مرتجع مشتريات', rv: 'سند قبض', pv: 'سند صرف', chq: 'شيك', dep: 'إهلاك', asset: 'أصل', payroll: 'رواتب', closing: 'إقفال', reverse: 'عكس', vat: 'ضريبة', stock: 'مخزون', cancel: 'إلغاء' };

function postJE({ date, desc, ref = '', src = 'manual', srcId = '', lines }) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('حدد تاريخاً صحيحاً للقيد');
  if (DB.settings.lockDate && date <= DB.settings.lockDate) throw new Error(`الفترة حتى ${fdate(DB.settings.lockDate)} مقفلة — لا يمكن الترحيل فيها`);
  const ls = [];
  for (const l of lines) {
    const d = r2(l.debit), c = r2(l.credit);
    if (!d && !c) continue;
    if (d < 0 || c < 0) throw new Error('لا يُسمح بمبالغ سالبة في أسطر القيد');
    if (d && c) throw new Error('لا يمكن أن يكون السطر مديناً ودائناً في نفس الوقت');
    const a = acc(l.acc);
    if (!a) throw new Error('الحساب غير موجود: ' + (l.acc || '(فارغ)'));
    if (a.grp) throw new Error(`«${a.name}» حساب رئيسي — اختر حساباً فرعياً للترحيل`);
    const o = { acc: l.acc, debit: d, credit: c };
    if (l.party) o.party = l.party;
    if (l.cc) o.cc = l.cc;
    if (l.memo) o.memo = String(l.memo).slice(0, 200);
    ls.push(o);
  }
  const td = r2(sum(ls, l => l.debit)), tc = r2(sum(ls, l => l.credit));
  if (!ls.length || !td) throw new Error('القيد فارغ — أدخل المبالغ');
  if (!ls.some(l => l.debit) || !ls.some(l => l.credit)) throw new Error('يجب أن يحتوي القيد على طرف مدين وطرف دائن');
  if (td !== tc) throw new Error(`القيد غير متوازن: المدين ${f2(td)} والدائن ${f2(tc)}`);
  const je = { id: uid(), no: ++DB.seq.je, date, desc: String(desc || 'قيد يومية').slice(0, 300), ref: String(ref || '').slice(0, 60), src, srcId, lines: ls, total: td, at: Date.now() };
  DB.journals.push(je);
  return je;
}
const jeById = id => DB.journals.find(j => j.id === id);
const jeByNo = no => DB.journals.find(j => j.no === Math.trunc(num(no)));
function reverseJE(je, date, desc) {
  return postJE({ date: date || today(), desc: desc || `عكس القيد رقم ${je.no}: ${je.desc}`, ref: 'عكس #' + je.no, src: 'reverse', srcId: je.id, lines: je.lines.map(l => ({ ...l, debit: l.credit, credit: l.debit })) });
}
const sortedJournals = () => memo('jsorted', () => DB.journals.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.no - b.no)));

/* ---------- الفواتير والمخزون ---------- */
const INV_KINDS = {
  sale: { t: 'فاتورة مبيعات', pre: 'INV', party: 'c', pt: 'العميل' },
  sret: { t: 'مرتجع مبيعات', pre: 'SR', party: 'c', pt: 'العميل' },
  purchase: { t: 'فاتورة مشتريات', pre: 'PUR', party: 's', pt: 'المورد' },
  pret: { t: 'مرتجع مشتريات', pre: 'PR', party: 's', pt: 'المورد' },
  quote: { t: 'عرض سعر', pre: 'QT', party: 'c', pt: 'العميل' },
};
const itemById = id => DB.items.find(i => i.id === id);

function saveInvoice(kind, d) {
  const K = INV_KINDS[kind];
  if (!K) throw new Error('نوع مستند غير معروف');
  if (!d.date) throw new Error('حدد تاريخ المستند');
  const lines = (d.lines || []).filter(l => l.item && num(l.qty) > 0).map(l => ({ item: l.item, qty: r4(l.qty), price: r2(l.price) }));
  if (!lines.length) throw new Error('أضف صنفاً واحداً على الأقل بكمية أكبر من صفر');
  if (lines.some(l => l.price < 0)) throw new Error('سعر الوحدة لا يمكن أن يكون سالباً');
  const items = lines.map(l => { const it = itemById(l.item); if (!it) throw new Error('صنف غير موجود'); return it; });
  const sub = r2(sum(lines, l => l.qty * l.price));
  const disc = r2(d.disc);
  if (disc < 0 || disc > sub) throw new Error('الخصم يجب أن يكون بين صفر وإجمالي الفاتورة');
  const net = r2(sub - disc), rate = d.vat ? num(DB.settings.vat) / 100 : 0, vat = r2(net * rate), total = r2(net + vat);
  const credit = d.pay === 'credit';
  if (credit && !d.party) throw new Error(`اختر ${K.pt} للمستند الآجل`);
  if (!credit && kind !== 'quote' && !cashAccs().some(a => a.code === d.pay)) throw new Error('اختر طريقة الدفع');
  if (kind === 'sale' || kind === 'pret') {
    const need = new Map();
    lines.forEach(l => need.set(l.item, (need.get(l.item) || 0) + l.qty));
    for (const [id, q] of need) { const it = itemById(id); if (q > it.qty + 1e-9) throw new Error(`الكمية المتاحة من «${it.name}» هي ${fN(it.qty, 0)} ${it.unit} فقط`); }
  }
  const no = (DB.seq[kind] || 0) + 1;
  const code = `${K.pre}-${String(no).padStart(4, '0')}`;
  const inv = {
    id: uid(), kind, no, code, date: d.date, party: d.party || '', pay: d.pay, note: String(d.note || '').slice(0, 300),
    lines: lines.map((l, i) => ({ ...l, name: items[i].name, unit: items[i].unit, cost: items[i].cost })), sub, disc, net, vat, vatOn: !!d.vat, total, cost: 0, je: '', status: kind === 'quote' ? 'open' : 'posted',
  };
  if (kind !== 'quote') {
    const party = credit && d.party ? `${K.party}:${d.party}` : '';
    const P = credit ? (K.party === 'c' ? '1103' : '2101') : d.pay;
    const cost = (kind === 'sale' || kind === 'sret') ? r2(lines.reduce((s, l, i) => s + l.qty * items[i].cost, 0)) : 0;
    let L;
    if (kind === 'sale') L = [{ acc: P, debit: total, party }, { acc: '4101', credit: net }, { acc: '2105', credit: vat }, { acc: '5101', debit: cost }, { acc: '1104', credit: cost }];
    else if (kind === 'sret') L = [{ acc: '4102', debit: net }, { acc: '2105', debit: vat }, { acc: P, credit: total, party }, { acc: '1104', debit: cost }, { acc: '5101', credit: cost }];
    else if (kind === 'purchase') L = [{ acc: '1104', debit: net }, { acc: '1108', debit: vat }, { acc: P, credit: total, party }];
    else L = [{ acc: P, debit: total, party }, { acc: '1104', credit: net }, { acc: '1108', credit: vat }];
    const pn = d.party ? ' — ' + partyName(`${K.party}:${d.party}`) : '';
    const je = postJE({ date: d.date, desc: `${K.t} ${code}${pn}`, ref: code, src: kind, srcId: inv.id, lines: L });
    inv.je = je.id; inv.cost = cost;
    const factor = sub ? net / sub : 1;
    lines.forEach((l, i) => {
      const it = items[i];
      if (kind === 'sale') { it.qty = r4(it.qty - l.qty); }
      else if (kind === 'sret') { it.qty = r4(it.qty + l.qty); }
      else if (kind === 'purchase') {
        const uc = l.price * factor, nq = it.qty + l.qty;
        it.cost = nq > 0 ? r4((Math.max(it.qty, 0) * it.cost + l.qty * uc) / nq) : r4(uc);
        it.qty = r4(nq);
      } else {
        const val = l.qty * l.price * factor, nq = it.qty - l.qty;
        if (nq > 0) it.cost = r4(Math.max(0, (it.qty * it.cost - val) / nq));
        it.qty = r4(nq);
      }
      DB.moves.push({ id: uid(), item: it.id, date: d.date, kind, qty: (kind === 'sale' || kind === 'pret') ? -l.qty : l.qty, cost: it.cost, price: l.price, ref: code });
    });
  }
  DB.seq[kind] = no;
  DB.invoices.push(inv);
  commit(`${K.t} ${code} بقيمة ${f2(total)}`);
  return inv;
}

function cancelInvoice(inv, date) {
  if (inv.status === 'cancelled') throw new Error('المستند ملغى مسبقاً');
  if (inv.kind === 'quote') { inv.status = 'cancelled'; commit(`إلغاء عرض السعر ${inv.code}`); return; }
  const K = INV_KINDS[inv.kind];
  // التحقق من إمكانية عكس حركة المخزون
  if (inv.kind === 'purchase' || inv.kind === 'sret') {
    for (const l of inv.lines) { const it = itemById(l.item); if (it && it.qty < l.qty - 1e-9) throw new Error(`لا يمكن الإلغاء: رصيد «${it.name}» الحالي أقل من كمية المستند`); }
  }
  const je = jeById(inv.je);
  if (je) reverseJE(je, date || today(), `إلغاء ${K.t} ${inv.code}`).src = 'cancel';
  for (const l of inv.lines) {
    const it = itemById(l.item); if (!it) continue;
    const sign = (inv.kind === 'sale' || inv.kind === 'pret') ? 1 : -1;
    it.qty = r4(it.qty + sign * l.qty);
    DB.moves.push({ id: uid(), item: it.id, date: date || today(), kind: 'cancel', qty: sign * l.qty, cost: it.cost, price: l.price, ref: 'إلغاء ' + inv.code });
  }
  inv.status = 'cancelled';
  commit(`إلغاء ${K.t} ${inv.code}`);
}

/* ---------- السندات ---------- */
function saveVoucher(type, v) {
  const a = r2(v.amount);
  if (!(a > 0)) throw new Error('أدخل مبلغاً أكبر من صفر');
  if (!v.cash) throw new Error('اختر الصندوق أو البنك');
  if (!v.acc) throw new Error('اختر الحساب المقابل');
  if (v.acc === v.cash) throw new Error('الحساب المقابل لا يمكن أن يكون نفس حساب النقدية');
  const pt = PARTY_ACC[v.acc];
  const party = pt && v.party ? `${pt}:${v.party}` : '';
  const no = (DB.seq[type] || 0) + 1, code = (type === 'rv' ? 'RV-' : 'PV-') + String(no).padStart(4, '0');
  const title = type === 'rv' ? 'سند قبض' : 'سند صرف';
  const desc = v.desc || `${title} ${code}` + (party ? ' — ' + partyName(party) : '');
  const L = type === 'rv'
    ? [{ acc: v.cash, debit: a }, { acc: v.acc, credit: a, party, cc: v.cc }]
    : [{ acc: v.acc, debit: a, party, cc: v.cc }, { acc: v.cash, credit: a }];
  const je = postJE({ date: v.date, desc, ref: code, src: type, lines: L });
  const rec = { id: uid(), type, no, code, date: v.date, cash: v.cash, acc: v.acc, party, amount: a, desc, je: je.id };
  je.srcId = rec.id;
  DB.seq[type] = no;
  DB.vouchers.push(rec);
  commit(`${title} ${code} بمبلغ ${f2(a)}`);
  return rec;
}

/* ---------- واجهة: أيقونات ---------- */
const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', bolt: 'M13 2 3 14h9l-1 8 10-12h-9z', book: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5zM4 21.5v-17M8 7h8M8 11h6',
  tree: 'M3 3h6v6H3zM15 15h6v6h-6zM15 3h6v6h-6zM6 9v9h9M6 6h9', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', plus: 'M12 5v14M5 12h14',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  truck: 'M1 4h14v12H1zM15 8h4l4 4v4h-8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  swap: 'M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4', card: 'M2 5h20v14H2zM2 10h20M6 15h4', building: 'M4 21V3h11v18M15 9h5v12M8 7h3M8 11h3M8 15h3M2 21h20',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', chart: 'M3 3v18h18M7 16v-5M12 16V8M17 16v-9', clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35', menu: 'M3 6h18M3 12h18M3 18h18', moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  x: 'M18 6 6 18M6 6l12 12', calc: 'M5 2h14v20H5zM8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8', scale: 'M12 3v18M7 21h10M4 7h16M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0zM12 3l-2 4h4z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', undo: 'M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13', copy: 'M9 9h13v13H9zM5 15H2V2h13v3',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z', check: 'M20 6 9 17l-5-5', alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  arrow: 'M15 18l-6-6 6-6', play: 'M5 3l14 9-14 9z', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
};
const icon = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ICONS.list}"/></svg>`;

/* ---------- واجهة: تنبيهات ونوافذ ---------- */
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = icon(type === 'err' ? 'alert' : 'check') + `<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), type === 'err' ? 4200 : 2600);
  setTimeout(() => el.remove(), type === 'err' ? 4600 : 3000);
}
let _modalClose = null;
function openModal(title, html, { wide = false, onClose = null } = {}) {
  const m = $('#modal');
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  m.querySelector('.modal-card').classList.toggle('wide', wide);
  m.hidden = false;
  _modalClose = onClose;
  document.body.classList.add('locked');
  const f = m.querySelector('.modal-body input:not([type=checkbox]):not([readonly]), .modal-body select, .modal-body textarea');
  if (f && matchMedia('(pointer:fine)').matches) setTimeout(() => { if (!m.contains(document.activeElement)) f.focus(); }, 30);
  return $('#modalBody');
}
function closeModal() {
  $('#modal').hidden = true;
  document.body.classList.remove('locked');
  const cb = _modalClose; _modalClose = null; if (cb) cb();
}
function ask(message, okLabel = 'تأكيد', danger = true) {
  return new Promise(res => {
    const c = $('#confirm');
    $('#confirmMsg').textContent = message;
    const ok = $('#confirmOk');
    ok.textContent = okLabel;
    ok.className = 'btn ' + (danger ? 'danger' : 'pri');
    c.hidden = false;
    const done = v => { c.hidden = true; ok.onclick = null; $('#confirmCancel').onclick = null; res(v); };
    ok.onclick = () => done(true);
    $('#confirmCancel').onclick = () => done(false);
    ok.focus();
  });
}

/* ---------- واجهة: تنزيل الملفات ---------- */
function download(name, text, mime = 'text/plain') {
  if (!IN_FRAME) {
    try {
      const blob = new Blob(['﻿' + text], { type: mime + ';charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('تم تنزيل الملف ' + name);
      return;
    } catch (e) { /* ننتقل إلى النسخ */ }
  }
  openModal('نسخ البيانات — ' + name, `<p class="muted">انسخ المحتوى التالي واحفظه في ملف باسم <b dir="ltr">${esc(name)}</b>.</p>
    <textarea class="code-area" id="dlText" readonly>${esc(text)}</textarea>
    <div class="form-actions"><button class="btn pri" id="dlCopy">${icon('copy')}نسخ إلى الحافظة</button></div>`, { wide: true });
  $('#dlCopy').onclick = () => {
    const ta = $('#dlText');
    const fallback = () => { ta.focus(); ta.select(); toast('تم تحديد النص — انسخه يدوياً'); };
    if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => toast('تم النسخ'), fallback); else fallback();
  };
}
function tableToCSV(tbl) {
  return $$('tr', tbl).map(tr => $$('th,td', tr).filter(c => !c.classList.contains('no-csv')).map(c => {
    const t = c.innerText.replace(/\s+/g, ' ').trim();
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  }).join(',')).join('\n');
}
