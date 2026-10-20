'use strict';
/* =========================================================
   ميزان — سجل العمليات المحاسبية (+٢٠٠ عملية)
   كل عملية: { id, cat, name, fields, run } أو انتقال لصفحة
   ========================================================= */

const CATS = [
  ['gl', 'القيود ودليل الحسابات', 'book'],
  ['docs', 'الفواتير والسندات والشيكات', 'file'],
  ['cap', 'رأس المال والتمويل', 'building'],
  ['cash', 'النقدية والبنوك', 'card'],
  ['sales', 'المبيعات والعملاء', 'users'],
  ['purch', 'المشتريات والموردون والمخزون', 'truck'],
  ['exp', 'المصروفات والتسويات', 'swap'],
  ['hr', 'الرواتب وشؤون الموظفين', 'person'],
  ['fa', 'الأصول الثابتة والإهلاك', 'building'],
  ['tax', 'الضرائب والزكاة', 'scale'],
  ['fx', 'العملات الأجنبية', 'swap'],
  ['rep', 'التقارير والقوائم المالية', 'chart'],
  ['ratio', 'النسب والتحليل المالي', 'chart'],
  ['fin', 'الرياضيات المالية والاستثمار', 'calc'],
  ['cost', 'التكاليف والتسعير وتقييم المخزون', 'calc'],
  ['util', 'أدوات مساعدة', 'calc'],
  ['sys', 'النظام والإعدادات', 'sliders'],
];
const CAT_NAME = Object.fromEntries(CATS.map(c => [c[0], c[1]]));
const OPS = [];
const OPS_BY_ID = new Map();
function op(o) { OPS.push(o); OPS_BY_ID.set(o.id, o); return o; }

/* ---------- منشئ النماذج ---------- */
const NUM_T = new Set(['money', 'num', 'int', 'pct']);
function F(k, l, v = '', t = 'text', x = {}) { return { k, l, v, t, ...x }; }
const normField = f => (Array.isArray(f) ? F(...f) : f);
const optList = arr => arr.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
const blankOpt = (l = '— بدون —') => `<option value="">${l}</option>`;

function accOptions(kind = 'leaf') {
  return memo('accopt|' + kind, () => {
    let list;
    if (kind === 'all') list = accTree().map(x => x.a);
    else if (kind === 'grp') list = accTree().map(x => x.a).filter(a => a.grp);
    else if (kind === 'cash') list = cashAccs();
    else if (kind === 'fixed') list = leaves().filter(a => (isUnder(a.code, '12') || isUnder(a.code, '13')) && a.code !== '1209');
    else list = leaves();
    const groups = {};
    list.forEach(a => { const t = acc(a.code).type; (groups[t] = groups[t] || []).push(a); });
    return Object.keys(TYPE_NAMES).filter(t => groups[t]).map(t => `<optgroup label="${TYPE_NAMES[t]}">${groups[t].map(a => {
      const d = kind === 'all' || kind === 'grp' ? '  '.repeat(Math.max(0, accDepth(a.code))) : '';
      return `<option value="${a.code}">${d}${esc(digits(a.code))} · ${esc(a.name)}</option>`;
    }).join('')}</optgroup>`).join('');
  });
}
const accDepth = code => { let d = 0; for (let c = acc(code)?.parent; c; c = acc(c)?.parent) d++; return d; };

function optionsFor(f) {
  switch (f.t) {
    case 'select': return optList(typeof f.opts === 'function' ? f.opts() : f.opts);
    case 'acc': return (f.blank ? blankOpt('— اختر الحساب —') : '') + accOptions('leaf');
    case 'accAll': return accOptions('all');
    case 'grp': return accOptions('grp');
    case 'cash': return accOptions('cash');
    case 'fixed': return accOptions('fixed');
    case 'payc': return `<option value="credit">آجل (على الحساب)</option>` + accOptions('cash');
    case 'cust': return blankOpt(f.req ? '— اختر العميل —' : '— بدون —') + optList(DB.customers.map(c => [c.id, c.name]));
    case 'supp': return blankOpt(f.req ? '— اختر المورد —' : '— بدون —') + optList(DB.suppliers.map(c => [c.id, c.name]));
    case 'emp': return blankOpt(f.req ? '— اختر الموظف —' : '— بدون —') + optList(DB.employees.map(c => [c.id, c.name]));
    case 'item': return blankOpt('— اختر الصنف —') + optList(DB.items.map(i => [i.id, `${i.code} · ${i.name}`]));
    case 'cc': return blankOpt() + optList(DB.costCenters.map(c => [c.code, `${c.code} · ${c.name}`]));
    default: return '';
  }
}
function fieldHtml(f) {
  const id = 'f_' + f.k, cls = 'field' + (f.full ? ' full' : '');
  if (f.t === 'check') return `<label class="${cls} check"><input type="checkbox" id="${id}" data-k="${f.k}"><span>${esc(f.l)}</span></label>`;
  let ctl;
  if (f.t === 'textarea') ctl = `<textarea id="${id}" data-k="${f.k}" rows="${f.rows || 3}"${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}></textarea>`;
  else if (f.t === 'date' || f.t === 'month' || f.t === 'password') ctl = `<input type="${f.t}" id="${id}" data-k="${f.k}">`;
  else if (f.t === 'text' || f.t === 'list') ctl = `<input type="text" id="${id}" data-k="${f.k}"${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}${f.t === 'list' ? ' dir="ltr" class="list-in"' : ''}>`;
  else if (NUM_T.has(f.t)) ctl = `<input type="text" inputmode="decimal" class="num-in" dir="ltr" id="${id}" data-k="${f.k}" data-num="1"${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}>`;
  else ctl = `<select id="${id}" data-k="${f.k}">${optionsFor(f)}</select>`;
  const suffix = f.t === 'pct' ? '<i class="sfx">٪</i>' : f.t === 'money' ? `<i class="sfx">${esc(cur())}</i>` : '';
  return `<label class="${cls}"><span>${esc(f.l)}${f.req ? ' <b class="req">*</b>' : ''}</span><div class="ctl">${ctl}${suffix}</div>${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</label>`;
}
function setValues(root, fields, vals = {}) {
  fields.forEach(f => {
    const el = root.querySelector(`[data-k="${f.k}"]`); if (!el) return;
    let v = f.k in vals ? vals[f.k] : f.v;
    if (typeof v === 'function') v = v();
    if (f.t === 'check') el.checked = !!v;
    else if (v !== undefined && v !== null) el.value = v;
  });
}
function readForm(root) {
  const o = {};
  $$('[data-k]', root).forEach(el => {
    const k = el.dataset.k;
    o[k] = el.type === 'checkbox' ? el.checked : el.dataset.num ? (el.value.trim() === '' ? '' : num(el.value)) : el.value.trim();
  });
  return o;
}
const parseList = s => String(s || '').split(/[,،؛;\s]+/).map(x => x.trim()).filter(Boolean).map(num);
function parseLots(s) {
  const lots = String(s || '').split(/[,،؛;\n]+/).map(x => x.trim()).filter(Boolean).map(x => {
    const m = x.replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d)).match(/^([\d.]+)\s*[@×x*]\s*([\d.]+)$/);
    if (!m) throw new Error(`صيغة غير صحيحة: «${x}» — استخدم الكمية@السعر مثل 100@12.5`);
    return { q: +m[1], c: +m[2] };
  });
  if (!lots.length) throw new Error('أدخل دفعة واحدة على الأقل');
  return lots;
}

/* ---------- تشغيل العمليات ---------- */
function renderResult(res) {
  if (res == null) return '';
  if (typeof res === 'string') return `<div class="res-note">${res}</div>`;
  const rows = Array.isArray(res) ? res : res.rows || [];
  let h = rows.length ? `<table class="kv">${rows.map(r => `<tr class="${r[2] ? 'main' : ''}"><th>${esc(r[0])}</th><td>${r[1]}</td></tr>`).join('')}</table>` : '';
  if (res.html) h += res.html;
  if (res.note) h += `<div class="res-note">${res.note}</div>`;
  return h;
}
async function runOp(id, preset = {}) {
  const o = OPS_BY_ID.get(id);
  if (!o) return;
  closePalette();
  if (o.go) { go(o.go, o.params || {}); return; }
  if (o.act) { await o.act(); return; }
  const fields = (typeof o.fields === 'function' ? o.fields() : o.fields || []).map(normField);
  const desc = typeof o.desc === 'function' ? o.desc() : o.desc;
  const body = openModal(o.name, `
    <div class="op-head"><span class="chip">${esc(CAT_NAME[o.cat])}</span>${o.calc ? '<span class="chip soft">حاسبة</span>' : o.kind === 'je' ? '<span class="chip soft">يُنشئ قيداً</span>' : ''}</div>
    ${desc ? `<p class="op-desc">${desc}</p>` : ''}
    <form class="form-grid" id="opForm" novalidate>${fields.map(fieldHtml).join('')}
      <div class="form-actions full"><button class="btn pri" type="submit">${icon(o.calc ? 'calc' : 'check')}${o.calc ? 'احسب' : esc(o.btn || 'تنفيذ وترحيل')}</button><button class="btn ghost" type="button" data-close>إغلاق</button></div>
    </form>
    <div id="opPreview"></div>
    <div id="opResult" class="op-result" hidden></div>`, { wide: o.wide || o.calc });
  const form = $('#opForm');
  setValues(form, fields, preset);
  const out = $('#opResult');
  let busy = false;
  const exec = async silent => {
    if (busy) return; busy = true;
    try {
      const v = readForm(form);
      for (const f of fields) if (f.req && (v[f.k] === '' || v[f.k] == null)) throw new Error(`الحقل «${f.l}» مطلوب`);
      const res = await o.run(v, form);
      if (o.calc) { out.hidden = false; out.className = 'op-result'; out.innerHTML = renderResult(res); }
      else if (res && res.cancel) { /* ألغى المستخدم */ }
      else {
        closeModal(); refresh();
        toast(res?.msg || 'تم تنفيذ العملية');
        if (res?.je) viewJE(res.je);
      }
    } catch (err) {
      if (o.calc) { out.hidden = false; out.className = 'op-result' + (silent ? '' : ' err'); out.innerHTML = `<div class="res-note">${esc(silent ? 'أدخل القيم لعرض النتيجة — ' + err.message : err.message)}</div>`; }
      else toast(err.message, 'err');
    } finally { busy = false; }
  };
  form.onsubmit = e => { e.preventDefault(); exec(false); };
  if (o.calc) {
    let t; form.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => exec(true), 250); });
    form.addEventListener('change', () => exec(true));
    exec(true);
  }
  if (o.onOpen) o.onOpen(form, body);
}

/* =========================================================
   ١) قوالب القيود المحاسبية الجاهزة
   P = حساب نقدي/بنكي يختاره المستخدم
   vo ضريبة مخرجات (دائن) | vor عكسها | vi ضريبة مدخلات (مدين) | vir عكسها
   ========================================================= */
const TPL = [
  ['cap', 'إيداع رأس المال نقداً أو في البنك', 'P', '3101'],
  ['cap', 'زيادة رأس المال بحصة عينية (سيارة)', '1203', '3101'],
  ['cap', 'مسحوبات المالك النقدية', '3102', 'P'],
  ['cap', 'مسحوبات المالك من البضاعة', '3102', '1104'],
  ['cap', 'إقفال المسحوبات في رأس المال', '3101', '3102'],
  ['cap', 'الحصول على قرض قصير الأجل', 'P', '2107'],
  ['cap', 'الحصول على قرض طويل الأجل', 'P', '2201'],
  ['cap', 'سداد قسط قرض قصير الأجل', '2107', 'P'],
  ['cap', 'سداد قسط قرض طويل الأجل', '2201', 'P'],
  ['cap', 'إعادة تبويب الجزء المتداول من القرض طويل الأجل', '2201', '2107'],
  ['cap', 'سداد فوائد القروض', '5215', 'P'],
  ['cap', 'إثبات فوائد قروض مستحقة', '5215', '2103'],
  ['cap', 'تكوين الاحتياطي النظامي', '3104', '3103'],
  ['cap', 'إعلان توزيعات أرباح', '3104', '2109'],
  ['cap', 'سداد توزيعات الأرباح', '2109', 'P'],
  ['cap', 'إصدار سندات', 'P', '2203'],
  ['cash', 'إيداع نقدية من الصندوق في البنك', '1102', '1101'],
  ['cash', 'سحب نقدية من البنك إلى الصندوق', '1101', '1102'],
  ['cash', 'عمولات ومصروفات بنكية', '5214', 'P'],
  ['cash', 'عوائد بنكية دائنة', 'P', '4202'],
  ['cash', 'صرف عهدة نقدية لموظف', '1110', 'P'],
  ['cash', 'تسوية العهدة بمصروفات', '5223', '1110'],
  ['cash', 'رد العهدة النقدية', 'P', '1110'],
  ['cash', 'إثبات عجز الصندوق', '5224', '1101'],
  ['cash', 'إثبات زيادة الصندوق', '1101', '4201'],
  ['cash', 'شراء استثمارات قصيرة الأجل', '1111', 'P'],
  ['cash', 'بيع استثمارات قصيرة الأجل بالتكلفة', 'P', '1111'],
  ['cash', 'توزيعات أرباح مستلمة من استثمارات', 'P', '4202'],
  ['sales', 'مبيعات نقدية مباشرة', 'P', '4101', 'vo'],
  ['sales', 'مبيعات آجلة مباشرة', '1103', '4101', 'vo'],
  ['sales', 'تحصيل من العملاء', 'P', '1103'],
  ['sales', 'مردودات مبيعات نقدية', '4102', 'P', 'vor'],
  ['sales', 'مردودات مبيعات آجلة', '4102', '1103', 'vor'],
  ['sales', 'خصم مسموح به للعملاء', '4103', '1103'],
  ['sales', 'استلام دفعة مقدمة من عميل', 'P', '2110'],
  ['sales', 'تسوية الدفعة المقدمة عند التسليم', '2110', '4101'],
  ['sales', 'إيرادات خدمات نقدية', 'P', '4104', 'vo'],
  ['sales', 'إيرادات خدمات آجلة', '1103', '4104', 'vo'],
  ['sales', 'استلام ورقة قبض من عميل', '1105', '1103'],
  ['sales', 'تحصيل ورقة قبض', 'P', '1105'],
  ['sales', 'ارتداد ورقة قبض', '1103', '1105'],
  ['sales', 'إعدام دين معدوم مباشرة', '5210', '1103'],
  ['sales', 'تكوين مخصص ديون مشكوك فيها', '5211', '1112'],
  ['sales', 'إعدام دين من المخصص', '1112', '1103'],
  ['sales', 'تحصيل دين سبق إعدامه', 'P', '4201'],
  ['sales', 'إيرادات إيجار محصلة', 'P', '4205', 'vo'],
  ['sales', 'إثبات إيرادات مستحقة', '1107', '4201'],
  ['sales', 'تحصيل الإيرادات المستحقة', 'P', '1107'],
  ['sales', 'تحصيل إيرادات مقدماً', 'P', '2104'],
  ['sales', 'إثبات الجزء المكتسب من الإيرادات المقدمة', '2104', '4104'],
  ['sales', 'صرف عمولة مبيعات', '5226', 'P'],
  ['purch', 'شراء بضاعة نقداً', '1104', 'P', 'vi'],
  ['purch', 'شراء بضاعة بالأجل', '1104', '2101', 'vi'],
  ['purch', 'سداد للموردين', '2101', 'P'],
  ['purch', 'مردودات مشتريات نقدية', 'P', '1104', 'vir'],
  ['purch', 'مردودات مشتريات آجلة', '2101', '1104', 'vir'],
  ['purch', 'خصم مكتسب من الموردين', '2101', '4204'],
  ['purch', 'مصاريف نقل المشتريات', '1104', 'P', 'vi'],
  ['purch', 'دفعة مقدمة لمورد', '1113', 'P'],
  ['purch', 'استلام بضاعة مقابل الدفعة المقدمة', '1104', '1113'],
  ['purch', 'تحرير ورقة دفع لمورد', '2101', '2102'],
  ['purch', 'سداد ورقة دفع', '2102', 'P'],
  ['purch', 'إثبات تكلفة البضاعة المباعة', '5101', '1104'],
  ['purch', 'إثبات تلف بضاعة', '5102', '1104'],
  ['purch', 'إثبات زيادة جرد المخزون', '1104', '4201'],
  ['purch', 'سحب بضاعة لأغراض الدعاية', '5207', '1104'],
  ['exp', 'سداد الإيجار', '5202', 'P', 'vi'],
  ['exp', 'دفع إيجار مقدم', '1106', 'P', 'vi'],
  ['exp', 'تسوية الإيجار المقدم المستنفد', '5202', '1106'],
  ['exp', 'سداد فاتورة الكهرباء والمياه', '5203', 'P', 'vi'],
  ['exp', 'إثبات كهرباء ومياه مستحقة', '5203', '2103'],
  ['exp', 'سداد فاتورة الاتصالات والإنترنت', '5204', 'P', 'vi'],
  ['exp', 'شراء قرطاسية ومطبوعات', '5205', 'P', 'vi'],
  ['exp', 'مصروفات صيانة وإصلاح', '5206', 'P', 'vi'],
  ['exp', 'مصروفات دعاية وإعلان', '5207', 'P', 'vi'],
  ['exp', 'مصروفات نقل ومواصلات', '5209', 'P'],
  ['exp', 'سداد قسط التأمين', '5212', 'P'],
  ['exp', 'دفع تأمين مقدم', '1106', 'P'],
  ['exp', 'تسوية التأمين المقدم المستنفد', '5212', '1106'],
  ['exp', 'سداد رسوم حكومية', '5213', 'P'],
  ['exp', 'مصروفات ضيافة ونظافة', '5216', 'P', 'vi'],
  ['exp', 'مصروفات سفر وانتقالات', '5217', 'P'],
  ['exp', 'أتعاب مهنية (محاسبة ومحاماة)', '5227', 'P', 'vi'],
  ['exp', 'إثبات مصروفات مستحقة', '5223', '2103'],
  ['exp', 'سداد المصروفات المستحقة', '2103', 'P'],
  ['exp', 'مصروفات متنوعة', '5223', 'P'],
  ['hr', 'إثبات استحقاق الرواتب', '5201', '2106'],
  ['hr', 'صرف الرواتب المستحقة', '2106', 'P'],
  ['hr', 'صرف رواتب مباشرة', '5201', 'P'],
  ['hr', 'صرف سلفة لموظف', '1109', 'P'],
  ['hr', 'استقطاع السلفة من الراتب', '2106', '1109'],
  ['hr', 'استرداد سلفة نقداً', 'P', '1109'],
  ['hr', 'إثبات حصة المنشأة في التأمينات', '5218', '2108'],
  ['hr', 'سداد التأمينات الاجتماعية', '2108', 'P'],
  ['hr', 'تكوين مخصص مكافأة نهاية الخدمة', '5219', '2202'],
  ['hr', 'صرف مكافأة نهاية الخدمة', '2202', 'P'],
  ['hr', 'صرف مكافآت وحوافز', '5201', 'P'],
  ['fa', 'شراء أرض', '1201', 'P'],
  ['fa', 'شراء مبنى', '1202', 'P'],
  ['fa', 'شراء سيارة نقداً', '1203', 'P', 'vi'],
  ['fa', 'شراء سيارة بالأجل', '1203', '2101', 'vi'],
  ['fa', 'شراء أثاث ومفروشات', '1204', 'P', 'vi'],
  ['fa', 'شراء آلات ومعدات', '1205', 'P', 'vi'],
  ['fa', 'شراء أجهزة حاسب آلي', '1206', 'P', 'vi'],
  ['fa', 'شراء برامج وتراخيص', '1302', 'P', 'vi'],
  ['fa', 'إثبات إهلاك الأصول (قيد مباشر)', '5208', '1209'],
  ['fa', 'إطفاء الأصول غير الملموسة', '5225', '1302'],
  ['fa', 'تحسينات رأسمالية على المعدات', '1205', 'P', 'vi'],
  ['tax', 'سداد ضريبة القيمة المضافة', '2105', 'P'],
  ['tax', 'استرداد ضريبة المدخلات', 'P', '1108'],
  ['tax', 'إثبات الزكاة أو ضريبة الدخل', '5222', '2111'],
  ['tax', 'سداد الزكاة أو ضريبة الدخل', '2111', 'P'],
  ['fx', 'إثبات أرباح فروقات العملة', 'P', '4206'],
  ['fx', 'إثبات خسائر فروقات العملة', '5221', 'P'],
];
const PARTY_FIELD = { c: ['party', 'العميل', '', 'cust'], s: ['party', 'المورد', '', 'supp'], e: ['party', 'الموظف', '', 'emp'] };

function tplLines(t, v) {
  const [, , dr0, cr0, flag] = t;
  const dr = dr0 === 'P' ? v.pay : dr0, cr = cr0 === 'P' ? v.pay : cr0;
  const a = r2(v.amount), tax = flag && v.vat ? r2(a * num(DB.settings.vat) / 100) : 0, g = r2(a + tax);
  const L = (acc, debit, credit) => ({ acc, debit, credit, party: PARTY_ACC[acc] && v.party ? `${PARTY_ACC[acc]}:${v.party}` : '', cc: (acc[0] === '4' || acc[0] === '5') ? v.cc : '' });
  if (!tax) return [L(dr, a, 0), L(cr, 0, a)];
  if (flag === 'vo') return [L(dr, g, 0), L(cr, 0, a), L('2105', 0, tax)];
  if (flag === 'vor') return [L(dr, a, 0), L('2105', tax, 0), L(cr, 0, g)];
  if (flag === 'vi') return [L(dr, a, 0), L('1108', tax, 0), L(cr, 0, g)];
  return [L(dr, g, 0), L(cr, 0, a), L('1108', 0, tax)];
}
function linesPreview(lines) {
  const ls = lines.filter(l => r2(l.debit) || r2(l.credit));
  if (!ls.length) return '';
  return `<div class="je-preview"><div class="je-preview-h">معاينة القيد</div><table class="tbl compact"><thead><tr><th>الحساب</th><th class="num">مدين</th><th class="num">دائن</th></tr></thead><tbody>${ls.map(l => `<tr><td>${l.credit ? '<span class="to">إلى ح/</span> ' : '<span class="to">من ح/</span> '}${esc(accName(l.acc))}${l.party ? ` <small class="muted">(${esc(partyName(l.party))})</small>` : ''}</td><td class="num">${amt(l.debit)}</td><td class="num">${amt(l.credit)}</td></tr>`).join('')}</tbody></table></div>`;
}
TPL.forEach((t, i) => {
  const [cat, name, dr, cr, flag] = t;
  const usesP = dr === 'P' || cr === 'P';
  const pt = PARTY_ACC[dr] || PARTY_ACC[cr];
  op({
    id: 't' + (i + 1), cat, name, kind: 'je',
    desc: () => `<span class="dc"><b>مدين:</b> ${dr === 'P' ? 'الصندوق أو البنك' : esc(accName(dr))}</span><span class="dc cr"><b>دائن:</b> ${cr === 'P' ? 'الصندوق أو البنك' : esc(accName(cr))}</span>`,
    fields: () => [
      ['date', 'التاريخ', today, 'date', { req: 1 }],
      ['amount', flag ? 'المبلغ قبل الضريبة' : 'المبلغ', '', 'money', { req: 1 }],
      ...(usesP ? [['pay', dr === 'P' ? 'حساب الاستلام' : 'حساب الدفع', cashAccs()[0]?.code || '1101', 'cash']] : []),
      ...(flag ? [['vat', `يشمل ضريبة القيمة المضافة ${digits(DB.settings.vat)}٪`, true, 'check']] : []),
      ...(pt ? [PARTY_FIELD[pt]] : []),
      ['cc', 'مركز التكلفة', '', 'cc'],
      ['ref', 'رقم المرجع', '', 'text'],
      ['desc', 'البيان', name, 'text', { full: 1 }],
    ],
    onOpen(form) {
      const upd = () => { const v = readForm(form); $('#opPreview').innerHTML = r2(v.amount) > 0 ? linesPreview(tplLines(t, v)) : ''; };
      form.addEventListener('input', upd); form.addEventListener('change', upd); upd();
    },
    run(v) {
      if (!(r2(v.amount) > 0)) throw new Error('أدخل مبلغاً أكبر من صفر');
      const je = postJE({ date: v.date, desc: v.desc || name, ref: v.ref, src: 'op', lines: tplLines(t, v) });
      commit(`${name} — قيد رقم ${je.no} بمبلغ ${f2(je.total)}`);
      return { je, msg: `تم ترحيل القيد رقم ${je.no}` };
    },
  });
});

/* =========================================================
   ٢) عمليات الوحدات (دليل الحسابات، المستندات، المخزون…)
   ========================================================= */
const nav = (id, cat, name, page, params) => op({ id, cat, name, go: page, params });

// --- القيود ودليل الحسابات ---
nav('je-new', 'gl', 'إنشاء قيد يومية يدوي متعدد الأطراف', 'je-new');
nav('je-opening', 'gl', 'إدخال قيد افتتاحي (أرصدة أول المدة)', 'je-new', { opening: 1 });
nav('journal', 'gl', 'عرض دفتر اليومية', 'journal');
nav('coa', 'gl', 'عرض دليل الحسابات الشجري', 'accounts');
nav('ledger', 'gl', 'كشف حساب (دفتر الأستاذ)', 'ledger');
op({
  id: 'acc-add', cat: 'gl', name: 'إضافة حساب جديد', btn: 'حفظ الحساب',
  fields: () => [['parent', 'الحساب الرئيسي', '11', 'grp', { req: 1 }], ['code', 'رمز الحساب', '', 'text', { req: 1 }], ['name', 'اسم الحساب', '', 'text', { req: 1 }],
    ['grp', 'حساب رئيسي (يحتوي حسابات فرعية)', false, 'check'], ['cash', 'حساب نقدي أو بنكي (يظهر في طرق الدفع)', false, 'check']],
  onOpen(form) {
    const p = form.querySelector('[data-k=parent]'), c = form.querySelector('[data-k=code]');
    const sug = () => { c.value = nextChildCode(p.value); };
    p.addEventListener('change', sug); sug();
  },
  run(v) {
    const parent = acc(v.parent);
    if (!parent || !parent.grp) throw new Error('اختر حساباً رئيسياً');
    if (!/^[0-9A-Za-z-]+$/.test(v.code)) throw new Error('رمز الحساب يقبل الأرقام والحروف اللاتينية فقط');
    if (acc(v.code)) throw new Error('رمز الحساب مستخدم مسبقاً');
    DB.accounts.push({ code: v.code, name: v.name, type: parent.type, parent: parent.code, grp: !!v.grp, cash: !v.grp && !!v.cash });
    commit(`إضافة الحساب ${v.code} ${v.name}`);
    return { msg: 'تمت إضافة الحساب ' + v.name };
  },
});
op({
  id: 'acc-rename', cat: 'gl', name: 'تعديل اسم حساب', btn: 'حفظ',
  fields: () => [['code', 'الحساب', '', 'accAll', { req: 1 }], ['name', 'الاسم الجديد', '', 'text', { req: 1 }]],
  onOpen(form) { const s = form.querySelector('[data-k=code]'), n = form.querySelector('[data-k=name]'); const f = () => { n.value = accName(s.value); }; s.addEventListener('change', f); f(); },
  run(v) { const a = acc(v.code); if (!a) throw new Error('اختر الحساب'); const old = a.name; a.name = v.name; commit(`تعديل اسم الحساب ${a.code} من «${old}» إلى «${v.name}»`); return { msg: 'تم تعديل اسم الحساب' }; },
});
op({
  id: 'acc-del', cat: 'gl', name: 'حذف حساب غير مستخدم', btn: 'حذف الحساب',
  fields: () => [['code', 'الحساب', '', 'accAll', { req: 1 }]],
  async run(v) {
    const a = acc(v.code);
    if (!a) throw new Error('اختر الحساب');
    if (SYS_CODES.has(a.code)) throw new Error('لا يمكن حذف حسابات الدليل الأساسية — يمكنك تعديل اسمها');
    if ((kids().get(a.code) || []).length) throw new Error('الحساب يحتوي على حسابات فرعية');
    if (totals().get(a.code)) throw new Error('الحساب عليه حركات — لا يمكن حذفه');
    if (!(await ask(`حذف الحساب «${a.name}» نهائياً؟`, 'حذف'))) return { cancel: true };
    DB.accounts = DB.accounts.filter(x => x.code !== a.code);
    commit(`حذف الحساب ${a.code} ${a.name}`);
    return { msg: 'تم حذف الحساب' };
  },
});
op({
  id: 'je-reverse', cat: 'gl', name: 'عكس قيد يومية', fields: () => [['no', 'رقم القيد', '', 'int', { req: 1 }], ['date', 'تاريخ القيد العكسي', today, 'date', { req: 1 }]],
  run(v) {
    const j = jeByNo(v.no); if (!j) throw new Error('لا يوجد قيد بهذا الرقم');
    if (DB.journals.some(x => x.src === 'reverse' && x.srcId === j.id)) throw new Error('تم عكس هذا القيد مسبقاً');
    const je = reverseJE(j, v.date); commit(`عكس القيد رقم ${j.no} بالقيد ${je.no}`); return { je, msg: `تم إنشاء القيد العكسي رقم ${je.no}` };
  },
});
op({
  id: 'je-copy', cat: 'gl', name: 'نسخ قيد بتاريخ جديد (قيد متكرر)', fields: () => [['no', 'رقم القيد المصدر', '', 'int', { req: 1 }], ['date', 'تاريخ القيد الجديد', today, 'date', { req: 1 }]],
  run(v) {
    const j = jeByNo(v.no); if (!j) throw new Error('لا يوجد قيد بهذا الرقم');
    const je = postJE({ date: v.date, desc: j.desc, ref: 'نسخ #' + j.no, src: 'manual', lines: j.lines.map(l => ({ ...l })) });
    commit(`نسخ القيد ${j.no} إلى القيد ${je.no}`); return { je, msg: `تم إنشاء القيد رقم ${je.no}` };
  },
});
const DELETABLE_SRC = new Set(['manual', 'opening', 'op', 'reverse', 'closing']);
async function deleteJE(j) {
  if (!DELETABLE_SRC.has(j.src)) throw new Error('هذا القيد مرتبط بمستند (فاتورة/سند/رواتب…) — ألغِ المستند أو اعكس القيد بدلاً من حذفه');
  if (DB.settings.lockDate && j.date <= DB.settings.lockDate) throw new Error('القيد ضمن فترة مقفلة');
  if (!(await ask(`حذف القيد رقم ${j.no} نهائياً؟ يُفضّل عكس القيد للحفاظ على مسار التدقيق.`, 'حذف القيد'))) return false;
  DB.journals = DB.journals.filter(x => x.id !== j.id);
  commit(`حذف القيد رقم ${j.no}: ${j.desc} (${f2(j.total)})`);
  return true;
}
op({
  id: 'je-del', cat: 'gl', name: 'حذف قيد يدوي', btn: 'حذف', fields: () => [['no', 'رقم القيد', '', 'int', { req: 1 }]],
  async run(v) { const j = jeByNo(v.no); if (!j) throw new Error('لا يوجد قيد بهذا الرقم'); return (await deleteJE(j)) ? { msg: 'تم حذف القيد' } : { cancel: true }; },
});
op({
  id: 'year-close', cat: 'gl', name: 'إقفال السنة المالية (ترحيل الأرباح للمحتجزة)', btn: 'إقفال',
  desc: 'يُقفل أرصدة جميع حسابات الإيرادات والمصروفات حتى التاريخ المحدد ويُرحّل صافي الربح أو الخسارة إلى حساب الأرباح المحتجزة.',
  fields: () => [['date', 'تاريخ الإقفال', () => addDays(addMonths(yearStart(), 12), -1), 'date', { req: 1 }]],
  async run(v) {
    const L = [];
    leaves().filter(a => a.type === 'R' || a.type === 'X').forEach(a => {
      const b = rawBal(a.code, '', v.date);
      if (b > 0) L.push({ acc: a.code, credit: b }); else if (b < 0) L.push({ acc: a.code, debit: -b });
    });
    if (!L.length) throw new Error('لا توجد أرصدة إيرادات أو مصروفات لإقفالها');
    const np = r2(bal('4', '', v.date) - bal('5', '', v.date));
    if (np > 0) L.push({ acc: '3104', credit: np }); else if (np < 0) L.push({ acc: '3104', debit: -np });
    if (!(await ask(`سيتم إقفال ${digits(L.length - 1)} حساباً وترحيل ${np >= 0 ? 'ربح' : 'خسارة'} بقيمة ${f2(Math.abs(np))} إلى الأرباح المحتجزة. متابعة؟`, 'إقفال', false))) return { cancel: true };
    const je = postJE({ date: v.date, desc: `قيد إقفال السنة المالية حتى ${v.date}`, src: 'closing', lines: L });
    commit(`إقفال السنة المالية — صافي ${f2(np)}`);
    return { je, msg: 'تم إقفال السنة المالية' };
  },
});
op({
  id: 'cc-add', cat: 'gl', name: 'إضافة مركز تكلفة', btn: 'حفظ',
  fields: () => [['code', 'رمز المركز', 'CC' + String(DB.costCenters.length + 1).padStart(2, '0'), 'text', { req: 1 }], ['name', 'اسم المركز', '', 'text', { req: 1 }]],
  run(v) { if (DB.costCenters.some(c => c.code === v.code)) throw new Error('الرمز مستخدم'); DB.costCenters.push({ code: v.code, name: v.name }); commit('إضافة مركز تكلفة ' + v.name); return { msg: 'تمت إضافة مركز التكلفة' }; },
});
op({
  id: 'budget-set', cat: 'gl', name: 'تحديد موازنة تقديرية لحساب', btn: 'حفظ الموازنة',
  fields: () => [['acc', 'الحساب', '5202', 'acc', { req: 1 }], ['year', 'السنة', today().slice(0, 4), 'int', { req: 1 }], ['amount', 'المبلغ السنوي المقدّر', '', 'money', { req: 1 }]],
  run(v) {
    const y = String(Math.trunc(v.year)); const b = DB.budgets.find(x => x.acc === v.acc && x.year === y);
    if (b) b.amount = r2(v.amount); else DB.budgets.push({ acc: v.acc, year: y, amount: r2(v.amount) });
    commit(`موازنة ${accName(v.acc)} لسنة ${y}: ${f2(v.amount)}`); return { msg: 'تم حفظ الموازنة' };
  },
});
op({
  id: 'lock', cat: 'gl', name: 'قفل الفترة المحاسبية', btn: 'حفظ',
  desc: 'يمنع إضافة أو تعديل أي قيد بتاريخ يساوي أو يسبق تاريخ القفل. اتركه فارغاً لإلغاء القفل.',
  fields: () => [['date', 'قفل حتى تاريخ', DB.settings.lockDate, 'date']],
  run(v) { DB.settings.lockDate = v.date || ''; commit(v.date ? 'قفل الفترة حتى ' + v.date : 'إلغاء قفل الفترة'); return { msg: v.date ? 'تم قفل الفترة' : 'تم إلغاء القفل' }; },
});
op({ id: 'exp-coa', cat: 'gl', name: 'تصدير دليل الحسابات (CSV)', act: () => download('دليل-الحسابات.csv', ['الرمز,الاسم,النوع,الأب,رئيسي,الرصيد', ...accTree().map(({ a }) => [a.code, `"${a.name}"`, TYPE_NAMES[a.type], a.parent, a.grp ? 'نعم' : 'لا', bal(a.code)].join(','))].join('\n'), 'text/csv') });
op({ id: 'exp-je', cat: 'gl', name: 'تصدير دفتر اليومية (CSV)', act: () => download('دفتر-اليومية.csv', ['رقم القيد,التاريخ,البيان,الحساب,اسم الحساب,مدين,دائن', ...sortedJournals().flatMap(j => j.lines.map(l => [j.no, j.date, `"${j.desc.replace(/"/g, '""')}"`, l.acc, `"${accName(l.acc)}"`, l.debit, l.credit].join(',')))].join('\n'), 'text/csv') });

// --- المستندات: الفواتير والسندات والشيكات ---
nav('inv-sale', 'docs', 'إصدار فاتورة مبيعات', 'inv-new', { kind: 'sale' });
nav('inv-purchase', 'docs', 'تسجيل فاتورة مشتريات', 'inv-new', { kind: 'purchase' });
nav('inv-sret', 'docs', 'تسجيل مرتجع مبيعات', 'inv-new', { kind: 'sret' });
nav('inv-pret', 'docs', 'تسجيل مرتجع مشتريات', 'inv-new', { kind: 'pret' });
nav('inv-quote', 'docs', 'إنشاء عرض سعر', 'inv-new', { kind: 'quote' });
op({
  id: 'quote-conv', cat: 'docs', name: 'تحويل عرض سعر إلى فاتورة مبيعات', btn: 'تحويل',
  fields: () => [['q', 'عرض السعر', '', 'select', { req: 1, opts: () => [['', '— اختر —'], ...DB.invoices.filter(i => i.kind === 'quote' && i.status === 'open').map(i => [i.id, `${i.code} · ${partyName('c:' + i.party) || 'بدون عميل'} · ${f2(i.total)}`])] }],
    ['pay', 'طريقة الدفع', 'credit', 'payc'], ['date', 'تاريخ الفاتورة', today, 'date', { req: 1 }]],
  run(v) {
    const q = DB.invoices.find(i => i.id === v.q); if (!q) throw new Error('اختر عرض السعر');
    const inv = saveInvoice('sale', { date: v.date, party: q.party, pay: v.pay, lines: q.lines, disc: q.disc, vat: q.vatOn, note: 'محوّل من ' + q.code });
    q.status = 'converted'; commit();
    return { msg: `تم إنشاء الفاتورة ${inv.code}`, je: jeById(inv.je) };
  },
});
op({
  id: 'inv-cancel', cat: 'docs', name: 'إلغاء فاتورة أو مرتجع (بقيد عكسي)', btn: 'إلغاء المستند',
  fields: () => [['inv', 'المستند', '', 'select', { req: 1, opts: () => [['', '— اختر —'], ...DB.invoices.filter(i => i.status === 'posted').slice(-300).reverse().map(i => [i.id, `${i.code} · ${INV_KINDS[i.kind].t} · ${f2(i.total)}`])] }], ['date', 'تاريخ الإلغاء', today, 'date', { req: 1 }]],
  async run(v) {
    const inv = DB.invoices.find(i => i.id === v.inv); if (!inv) throw new Error('اختر المستند');
    if (!(await ask(`إلغاء ${INV_KINDS[inv.kind].t} ${inv.code} وعكس قيده وحركة المخزون؟`, 'إلغاء المستند'))) return { cancel: true };
    cancelInvoice(inv, v.date); return { msg: 'تم إلغاء المستند ' + inv.code };
  },
});
const voucherOp = (id, type, name, accDef, pt) => op({
  id, cat: 'docs', name, kind: 'je', btn: 'حفظ السند',
  fields: () => [['date', 'التاريخ', today, 'date', { req: 1 }], ['amount', 'المبلغ', '', 'money', { req: 1 }], ['cash', type === 'rv' ? 'إلى (الصندوق/البنك)' : 'من (الصندوق/البنك)', cashAccs()[0]?.code, 'cash', { req: 1 }],
    ...(pt ? [PARTY_FIELD[pt].slice(0, 3).concat([PARTY_FIELD[pt][3], { req: 1 }])] : [['acc', type === 'rv' ? 'الحساب الدائن (المقابل)' : 'الحساب المدين (المقابل)', accDef, 'acc', { req: 1 }]]),
    ['cc', 'مركز التكلفة', '', 'cc'], ['desc', 'البيان', '', 'text', { full: 1, ph: 'يُولّد تلقائياً إن تُرك فارغاً' }]],
  onOpen(form) {
    const a = form.querySelector('[data-k=amount]');
    const tip = document.createElement('small'); tip.className = 'tafqeet'; a.closest('.field').appendChild(tip);
    a.addEventListener('input', () => { tip.textContent = r2(num(a.value)) > 0 ? tafqeet(a.value, DB.settings.curName, DB.settings.subName) : ''; });
  },
  run(v) { const rec = saveVoucher(type, { ...v, acc: pt ? accDef : v.acc }); return { je: jeById(rec.je), msg: `تم حفظ ${type === 'rv' ? 'سند القبض' : 'سند الصرف'} ${rec.code}` }; },
});
voucherOp('rv-cust', 'rv', 'سند قبض من عميل', '1103', 'c');
voucherOp('rv-gen', 'rv', 'سند قبض عام', '4201');
voucherOp('pv-supp', 'pv', 'سند صرف لمورد', '2101', 's');
voucherOp('pv-gen', 'pv', 'سند صرف عام (مصروف أو أي حساب)', '5223');
op({
  id: 'cash-xfer', cat: 'cash', name: 'تحويل بين حسابات النقدية والبنوك', kind: 'je',
  fields: () => [['date', 'التاريخ', today, 'date', { req: 1 }], ['amount', 'المبلغ', '', 'money', { req: 1 }], ['from', 'من حساب', '1101', 'cash', { req: 1 }], ['to', 'إلى حساب', '1102', 'cash', { req: 1 }], ['desc', 'البيان', 'تحويل بين الحسابات النقدية', 'text', { full: 1 }]],
  run(v) {
    if (v.from === v.to) throw new Error('اختر حسابين مختلفين');
    if (r2(v.amount) > rawBal(v.from)) throw new Error(`رصيد ${accName(v.from)} لا يكفي (${f2(rawBal(v.from))})`);
    const je = postJE({ date: v.date, desc: v.desc, src: 'op', lines: [{ acc: v.to, debit: v.amount }, { acc: v.from, credit: v.amount }] });
    commit(`تحويل ${f2(v.amount)} من ${accName(v.from)} إلى ${accName(v.to)}`); return { je };
  },
});
const pendingChq = () => [['', '— اختر الشيك —'], ...DB.cheques.filter(c => c.status === 'pending').map(c => [c.id, `${c.kind === 'in' ? 'وارد' : 'صادر'} · رقم ${c.chqNo} · ${partyName(c.party)} · ${f2(c.amount)} · يستحق ${c.due}`])];
function chqOp(id, kind, name) {
  op({
    id, cat: 'docs', name, kind: 'je', btn: 'حفظ الشيك',
    fields: () => [['chqNo', 'رقم الشيك', '', 'text', { req: 1 }], ['bank', kind === 'in' ? 'البنك المسحوب عليه' : 'من حساب البنك', kind === 'in' ? '' : '1102', kind === 'in' ? 'text' : 'cash', { req: 1 }],
      kind === 'in' ? ['party', 'العميل', '', 'cust', { req: 1 }] : ['party', 'المورد', '', 'supp', { req: 1 }],
      ['amount', 'المبلغ', '', 'money', { req: 1 }], ['date', 'تاريخ التحرير', today, 'date', { req: 1 }], ['due', 'تاريخ الاستحقاق', () => addDays(today(), 30), 'date', { req: 1 }]],
    run(v) {
      if (!(r2(v.amount) > 0)) throw new Error('أدخل مبلغ الشيك');
      const party = (kind === 'in' ? 'c:' : 's:') + v.party;
      const L = kind === 'in' ? [{ acc: '1105', debit: v.amount }, { acc: '1103', credit: v.amount, party }] : [{ acc: '2101', debit: v.amount, party }, { acc: '2102', credit: v.amount }];
      const je = postJE({ date: v.date, desc: `${kind === 'in' ? 'استلام' : 'تحرير'} شيك رقم ${v.chqNo} — ${partyName(party)}`, ref: 'شيك ' + v.chqNo, src: 'chq', lines: L });
      DB.cheques.push({ id: uid(), no: ++DB.seq.chq, kind, chqNo: v.chqNo, bank: v.bank, party, amount: r2(v.amount), date: v.date, due: v.due, status: 'pending', je: je.id });
      commit(`${name} رقم ${v.chqNo} بمبلغ ${f2(v.amount)}`); return { je };
    },
  });
}
chqOp('chq-in', 'in', 'تسجيل شيك وارد من عميل');
chqOp('chq-out', 'out', 'تحرير شيك صادر لمورد');
op({
  id: 'chq-clear', cat: 'docs', name: 'تحصيل شيك وارد / صرف شيك صادر', kind: 'je',
  fields: () => [['chq', 'الشيك', '', 'select', { req: 1, opts: pendingChq }], ['bankAcc', 'حساب البنك (للشيك الوارد)', '1102', 'cash'], ['date', 'التاريخ', today, 'date', { req: 1 }]],
  run(v) {
    const c = DB.cheques.find(x => x.id === v.chq); if (!c) throw new Error('اختر الشيك');
    const L = c.kind === 'in' ? [{ acc: v.bankAcc, debit: c.amount }, { acc: '1105', credit: c.amount }] : [{ acc: '2102', debit: c.amount }, { acc: cashAccs().some(a => a.code === c.bank) ? c.bank : v.bankAcc, credit: c.amount }];
    const je = postJE({ date: v.date, desc: `${c.kind === 'in' ? 'تحصيل' : 'صرف'} الشيك رقم ${c.chqNo}`, ref: 'شيك ' + c.chqNo, src: 'chq', lines: L });
    c.status = 'cleared'; c.clearedOn = v.date;
    commit(`${c.kind === 'in' ? 'تحصيل' : 'صرف'} الشيك ${c.chqNo}`); return { je };
  },
});
op({
  id: 'chq-bounce', cat: 'docs', name: 'تسجيل ارتداد شيك', kind: 'je',
  fields: () => [['chq', 'الشيك', '', 'select', { req: 1, opts: pendingChq }], ['date', 'تاريخ الارتداد', today, 'date', { req: 1 }]],
  run(v) {
    const c = DB.cheques.find(x => x.id === v.chq); if (!c) throw new Error('اختر الشيك');
    const L = c.kind === 'in' ? [{ acc: '1103', debit: c.amount, party: c.party }, { acc: '1105', credit: c.amount }] : [{ acc: '2102', debit: c.amount }, { acc: '2101', credit: c.amount, party: c.party }];
    const je = postJE({ date: v.date, desc: `ارتداد الشيك رقم ${c.chqNo} — ${partyName(c.party)}`, ref: 'شيك ' + c.chqNo, src: 'chq', lines: L });
    c.status = 'bounced'; commit(`ارتداد الشيك ${c.chqNo}`); return { je };
  },
});
nav('vouchers', 'docs', 'سجل سندات القبض والصرف', 'vouchers');
nav('cheques', 'docs', 'سجل الشيكات وتواريخ الاستحقاق', 'cheques');

// --- العملاء والموردون ---
function partyAddOp(id, t, name) {
  op({
    id, cat: t === 'c' ? 'sales' : 'purch', name, btn: 'حفظ',
    fields: () => [['name', 'الاسم', '', 'text', { req: 1 }], ['phone', 'الجوال', '', 'text'], ['email', 'البريد الإلكتروني', '', 'text'], ['taxNo', 'الرقم الضريبي', '', 'text'],
      ['city', 'المدينة', '', 'text'], ...(t === 'c' ? [['limit', 'حد الائتمان', '', 'money']] : []), ['opening', t === 'c' ? 'رصيد افتتاحي مدين (له علينا = سالب)' : 'رصيد افتتاحي دائن (مستحق له)', '', 'money'], ['openDate', 'تاريخ الرصيد الافتتاحي', yearStart, 'date']],
    run(v) {
      const list = partyList(t);
      if (list.some(x => x.name === v.name)) throw new Error('الاسم مسجل مسبقاً');
      const key = t === 'c' ? 'cust' : 'supp';
      const rec = { id: uid(), code: (t === 'c' ? 'C' : 'S') + String(++DB.seq[key]).padStart(3, '0'), name: v.name, phone: v.phone, email: v.email, taxNo: v.taxNo, city: v.city, limit: r2(v.limit || 0) };
      list.push(rec);
      const ob = r2(v.opening || 0);
      if (ob) {
        const pacc = t === 'c' ? '1103' : '2101', party = t + ':' + rec.id;
        const positiveDebit = t === 'c' ? ob > 0 : ob < 0;
        const a = Math.abs(ob);
        postJE({ date: v.openDate || yearStart(), desc: `رصيد افتتاحي — ${rec.name}`, src: 'opening', lines: positiveDebit ? [{ acc: pacc, debit: a, party }, { acc: '3105', credit: a }] : [{ acc: '3105', debit: a }, { acc: pacc, credit: a, party }] });
      }
      commit(`إضافة ${t === 'c' ? 'العميل' : 'المورد'} ${rec.name}`);
      return { msg: `تمت إضافة ${rec.name}` };
    },
  });
}
partyAddOp('cust-add', 'c', 'إضافة عميل جديد');
partyAddOp('supp-add', 's', 'إضافة مورد جديد');
op({ id: 'cust-stmt', cat: 'sales', name: 'كشف حساب عميل', btn: 'عرض الكشف', fields: () => [['p', 'العميل', '', 'cust', { req: 1 }]], run(v) { closeModal(); go('ledger', { party: 'c:' + v.p }); return { cancel: true }; } });
op({ id: 'supp-stmt', cat: 'purch', name: 'كشف حساب مورد', btn: 'عرض الكشف', fields: () => [['p', 'المورد', '', 'supp', { req: 1 }]], run(v) { closeModal(); go('ledger', { party: 's:' + v.p }); return { cancel: true }; } });
nav('customers', 'sales', 'قائمة العملاء وأرصدتهم', 'customers');
nav('suppliers', 'purch', 'قائمة الموردين وأرصدتهم', 'suppliers');
nav('aging-c', 'sales', 'أعمار ديون العملاء', 'rep-aging', { t: 'c' });
nav('aging-s', 'purch', 'أعمار أرصدة الموردين', 'rep-aging', { t: 's' });
op({
  id: 'bad-debt-prov', cat: 'sales', name: 'احتساب مخصص الديون المشكوك فيها حسب الأعمار', kind: 'je',
  desc: 'يحسب المخصص المطلوب بتطبيق نسب على شرائح أعمار الديون، ويرحّل الفرق عن الرصيد الحالي للمخصص.',
  fields: () => [['date', 'التاريخ', today, 'date', { req: 1 }], ['p1', 'نسبة 0-30 يوماً', 1, 'pct'], ['p2', 'نسبة 31-60 يوماً', 5, 'pct'], ['p3', 'نسبة 61-90 يوماً', 15, 'pct'], ['p4', 'نسبة أكثر من 90 يوماً', 40, 'pct']],
  run(v) {
    const b = agingBuckets('c', v.date).totals;
    const need = r2(b[0] * v.p1 / 100 + b[1] * v.p2 / 100 + b[2] * v.p3 / 100 + b[3] * v.p4 / 100);
    const curP = -rawBal('1112'); const diff = r2(need - curP);
    if (!diff) throw new Error('المخصص الحالي مطابق للمطلوب');
    const L = diff > 0 ? [{ acc: '5211', debit: diff }, { acc: '1112', credit: diff }] : [{ acc: '1112', debit: -diff }, { acc: '5211', credit: -diff }];
    const je = postJE({ date: v.date, desc: `تسوية مخصص الديون المشكوك فيها (المطلوب ${f2(need)})`, src: 'op', lines: L });
    commit('تسوية مخصص الديون المشكوك فيها'); return { je };
  },
});

// --- المخزون ---
op({
  id: 'item-add', cat: 'purch', name: 'إضافة صنف مخزون جديد', btn: 'حفظ الصنف',
  fields: () => [['code', 'رمز الصنف', 'P' + String(DB.seq.item + 1).padStart(4, '0'), 'text', { req: 1 }], ['name', 'اسم الصنف', '', 'text', { req: 1 }], ['unit', 'الوحدة', 'حبة', 'text', { req: 1 }], ['cat', 'التصنيف', '', 'text'],
    ['cost', 'تكلفة الوحدة', '', 'money'], ['price', 'سعر البيع', '', 'money'], ['min', 'حد إعادة الطلب', '', 'num'], ['qty', 'الكمية الافتتاحية', '', 'num'], ['openDate', 'تاريخ الرصيد الافتتاحي', today, 'date']],
  run(v) {
    if (DB.items.some(i => i.code === v.code)) throw new Error('رمز الصنف مستخدم');
    const it = { id: uid(), code: v.code, name: v.name, unit: v.unit, cat: v.cat, cost: r4(v.cost || 0), price: r2(v.price || 0), min: num(v.min), qty: 0 };
    const q = num(v.qty);
    if (q < 0) throw new Error('الكمية الافتتاحية لا يمكن أن تكون سالبة');
    if (q > 0) {
      const val = r2(q * it.cost);
      if (val > 0) postJE({ date: v.openDate || today(), desc: `رصيد افتتاحي للصنف ${it.name}`, src: 'opening', lines: [{ acc: '1104', debit: val }, { acc: '3105', credit: val }] });
      it.qty = q;
      DB.moves.push({ id: uid(), item: it.id, date: v.openDate || today(), kind: 'open', qty: q, cost: it.cost, price: it.cost, ref: 'رصيد افتتاحي' });
    }
    DB.seq.item++; DB.items.push(it);
    commit('إضافة الصنف ' + it.name); return { msg: 'تمت إضافة الصنف ' + it.name };
  },
});
op({
  id: 'item-price', cat: 'purch', name: 'تعديل سعر بيع صنف', btn: 'حفظ',
  fields: () => [['item', 'الصنف', '', 'item', { req: 1 }], ['price', 'سعر البيع الجديد', '', 'money', { req: 1 }], ['min', 'حد إعادة الطلب', '', 'num']],
  onOpen(form) { const s = form.querySelector('[data-k=item]'); s.addEventListener('change', () => { const it = itemById(s.value); if (it) { form.querySelector('[data-k=price]').value = it.price; form.querySelector('[data-k=min]').value = it.min; } }); },
  run(v) { const it = itemById(v.item); if (!it) throw new Error('اختر الصنف'); it.price = r2(v.price); if (v.min !== '') it.min = num(v.min); commit(`تعديل سعر ${it.name} إلى ${f2(it.price)}`); return { msg: 'تم تحديث الصنف' }; },
});
op({
  id: 'stock-adj', cat: 'purch', name: 'تسوية جرد صنف (عجز أو زيادة)', kind: 'je',
  fields: () => [['item', 'الصنف', '', 'item', { req: 1 }], ['actual', 'الكمية الفعلية بالجرد', '', 'num', { req: 1 }], ['date', 'تاريخ الجرد', today, 'date', { req: 1 }], ['note', 'السبب', 'جرد دوري', 'text', { full: 1 }]],
  onOpen(form) { const s = form.querySelector('[data-k=item]'); s.addEventListener('change', () => { const it = itemById(s.value); if (it) form.querySelector('[data-k=actual]').placeholder = 'الرصيد الدفتري: ' + fN(it.qty, 0); }); },
  run(v) {
    const it = itemById(v.item); if (!it) throw new Error('اختر الصنف');
    const diff = r4(num(v.actual) - it.qty);
    if (!diff) throw new Error('لا يوجد فرق بين الرصيد الدفتري والفعلي');
    if (num(v.actual) < 0) throw new Error('الكمية الفعلية لا يمكن أن تكون سالبة');
    const val = r2(Math.abs(diff) * it.cost);
    let je = null;
    if (val > 0) je = postJE({ date: v.date, desc: `تسوية جرد ${it.name}: ${diff > 0 ? 'زيادة' : 'عجز'} ${fN(Math.abs(diff), 2)} ${it.unit} — ${v.note}`, src: 'stock', lines: diff > 0 ? [{ acc: '1104', debit: val }, { acc: '4201', credit: val }] : [{ acc: '5102', debit: val }, { acc: '1104', credit: val }] });
    it.qty = r4(num(v.actual));
    DB.moves.push({ id: uid(), item: it.id, date: v.date, kind: 'adj', qty: diff, cost: it.cost, price: it.cost, ref: 'تسوية جرد' });
    commit(`تسوية جرد ${it.name} بفرق ${fN(diff, 2)}`); return { je, msg: 'تمت تسوية الجرد' };
  },
});
op({ id: 'item-card', cat: 'purch', name: 'بطاقة صنف (حركة المخزون)', btn: 'عرض', fields: () => [['item', 'الصنف', '', 'item', { req: 1 }]], run(v) { closeModal(); go('item-card', { id: v.item }); return { cancel: true }; } });
nav('items', 'purch', 'قائمة الأصناف والأرصدة', 'items');
nav('stock-val', 'purch', 'تقرير تقييم المخزون', 'rep-stock');
nav('stock-low', 'purch', 'الأصناف التي بلغت حد الطلب', 'items', { low: 1 });

// --- الأصول الثابتة ---
function depForMonth(a, monthStr) {
  if (a.status !== 'active' || monthStr < ym(a.date)) return 0;
  const base = a.cost - a.salvage, remaining = r2(a.cost - a.salvage - a.accDep);
  if (remaining <= 0) return 0;
  let d = a.method === 'ddb' ? (a.cost - a.accDep) * (2 / a.life) / 12 : base / a.life / 12;
  return r2(Math.min(d, remaining));
}
op({
  id: 'asset-add', cat: 'fa', name: 'إضافة أصل ثابت إلى السجل', kind: 'je', btn: 'حفظ الأصل',
  fields: () => [['name', 'اسم الأصل', '', 'text', { req: 1 }], ['acc', 'حساب الأصل', '1204', 'fixed', { req: 1 }], ['cost', 'التكلفة (قبل الضريبة)', '', 'money', { req: 1 }], ['salvage', 'القيمة التخريدية', 0, 'money'],
    ['life', 'العمر الإنتاجي (سنوات)', 5, 'num', { req: 1 }], ['method', 'طريقة الإهلاك', 'sl', 'select', { opts: [['sl', 'القسط الثابت'], ['ddb', 'القسط المتناقص المضاعف']] }], ['date', 'تاريخ الشراء', today, 'date', { req: 1 }],
    ['pay', 'طريقة السداد', '1102', 'select', { opts: () => [...cashAccs().map(a => [a.code, a.name]), ['2101', 'آجل على مورد'], ['3105', 'أصل قائم (رصيد افتتاحي)']] }], ['vat', 'يشمل ضريبة مدخلات', true, 'check']],
  run(v) {
    const cost = r2(v.cost), salvage = r2(v.salvage || 0), life = num(v.life);
    if (!(cost > 0)) throw new Error('أدخل تكلفة الأصل'); if (!(life > 0)) throw new Error('العمر الإنتاجي يجب أن يكون أكبر من صفر'); if (salvage >= cost) throw new Error('القيمة التخريدية يجب أن تكون أقل من التكلفة');
    const tax = v.vat && v.pay !== '3105' ? r2(cost * num(DB.settings.vat) / 100) : 0;
    const je = postJE({ date: v.date, desc: `شراء أصل ثابت: ${v.name}`, src: 'asset', lines: [{ acc: v.acc, debit: cost }, { acc: '1108', debit: tax }, { acc: v.pay, credit: r2(cost + tax) }] });
    const a = { id: uid(), code: 'FA' + String(++DB.seq.asset).padStart(3, '0'), name: v.name, acc: v.acc, cost, salvage, life, method: v.method, date: v.date, accDep: 0, status: 'active', deps: {}, je: je.id };
    je.srcId = a.id; DB.assets.push(a);
    commit(`إضافة الأصل ${a.name} بتكلفة ${f2(cost)}`); return { je };
  },
});
op({
  id: 'dep-run', cat: 'fa', name: 'احتساب وترحيل الإهلاك الشهري', kind: 'je', btn: 'احتساب وترحيل',
  desc: 'يحتسب إهلاك جميع الأصول النشطة للشهر المحدد ويرحّلها بقيد واحد، مع منع تكرار احتساب نفس الشهر.',
  fields: () => [['month', 'الشهر', today().slice(0, 7), 'month', { req: 1 }]],
  run(v) {
    const m = v.month; let total = 0; const done = [];
    DB.assets.forEach(a => { if (a.deps[m] !== undefined) return; const d = depForMonth(a, m); if (d > 0) { total += d; done.push([a, d]); } });
    total = r2(total);
    if (!total) throw new Error('لا يوجد إهلاك مستحق لهذا الشهر (ربما تم احتسابه مسبقاً)');
    const je = postJE({ date: monthEnd(m), desc: `إهلاك الأصول الثابتة عن شهر ${monthName(m)}`, src: 'dep', lines: [{ acc: '5208', debit: total }, { acc: '1209', credit: total }] });
    done.forEach(([a, d]) => { a.deps[m] = d; a.accDep = r2(a.accDep + d); });
    commit(`إهلاك شهر ${m} لعدد ${done.length} أصول بقيمة ${f2(total)}`); return { je };
  },
});
op({
  id: 'asset-dispose', cat: 'fa', name: 'بيع أو استبعاد أصل ثابت', kind: 'je',
  fields: () => [['asset', 'الأصل', '', 'select', { req: 1, opts: () => [['', '— اختر —'], ...DB.assets.filter(a => a.status === 'active').map(a => [a.id, `${a.code} · ${a.name} · القيمة الدفترية ${f2(a.cost - a.accDep)}`])] }],
    ['price', 'سعر البيع (صفر للاستبعاد)', 0, 'money'], ['pay', 'حساب التحصيل', '1102', 'cash'], ['date', 'التاريخ', today, 'date', { req: 1 }]],
  run(v) {
    const a = DB.assets.find(x => x.id === v.asset); if (!a) throw new Error('اختر الأصل');
    const price = r2(v.price || 0), bv = r2(a.cost - a.accDep), gl = r2(price - bv);
    const L = [{ acc: v.pay, debit: price }, { acc: '1209', debit: a.accDep }, { acc: a.acc, credit: a.cost }];
    if (gl > 0) L.push({ acc: '4203', credit: gl }); else if (gl < 0) L.push({ acc: '5220', debit: -gl });
    const je = postJE({ date: v.date, desc: `${price ? 'بيع' : 'استبعاد'} الأصل ${a.name} — ${gl >= 0 ? 'ربح' : 'خسارة'} ${f2(Math.abs(gl))}`, src: 'asset', srcId: a.id, lines: L });
    a.status = 'disposed'; a.disposedOn = v.date; a.salePrice = price;
    commit(`استبعاد الأصل ${a.name}`); return { je };
  },
});
nav('assets', 'fa', 'سجل الأصول الثابتة', 'assets');

// --- الموظفون والرواتب ---
op({
  id: 'emp-add', cat: 'hr', name: 'إضافة موظف', btn: 'حفظ',
  fields: () => [['name', 'اسم الموظف', '', 'text', { req: 1 }], ['job', 'المسمى الوظيفي', '', 'text'], ['idNo', 'رقم الهوية/الإقامة', '', 'text'], ['hire', 'تاريخ المباشرة', today, 'date', { req: 1 }],
    ['basic', 'الراتب الأساسي', '', 'money', { req: 1 }], ['housing', 'بدل السكن', '', 'money'], ['transport', 'بدل النقل', '', 'money'], ['other', 'بدلات أخرى', '', 'money'], ['gosi', 'نسبة استقطاع التأمينات (حصة الموظف)', 9.75, 'pct']],
  run(v) {
    if (!(r2(v.basic) > 0)) throw new Error('أدخل الراتب الأساسي');
    DB.employees.push({ id: uid(), code: 'E' + String(++DB.seq.emp).padStart(3, '0'), name: v.name, job: v.job, idNo: v.idNo, hire: v.hire, basic: r2(v.basic), housing: r2(v.housing || 0), transport: r2(v.transport || 0), other: r2(v.other || 0), gosi: num(v.gosi), active: true });
    commit('إضافة الموظف ' + v.name); return { msg: 'تمت إضافة الموظف' };
  },
});
const empGross = e => r2(e.basic + e.housing + e.transport + e.other);
const empGosi = e => r2((e.basic + e.housing) * e.gosi / 100);
op({
  id: 'payroll-run', cat: 'hr', name: 'إعداد مسير الرواتب الشهري وترحيله', kind: 'je', btn: 'ترحيل المسير',
  fields: () => [['month', 'الشهر', today().slice(0, 7), 'month', { req: 1 }], ['payNow', 'صرف صافي الرواتب فوراً', false, 'check'], ['pay', 'حساب الصرف', '1102', 'cash']],
  run(v) {
    if (DB.payrolls.some(p => p.month === v.month)) throw new Error('تم ترحيل مسير هذا الشهر مسبقاً');
    const emps = DB.employees.filter(e => e.active && e.hire <= monthEnd(v.month));
    if (!emps.length) throw new Error('لا يوجد موظفون نشطون لهذا الشهر');
    const rows = emps.map(e => ({ emp: e.id, name: e.name, gross: empGross(e), gosi: empGosi(e), net: r2(empGross(e) - empGosi(e)) }));
    const gross = r2(sum(rows, r => r.gross)), gosi = r2(sum(rows, r => r.gosi)), net = r2(gross - gosi);
    const date = monthEnd(v.month);
    const je = postJE({ date, desc: `مسير رواتب شهر ${monthName(v.month)} — ${digits(rows.length)} موظفين`, src: 'payroll', lines: [{ acc: '5201', debit: gross, cc: 'CC01' }, { acc: '2108', credit: gosi }, { acc: '2106', credit: net }] });
    const pr = { id: uid(), month: v.month, rows, gross, gosi, net, je: je.id, paid: false };
    if (v.payNow) { postJE({ date, desc: `صرف صافي رواتب ${monthName(v.month)}`, src: 'payroll', lines: [{ acc: '2106', debit: net }, { acc: v.pay, credit: net }] }); pr.paid = true; }
    je.srcId = pr.id; DB.payrolls.push(pr);
    commit(`مسير رواتب ${v.month}: إجمالي ${f2(gross)}`); return { je };
  },
});
function eosAward(wage, years, reason) {
  const y1 = Math.min(years, 5), y2 = Math.max(0, years - 5);
  let full = wage / 2 * y1 + wage * y2;
  let factor = 1;
  if (reason === 'resign') factor = years < 2 ? 0 : years < 5 ? 1 / 3 : years < 10 ? 2 / 3 : 1;
  return { full: r2(full), factor, award: r2(full * factor) };
}
op({
  id: 'eos-prov', cat: 'hr', name: 'تحديث مخصص نهاية الخدمة لجميع الموظفين', kind: 'je',
  desc: 'يحسب الالتزام الكامل لمكافأة نهاية الخدمة وفق نظام العمل (نصف شهر عن كل سنة من الخمس الأولى، وشهر كامل لما بعدها) ويرحّل الفرق عن رصيد المخصص.',
  fields: () => [['date', 'كما في تاريخ', today, 'date', { req: 1 }]],
  run(v) {
    const need = r2(sum(DB.employees.filter(e => e.active), e => eosAward(r2(e.basic + e.housing), Math.max(0, daysBetween(e.hire, v.date)) / 365, 'end').full));
    const diff = r2(need - bal('2202'));
    if (!diff) throw new Error('المخصص مطابق للالتزام المحسوب');
    const L = diff > 0 ? [{ acc: '5219', debit: diff }, { acc: '2202', credit: diff }] : [{ acc: '2202', debit: -diff }, { acc: '5219', credit: -diff }];
    const je = postJE({ date: v.date, desc: `تسوية مخصص مكافأة نهاية الخدمة (الالتزام ${f2(need)})`, src: 'op', lines: L });
    commit('تحديث مخصص نهاية الخدمة'); return { je };
  },
});
op({
  id: 'payroll-pay', cat: 'hr', name: 'صرف صافي رواتب مسير مُرحّل', kind: 'je',
  fields: () => [['pr', 'المسير', '', 'select', { req: 1, opts: () => [['', '— اختر —'], ...DB.payrolls.filter(p => !p.paid).map(p => [p.id, `${monthName(p.month)} · صافي ${f2(p.net)}`])] }], ['pay', 'حساب الصرف', '1102', 'cash'], ['date', 'تاريخ الصرف', today, 'date', { req: 1 }]],
  run(v) {
    const pr = DB.payrolls.find(p => p.id === v.pr); if (!pr) throw new Error('اختر المسير');
    const je = postJE({ date: v.date, desc: `صرف صافي رواتب ${monthName(pr.month)}`, src: 'payroll', srcId: pr.id, lines: [{ acc: '2106', debit: pr.net }, { acc: v.pay, credit: pr.net }] });
    pr.paid = true; commit(`صرف رواتب ${pr.month}`); return { je };
  },
});
nav('employees', 'hr', 'سجل الموظفين ومسيرات الرواتب', 'employees');

// --- الضرائب ---
function vatSummary(from, to) {
  let out = 0, inp = 0;
  for (const j of DB.journals) {
    if (j.src === 'vat' || (from && j.date < from) || (to && j.date > to)) continue;
    for (const l of j.lines) { if (l.acc === '2105') out += l.credit - l.debit; else if (l.acc === '1108') inp += l.debit - l.credit; }
  }
  return { out: r2(out), inp: r2(inp), net: r2(out - inp) };
}
nav('vat-return', 'tax', 'إقرار ضريبة القيمة المضافة', 'rep-vat');
op({
  id: 'vat-settle', cat: 'tax', name: 'تسوية وسداد ضريبة القيمة المضافة للفترة', kind: 'je',
  desc: 'يُقفل حسابي ضريبة المخرجات والمدخلات للفترة ويثبت صافي المبلغ المسدد أو المسترد.',
  fields: () => [['from', 'من تاريخ', () => today().slice(0, 8) + '01', 'date', { req: 1 }], ['to', 'إلى تاريخ', today, 'date', { req: 1 }], ['pay', 'حساب السداد', '1102', 'cash'], ['date', 'تاريخ القيد', today, 'date', { req: 1 }]],
  run(v) {
    const s = vatSummary(v.from, v.to);
    if (!s.out && !s.inp) throw new Error('لا توجد حركات ضريبية في الفترة');
    const L = [{ acc: '2105', debit: Math.max(s.out, 0), credit: Math.max(-s.out, 0) }, { acc: '1108', credit: Math.max(s.inp, 0), debit: Math.max(-s.inp, 0) }];
    if (s.net > 0) L.push({ acc: v.pay, credit: s.net }); else if (s.net < 0) L.push({ acc: v.pay, debit: -s.net });
    const je = postJE({ date: v.date, desc: `تسوية ضريبة القيمة المضافة من ${v.from} إلى ${v.to}`, src: 'vat', lines: L });
    commit(`تسوية ضريبة القيمة المضافة — صافي ${f2(s.net)}`); return { je };
  },
});

// --- التقارير ---
[
  ['rep-tb', 'ميزان المراجعة'], ['rep-is', 'قائمة الدخل'], ['rep-bs', 'قائمة المركز المالي (الميزانية العمومية)'], ['rep-cf', 'قائمة التدفقات النقدية'],
  ['rep-eq', 'قائمة التغيرات في حقوق الملكية'], ['rep-ratios', 'التحليل المالي الشامل من الدفاتر'], ['rep-sales', 'تقرير المبيعات التحليلي'], ['rep-purch', 'تقرير المشتريات التحليلي'],
  ['rep-cash', 'حركة النقدية والبنوك اليومية'], ['rep-budget', 'الموازنة التقديرية مقابل الفعلي'], ['rep-cc', 'تقرير مراكز التكلفة'], ['rep-monthly', 'المقارنة الشهرية للإيرادات والمصروفات'],
  ['rep-expenses', 'تحليل المصروفات حسب البند'], ['rep-sales', 'ربحية الأصناف', { by: 'item' }, 'items'], ['rep-sales', 'أفضل العملاء حسب المبيعات', { by: 'party' }, 'cust'], ['log', 'سجل العمليات ومسار التدقيق'],
  ['rep-aging', 'أعمار ديون العملاء (تقرير)', { t: 'c' }, 'c'], ['rep-stock', 'تقييم المخزون (تقرير)', null, 'x'], ['reports', 'مركز التقارير'],
].forEach(([page, name, params, sfx]) => nav('nav-' + page + (sfx ? '-' + sfx : ''), 'rep', name, page, params));

// --- النظام ---
nav('settings', 'sys', 'إعدادات المنشأة والنظام', 'settings');
op({
  id: 'pass', cat: 'sys', name: 'تغيير كلمة المرور', btn: 'حفظ',
  fields: () => [['old', 'كلمة المرور الحالية', '', 'password', { req: 1 }], ['n1', 'كلمة المرور الجديدة', '', 'password', { req: 1 }], ['n2', 'تأكيد كلمة المرور', '', 'password', { req: 1 }]],
  run(v) {
    if (v.old !== DB.settings.pass) throw new Error('كلمة المرور الحالية غير صحيحة');
    if (v.n1.length < 4) throw new Error('كلمة المرور الجديدة يجب ألا تقل عن ٤ خانات');
    if (v.n1 !== v.n2) throw new Error('كلمتا المرور غير متطابقتين');
    DB.settings.pass = v.n1; commit('تغيير كلمة المرور'); return { msg: 'تم تغيير كلمة المرور' };
  },
});
op({ id: 'backup', cat: 'sys', name: 'تنزيل نسخة احتياطية كاملة', act: () => download(`ميزان-نسخة-${today()}.json`, JSON.stringify(DB), 'application/json') });
op({
  id: 'restore', cat: 'sys', name: 'استعادة نسخة احتياطية', btn: 'استعادة',
  fields: () => [['file', 'ملف النسخة (JSON)', '', 'text', { hint: 'الصق محتوى الملف في الحقل أدناه أو اختر الملف' }], ['json', 'محتوى النسخة', '', 'textarea', { full: 1, rows: 6 }]],
  onOpen(form) {
    const f = form.querySelector('[data-k=file]'); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.id = 'restoreFile'; f.replaceWith(inp);
    inp.addEventListener('change', () => { const file = inp.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { form.querySelector('[data-k=json]').value = r.result; }; r.readAsText(file); });
  },
  async run(v) {
    let d; try { d = JSON.parse(v.json.replace(/^﻿/, '')); } catch (e) { throw new Error('المحتوى ليس ملف JSON صالحاً'); }
    if (!d || !Array.isArray(d.accounts) || !Array.isArray(d.journals) || !d.settings) throw new Error('الملف لا يحتوي على نسخة ميزان صالحة');
    if (!(await ask('ستُستبدل جميع البيانات الحالية بالنسخة المستعادة. متابعة؟', 'استعادة'))) return { cancel: true };
    const base = freshDB();
    for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
    d.seq = { ...base.seq, ...d.seq };
    setDB(d); commit('استعادة نسخة احتياطية'); return { msg: 'تمت استعادة النسخة' };
  },
});
op({ id: 'demo', cat: 'sys', name: 'تحميل بيانات تجريبية', async act() { if (await ask('سيتم استبدال البيانات الحالية ببيانات تجريبية. متابعة؟', 'تحميل')) { loadDemo(); renderShell(); go('dash'); toast('تم تحميل البيانات التجريبية'); } } });
op({ id: 'reset', cat: 'sys', name: 'تصفير النظام والبدء من جديد', async act() { if (await ask('سيتم حذف جميع القيود والمستندات والبيانات نهائياً. هل أنت متأكد؟', 'حذف كل البيانات')) { const s = DB.settings, wasDemo = DB.demo; setDB(freshDB()); DB.settings = { ...DB.settings, pass: s.pass, digits: s.digits, ...(wasDemo ? {} : { company: s.company, taxNo: s.taxNo, address: s.address, phone: s.phone, vat: s.vat, currency: s.currency, curName: s.curName, subName: s.subName }) }; commit('تصفير النظام'); renderShell(); go('dash'); toast('تم تصفير النظام — النظام جاهز لبياناتك'); } } });
op({ id: 'theme', cat: 'sys', name: 'تبديل المظهر الفاتح والداكن', act: () => toggleTheme() });
op({ id: 'digits', cat: 'sys', name: 'تبديل الأرقام (عربية ٠١٢ / لاتينية 012)', act() { DB.settings.digits = DB.settings.digits === 'arab' ? 'latn' : 'arab'; setDB(DB); commit(); refresh(); toast('تم تغيير نمط الأرقام'); } });
op({ id: 'logout', cat: 'sys', name: 'تسجيل الخروج', act: () => logout() });

/* =========================================================
   ٣) الحاسبات المالية والتحليلية
   ========================================================= */
let _cn = 0;
const calc = (cat, name, fields, run, desc = '') => op({ id: 'c' + (++_cn), cat, name, calc: true, fields, run, desc });
const M = n => `${money(n)} <small>${esc(cur())}</small>`;
const Pc = n => (isFinite(n) ? pct(n) : '—');
const X = n => (isFinite(n) ? fN(n, 2) + ' مرة' : '—');
const Dy = n => (isFinite(n) ? fN(n, 0) + ' يوم' : '—');
const Yr = n => (isFinite(n) ? fN(n, 2) + ' سنة' : '—');
const nz = (n, msg = 'إحدى القيم المستخدمة في القسمة تساوي صفراً — عدّل المدخلات') => { if (!(num(n) > 0)) throw new Error(msg); return num(n); };
const flowsOf = v => { const f = parseList(v.flows); if (!f.length) throw new Error('أدخل التدفقات النقدية مفصولة بفواصل'); return f; };
function scheduleTable(head, rows) {
  return `<div class="tbl-wrap"><table class="tbl compact"><thead><tr>${head.map((h, i) => `<th class="${i ? 'num' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'num' : ''}">${i ? money(c) : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// ---- الرياضيات المالية ----
calc('fin', 'الفائدة البسيطة', [['p', 'أصل المبلغ', 10000, 'money'], ['r', 'معدل الفائدة السنوي', 5, 'pct'], ['t', 'المدة بالسنوات', 3, 'num']],
  v => { const i = v.p * v.r / 100 * v.t; return [['الفائدة', M(i)], ['جملة المبلغ', M(v.p + i), 1]]; });
calc('fin', 'الفائدة المركبة', [['p', 'أصل المبلغ', 10000, 'money'], ['r', 'معدل الفائدة السنوي', 5, 'pct'], ['n', 'عدد مرات الرسملة في السنة', 12, 'int'], ['t', 'المدة بالسنوات', 3, 'num']],
  v => { const fv = v.p * Math.pow(1 + v.r / 100 / nz(v.n), v.n * v.t); return [['جملة المبلغ', M(fv), 1], ['الفائدة المركبة', M(fv - v.p)]]; });
calc('fin', 'القيمة المستقبلية لمبلغ حالي', [['pv', 'القيمة الحالية', 50000, 'money'], ['r', 'معدل العائد لكل فترة', 7, 'pct'], ['n', 'عدد الفترات', 10, 'int']],
  v => [['القيمة المستقبلية', M(v.pv * Math.pow(1 + v.r / 100, v.n)), 1]]);
calc('fin', 'القيمة الحالية لمبلغ مستقبلي', [['fv', 'القيمة المستقبلية', 100000, 'money'], ['r', 'معدل الخصم لكل فترة', 8, 'pct'], ['n', 'عدد الفترات', 5, 'int']],
  v => { const pv = v.fv / Math.pow(1 + v.r / 100, v.n); return [['القيمة الحالية', M(pv), 1], ['معامل الخصم', fN(pv / (v.fv || 1), 4)]]; });
calc('fin', 'القيمة المستقبلية لدفعات منتظمة', [['pmt', 'الدفعة الدورية', 1000, 'money'], ['r', 'معدل العائد لكل فترة', 1, 'pct'], ['n', 'عدد الدفعات', 36, 'int'], ['type', 'توقيت الدفعة', 'end', 'select', { opts: [['end', 'نهاية الفترة'], ['begin', 'بداية الفترة']] }]],
  v => { const r = v.r / 100; let fv = r ? v.pmt * (Math.pow(1 + r, v.n) - 1) / r : v.pmt * v.n; if (v.type === 'begin') fv *= 1 + r; return [['القيمة المستقبلية', M(fv), 1], ['إجمالي الدفعات', M(v.pmt * v.n)], ['العائد المتراكم', M(fv - v.pmt * v.n)]]; });
calc('fin', 'القيمة الحالية لدفعات منتظمة', [['pmt', 'الدفعة الدورية', 2000, 'money'], ['r', 'معدل الخصم لكل فترة', 1, 'pct'], ['n', 'عدد الدفعات', 24, 'int'], ['type', 'توقيت الدفعة', 'end', 'select', { opts: [['end', 'نهاية الفترة'], ['begin', 'بداية الفترة']] }]],
  v => { const r = v.r / 100; let pv = r ? v.pmt * (1 - Math.pow(1 + r, -v.n)) / r : v.pmt * v.n; if (v.type === 'begin') pv *= 1 + r; return [['القيمة الحالية', M(pv), 1], ['إجمالي الدفعات', M(v.pmt * v.n)]]; });
const loanPmt = (p, annual, months) => { const r = annual / 1200; return r ? p * r / (1 - Math.pow(1 + r, -months)) : p / months; };
calc('fin', 'القسط الشهري للقرض', [['p', 'مبلغ القرض', 200000, 'money'], ['r', 'معدل الفائدة السنوي', 6, 'pct'], ['m', 'المدة بالأشهر', 60, 'int']],
  v => { const pm = loanPmt(v.p, v.r, nz(v.m)); return [['القسط الشهري', M(pm), 1], ['إجمالي المدفوع', M(pm * v.m)], ['إجمالي الفوائد', M(pm * v.m - v.p)]]; });
calc('fin', 'جدول سداد القرض التفصيلي', [['p', 'مبلغ القرض', 100000, 'money'], ['r', 'معدل الفائدة السنوي', 6, 'pct'], ['m', 'المدة بالأشهر', 12, 'int']],
  v => {
    const n = Math.min(nz(v.m), 480), pm = loanPmt(v.p, v.r, n), rows = []; let b = v.p;
    for (let i = 1; i <= n; i++) { const it = b * v.r / 1200, pr = pm - it; b = Math.max(0, b - pr); rows.push([digits(i), pm, it, pr, b]); }
    return { rows: [['القسط الشهري', M(pm), 1], ['إجمالي الفوائد', M(pm * n - v.p)]], html: scheduleTable(['القسط', 'الدفعة', 'الفائدة', 'أصل الدين', 'الرصيد المتبقي'], rows) };
  });
const npvOf = (r, c0, flows) => flows.reduce((s, f, i) => s + f / Math.pow(1 + r, i + 1), -c0);
function irrOf(c0, flows) {
  let lo = -0.9999, hi = 10, flo = npvOf(lo, c0, flows), fhi = npvOf(hi, c0, flows);
  if (flo * fhi > 0) return NaN;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, fm = npvOf(mid, c0, flows); if (Math.abs(fm) < 1e-7) return mid; if (flo * fm < 0) { hi = mid; } else { lo = mid; flo = fm; } }
  return (lo + hi) / 2;
}
const flowsField = ['flows', 'التدفقات النقدية السنوية (مفصولة بفواصل)', '30000, 35000, 40000, 45000', 'list', { full: 1 }];
calc('fin', 'صافي القيمة الحالية (NPV)', [['c0', 'تكلفة الاستثمار المبدئي', 100000, 'money'], ['r', 'معدل الخصم', 10, 'pct'], flowsField],
  v => { const n = npvOf(v.r / 100, v.c0, flowsOf(v)); return { rows: [['صافي القيمة الحالية', M(n), 1]], note: n >= 0 ? 'المشروع مقبول: يحقق عائداً يفوق معدل الخصم.' : 'المشروع مرفوض: القيمة الحالية للتدفقات أقل من التكلفة.' }; });
calc('fin', 'معدل العائد الداخلي (IRR)', [['c0', 'تكلفة الاستثمار المبدئي', 100000, 'money'], flowsField],
  v => { const i = irrOf(v.c0, flowsOf(v)); return isFinite(i) ? [['معدل العائد الداخلي', Pc(i * 100), 1]] : 'لا يوجد معدل عائد داخلي لهذه التدفقات'; });
calc('fin', 'فترة استرداد رأس المال', [['c0', 'تكلفة الاستثمار', 100000, 'money'], flowsField],
  v => { let left = v.c0; const f = flowsOf(v); for (let i = 0; i < f.length; i++) { if (f[i] >= left) return [['فترة الاسترداد', Yr(i + left / f[i]), 1]]; left -= f[i]; } return 'لا يُسترد رأس المال خلال الفترات المدخلة'; });
calc('fin', 'فترة الاسترداد المخصومة', [['c0', 'تكلفة الاستثمار', 100000, 'money'], ['r', 'معدل الخصم', 10, 'pct'], flowsField],
  v => { let left = v.c0; const f = flowsOf(v); for (let i = 0; i < f.length; i++) { const d = f[i] / Math.pow(1 + v.r / 100, i + 1); if (d >= left) return [['فترة الاسترداد المخصومة', Yr(i + left / d), 1]]; left -= d; } return 'لا يُسترد رأس المال المخصوم خلال الفترات المدخلة'; });
calc('fin', 'مؤشر الربحية (PI)', [['c0', 'تكلفة الاستثمار', 100000, 'money'], ['r', 'معدل الخصم', 10, 'pct'], flowsField],
  v => { const pv = npvOf(v.r / 100, 0, flowsOf(v)); const pi = pv / nz(v.c0); return { rows: [['القيمة الحالية للتدفقات', M(pv)], ['مؤشر الربحية', fN(pi, 3), 1]], note: pi >= 1 ? 'المؤشر ≥ ١: المشروع مجدٍ.' : 'المؤشر < ١: المشروع غير مجدٍ.' }; });
calc('fin', 'معدل الفائدة الفعلي السنوي', [['r', 'المعدل الاسمي السنوي', 12, 'pct'], ['m', 'مرات الرسملة في السنة', 12, 'int']],
  v => [['المعدل الفعلي', Pc((Math.pow(1 + v.r / 100 / nz(v.m), v.m) - 1) * 100), 1]]);
calc('fin', 'قاعدة ٧٢ لمضاعفة الاستثمار', [['r', 'معدل العائد السنوي', 8, 'pct']],
  v => [['المدة التقريبية (قاعدة ٧٢)', Yr(72 / nz(v.r)), 1], ['المدة الدقيقة', Yr(Math.log(2) / Math.log(1 + v.r / 100))]]);
calc('fin', 'معدل النمو السنوي المركب (CAGR)', [['a', 'القيمة في البداية', 100000, 'money'], ['b', 'القيمة في النهاية', 180000, 'money'], ['n', 'عدد السنوات', 5, 'num']],
  v => [['معدل النمو السنوي المركب', Pc((Math.pow(v.b / nz(v.a), 1 / nz(v.n)) - 1) * 100), 1]]);
calc('fin', 'العائد على الاستثمار (ROI)', [['cost', 'تكلفة الاستثمار', 50000, 'money'], ['value', 'العائد أو القيمة الحالية', 65000, 'money']],
  v => [['صافي الربح', M(v.value - v.cost)], ['العائد على الاستثمار', Pc((v.value - v.cost) / nz(v.cost) * 100), 1]]);
calc('fin', 'البيع بالتقسيط (المرابحة)', [['cost', 'تكلفة السلعة', 80000, 'money'], ['down', 'الدفعة الأولى', 10000, 'money'], ['rate', 'نسبة الربح السنوية', 5, 'pct'], ['m', 'عدد الأشهر', 48, 'int']],
  v => { const fin = v.cost - v.down, prof = fin * v.rate / 100 * (v.m / 12); return [['المبلغ الممول', M(fin)], ['إجمالي الربح', M(prof)], ['إجمالي سعر البيع', M(v.cost + prof)], ['القسط الشهري', M((fin + prof) / nz(v.m)), 1]]; });
calc('fin', 'الإيداع الدوري لبلوغ مبلغ مستهدف', [['fv', 'المبلغ المستهدف', 500000, 'money'], ['r', 'العائد السنوي', 5, 'pct'], ['y', 'عدد السنوات', 10, 'num'], ['k', 'عدد الإيداعات في السنة', 12, 'int']],
  v => { const r = v.r / 100 / nz(v.k), n = v.y * v.k, p = r ? v.fv * r / (Math.pow(1 + r, n) - 1) : v.fv / n; return [['الإيداع الدوري', M(p), 1], ['إجمالي الإيداعات', M(p * n)]]; });
calc('fin', 'القيمة الحقيقية بعد التضخم', [['a', 'المبلغ', 100000, 'money'], ['i', 'معدل التضخم السنوي', 3, 'pct'], ['y', 'عدد السنوات', 10, 'num']],
  v => { const real = v.a / Math.pow(1 + v.i / 100, v.y); return [['القوة الشرائية المكافئة اليوم', M(real), 1], ['الانخفاض في القوة الشرائية', Pc((1 - real / (v.a || 1)) * 100)]]; });
calc('fin', 'تسعير السندات', [['face', 'القيمة الاسمية', 1000, 'money'], ['c', 'معدل الكوبون السنوي', 6, 'pct'], ['y', 'العائد المطلوب في السوق', 7, 'pct'], ['n', 'سنوات حتى الاستحقاق', 5, 'int']],
  v => { const cp = v.face * v.c / 100, r = v.y / 100; const price = (r ? cp * (1 - Math.pow(1 + r, -v.n)) / r : cp * v.n) + v.face / Math.pow(1 + r, v.n); return { rows: [['الكوبون السنوي', M(cp)], ['السعر العادل للسند', M(price), 1]], note: price < v.face ? 'يُباع السند بخصم (أقل من القيمة الاسمية).' : price > v.face ? 'يُباع السند بعلاوة (أعلى من القيمة الاسمية).' : 'يُباع السند بالقيمة الاسمية.' }; });
calc('fin', 'متوسط تكلفة رأس المال المرجح (WACC)', [['e', 'قيمة حقوق الملكية', 600000, 'money'], ['d', 'قيمة الديون', 400000, 'money'], ['re', 'تكلفة حقوق الملكية', 12, 'pct'], ['rd', 'تكلفة الدين', 6, 'pct'], ['t', 'معدل الضريبة', 20, 'pct']],
  v => { const V = nz(v.e + v.d); return [['وزن حقوق الملكية', Pc(v.e / V * 100)], ['وزن الديون', Pc(v.d / V * 100)], ['WACC', Pc(v.e / V * v.re + v.d / V * v.rd * (1 - v.t / 100)), 1]]; });

// ---- الإهلاك ----
const depFields = [['cost', 'تكلفة الأصل', 120000, 'money'], ['salvage', 'القيمة التخريدية', 20000, 'money'], ['life', 'العمر الإنتاجي (سنوات)', 5, 'int']];
function depSchedule(v, fn) {
  const life = Math.min(nz(v.life), 60); let acc = 0; const rows = [];
  for (let y = 1; y <= life; y++) { let d = fn(y, v.cost - acc); if (y === life) d = v.cost - v.salvage - acc; d = Math.max(0, Math.min(d, v.cost - v.salvage - acc)); acc += d; rows.push([digits(y), d, acc, v.cost - acc]); }
  return scheduleTable(['السنة', 'قسط الإهلاك', 'مجمع الإهلاك', 'القيمة الدفترية'], rows);
}
calc('fa', 'إهلاك القسط الثابت', depFields, v => { const a = (v.cost - v.salvage) / nz(v.life); return { rows: [['قسط الإهلاك السنوي', M(a), 1], ['قسط الإهلاك الشهري', M(a / 12)], ['معدل الإهلاك', Pc(100 / v.life)]], html: depSchedule(v, () => a) }; });
calc('fa', 'إهلاك القسط المتناقص (نسبة ثابتة)', [...depFields, ['rate', 'نسبة الإهلاك السنوية', 30, 'pct']], v => ({ html: depSchedule(v, (y, bv) => bv * v.rate / 100) }));
calc('fa', 'إهلاك القسط المتناقص المضاعف', depFields, v => ({ rows: [['النسبة المضاعفة', Pc(200 / nz(v.life)), 1]], html: depSchedule(v, (y, bv) => bv * 2 / v.life) }));
calc('fa', 'إهلاك مجموع أرقام السنوات', depFields, v => { const s = v.life * (v.life + 1) / 2; return { rows: [['مجموع أرقام السنوات', fN(s, 0), 1]], html: depSchedule(v, y => (v.cost - v.salvage) * (v.life - y + 1) / s) }; });
calc('fa', 'إهلاك وحدات الإنتاج', [['cost', 'تكلفة الأصل', 120000, 'money'], ['salvage', 'القيمة التخريدية', 20000, 'money'], ['units', 'الطاقة الإنتاجية الكلية (وحدات)', 100000, 'num'], ['used', 'وحدات الفترة الحالية', 18000, 'num']],
  v => { const u = (v.cost - v.salvage) / nz(v.units); return [['إهلاك الوحدة', M(u)], ['إهلاك الفترة', M(u * v.used), 1]]; });
calc('fa', 'إهلاك جزء السنة الأولى', [...depFields, ['months', 'عدد أشهر الاستخدام في السنة الأولى', 7, 'int']],
  v => { const a = (v.cost - v.salvage) / nz(v.life); return [['القسط السنوي الكامل', M(a)], ['إهلاك السنة الأولى', M(a * Math.min(v.months, 12) / 12), 1]]; });
calc('fa', 'القيمة الدفترية وأرباح أو خسائر البيع', [['cost', 'تكلفة الأصل', 120000, 'money'], ['acc', 'مجمع الإهلاك', 70000, 'money'], ['price', 'سعر البيع', 45000, 'money']],
  v => { const bv = v.cost - v.acc, g = v.price - bv; return [['القيمة الدفترية', M(bv)], [g >= 0 ? 'أرباح بيع الأصل' : 'خسائر بيع الأصل', M(Math.abs(g)), 1]]; });

// ---- التكاليف والتسعير والمخزون ----
calc('cost', 'نقطة التعادل بالوحدات', [['fc', 'التكاليف الثابتة', 150000, 'money'], ['p', 'سعر بيع الوحدة', 50, 'money'], ['vc', 'التكلفة المتغيرة للوحدة', 30, 'money']],
  v => { const cm = v.p - v.vc; if (cm <= 0) throw new Error('سعر البيع يجب أن يتجاوز التكلفة المتغيرة'); const u = v.fc / cm; return [['هامش مساهمة الوحدة', M(cm)], ['نقطة التعادل بالوحدات', fN(Math.ceil(u), 0) + ' وحدة', 1], ['نقطة التعادل بالقيمة', M(Math.ceil(u) * v.p)]]; });
calc('cost', 'نقطة التعادل بالقيمة', [['fc', 'التكاليف الثابتة', 150000, 'money'], ['cmr', 'نسبة هامش المساهمة', 40, 'pct']],
  v => [['المبيعات اللازمة للتعادل', M(v.fc / (nz(v.cmr) / 100)), 1]]);
calc('cost', 'هامش المساهمة ونسبته', [['p', 'سعر بيع الوحدة', 50, 'money'], ['vc', 'التكلفة المتغيرة للوحدة', 30, 'money'], ['q', 'عدد الوحدات المباعة', 10000, 'num']],
  v => [['هامش مساهمة الوحدة', M(v.p - v.vc)], ['إجمالي هامش المساهمة', M((v.p - v.vc) * v.q), 1], ['نسبة هامش المساهمة', Pc((v.p - v.vc) / nz(v.p) * 100)]]);
calc('cost', 'هامش الأمان', [['s', 'المبيعات الفعلية أو المخططة', 500000, 'money'], ['be', 'مبيعات التعادل', 375000, 'money']],
  v => [['هامش الأمان', M(v.s - v.be), 1], ['نسبة هامش الأمان', Pc((v.s - v.be) / nz(v.s) * 100)]]);
calc('cost', 'درجة الرفع التشغيلي', [['cm', 'إجمالي هامش المساهمة', 200000, 'money'], ['op', 'صافي الربح التشغيلي', 50000, 'money']],
  v => ({ rows: [['درجة الرفع التشغيلي', X(v.cm / nz(v.op)), 1]], note: `كل زيادة ١٪ في المبيعات تزيد الربح التشغيلي بنحو ${fN(v.cm / v.op, 2)}٪.` }));
calc('cost', 'المبيعات اللازمة لتحقيق ربح مستهدف', [['fc', 'التكاليف الثابتة', 150000, 'money'], ['t', 'الربح المستهدف', 60000, 'money'], ['p', 'سعر بيع الوحدة', 50, 'money'], ['vc', 'التكلفة المتغيرة للوحدة', 30, 'money']],
  v => { const cm = v.p - v.vc; if (cm <= 0) throw new Error('سعر البيع يجب أن يتجاوز التكلفة المتغيرة'); const u = Math.ceil((v.fc + v.t) / cm); return [['الوحدات المطلوبة', fN(u, 0) + ' وحدة', 1], ['قيمة المبيعات المطلوبة', M(u * v.p)]]; });
calc('cost', 'سعر البيع بهامش ربح من سعر البيع', [['c', 'التكلفة', 75, 'money'], ['m', 'هامش الربح المطلوب', 25, 'pct']],
  v => { if (v.m >= 100) throw new Error('الهامش يجب أن يكون أقل من ١٠٠٪'); const p = v.c / (1 - v.m / 100); return [['سعر البيع', M(p), 1], ['الربح', M(p - v.c)], ['نسبة الإضافة على التكلفة', Pc((p - v.c) / nz(v.c) * 100)]]; });
calc('cost', 'سعر البيع بنسبة إضافة على التكلفة', [['c', 'التكلفة', 75, 'money'], ['k', 'نسبة الإضافة', 30, 'pct']],
  v => { const p = v.c * (1 + v.k / 100); return [['سعر البيع', M(p), 1], ['هامش الربح من سعر البيع', Pc((p - v.c) / nz(p) * 100)]]; });
calc('cost', 'التحويل بين نسبة الإضافة وهامش الربح', [['k', 'نسبة الإضافة على التكلفة', 50, 'pct'], ['m', 'هامش الربح من سعر البيع', 20, 'pct']],
  v => [['الإضافة ' + pct(v.k) + ' تعادل هامشاً قدره', Pc(v.k / (100 + v.k) * 100), 1], ['الهامش ' + pct(v.m) + ' يعادل إضافةً قدرها', Pc(v.m >= 100 ? NaN : v.m / (100 - v.m) * 100), 1]]);
calc('cost', 'الخصم التجاري والخصومات المتتالية', [['p', 'سعر القائمة', 10000, 'money'], ['d1', 'الخصم الأول', 10, 'pct'], ['d2', 'الخصم الثاني', 5, 'pct'], ['d3', 'الخصم الثالث', 0, 'pct']],
  v => { const n = v.p * (1 - v.d1 / 100) * (1 - v.d2 / 100) * (1 - v.d3 / 100); return [['صافي السعر', M(n), 1], ['إجمالي الخصم', M(v.p - n)], ['معدل الخصم المكافئ', Pc((1 - n / nz(v.p)) * 100)]]; });
calc('cost', 'تكلفة عدم الاستفادة من الخصم النقدي', [['d', 'نسبة الخصم النقدي', 2, 'pct'], ['dd', 'فترة الخصم (أيام)', 10, 'int'], ['nd', 'فترة الائتمان الكاملة (أيام)', 30, 'int']],
  v => { if (v.nd <= v.dd) throw new Error('فترة الائتمان يجب أن تتجاوز فترة الخصم'); return { rows: [['التكلفة السنوية الفعلية', Pc(v.d / (100 - v.d) * 365 / (v.nd - v.dd) * 100), 1]], note: 'إذا كانت تكلفة التمويل أقل من هذه النسبة فالأفضل الاستفادة من الخصم.' }; });
const lotsField = ['lots', 'دفعات الشراء بالترتيب (الكمية@السعر)', '100@10, 150@12, 200@13', 'list', { full: 1 }];
calc('cost', 'متوسط التكلفة المرجح', [lotsField],
  v => { const l = parseLots(v.lots), q = sum(l, x => x.q), c = sum(l, x => x.q * x.c); return [['إجمالي الكمية', fN(q, 2)], ['إجمالي التكلفة', M(c)], ['متوسط تكلفة الوحدة', M(c / nz(q)), 1]]; });
function costFlow(v, lifo) {
  const lots = parseLots(v.lots).map(x => ({ ...x })); let need = num(v.sold), cogs = 0;
  if (need > sum(lots, x => x.q)) throw new Error('الكمية المباعة أكبر من المتاح');
  const order = lifo ? lots.slice().reverse() : lots;
  for (const l of order) { const t = Math.min(l.q, need); cogs += t * l.c; l.q -= t; need -= t; if (!need) break; }
  const end = sum(lots, x => x.q * x.c);
  return [['تكلفة البضاعة المباعة', M(cogs), 1], ['قيمة مخزون آخر المدة', M(end)], ['الكمية المتبقية', fN(sum(lots, x => x.q), 2)]];
}
calc('cost', 'تقييم المخزون بطريقة الوارد أولاً صادر أولاً (FIFO)', [lotsField, ['sold', 'الكمية المباعة', 220, 'num']], v => costFlow(v, false));
calc('cost', 'تقييم المخزون بطريقة الوارد أخيراً صادر أولاً (LIFO)', [lotsField, ['sold', 'الكمية المباعة', 220, 'num']], v => ({ rows: costFlow(v, true), note: 'طريقة LIFO غير مسموح بها وفق المعايير الدولية (IFRS) وتُعرض هنا للمقارنة.' }));
calc('cost', 'تكلفة البضاعة المباعة (الجرد الدوري)', [['open', 'مخزون أول المدة', 40000, 'money'], ['pur', 'المشتريات', 250000, 'money'], ['fr', 'مصاريف نقل المشتريات', 5000, 'money'], ['ret', 'مردودات ومسموحات المشتريات', 8000, 'money'], ['close', 'مخزون آخر المدة', 55000, 'money']],
  v => { const net = v.pur + v.fr - v.ret; return [['صافي المشتريات', M(net)], ['تكلفة البضاعة المتاحة للبيع', M(v.open + net)], ['تكلفة البضاعة المباعة', M(v.open + net - v.close), 1]]; });
calc('cost', 'الكمية الاقتصادية للطلب (EOQ)', [['d', 'الطلب السنوي (وحدات)', 12000, 'num'], ['s', 'تكلفة إصدار الطلبية', 150, 'money'], ['h', 'تكلفة التخزين السنوية للوحدة', 4, 'money']],
  v => { const q = Math.sqrt(2 * v.d * v.s / nz(v.h)); return [['الكمية الاقتصادية', fN(q, 0) + ' وحدة', 1], ['عدد الطلبيات سنوياً', fN(v.d / q, 1)], ['إجمالي تكلفة الطلب والتخزين', M(v.d / q * v.s + q / 2 * v.h)]]; });
calc('cost', 'نقطة إعادة الطلب', [['u', 'الاستهلاك اليومي', 40, 'num'], ['l', 'مدة التوريد (أيام)', 7, 'int'], ['ss', 'مخزون الأمان', 100, 'num']],
  v => [['نقطة إعادة الطلب', fN(v.u * v.l + v.ss, 0) + ' وحدة', 1]]);
calc('cost', 'تكلفة الوحدة المنتجة', [['dm', 'المواد المباشرة', 50000, 'money'], ['dl', 'الأجور المباشرة', 30000, 'money'], ['oh', 'التكاليف الصناعية غير المباشرة', 20000, 'money'], ['u', 'عدد الوحدات المنتجة', 2000, 'num']],
  v => { const t = v.dm + v.dl + v.oh; return [['التكلفة الأولية', M(v.dm + v.dl)], ['تكلفة التحويل', M(v.dl + v.oh)], ['إجمالي تكلفة الإنتاج', M(t)], ['تكلفة الوحدة', M(t / nz(v.u)), 1]]; });
calc('cost', 'معدل تحميل التكاليف غير المباشرة', [['oh', 'التكاليف غير المباشرة المقدرة', 120000, 'money'], ['base', 'أساس التحميل المقدر (ساعات)', 8000, 'num'], ['act', 'الساعات الفعلية', 7600, 'num'], ['actoh', 'التكاليف غير المباشرة الفعلية', 118000, 'money']],
  v => { const r = v.oh / nz(v.base), ap = r * v.act, d = ap - v.actoh; return [['معدل التحميل', M(r) + ' / ساعة', 1], ['التكاليف المحمّلة', M(ap)], [d >= 0 ? 'زيادة في التحميل' : 'نقص في التحميل', M(Math.abs(d))]]; });
calc('cost', 'انحرافات المواد المباشرة (السعر والكمية)', [['sp', 'السعر المعياري', 10, 'money'], ['ap', 'السعر الفعلي', 10.5, 'money'], ['sq', 'الكمية المعيارية', 5000, 'num'], ['aq', 'الكمية الفعلية', 5200, 'num']],
  v => { const pv = (v.ap - v.sp) * v.aq, qv = (v.aq - v.sq) * v.sp, f = n => (n > 0 ? ' (غير ملائم)' : n < 0 ? ' (ملائم)' : ''); return [['انحراف السعر', M(Math.abs(pv)) + f(pv)], ['انحراف الكمية', M(Math.abs(qv)) + f(qv)], ['الانحراف الكلي', M(Math.abs(pv + qv)) + f(pv + qv), 1]]; });
calc('cost', 'انحرافات الأجور المباشرة (المعدل والكفاءة)', [['sr', 'معدل الأجر المعياري', 40, 'money'], ['ar', 'معدل الأجر الفعلي', 42, 'money'], ['sh', 'الساعات المعيارية', 1000, 'num'], ['ah', 'الساعات الفعلية', 950, 'num']],
  v => { const rv = (v.ar - v.sr) * v.ah, ev = (v.ah - v.sh) * v.sr, f = n => (n > 0 ? ' (غير ملائم)' : n < 0 ? ' (ملائم)' : ''); return [['انحراف معدل الأجر', M(Math.abs(rv)) + f(rv)], ['انحراف الكفاءة', M(Math.abs(ev)) + f(ev)], ['الانحراف الكلي', M(Math.abs(rv + ev)) + f(rv + ev), 1]]; });
calc('cost', 'نسبة التغير بين قيمتين', [['a', 'القيمة السابقة', 80000, 'money'], ['b', 'القيمة الحالية', 96000, 'money']],
  v => [['مقدار التغير', M(v.b - v.a)], ['نسبة التغير', Pc((v.b - v.a) / nz(Math.abs(v.a)) * 100), 1]]);
calc('cost', 'مجمل الربح ونسبته', [['s', 'صافي المبيعات', 300000, 'money'], ['c', 'تكلفة المبيعات', 195000, 'money']],
  v => [['مجمل الربح', M(v.s - v.c), 1], ['نسبة مجمل الربح', Pc((v.s - v.c) / nz(v.s) * 100)], ['نسبة الإضافة على التكلفة', Pc((v.s - v.c) / nz(v.c) * 100)]]);
calc('cost', 'السعر النهائي للمستهلك (تكلفة + ربح + ضريبة)', [['c', 'التكلفة', 80, 'money'], ['k', 'نسبة الإضافة', 35, 'pct'], ['t', 'نسبة الضريبة', () => DB.settings.vat, 'pct']],
  v => { const p = v.c * (1 + v.k / 100), t = p * v.t / 100; return [['السعر قبل الضريبة', M(p)], ['الضريبة', M(t)], ['السعر النهائي', M(p + t), 1]]; });
calc('cost', 'توزيع مبلغ حسب نسب أو أوزان', [['a', 'المبلغ', 90000, 'money'], ['w', 'الأوزان أو النسب (مفصولة بفواصل)', '50, 30, 20', 'list', { full: 1 }]],
  v => { const w = parseList(v.w), t = sum(w); if (!t) throw new Error('أدخل الأوزان'); return w.map((x, i) => [`الجزء ${digits(i + 1)} (${pct(x / t * 100)})`, M(v.a * x / t)]); });
calc('cost', 'تكلفة الاحتفاظ بالمخزون', [['avg', 'متوسط قيمة المخزون', 200000, 'money'], ['h', 'نسبة تكلفة الاحتفاظ السنوية', 20, 'pct']],
  v => [['تكلفة الاحتفاظ السنوية', M(v.avg * v.h / 100), 1], ['التكلفة الشهرية', M(v.avg * v.h / 1200)]]);

// ---- النسب المالية (القيم الافتراضية من الدفاتر) ----
const BK = {
  ca: () => bal('11'), cl: () => bal('21'), inv: () => bal('1104'), cash: () => r2(cashTotal() + bal('1111')), ta: () => bal('1'), tl: () => bal('2'),
  eq: () => r2(bal('3') + profit()), sales: () => bal('41', yearStart()), cogs: () => bal('51', yearStart()), np: () => profit(yearStart()), ar: () => bal('1103'), ap: () => bal('2101'),
  int: () => bal('5215', yearStart()), zak: () => bal('5222', yearStart()), dep: () => r2(bal('5208', yearStart()) + bal('5225', yearStart())), fa: () => r2(bal('12') + bal('13')),
  opex: () => r2(bal('52', yearStart()) - bal('5215', yearStart()) - bal('5222', yearStart())), re: () => r2(bal('3104') + profit()),
};
const ebit = () => r2(BK.np() + BK.int() + BK.zak());
const RN = 'القيم الافتراضية مأخوذة من دفاترك (الأرصدة الحالية وحركة السنة المالية) ويمكنك تعديلها.';
const ratio = (name, fields, fn) => calc('ratio', name, fields, fn, RN);
ratio('نسبة التداول', [['ca', 'الأصول المتداولة', BK.ca, 'money'], ['cl', 'الخصوم المتداولة', BK.cl, 'money']],
  v => ({ rows: [['نسبة التداول', X(v.ca / nz(v.cl, 'الخصوم المتداولة يجب أن تكون أكبر من صفر')), 1]], note: 'المعدل المقبول عادةً بين ١٫٥ و٢ مرة.' }));
ratio('نسبة السيولة السريعة', [['ca', 'الأصول المتداولة', BK.ca, 'money'], ['inv', 'المخزون', BK.inv, 'money'], ['pre', 'المصروفات المقدمة', () => bal('1106'), 'money'], ['cl', 'الخصوم المتداولة', BK.cl, 'money']],
  v => ({ rows: [['النسبة السريعة', X((v.ca - v.inv - v.pre) / nz(v.cl)), 1]], note: 'يُفضّل ألا تقل عن ١ مرة.' }));
ratio('نسبة النقدية', [['cash', 'النقدية وما في حكمها', BK.cash, 'money'], ['cl', 'الخصوم المتداولة', BK.cl, 'money']], v => [['نسبة النقدية', X(v.cash / nz(v.cl)), 1]]);
ratio('رأس المال العامل', [['ca', 'الأصول المتداولة', BK.ca, 'money'], ['cl', 'الخصوم المتداولة', BK.cl, 'money']], v => [['رأس المال العامل', M(v.ca - v.cl), 1]]);
ratio('هامش مجمل الربح', [['s', 'صافي المبيعات', BK.sales, 'money'], ['c', 'تكلفة المبيعات', BK.cogs, 'money']], v => [['مجمل الربح', M(v.s - v.c)], ['هامش مجمل الربح', Pc((v.s - v.c) / nz(v.s) * 100), 1]]);
ratio('هامش صافي الربح', [['np', 'صافي الربح', BK.np, 'money'], ['s', 'صافي المبيعات', BK.sales, 'money']], v => [['هامش صافي الربح', Pc(v.np / nz(v.s) * 100), 1]]);
ratio('هامش الربح التشغيلي', [['s', 'صافي المبيعات', BK.sales, 'money'], ['c', 'تكلفة المبيعات', BK.cogs, 'money'], ['o', 'المصروفات التشغيلية', BK.opex, 'money']],
  v => [['الربح التشغيلي', M(v.s - v.c - v.o)], ['هامش الربح التشغيلي', Pc((v.s - v.c - v.o) / nz(v.s) * 100), 1]]);
ratio('العائد على الأصول (ROA)', [['np', 'صافي الربح', BK.np, 'money'], ['ta', 'إجمالي الأصول', BK.ta, 'money']], v => [['العائد على الأصول', Pc(v.np / nz(v.ta) * 100), 1]]);
ratio('العائد على حقوق الملكية (ROE)', [['np', 'صافي الربح', BK.np, 'money'], ['eq', 'حقوق الملكية', BK.eq, 'money']], v => [['العائد على حقوق الملكية', Pc(v.np / nz(v.eq) * 100), 1]]);
ratio('نسبة المديونية', [['tl', 'إجمالي الخصوم', BK.tl, 'money'], ['ta', 'إجمالي الأصول', BK.ta, 'money']], v => [['نسبة المديونية', Pc(v.tl / nz(v.ta) * 100), 1]]);
ratio('نسبة الديون إلى حقوق الملكية', [['tl', 'إجمالي الخصوم', BK.tl, 'money'], ['eq', 'حقوق الملكية', BK.eq, 'money']], v => [['الديون إلى حقوق الملكية', X(v.tl / nz(v.eq)), 1]]);
ratio('نسبة الملكية', [['eq', 'حقوق الملكية', BK.eq, 'money'], ['ta', 'إجمالي الأصول', BK.ta, 'money']], v => [['نسبة الملكية', Pc(v.eq / nz(v.ta) * 100), 1]]);
ratio('معدل دوران المخزون وفترة التخزين', [['c', 'تكلفة المبيعات السنوية', BK.cogs, 'money'], ['inv', 'متوسط المخزون', BK.inv, 'money']],
  v => { const t = v.c / nz(v.inv); return [['معدل دوران المخزون', X(t), 1], ['متوسط فترة التخزين', Dy(365 / t)]]; });
ratio('معدل دوران الذمم المدينة وفترة التحصيل', [['s', 'صافي المبيعات الآجلة', BK.sales, 'money'], ['ar', 'متوسط الذمم المدينة', BK.ar, 'money']],
  v => { const t = v.s / nz(v.ar); return [['معدل الدوران', X(t), 1], ['متوسط فترة التحصيل', Dy(365 / t)]]; });
ratio('معدل دوران الذمم الدائنة وفترة السداد', [['p', 'المشتريات الآجلة السنوية', BK.cogs, 'money'], ['ap', 'متوسط الذمم الدائنة', BK.ap, 'money']],
  v => { const t = v.p / nz(v.ap, 'متوسط الذمم الدائنة يجب أن يكون أكبر من صفر'); return [['معدل الدوران', X(t), 1], ['متوسط فترة السداد', Dy(365 / t)]]; });
ratio('دورة التحويل النقدي', [['dio', 'فترة التخزين (يوم)', () => r2(365 * BK.inv() / (BK.cogs() || 1)), 'num'], ['dso', 'فترة التحصيل (يوم)', () => r2(365 * BK.ar() / (BK.sales() || 1)), 'num'], ['dpo', 'فترة السداد (يوم)', () => r2(365 * BK.ap() / (BK.cogs() || 1)), 'num']],
  v => ({ rows: [['دورة التحويل النقدي', Dy(v.dio + v.dso - v.dpo), 1]], note: 'كلما قصرت الدورة احتاجت المنشأة تمويلاً أقل لرأس المال العامل.' }));
ratio('معدل دوران الأصول', [['s', 'صافي المبيعات', BK.sales, 'money'], ['ta', 'إجمالي الأصول', BK.ta, 'money']], v => [['معدل دوران الأصول', X(v.s / nz(v.ta)), 1]]);
ratio('معدل دوران الأصول الثابتة', [['s', 'صافي المبيعات', BK.sales, 'money'], ['fa', 'صافي الأصول الثابتة', BK.fa, 'money']], v => [['معدل الدوران', X(v.s / nz(v.fa)), 1]]);
ratio('معدل تغطية الفوائد', [['ebit', 'الربح قبل الفوائد والزكاة', ebit, 'money'], ['i', 'مصروف الفوائد', BK.int, 'money']], v => [['تغطية الفوائد', X(v.ebit / nz(v.i, 'لا توجد فوائد مسجلة — أدخل قيمة')), 1]]);
ratio('ربحية السهم (EPS)', [['np', 'صافي الربح', BK.np, 'money'], ['pd', 'توزيعات الأسهم الممتازة', 0, 'money'], ['sh', 'عدد الأسهم القائمة', 100000, 'num']], v => [['ربحية السهم', M((v.np - v.pd) / nz(v.sh)), 1]]);
ratio('مضاعف الربحية (P/E)', [['p', 'سعر السهم السوقي', 25, 'money'], ['eps', 'ربحية السهم', 2, 'money']], v => [['مضاعف الربحية', X(v.p / nz(v.eps)), 1]]);
ratio('القيمة الدفترية للسهم', [['eq', 'حقوق الملكية', BK.eq, 'money'], ['sh', 'عدد الأسهم', 100000, 'num']], v => [['القيمة الدفترية للسهم', M(v.eq / nz(v.sh)), 1]]);
ratio('نسبة توزيع الأرباح', [['d', 'التوزيعات النقدية', 50000, 'money'], ['np', 'صافي الربح', BK.np, 'money']], v => [['نسبة التوزيع', Pc(v.d / nz(v.np, 'صافي الربح يجب أن يكون موجباً لحساب نسبة التوزيع') * 100), 1], ['نسبة الاحتجاز', Pc((1 - v.d / v.np) * 100)]]);
ratio('عائد التوزيعات النقدية', [['dps', 'التوزيع للسهم', 1.5, 'money'], ['p', 'سعر السهم', 30, 'money']], v => [['عائد التوزيعات', Pc(v.dps / nz(v.p) * 100), 1]]);
ratio('الأرباح قبل الفوائد والزكاة والإهلاك (EBITDA)', [['np', 'صافي الربح', BK.np, 'money'], ['i', 'الفوائد', BK.int, 'money'], ['z', 'الزكاة والضرائب', BK.zak, 'money'], ['d', 'الإهلاك والإطفاء', BK.dep, 'money']],
  v => [['EBIT', M(v.np + v.i + v.z)], ['EBITDA', M(v.np + v.i + v.z + v.d), 1]]);
ratio('تحليل دوبونت للعائد على حقوق الملكية', [['np', 'صافي الربح', BK.np, 'money'], ['s', 'صافي المبيعات', BK.sales, 'money'], ['ta', 'إجمالي الأصول', BK.ta, 'money'], ['eq', 'حقوق الملكية', BK.eq, 'money']],
  v => { const m = v.np / nz(v.s), t = v.s / nz(v.ta), l = v.ta / nz(v.eq); return [['هامش صافي الربح', Pc(m * 100)], ['معدل دوران الأصول', X(t)], ['مضاعف الرفع المالي', X(l)], ['العائد على حقوق الملكية', Pc(m * t * l * 100), 1]]; });
ratio('نموذج ألتمان (Z) للتنبؤ بالتعثر', [['wc', 'رأس المال العامل', () => r2(BK.ca() - BK.cl()), 'money'], ['re', 'الأرباح المحتجزة', BK.re, 'money'], ['ebit', 'الربح قبل الفوائد والضرائب', ebit, 'money'], ['eq', 'حقوق الملكية الدفترية', BK.eq, 'money'], ['ta', 'إجمالي الأصول', BK.ta, 'money'], ['tl', 'إجمالي الخصوم', BK.tl, 'money']],
  v => { const ta = nz(v.ta), z = 6.56 * v.wc / ta + 3.26 * v.re / ta + 6.72 * v.ebit / ta + 1.05 * v.eq / nz(v.tl, 'إجمالي الخصوم يجب أن يكون أكبر من صفر'); return { rows: [['مؤشر Z', fN(z, 2), 1]], note: z > 2.6 ? 'منطقة الأمان: احتمال التعثر منخفض.' : z > 1.1 ? 'المنطقة الرمادية: تتطلب المتابعة.' : 'منطقة الخطر: مؤشرات تعثر مالي.' }; });
ratio('التدفق النقدي الحر', [['cfo', 'صافي التدفق من الأنشطة التشغيلية', 150000, 'money'], ['capex', 'الإنفاق الرأسمالي', 60000, 'money']], v => [['التدفق النقدي الحر', M(v.cfo - v.capex), 1]]);

// ---- الضرائب والزكاة ----
calc('tax', 'إضافة ضريبة القيمة المضافة إلى مبلغ', [['a', 'المبلغ قبل الضريبة', 1000, 'money'], ['r', 'نسبة الضريبة', () => DB.settings.vat, 'pct']],
  v => [['الضريبة', M(v.a * v.r / 100)], ['المبلغ شامل الضريبة', M(v.a * (1 + v.r / 100)), 1]]);
calc('tax', 'استخراج الضريبة من مبلغ شامل', [['a', 'المبلغ شامل الضريبة', 1150, 'money'], ['r', 'نسبة الضريبة', () => DB.settings.vat, 'pct']],
  v => { const n = v.a / (1 + v.r / 100); return [['المبلغ قبل الضريبة', M(n), 1], ['الضريبة', M(v.a - n)]]; });
calc('tax', 'احتساب فاتورة ضريبية بخصم', [['q', 'الكمية', 10, 'num'], ['p', 'سعر الوحدة', 250, 'money'], ['d', 'نسبة الخصم', 10, 'pct'], ['r', 'نسبة الضريبة', () => DB.settings.vat, 'pct']],
  v => { const g = v.q * v.p, d = g * v.d / 100, n = g - d, t = n * v.r / 100; return [['الإجمالي', M(g)], ['الخصم', M(d)], ['الصافي الخاضع للضريبة', M(n)], ['الضريبة', M(t)], ['الإجمالي المستحق', M(n + t), 1]]; });
calc('tax', 'صافي ضريبة القيمة المضافة المستحقة', [['o', 'ضريبة المخرجات (المبيعات)', () => vatSummary().out, 'money'], ['i', 'ضريبة المدخلات (المشتريات)', () => vatSummary().inp, 'money']],
  v => { const n = v.o - v.i; return [[n >= 0 ? 'صافي الضريبة المستحقة السداد' : 'رصيد ضريبي قابل للاسترداد', M(Math.abs(n)), 1]]; });
const zakatFields = d => [['eq', 'رأس المال والاحتياطيات والأرباح المدورة', d ? () => bal('3') : 500000, 'money'], ['np', 'صافي الربح المعدل للسنة', d ? () => profit(yearStart()) : 120000, 'money'],
  ['ltl', 'القروض والمخصصات طويلة الأجل', d ? () => bal('22') : 100000, 'money'], ['fa', 'صافي الأصول الثابتة وغير الملموسة (حسم)', d ? BK.fa : 300000, 'money'],
  ['inv', 'استثمارات طويلة الأجل (حسم)', 0, 'money'], ['cal', 'نوع السنة', 'g', 'select', { opts: [['g', 'ميلادية (٢٫٥٧٧٥٪)'], ['h', 'هجرية (٢٫٥٪)']] }]];
const zakatRun = v => { const base = v.eq + v.np + v.ltl - v.fa - v.inv, rate = v.cal === 'h' ? 2.5 : 2.5775, z = Math.max(base, v.np, 0) * rate / 100; return { rows: [['الوعاء الزكوي', M(base)], ['الوعاء المعتمد (لا يقل عن صافي الربح)', M(Math.max(base, v.np, 0))], ['الزكاة المستحقة', M(z), 1]], note: 'احتساب تقديري مبسّط وفق طريقة صافي حقوق الملكية — يُراجع مع إقرار هيئة الزكاة والضريبة والجمارك.' }; };
calc('tax', 'احتساب الزكاة التقديري (إدخال يدوي)', zakatFields(false), zakatRun);
calc('tax', 'احتساب الزكاة من أرصدة الدفاتر', zakatFields(true), zakatRun);
calc('tax', 'ضريبة الاستقطاع على المدفوعات لغير المقيمين', [['a', 'مبلغ الدفعة', 50000, 'money'], ['r', 'نسبة الاستقطاع', '5', 'select', { opts: [['5', '٥٪ (خدمات فنية، إيجار، تذاكر)'], ['15', '١٥٪ (إتاوات، خدمات من طرف مرتبط)'], ['20', '٢٠٪ (أتعاب إدارة)']] }]],
  v => { const t = v.a * num(v.r) / 100; return [['ضريبة الاستقطاع', M(t), 1], ['صافي المبلغ المحوّل للمستفيد', M(v.a - t)]]; });
calc('tax', 'ضريبة الدخل على الأرباح', [['p', 'صافي الربح الخاضع', 400000, 'money'], ['r', 'نسبة الضريبة', 20, 'pct'], ['s', 'نسبة الملكية الخاضعة', 100, 'pct']],
  v => [['الربح الخاضع للضريبة', M(v.p * v.s / 100)], ['ضريبة الدخل', M(v.p * v.s / 100 * v.r / 100), 1]]);

// ---- الرواتب ----
calc('hr', 'مكافأة نهاية الخدمة (نظام العمل السعودي)', [['w', 'آخر أجر شهري (أساسي + بدلات ثابتة)', 9000, 'money'], ['from', 'تاريخ المباشرة', '2018-03-01', 'date'], ['to', 'تاريخ انتهاء الخدمة', today, 'date'], ['reason', 'سبب انتهاء العلاقة', 'end', 'select', { opts: [['end', 'انتهاء العقد أو إنهاء صاحب العمل'], ['resign', 'استقالة الموظف']] }]],
  v => { const y = Math.max(0, daysBetween(v.from, v.to)) / 365, e = eosAward(v.w, y, v.reason); return { rows: [['مدة الخدمة', Yr(y)], ['المكافأة الكاملة', M(e.full)], ['نسبة الاستحقاق', Pc(e.factor * 100)], ['المكافأة المستحقة', M(e.award), 1]], note: 'نصف أجر شهر عن كل سنة من السنوات الخمس الأولى، وأجر شهر كامل عن كل سنة بعدها؛ وفي الاستقالة: لا شيء قبل سنتين، ثلث المكافأة من ٢ إلى ٥ سنوات، ثلثاها من ٥ إلى ١٠، وكاملة بعد ١٠ سنوات.' }; });
calc('hr', 'الأجر اليومي وأجر الساعة', [['m', 'الأجر الشهري', 6000, 'money'], ['h', 'ساعات العمل اليومية', 8, 'num']],
  v => [['الأجر اليومي', M(v.m / 30), 1], ['أجر الساعة', M(v.m / 30 / nz(v.h))]]);
calc('hr', 'أجر العمل الإضافي', [['b', 'الأجر الأساسي الشهري', 5000, 'money'], ['full', 'الأجر الشامل الشهري', 6500, 'money'], ['h', 'عدد الساعات الإضافية', 12, 'num'], ['d', 'ساعات العمل اليومية', 8, 'num']],
  v => { const hr = v.full / 30 / nz(v.d), extra = v.b / 30 / v.d * 0.5; return { rows: [['أجر الساعة الإضافية', M(hr + extra)], ['إجمالي أجر العمل الإضافي', M((hr + extra) * v.h), 1]], note: 'أجر الساعة الإضافية = أجر الساعة + ٥٠٪ من أجر الساعة الأساسي.' }; });
calc('hr', 'اشتراكات التأمينات الاجتماعية', [['w', 'الأجر الخاضع (أساسي + سكن)', 8000, 'money'], ['ee', 'نسبة حصة الموظف', 9.75, 'pct'], ['er', 'نسبة حصة صاحب العمل', 11.75, 'pct'], ['cap', 'الحد الأعلى للأجر الخاضع', 45000, 'money']],
  v => { const w = Math.min(v.w, v.cap || v.w); return [['حصة الموظف (تُستقطع)', M(w * v.ee / 100)], ['حصة صاحب العمل', M(w * v.er / 100)], ['إجمالي الاشتراك الشهري', M(w * (v.ee + v.er) / 100), 1]]; });
calc('hr', 'أجر الإجازة السنوية', [['w', 'الأجر الشهري الشامل', 9000, 'money'], ['d', 'عدد أيام الإجازة', 21, 'int']], v => [['أجر الإجازة', M(v.w / 30 * v.d), 1]]);
calc('hr', 'خصم الغياب والتأخير', [['w', 'الأجر الشهري الشامل', 9000, 'money'], ['d', 'أيام الغياب', 2, 'num'], ['m', 'دقائق التأخير', 90, 'num'], ['h', 'ساعات العمل اليومية', 8, 'num']],
  v => { const day = v.w / 30, min = day / nz(v.h) / 60; return [['خصم الغياب', M(day * v.d)], ['خصم التأخير', M(min * v.m)], ['إجمالي الخصم', M(day * v.d + min * v.m), 1]]; });
calc('hr', 'صافي الراتب الشهري', [['b', 'الأساسي', 6000, 'money'], ['hs', 'بدل السكن', 1500, 'money'], ['t', 'بدل النقل', 600, 'money'], ['o', 'بدلات أخرى', 0, 'money'], ['g', 'نسبة التأمينات (الموظف)', 9.75, 'pct'], ['ded', 'خصومات أخرى وسلف', 0, 'money']],
  v => { const gross = v.b + v.hs + v.t + v.o, gosi = (v.b + v.hs) * v.g / 100; return [['إجمالي الراتب', M(gross)], ['استقطاع التأمينات', M(gosi)], ['خصومات أخرى', M(v.ded)], ['صافي الراتب', M(gross - gosi - v.ded), 1]]; });

// ---- العملات ----
calc('fx', 'تحويل العملات', [['a', 'المبلغ', 1000, 'money'], ['r', 'سعر الصرف (وحدة العملة الأجنبية بالمحلية)', 3.75, 'num']],
  v => [['المبلغ بالعملة المحلية', M(v.a * v.r), 1], ['المبلغ المحلي بالعملة الأجنبية', fN(v.a / nz(v.r), 2)]]);
calc('fx', 'فروقات العملة عند السداد أو التحصيل', [['fa', 'المبلغ بالعملة الأجنبية', 10000, 'money'], ['r1', 'سعر الصرف عند التسجيل', 3.75, 'num'], ['r2', 'سعر الصرف عند السداد', 3.76, 'num'], ['t', 'نوع الرصيد', 'ar', 'select', { opts: [['ar', 'مستحق لنا (عميل)'], ['ap', 'مستحق علينا (مورد)']] }]],
  v => { let d = v.fa * (v.r2 - v.r1); if (v.t === 'ap') d = -d; return [['القيمة الدفترية', M(v.fa * v.r1)], ['القيمة عند التسوية', M(v.fa * v.r2)], [d >= 0 ? 'أرباح فروقات عملة' : 'خسائر فروقات عملة', M(Math.abs(d)), 1]]; });
calc('fx', 'السعر المتقاطع بين عملتين', [['a', 'سعر العملة (أ) مقابل الدولار', 3.75, 'num'], ['b', 'سعر العملة (ب) مقابل الدولار', 0.31, 'num']],
  v => [['١ (ب) = ? (أ)', fN(v.a / nz(v.b), 4), 1], ['١ (أ) = ? (ب)', fN(v.b / nz(v.a), 4)]]);
calc('fx', 'إعادة تقييم رصيد بالعملة الأجنبية', [['fa', 'الرصيد بالعملة الأجنبية', 25000, 'money'], ['r1', 'السعر الدفتري', 3.75, 'num'], ['r2', 'سعر الإقفال', 3.7, 'num']],
  v => { const d = v.fa * (v.r2 - v.r1); return [['القيمة بعد إعادة التقييم', M(v.fa * v.r2)], [d >= 0 ? 'أرباح غير محققة' : 'خسائر غير محققة', M(Math.abs(d)), 1]]; });

// ---- أدوات مساعدة ----
calc('util', 'تفقيط مبلغ (كتابته بالحروف)', [['a', 'المبلغ', 12345.5, 'money'], ['c', 'اسم العملة', () => DB.settings.curName, 'text'], ['s', 'اسم الجزء', () => DB.settings.subName, 'text']],
  v => `<b class="big-words">${esc(tafqeet(v.a, v.c || 'ريال', v.s || 'هللة'))}</b>`);
calc('util', 'تحويل التاريخ الميلادي إلى هجري', [['d', 'التاريخ الميلادي', today, 'date']], v => [['التاريخ الهجري (أم القرى)', esc(hijri(v.d)) || '—', 1]]);
calc('util', 'عدد الأيام بين تاريخين', [['a', 'من تاريخ', yearStart, 'date'], ['b', 'إلى تاريخ', today, 'date']],
  v => { const d = daysBetween(v.a, v.b); return [['عدد الأيام', Dy(d), 1], ['بالأسابيع', fN(d / 7, 1)], ['بالأشهر التقريبية', fN(d / 30.4375, 1)]]; });
calc('util', 'حساب تاريخ الاستحقاق', [['d', 'تاريخ الفاتورة', today, 'date'], ['n', 'مدة الائتمان (أيام)', 30, 'int']], v => [['تاريخ الاستحقاق', fdate(addDays(v.d, Math.trunc(v.n))), 1], ['الموافق هجرياً', esc(hijri(addDays(v.d, Math.trunc(v.n))))]]);
calc('util', 'مذكرة التسوية البنكية', [['book', 'الرصيد حسب الدفاتر', () => rawBal('1102'), 'money'], ['bank', 'الرصيد حسب كشف البنك', 0, 'money'], ['oc', 'شيكات صادرة لم تُصرف', 0, 'money'], ['dt', 'إيداعات في الطريق', 0, 'money'], ['ch', 'مصروفات بنكية لم تُسجّل', 0, 'money'], ['in', 'إيداعات/عوائد لم تُسجّل', 0, 'money']],
  v => { const b = v.bank - v.oc + v.dt, k = v.book - v.ch + v.in, d = r2(b - k); return { rows: [['الرصيد المعدّل حسب البنك', M(b)], ['الرصيد المعدّل حسب الدفاتر', M(k)], ['الفرق', M(d), 1]], note: d ? 'يوجد فرق غير مفسّر — راجع الحركات.' : 'الرصيدان متطابقان بعد التسوية.' }; });
calc('util', 'توزيع مصروف مقدم على الفترات', [['a', 'المبلغ المدفوع مقدماً', 36000, 'money'], ['n', 'عدد الأشهر المغطاة', 12, 'int'], ['e', 'الأشهر المنقضية', 4, 'int']],
  v => { const m = v.a / nz(v.n), e = Math.min(v.e, v.n); return [['المصروف الشهري', M(m)], ['المصروف المستحق حتى الآن', M(m * e), 1], ['الرصيد المقدم المتبقي', M(v.a - m * e)]]; });
calc('util', 'جدولة مبلغ على أقساط', [['a', 'المبلغ', 60000, 'money'], ['n', 'عدد الأقساط', 6, 'int'], ['d', 'تاريخ القسط الأول', today, 'date'], ['k', 'كل (أشهر)', 1, 'int']],
  v => { const n = Math.min(nz(v.n), 240), p = r2(v.a / n), rows = []; for (let i = 0; i < n; i++) rows.push([fdate(addMonths(v.d, i * (v.k || 1))), i === n - 1 ? r2(v.a - p * (n - 1)) : p]); return { html: scheduleTable(['تاريخ الاستحقاق', 'قيمة القسط'], rows) }; });
calc('util', 'حاسبة النسبة المئوية', [['x', 'الجزء', 250, 'num'], ['y', 'الكل', 2000, 'num'], ['p', 'نسبة لحساب قيمتها', 15, 'pct']],
  v => [['الجزء من الكل', Pc(v.x / nz(v.y) * 100), 1], [pct(v.p) + ' من الكل', fN(v.y * v.p / 100, 2)]]);
calc('util', 'إحصاءات قائمة مبالغ', [['l', 'المبالغ (مفصولة بفواصل)', '1200, 850, 3400, 760, 2100', 'list', { full: 1 }]],
  v => { const l = parseList(v.l); if (!l.length) throw new Error('أدخل المبالغ'); const s = sum(l); return [['العدد', fN(l.length, 0)], ['المجموع', M(s), 1], ['المتوسط', M(s / l.length)], ['الأعلى', M(Math.max(...l))], ['الأدنى', M(Math.min(...l))]]; });

const OPS_COUNT = OPS.length;
