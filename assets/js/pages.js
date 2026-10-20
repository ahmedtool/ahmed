'use strict';
/* =========================================================
   ميزان — الصفحات والتقارير
   ========================================================= */

const PAGES = {};
const R = { page: 'dash', params: {} };
const ACT = {};
const page = (id, title, render, opts = {}) => { PAGES[id] = { title, render, ...opts }; };

/* ---------- عناصر مشتركة ---------- */
const head = (title, sub = '', actions = '') => `<div class="page-head"><div class="ph-text"><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions ? `<div class="head-actions">${actions}</div>` : ''}</div>`;
const btn = (label, attrs, cls = '', ic = '') => `<button type="button" class="btn ${cls}" ${attrs}>${ic ? icon(ic) : ''}<span>${label}</span></button>`;
const opBtn = (id, label, cls = '', ic = 'plus', preset) => btn(label || esc(OPS_BY_ID.get(id).name), `data-op="${id}"${preset ? ` data-preset="${esc(JSON.stringify(preset))}"` : ''}`, cls, ic);
const goBtn = (pg, label, params, cls = 'ghost', ic = '') => btn(label, `data-go="${pg}"${params ? ` data-params="${esc(JSON.stringify(params))}"` : ''}`, cls, ic);
const iconBtn = (ic, title, attrs) => `<button type="button" class="icon-btn sm" title="${title}" aria-label="${title}" ${attrs}>${icon(ic)}</button>`;
const badge = (t, cls = '') => `<span class="badge ${cls}">${t}</span>`;
const srcBadge = s => badge(SRC_NAMES[s] || s, ['sale', 'rv'].includes(s) ? 'ok' : ['purchase', 'pv', 'payroll'].includes(s) ? 'info' : ['reverse', 'cancel'].includes(s) ? 'bad' : 'muted');
const card = (title, body, extra = '', cls = '') => `<section class="card ${cls}">${title ? `<div class="card-h"><h2>${title}</h2>${extra}</div>` : ''}${body}</section>`;
const empty = (msg, action = '') => `<div class="empty"><p>${msg}</p>${action}</div>`;

function table(cols, rows, { foot, emptyMsg = 'لا توجد بيانات للفترة المحددة', cls = '', action = '' } = {}) {
  if (!rows.length) return empty(emptyMsg, action);
  const td = (c, v) => `<td class="${c.n ? 'num' : ''} ${c.cls || ''}">${v}</td>`;
  return `<div class="tbl-wrap"><table class="tbl ${cls}"><thead><tr>${cols.map(c => `<th class="${c.n ? 'num' : ''} ${c.cls || ''}">${c.h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr${r._cls ? ` class="${r._cls}"` : ''}>${cols.map(c => td(c, c.f(r))).join('')}</tr>`).join('')}</tbody>
    ${foot ? `<tfoot><tr>${foot.map((f, i) => td(cols[i] || {}, f)).join('')}</tr></tfoot>` : ''}</table></div>`;
}
function dateBar(p, extra = '', withFrom = true) {
  return `<form class="filters" data-filter>
    ${withFrom ? `<label class="field sm"><span>من تاريخ</span><input type="date" name="from" value="${esc(p.from || '')}"></label>` : ''}
    <label class="field sm"><span>${withFrom ? 'إلى تاريخ' : 'كما في تاريخ'}</span><input type="date" name="to" value="${esc(p.to || '')}"></label>
    ${extra}
    <button class="btn" type="submit">${icon('search')}<span>عرض</span></button>
    ${withFrom ? `<div class="quick">${[['month', 'هذا الشهر'], ['lastmonth', 'الشهر الماضي'], ['quarter', 'هذا الربع'], ['year', 'السنة المالية'], ['all', 'الكل']].map(([r, l]) => `<button type="button" class="chip-btn" data-act="range" data-r="${r}">${l}</button>`).join('')}</div>` : ''}
  </form>`;
}
const repActions = () => btn('تصدير CSV', 'data-act="csv"', 'ghost', 'download') + (IN_FRAME ? '' : btn('طباعة', 'data-act="print"', 'ghost', 'print'));
const withDefaults = (p, d) => { for (const k in d) if (p[k] === undefined) p[k] = typeof d[k] === 'function' ? d[k]() : d[k]; return p; };
const periodLabel = p => (p.from ? `من ${fdate(p.from)} ` : 'منذ البداية ') + `إلى ${fdate(p.to || today())}`;
function partyOptions() {
  return memo('partyOpts', () => blankOpt() + [['c', 'العملاء'], ['s', 'الموردون'], ['e', 'الموظفون']].map(([t, l]) => {
    const list = partyList(t); return list.length ? `<optgroup label="${l}">${list.map(x => `<option value="${t}:${x.id}">${esc(x.name)}</option>`).join('')}</optgroup>` : '';
  }).join(''));
}
const normAr = s => String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d));

/* =========================================================
   لوحة التحكم
   ========================================================= */
const nfc = () => new Intl.NumberFormat(DB.settings.digits === 'arab' ? 'ar-SA' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 });
function niceMax(v) { if (v <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
function barChart(data) {
  // data: [{label, a, b}] — يُرسم من اليمين إلى اليسار (الأقدم يميناً)
  const W = 640, H = 250, padT = 14, padB = 34, padR = 58, padL = 10, ch = H - padT - padB, cw = W - padR - padL;
  const max = niceMax(Math.max(1, ...data.flatMap(d => [d.a, d.b]))), fmt = nfc();
  const gw = cw / data.length, bw = Math.min(26, (gw - 18) / 2);
  const y = v => padT + ch - (Math.max(0, v) / max) * ch;
  const bar = (x, v, cls) => { const top = y(v), h = padT + ch - top; if (h < 0.5) return ''; const r = Math.min(4, h, bw / 2); return `<path class="${cls}" d="M${x},${padT + ch} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${padT + ch} Z"/>`; };
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, yy = y(v); g += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}"/><text class="ax" x="${W - padR + 8}" y="${yy + 4}" text-anchor="start">${fmt.format(v)}</text>`; }
  data.forEach((d, i) => {
    const gx = W - padR - gw * (i + 1), cx = gx + gw / 2;
    g += bar(cx - bw - 1, d.a, 's1') + bar(cx + 1, d.b, 's2');
    g += `<text class="ax" x="${cx}" y="${H - 12}" text-anchor="middle">${esc(d.label)}</text>`;
    g += `<rect class="hit" x="${gx}" y="${padT}" width="${gw}" height="${ch}" data-i="${i}"/>`;
  });
  return `<div class="chart" data-chart='${esc(JSON.stringify(data))}'><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="رسم بياني للإيرادات والمصروفات">${g}</svg><div class="tip" hidden></div></div>`;
}
function bindChart(root) {
  const c = root.querySelector('.chart'); if (!c) return;
  const data = JSON.parse(c.dataset.chart), tip = c.querySelector('.tip');
  c.addEventListener('pointermove', e => {
    const h = e.target.closest('.hit'); if (!h) { tip.hidden = true; return; }
    const d = data[+h.dataset.i];
    tip.innerHTML = `<b>${esc(d.label)}</b><div><i class="sw s1"></i>الإيرادات <span class="n" dir="ltr">${f2(d.a)}</span></div><div><i class="sw s2"></i>المصروفات <span class="n" dir="ltr">${f2(d.b)}</span></div><div class="tip-net">الصافي <span class="n${d.a - d.b < 0 ? ' neg' : ''}" dir="ltr">${f2(d.a - d.b)}</span></div>`;
    tip.hidden = false;
    const r = c.getBoundingClientRect(), hr = h.getBoundingClientRect();
    let x = hr.left - r.left + hr.width / 2 - tip.offsetWidth / 2; x = Math.max(4, Math.min(x, r.width - tip.offsetWidth - 4));
    tip.style.left = x + 'px'; tip.style.top = '4px';
  });
  c.addEventListener('pointerleave', () => { tip.hidden = true; });
}
page('dash', 'لوحة التحكم', () => {
  const t = today(), m0 = t.slice(0, 8) + '01', ys = yearStart();
  const months = []; for (let i = 5; i >= 0; i--) { const s = addMonths(m0, -i); months.push({ s, e: monthEnd(ym(s)), label: MONTHS[+s.slice(5, 7) - 1] }); }
  const data = months.map(m => ({ label: m.label, a: bal('4', m.s, m.e), b: bal('5', m.s, m.e) }));
  const revM = bal('4', m0, t), expM = bal('5', m0, t), npY = profit(ys, t);
  const prev = data[4] || { a: 0, b: 0 };
  const delta = (cur, old) => (old ? `<span class="delta ${cur >= old ? 'up' : 'down'}">${cur >= old ? '▲' : '▼'} ${pct(Math.abs((cur - old) / old * 100), 0)}</span> عن الشهر السابق` : 'لا توجد بيانات للشهر السابق');
  const kpi = (label, v, sub, go, params) => `<button type="button" class="kpi" data-go="${go}"${params ? ` data-params="${esc(JSON.stringify(params))}"` : ''}><span class="k-label">${label}</span><span class="k-val">${money(v)}<small>${esc(cur())}</small></span><span class="k-sub">${sub}</span></button>`;
  const low = DB.items.filter(i => i.min > 0 && i.qty <= i.min);
  const dueChq = DB.cheques.filter(c => c.status === 'pending' && daysBetween(t, c.due) <= 7);
  const unpaid = DB.payrolls.filter(p => !p.paid);
  const vat = vatSummary(addMonths(m0, -2), t);
  const alerts = [
    ...dueChq.map(c => [daysBetween(t, c.due) < 0 ? 'bad' : 'warn', `شيك ${c.kind === 'in' ? 'وارد' : 'صادر'} رقم ${esc(c.chqNo)} — ${esc(partyName(c.party))} بمبلغ ${f2(c.amount)} ${daysBetween(t, c.due) < 0 ? 'متأخر منذ ' + digits(-daysBetween(t, c.due)) + ' يوم' : 'يستحق ' + (daysBetween(t, c.due) ? 'خلال ' + digits(daysBetween(t, c.due)) + ' يوم' : 'اليوم')}`, 'cheques']),
    ...low.map(i => [i.qty <= 0 ? 'bad' : 'warn', `الصنف «${esc(i.name)}» ${i.qty <= 0 ? 'نفد من المخزون' : 'بلغ حد الطلب'} — الرصيد ${fN(i.qty, 0)} ${esc(i.unit)}`, 'items']),
    ...unpaid.map(p => ['warn', `رواتب ${monthName(p.month)} مستحقة غير مصروفة — صافي ${f2(p.net)}`, 'employees']),
    ...(vat.net > 0 ? [['info', `صافي ضريبة القيمة المضافة المستحقة عن آخر ٣ أشهر: ${f2(vat.net)}`, 'rep-vat']] : []),
  ];
  const recent = DB.journals.slice(-7).reverse();
  const quick = [['inv-sale', 'فاتورة مبيعات', 'file'], ['inv-purchase', 'فاتورة مشتريات', 'truck'], ['rv-cust', 'سند قبض', 'swap'], ['pv-gen', 'سند صرف', 'swap'], ['je-new', 'قيد يومية', 'book'], [OPS.find(o => o.name === 'سداد الإيجار').id, 'سداد إيجار', 'building']];
  return head(esc(DB.settings.company), `${fdate(t)} م · ${esc(hijri(t))}`, btn('مركز العمليات', 'data-go="ops"', 'pri', 'bolt'))
    + `<div class="kpis">
      ${kpi('النقدية والبنوك', cashTotal(), `${digits(cashAccs().length)} حسابات نقدية وبنكية`, 'rep-cash')}
      ${kpi('مستحق من العملاء', bal('1103'), `${digits(DB.customers.filter(c => partyBal('c:' + c.id) > 0).length)} عملاء لديهم أرصدة`, 'rep-aging', { t: 'c' })}
      ${kpi('مستحق للموردين', bal('2101'), `${digits(DB.suppliers.filter(c => partyBal('s:' + c.id) < 0).length)} موردين لهم أرصدة`, 'rep-aging', { t: 's' })}
      ${kpi('قيمة المخزون', bal('1104'), `${digits(DB.items.length)} صنفاً · ${digits(low.length)} تحت حد الطلب`, 'rep-stock')}
    </div>
    <div class="grid g-dash">
      ${card('الإيرادات والمصروفات — آخر ستة أشهر', !data.some(d => d.a || d.b) ? empty('لا توجد إيرادات أو مصروفات مرحّلة في آخر ستة أشهر بعد. ابدأ بإصدار فاتورة أو تسجيل قيد.', opBtn('inv-sale', 'فاتورة مبيعات', 'pri sm') + opBtn('je-new', 'قيد يومية', 'ghost sm')) : `<div class="legend"><span><i class="sw s1"></i>الإيرادات</span><span><i class="sw s2"></i>المصروفات</span></div>${barChart(data)}
        <details class="chart-data"><summary>عرض البيانات كجدول</summary>${table([{ h: 'الشهر', f: d => esc(d.label) }, { h: 'الإيرادات', n: 1, f: d => money(d.a) }, { h: 'المصروفات', n: 1, f: d => money(d.b) }, { h: 'الصافي', n: 1, f: d => money(d.a - d.b) }], data, { cls: 'compact' })}</details>`, '', 'span2')}
      ${card('أداء الفترة', `<dl class="stats">
          <div><dt>إيرادات هذا الشهر</dt><dd>${money(revM)}</dd><small>${delta(revM, prev.a)}</small></div>
          <div><dt>مصروفات هذا الشهر</dt><dd>${money(expM)}</dd><small>${delta(expM, prev.b)}</small></div>
          <div><dt>صافي ربح السنة المالية</dt><dd>${money(npY)}</dd><small>منذ ${fdate(ys)}</small></div>
          <div><dt>هامش صافي الربح</dt><dd>${bal('41', ys) ? pct(npY / bal('41', ys) * 100, 1) : '—'}</dd><small>من صافي المبيعات</small></div>
        </dl>`)}
    </div>
    <div class="grid g3">
      ${card('عمليات سريعة', `<div class="quick-ops">${quick.map(([id, l, ic]) => `<button type="button" class="qop" data-op="${id}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>`)}
      ${card('تنبيهات', alerts.length ? `<ul class="alerts">${alerts.slice(0, 8).map(([c, m, g]) => `<li class="al-${c}"><button type="button" data-go="${g}">${icon(c === 'info' ? 'clock' : 'alert')}<span>${m}</span></button></li>`).join('')}</ul>` : empty('لا توجد تنبيهات — كل شيء على ما يرام.'), alerts.length ? badge(digits(alerts.length), 'warn') : '')}
      ${card('أحدث القيود', recent.length ? `<ul class="recent">${recent.map(j => `<li><button type="button" data-act="je-view" data-id="${j.id}"><span class="r-no">#${digits(j.no)}</span><span class="r-desc">${esc(j.desc)}<small>${fdate(j.date)}</small></span>${money(j.total)}</button></li>`).join('')}</ul>` : empty('لا توجد قيود بعد', opBtn('je-new', 'أنشئ أول قيد', 'pri sm')), goBtn('journal', 'الكل', null, 'ghost sm'))}
    </div>`;
}, { after: () => bindChart($('#main')) });

/* =========================================================
   مركز العمليات
   ========================================================= */
page('ops', 'مركز العمليات', p => {
  const kindOf = o => (o.calc ? ['حاسبة', 'calc'] : o.go ? ['شاشة', 'nav'] : o.act ? ['إجراء', 'act'] : o.kind === 'je' ? ['قيد', 'je'] : ['نموذج', 'form']);
  const counts = {}; OPS.forEach(o => { counts[o.cat] = (counts[o.cat] || 0) + 1; });
  const stats = { je: OPS.filter(o => o.kind === 'je').length, calc: OPS.filter(o => o.calc).length };
  return head('مركز العمليات', `<b class="big-count">${digits(OPS_COUNT)}</b> عملية محاسبية: ${digits(stats.je)} عملية تُنشئ قيوداً، و${digits(stats.calc)} حاسبة مالية وتحليلية، والباقي شاشات ونماذج وإجراءات.`)
    + `<div class="ops-tools"><label class="search-box">${icon('search')}<input id="opsSearch" type="search" placeholder="ابحث: إيجار، إهلاك، زكاة، فاتورة، نقطة التعادل…" value="${esc(p.q || '')}" autocomplete="off"></label>
      <div class="chips" id="opsCats"><button type="button" class="chip-btn on" data-cat="">الكل <b>${digits(OPS_COUNT)}</b></button>${CATS.map(([c, n]) => `<button type="button" class="chip-btn" data-cat="${c}">${n} <b>${digits(counts[c] || 0)}</b></button>`).join('')}</div></div>
    <div id="opsList">${CATS.map(([c, n, ic]) => `<section class="op-sec" data-sec="${c}"><h2>${icon(ic)}${n}<small>${digits(counts[c] || 0)}</small></h2><div class="op-grid">${OPS.filter(o => o.cat === c).map(o => { const [kl, kc] = kindOf(o); return `<button type="button" class="op-btn" data-op="${o.id}" data-s="${esc(normAr(o.name + ' ' + n))}"><span>${esc(o.name)}</span><i class="op-tag t-${kc}">${kl}</i></button>`; }).join('')}</div></section>`).join('')}</div>
    <p class="empty" id="opsNone" hidden>لا توجد عملية مطابقة — جرّب كلمة أخرى.</p>`;
}, {
  after(p) {
    const inp = $('#opsSearch'); let cat = '';
    const apply = () => {
      const q = normAr(inp.value.trim()).split(/\s+/).filter(Boolean); let shown = 0;
      $$('.op-sec').forEach(sec => {
        let n = 0;
        $$('.op-btn', sec).forEach(b => { const ok = (!cat || sec.dataset.sec === cat) && q.every(w => b.dataset.s.includes(w)); b.hidden = !ok; if (ok) n++; });
        sec.hidden = !n; shown += n;
      });
      $('#opsNone').hidden = !!shown;
    };
    inp.addEventListener('input', apply);
    $('#opsCats').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; $$('#opsCats .chip-btn').forEach(x => x.classList.toggle('on', x === b)); apply(); });
    apply();
    if (matchMedia('(pointer:fine)').matches) inp.focus();
  },
});

/* =========================================================
   دليل الحسابات
   ========================================================= */
page('accounts', 'دليل الحسابات', p => {
  const rows = accTree().filter(({ a }) => !p.q || normAr(a.name + a.code).includes(normAr(p.q)));
  return head('دليل الحسابات', `${digits(DB.accounts.length)} حساباً · ${digits(leaves().length)} حساباً فرعياً قابلاً للترحيل`, opBtn('acc-add', 'إضافة حساب', 'pri') + btn('تصدير', 'data-op="exp-coa"', 'ghost', 'download'))
    + `<form class="filters" data-filter><label class="field sm grow"><span>بحث</span><input type="search" name="q" value="${esc(p.q || '')}" placeholder="اسم الحساب أو رمزه"></label><button class="btn" type="submit">${icon('search')}<span>بحث</span></button></form>`
    + card('', table([
      { h: 'الرمز', f: ({ a }) => `<span class="code">${digits(a.code)}</span>` },
      { h: 'اسم الحساب', f: ({ a, depth }) => `<span class="tree d${Math.min(depth, 4)} ${a.grp ? 'grp' : ''}">${esc(a.name)}${a.cash ? ' ' + badge('نقدي', 'info') : ''}</span>` },
      { h: 'النوع', f: ({ a }) => TYPE_NAMES[a.type] },
      { h: 'الطبيعة', f: ({ a }) => (a.type === 'A' || a.type === 'X' ? 'مدين' : 'دائن') },
      { h: 'الرصيد', n: 1, f: ({ a }) => amt(bal(a.code)) },
      { h: '', cls: 'actions no-csv', f: ({ a }) => iconBtn('eye', 'كشف حساب', `data-go="ledger" data-params="${esc(JSON.stringify({ acc: a.code }))}"`) + (a.grp ? iconBtn('plus', 'إضافة حساب فرعي', `data-op="acc-add" data-preset="${esc(JSON.stringify({ parent: a.code }))}"`) : '') + iconBtn('edit', 'تعديل الاسم', `data-op="acc-rename" data-preset="${esc(JSON.stringify({ code: a.code }))}"`) },
    ], rows.map(r => ({ ...r, _cls: r.a.grp ? 'row-grp' : '' })), { cls: 'tree-tbl' }));
});

/* =========================================================
   دفتر اليومية والقيود
   ========================================================= */
page('journal', 'دفتر اليومية', p => {
  withDefaults(p, { from: '', to: '' });
  const q = normAr(p.q || '');
  let list = sortedJournals().filter(j => (!p.from || j.date >= p.from) && (!p.to || j.date <= p.to) && (!p.src || j.src === p.src) && (!q || normAr(j.desc + ' ' + j.ref + ' ' + j.no).includes(q))).reverse();
  const total = list.length, shown = list.slice(0, +p.limit || 200);
  return head('دفتر اليومية', `${digits(total)} قيداً${total > shown.length ? ` (يُعرض أحدث ${digits(shown.length)})` : ''}`, opBtn('je-new', 'قيد جديد', 'pri') + btn('تصدير', 'data-op="exp-je"', 'ghost', 'download'))
    + dateBar(p, `<label class="field sm"><span>المصدر</span><select name="src">${blankOpt('الكل')}${optList(Object.entries(SRC_NAMES))}</select></label><label class="field sm grow"><span>بحث</span><input type="search" name="q" value="${esc(p.q || '')}" placeholder="البيان أو المرجع أو رقم القيد"></label>`)
    + card('', table([
      { h: 'رقم', f: j => `<button type="button" class="link" data-act="je-view" data-id="${j.id}">#${digits(j.no)}</button>` },
      { h: 'التاريخ', f: j => fdate(j.date) },
      { h: 'البيان', f: j => `${esc(j.desc)}${j.ref ? ` <small class="muted">${esc(j.ref)}</small>` : ''}` },
      { h: 'الحسابات', cls: 'hide-sm', f: j => `<small class="muted">${j.lines.slice(0, 3).map(l => esc(accName(l.acc))).join('، ')}${j.lines.length > 3 ? '…' : ''}</small>` },
      { h: 'المصدر', f: j => srcBadge(j.src) },
      { h: 'المبلغ', n: 1, f: j => money(j.total) },
      { h: '', cls: 'actions no-csv', f: j => iconBtn('eye', 'عرض', `data-act="je-view" data-id="${j.id}"`) + iconBtn('undo', 'عكس القيد', `data-op="je-reverse" data-preset="${esc(JSON.stringify({ no: j.no }))}"`) + iconBtn('copy', 'نسخ', `data-op="je-copy" data-preset="${esc(JSON.stringify({ no: j.no }))}"`) },
    ], shown, { foot: ['', '', 'إجمالي القيود المعروضة', '', '', money(sum(shown, j => j.total)), ''], emptyMsg: 'لا توجد قيود مطابقة', action: opBtn('je-new', 'إنشاء قيد', 'pri sm') }))
    + (total > shown.length ? `<div class="more">${goBtn('journal', 'عرض المزيد', { ...p, limit: shown.length + 300 })}</div>` : '');
}, { after(p) { const s = $('select[name=src]'); if (s) s.value = p.src || ''; } });

function viewJE(je) {
  if (!je) return;
  const rev = DB.journals.find(x => x.src === 'reverse' && x.srcId === je.id);
  openModal(`قيد يومية رقم ${digits(je.no)}`, `
    <div class="je-meta"><div><span>التاريخ</span><b>${fdate(je.date)}</b></div><div><span>المصدر</span>${srcBadge(je.src)}</div>${je.ref ? `<div><span>المرجع</span><b>${esc(je.ref)}</b></div>` : ''}<div><span>البيان</span><b>${esc(je.desc)}</b></div></div>
    ${table([
      { h: 'الحساب', f: l => `${l.credit ? '<span class="to">إلى ح/</span> ' : '<span class="to">من ح/</span> '}<button type="button" class="link" data-go="ledger" data-params="${esc(JSON.stringify({ acc: l.acc }))}">${esc(accLabel(l.acc))}</button>${l.party ? `<small class="muted"> — ${esc(partyName(l.party))}</small>` : ''}${l.memo ? `<small class="muted"> · ${esc(l.memo)}</small>` : ''}${l.cc ? ` ${badge(esc(l.cc), 'muted')}` : ''}` },
      { h: 'مدين', n: 1, f: l => amt(l.debit) }, { h: 'دائن', n: 1, f: l => amt(l.credit) },
    ], je.lines, { foot: ['الإجمالي', money(je.total), money(je.total)], cls: 'compact' })}
    <p class="tafqeet">${esc(tafqeet(je.total, DB.settings.curName, DB.settings.subName))}</p>
    ${rev ? `<p class="res-note">تم عكس هذا القيد بالقيد رقم ${digits(rev.no)}.</p>` : ''}
    <div class="form-actions">
      ${rev ? '' : btn('عكس القيد', `data-op="je-reverse" data-preset="${esc(JSON.stringify({ no: je.no }))}"`, '', 'undo')}
      ${btn('نسخ بتاريخ جديد', `data-op="je-copy" data-preset="${esc(JSON.stringify({ no: je.no }))}"`, 'ghost', 'copy')}
      ${DELETABLE_SRC.has(je.src) ? btn('حذف', `data-act="je-del" data-id="${je.id}"`, 'ghost danger-text', 'trash') : ''}
      ${IN_FRAME ? '' : btn('طباعة', 'data-act="print"', 'ghost', 'print')}
    </div>`, { wide: true });
}
ACT['je-view'] = t => viewJE(jeById(t.dataset.id));
ACT['je-del'] = async t => { const j = jeById(t.dataset.id); if (!j) return; try { if (await deleteJE(j)) { closeModal(); refresh(); toast('تم حذف القيد'); } } catch (e) { toast(e.message, 'err'); } };

/* ---------- قيد جديد متعدد الأسطر ---------- */
page('je-new', 'قيد يومية جديد', p => head(p.opening ? 'قيد افتتاحي' : 'قيد يومية جديد', p.opening ? 'أدخل أرصدة أول المدة: الأصول مدينة، والخصوم وحقوق الملكية دائنة. يُقفل الفرق تلقائياً في حساب الأرصدة الافتتاحية عند الحاجة.' : 'قيد مزدوج متعدد الأطراف — يجب أن يتساوى مجموع المدين مع مجموع الدائن.', goBtn('journal', 'دفتر اليومية', null, 'ghost', 'book'))
  + `<form id="jeForm" class="card" novalidate>
    <div class="form-grid">
      <label class="field"><span>التاريخ <b class="req">*</b></span><input type="date" id="jeDate" value="${p.opening ? yearStart() : today()}"></label>
      <label class="field"><span>رقم المرجع</span><input type="text" id="jeRef" placeholder="رقم المستند أو الفاتورة"></label>
      <label class="field full"><span>البيان العام <b class="req">*</b></span><input type="text" id="jeDesc" value="${p.opening ? 'قيد الأرصدة الافتتاحية' : ''}" placeholder="مثال: إثبات مصروفات الصيانة لشهر أكتوبر"></label>
    </div>
    <div class="tbl-wrap"><table class="tbl je-lines"><thead><tr><th class="w-acc">الحساب</th><th>الطرف</th><th>مركز التكلفة</th><th>بيان السطر</th><th class="num">مدين</th><th class="num">دائن</th><th></th></tr></thead><tbody id="jeRows"></tbody>
      <tfoot><tr><td colspan="4"><button type="button" class="btn ghost sm" id="jeAdd">${icon('plus')}<span>إضافة سطر</span></button></td><td class="num" id="jeTd">0</td><td class="num" id="jeTc">0</td><td></td></tr></tfoot></table></div>
    <div class="je-foot"><div id="jeStatus" class="je-status"></div>
      <div class="form-actions">${p.opening ? btn('موازنة الفرق في الأرصدة الافتتاحية', 'id="jeBalance"', 'ghost') : ''}<button type="submit" class="btn pri">${icon('check')}<span>ترحيل القيد</span></button></div></div>
  </form>`, {
  after(p) {
    const tbody = $('#jeRows'), accO = '<option value="">— اختر الحساب —</option>' + accOptions('leaf'), ccO = blankOpt() + optList(DB.costCenters.map(c => [c.code, c.name])), pO = partyOptions();
    const addRow = (vals = {}) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="c-acc" data-l="الحساب"><select class="l-acc" aria-label="الحساب">${accO}</select></td><td data-l="الطرف"><select class="l-party" aria-label="الطرف">${pO}</select></td><td data-l="مركز التكلفة"><select class="l-cc" aria-label="مركز التكلفة">${ccO}</select></td><td class="c-memo" data-l="بيان السطر"><input type="text" class="l-memo" aria-label="بيان السطر"></td><td data-l="مدين"><input class="num-in l-d" inputmode="decimal" dir="ltr" placeholder="0.00" aria-label="مدين"></td><td data-l="دائن"><input class="num-in l-c" inputmode="decimal" dir="ltr" placeholder="0.00" aria-label="دائن"></td><td class="rm-cell">${iconBtn('x', 'حذف السطر', 'data-rm')}</td>`;
      tbody.appendChild(tr);
      if (vals.acc) tr.querySelector('.l-acc').value = vals.acc;
      if (vals.d) tr.querySelector('.l-d').value = vals.d;
      if (vals.c) tr.querySelector('.l-c').value = vals.c;
    };
    const read = () => $$('tr', tbody).map(tr => ({ acc: tr.querySelector('.l-acc').value, party: tr.querySelector('.l-party').value, cc: tr.querySelector('.l-cc').value, memo: tr.querySelector('.l-memo').value.trim(), debit: r2(num(tr.querySelector('.l-d').value)), credit: r2(num(tr.querySelector('.l-c').value)) }));
    const recalc = () => {
      const ls = read(), d = r2(sum(ls, l => l.debit)), c = r2(sum(ls, l => l.credit)), diff = r2(d - c);
      $('#jeTd').innerHTML = money(d); $('#jeTc').innerHTML = money(c);
      $('#jeStatus').innerHTML = !d && !c ? '<span class="muted">أدخل المبالغ في أسطر القيد</span>' : diff ? `<span class="st-bad">${icon('alert')} غير متوازن — الفرق ${f2(Math.abs(diff))} في جانب ${diff > 0 ? 'المدين' : 'الدائن'}</span>` : `<span class="st-ok">${icon('check')} القيد متوازن</span><span class="tafqeet">${esc(tafqeet(d, DB.settings.curName, DB.settings.subName))}</span>`;
    };
    for (let i = 0; i < (p.opening ? 6 : 2); i++) addRow();
    tbody.addEventListener('input', e => {
      const el = e.target;
      if (el.classList.contains('l-d') && el.value) el.closest('tr').querySelector('.l-c').value = '';
      if (el.classList.contains('l-c') && el.value) el.closest('tr').querySelector('.l-d').value = '';
      recalc();
    });
    tbody.addEventListener('change', recalc);
    tbody.addEventListener('click', e => { if (e.target.closest('[data-rm]')) { if (tbody.rows.length > 2) e.target.closest('tr').remove(); else toast('يجب أن يحتوي القيد على سطرين على الأقل', 'err'); recalc(); } });
    $('#jeAdd').onclick = () => addRow();
    if ($('#jeBalance')) $('#jeBalance').onclick = () => { const ls = read(), diff = r2(sum(ls, l => l.debit) - sum(ls, l => l.credit)); if (!diff) return toast('القيد متوازن'); addRow(diff > 0 ? { acc: '3105', c: diff } : { acc: '3105', d: -diff }); recalc(); };
    $('#jeForm').onsubmit = e => {
      e.preventDefault();
      try {
        const desc = $('#jeDesc').value.trim(); if (!desc) throw new Error('أدخل البيان العام للقيد');
        const ls = read().filter(l => l.debit || l.credit);
        if (ls.some(l => !l.acc)) throw new Error('اختر الحساب لكل سطر يحتوي على مبلغ');
        for (const l of ls) if (l.party && PARTY_ACC[l.acc] && PARTY_ACC[l.acc] !== l.party[0]) throw new Error(`نوع الطرف لا يتوافق مع حساب «${accName(l.acc)}»`);
        const je = postJE({ date: $('#jeDate').value, desc, ref: $('#jeRef').value.trim(), src: p.opening ? 'opening' : 'manual', lines: ls });
        commit(`قيد يومية رقم ${je.no}: ${desc} (${f2(je.total)})`);
        toast(`تم ترحيل القيد رقم ${je.no}`);
        go('journal'); viewJE(je);
      } catch (err) { toast(err.message, 'err'); }
    };
    recalc();
  },
  onRefresh() { /* الحفاظ على القيد قيد الإدخال */ },
});

/* ---------- كشف الحساب ---------- */
page('ledger', 'كشف حساب', p => {
  withDefaults(p, { from: yearStart, to: today });
  const isParty = !!p.party;
  if (!isParty && !p.acc) p.acc = '1101';
  const debitNature = isParty ? p.party[0] !== 's' : isDebitNature(p.acc);
  const match = isParty ? l => l.party === p.party : (isGroup(p.acc) ? l => isUnder(l.acc, p.acc) : l => l.acc === p.acc);
  let open = 0; const rows = [];
  for (const j of sortedJournals()) {
    if (p.to && j.date > p.to) break;
    for (const l of j.lines) {
      if (!match(l)) continue;
      const v = debitNature ? l.debit - l.credit : l.credit - l.debit;
      if (p.from && j.date < p.from) { open += v; continue; }
      rows.push({ j, l, v });
    }
  }
  let run = open; rows.forEach(r => { run += r.v; r.bal = run; });
  const td = sum(rows, r => r.l.debit), tc = sum(rows, r => r.l.credit);
  const title = isParty ? `كشف حساب ${p.party[0] === 'c' ? 'العميل' : p.party[0] === 's' ? 'المورد' : 'الموظف'}: ${esc(partyName(p.party))}` : `كشف حساب: ${esc(accLabel(p.acc))}`;
  const selector = isParty ? `<label class="field sm grow"><span>الطرف</span><select name="party">${partyOptions()}</select></label>` : `<label class="field sm grow"><span>الحساب</span><select name="acc">${accOptions('all')}</select></label>`;
  return head(title, `${periodLabel(p)} · ${debitNature ? 'طبيعة مدينة' : 'طبيعة دائنة'}`, repActions() + (isParty ? goBtn('ledger', 'كشف حساب عام', { acc: p.party[0] === 's' ? '2101' : '1103' }, 'ghost') : ''))
    + dateBar(p, selector)
    + `<div class="kpis sm"><div class="kpi static"><span class="k-label">رصيد أول المدة</span><span class="k-val">${money(open)}</span></div><div class="kpi static"><span class="k-label">إجمالي المدين</span><span class="k-val">${money(td)}</span></div><div class="kpi static"><span class="k-label">إجمالي الدائن</span><span class="k-val">${money(tc)}</span></div><div class="kpi static"><span class="k-label">الرصيد الختامي</span><span class="k-val">${money(run)}</span></div></div>`
    + card('', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>القيد</th><th>البيان</th>${!isParty && isGroup(p.acc) ? '<th>الحساب</th>' : ''}<th class="num">مدين</th><th class="num">دائن</th><th class="num">الرصيد</th></tr></thead><tbody>
      <tr class="row-grp"><td>${fdate(p.from) || '—'}</td><td></td><td>رصيد أول المدة</td>${!isParty && isGroup(p.acc) ? '<td></td>' : ''}<td></td><td></td><td class="num">${money(open)}</td></tr>
      ${rows.map(r => `<tr><td>${fdate(r.j.date)}</td><td><button type="button" class="link" data-act="je-view" data-id="${r.j.id}">#${digits(r.j.no)}</button></td><td>${esc(r.l.memo || r.j.desc)}</td>${!isParty && isGroup(p.acc) ? `<td><small>${esc(accName(r.l.acc))}</small></td>` : ''}<td class="num">${amt(r.l.debit)}</td><td class="num">${amt(r.l.credit)}</td><td class="num">${money(r.bal)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="${!isParty && isGroup(p.acc) ? 4 : 3}">الإجمالي والرصيد الختامي</td><td class="num">${money(td)}</td><td class="num">${money(tc)}</td><td class="num">${money(run)}</td></tr></tfoot></table></div>
      ${rows.length ? '' : empty('لا توجد حركات في الفترة المحددة')}<p class="tafqeet">الرصيد: ${esc(tafqeet(run, DB.settings.curName, DB.settings.subName))}${run ? (run > 0 ? (debitNature ? ' (مدين)' : ' (دائن)') : (debitNature ? ' (دائن)' : ' (مدين)')) : ''}</p>`);
}, { after(p) { const s = $('select[name=acc]'); if (s) s.value = p.acc; const t = $('select[name=party]'); if (t) t.value = p.party; } });

/* =========================================================
   الفواتير
   ========================================================= */
const payLabel = i => (i.pay === 'credit' ? badge('آجل', 'warn') : esc(accName(i.pay)));
const statusBadge = i => ({ posted: badge('مرحّلة', 'ok'), cancelled: badge('ملغاة', 'bad'), open: badge('مفتوح', 'info'), converted: badge('محوّل لفاتورة', 'muted') }[i.status] || '');
function invListPage(id, title, kinds, buttons) {
  page(id, title, p => {
    withDefaults(p, { from: yearStart, to: today, k: '' });
    const q = normAr(p.q || '');
    const list = DB.invoices.filter(i => kinds.includes(i.kind) && (!p.k || i.kind === p.k) && (!p.from || i.date >= p.from) && (!p.to || i.date <= p.to) && (!q || normAr(i.code + ' ' + partyName(INV_KINDS[i.kind].party + ':' + i.party)).includes(q))).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.no - a.no));
    const posted = list.filter(i => i.status === 'posted' && i.kind !== 'quote'), sign = i => (i.kind === 'sret' || i.kind === 'pret' ? -1 : 1);
    const tot = f => sum(posted, i => sign(i) * i[f]);
    return head(title, `${periodLabel(p)} · ${digits(list.length)} مستنداً`, buttons.map(([op, l, c]) => opBtn(op, l, c)).join(''))
      + `<div class="kpis sm"><div class="kpi static"><span class="k-label">الصافي قبل الضريبة</span><span class="k-val">${money(tot('net'))}</span></div><div class="kpi static"><span class="k-label">الضريبة</span><span class="k-val">${money(tot('vat'))}</span></div><div class="kpi static"><span class="k-label">الإجمالي</span><span class="k-val">${money(tot('total'))}</span></div>${kinds.includes('sale') ? `<div class="kpi static"><span class="k-label">مجمل الربح</span><span class="k-val">${money(tot('net') - tot('cost'))}</span></div>` : ''}</div>`
      + dateBar(p, `<label class="field sm"><span>النوع</span><select name="k">${blankOpt('الكل')}${optList(kinds.map(k => [k, INV_KINDS[k].t]))}</select></label><label class="field sm grow"><span>بحث</span><input type="search" name="q" value="${esc(p.q || '')}" placeholder="رقم المستند أو الاسم"></label>`)
      + card('', table([
        { h: 'الرقم', f: i => `<button type="button" class="link" data-act="inv-view" data-id="${i.id}">${esc(i.code)}</button>` },
        { h: 'النوع', f: i => esc(INV_KINDS[i.kind].t) }, { h: 'التاريخ', f: i => fdate(i.date) },
        { h: INV_KINDS[kinds[0]].pt, f: i => esc(partyName(INV_KINDS[i.kind].party + ':' + i.party) || 'نقدي') },
        { h: 'الدفع', cls: 'hide-sm', f: payLabel }, { h: 'الصافي', n: 1, cls: 'hide-sm', f: i => money(i.net) }, { h: 'الضريبة', n: 1, cls: 'hide-sm', f: i => money(i.vat) }, { h: 'الإجمالي', n: 1, f: i => money(i.total) },
        { h: 'الحالة', f: statusBadge },
        { h: '', cls: 'actions no-csv', f: i => iconBtn('eye', 'عرض', `data-act="inv-view" data-id="${i.id}"`) + (i.status === 'posted' ? iconBtn('x', 'إلغاء', `data-op="inv-cancel" data-preset="${esc(JSON.stringify({ inv: i.id }))}"`) : '') },
      ], list, { emptyMsg: 'لا توجد مستندات في الفترة المحددة', action: opBtn(buttons[0][0], buttons[0][1], 'pri sm') }));
  }, { after(p) { const s = $('select[name=k]'); if (s) s.value = p.k || ''; } });
}
invListPage('sales', 'المبيعات', ['sale', 'sret', 'quote'], [['inv-sale', 'فاتورة مبيعات', 'pri'], ['inv-sret', 'مرتجع مبيعات', 'ghost'], ['inv-quote', 'عرض سعر', 'ghost']]);
invListPage('purchases', 'المشتريات', ['purchase', 'pret'], [['inv-purchase', 'فاتورة مشتريات', 'pri'], ['inv-pret', 'مرتجع مشتريات', 'ghost']]);

function viewInvoice(inv) {
  if (!inv) return;
  const K = INV_KINDS[inv.kind], S = DB.settings, pn = partyName(K.party + ':' + inv.party);
  const party = inv.party ? partyList(K.party).find(x => x.id === inv.party) : null;
  const title = inv.kind === 'quote' ? 'عرض سعر' : inv.kind === 'sale' ? (inv.vatOn ? 'فاتورة ضريبية' : 'فاتورة مبيعات') : K.t;
  openModal(`${K.t} ${inv.code}`, `<article class="doc">
    <header class="doc-head"><div><h2>${esc(S.company)}</h2>${S.taxNo ? `<p>الرقم الضريبي: <b dir="ltr">${esc(S.taxNo)}</b></p>` : ''}${S.address ? `<p>${esc(S.address)}</p>` : ''}${S.phone ? `<p dir="ltr">${esc(S.phone)}</p>` : ''}</div>
      <div class="doc-title"><span>${title}</span><b>${esc(inv.code)}</b>${statusBadge(inv)}</div></header>
    <div class="doc-meta"><div><span>التاريخ</span><b>${fdate(inv.date)}</b><small>${esc(hijri(inv.date))}</small></div><div><span>${K.pt}</span><b>${esc(pn || 'نقدي')}</b>${party?.taxNo ? `<small>ر.ض: ${esc(party.taxNo)}</small>` : ''}</div><div><span>طريقة الدفع</span><b>${inv.pay === 'credit' ? 'آجل' : esc(accName(inv.pay))}</b></div></div>
    ${table([{ h: '#', f: l => digits(inv.lines.indexOf(l) + 1) }, { h: 'الصنف', f: l => esc(l.name) }, { h: 'الكمية', n: 1, f: l => fN(l.qty, l.qty % 1 ? 2 : 0) + ' <small>' + esc(l.unit) + '</small>' }, { h: 'سعر الوحدة', n: 1, f: l => money(l.price) }, { h: 'الإجمالي', n: 1, f: l => money(l.qty * l.price) }], inv.lines, { cls: 'compact' })}
    <div class="doc-totals"><div><span>الإجمالي</span>${money(inv.sub)}</div>${inv.disc ? `<div><span>الخصم</span>${money(-inv.disc)}</div>` : ''}<div><span>الصافي قبل الضريبة</span>${money(inv.net)}</div><div><span>ضريبة القيمة المضافة ${inv.vatOn ? digits(S.vat) + '٪' : ''}</span>${money(inv.vat)}</div><div class="grand"><span>الإجمالي المستحق</span>${money(inv.total)} <small>${esc(cur())}</small></div></div>
    <p class="tafqeet">${esc(tafqeet(inv.total, S.curName, S.subName))}</p>${inv.note ? `<p class="muted">ملاحظات: ${esc(inv.note)}</p>` : ''}
  </article>
  <div class="form-actions">
    ${inv.je ? btn('عرض القيد المحاسبي', `data-act="je-view" data-id="${inv.je}"`, 'ghost', 'book') : ''}
    ${inv.kind === 'quote' && inv.status === 'open' ? btn('تحويل إلى فاتورة', `data-op="quote-conv" data-preset="${esc(JSON.stringify({ q: inv.id }))}"`, 'pri', 'check') : ''}
    ${inv.status === 'posted' || inv.status === 'open' ? btn('إلغاء المستند', `data-op="inv-cancel" data-preset="${esc(JSON.stringify({ inv: inv.id }))}"`, 'ghost danger-text', 'x') : ''}
    ${IN_FRAME ? '' : btn('طباعة', 'data-act="print"', 'ghost', 'print')}
  </div>`, { wide: true });
}
ACT['inv-view'] = t => viewInvoice(DB.invoices.find(i => i.id === t.dataset.id));

page('inv-new', 'مستند جديد', p => {
  const K = INV_KINDS[p.kind] || INV_KINDS.sale;
  const isSale = ['sale', 'sret', 'quote'].includes(p.kind);
  return head(K.t + ' جديد', p.kind === 'sale' ? 'يُرحّل قيد الإيراد والضريبة وتكلفة البضاعة المباعة ويُخفّض المخزون تلقائياً.' : p.kind === 'purchase' ? 'يُرحّل قيد المشتريات وضريبة المدخلات ويُحدّث متوسط تكلفة الأصناف.' : p.kind === 'quote' ? 'عرض السعر لا يُنشئ قيداً، ويمكن تحويله لاحقاً إلى فاتورة.' : 'يعكس أثر الفاتورة الأصلية على الحسابات والمخزون.',
    goBtn(isSale ? 'sales' : 'purchases', 'القائمة', null, 'ghost', 'list') + opBtn('item-add', 'صنف جديد', 'ghost') + opBtn(isSale ? 'cust-add' : 'supp-add', isSale ? 'عميل جديد' : 'مورد جديد', 'ghost'))
    + `<form id="invForm" class="card" novalidate>
      <div class="form-grid">
        <label class="field"><span>${K.pt}</span><select id="invParty"></select></label>
        <label class="field"><span>التاريخ <b class="req">*</b></span><input type="date" id="invDate" value="${today()}"></label>
        <label class="field"><span>طريقة الدفع</span><select id="invPay"><option value="credit">آجل (على الحساب)</option>${accOptions('cash')}</select></label>
        <label class="field check"><input type="checkbox" id="invVat" checked><span>خاضع لضريبة القيمة المضافة ${digits(DB.settings.vat)}٪</span></label>
      </div>
      <div class="tbl-wrap"><table class="tbl inv-lines"><thead><tr><th class="w-acc">الصنف</th><th class="num">الكمية</th><th class="num">سعر الوحدة</th><th class="num">الإجمالي</th><th></th></tr></thead><tbody id="invRows"></tbody>
        <tfoot><tr><td colspan="5"><button type="button" class="btn ghost sm" id="invAdd">${icon('plus')}<span>إضافة صنف</span></button></td></tr></tfoot></table></div>
      <div class="inv-bottom">
        <label class="field full"><span>ملاحظات</span><textarea id="invNote" rows="2"></textarea></label>
        <div class="doc-totals" id="invTotals"></div>
      </div>
      <p class="tafqeet" id="invWords"></p>
      <div class="form-actions"><button type="submit" class="btn pri">${icon('check')}<span>${p.kind === 'quote' ? 'حفظ عرض السعر' : 'حفظ وترحيل'}</span></button></div>
    </form>`;
}, {
  after(p) {
    const kind = INV_KINDS[p.kind] ? p.kind : 'sale', K = INV_KINDS[kind], tbody = $('#invRows');
    const isSale = ['sale', 'sret', 'quote'].includes(kind);
    let discV = 0;
    const fillOpts = () => {
      const ps = $('#invParty'), pv = ps.value; ps.innerHTML = blankOpt(`— ${K.pt} نقدي —`) + optList(partyList(K.party).map(x => [x.id, x.name])); ps.value = pv;
      const io = blankOpt('— اختر الصنف —') + optList(DB.items.map(i => [i.id, `${i.code} · ${i.name}`]));
      $$('.it-sel', tbody).forEach(s => { const v = s.value; s.innerHTML = io; s.value = v; });
      return io;
    };
    let itemO = fillOpts();
    const addRow = () => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="c-acc"><select class="it-sel" aria-label="الصنف">${itemO}</select><small class="it-hint muted"></small></td><td data-l="الكمية"><input class="num-in q" inputmode="decimal" dir="ltr" value="1" aria-label="الكمية"></td><td data-l="سعر الوحدة"><input class="num-in pr" inputmode="decimal" dir="ltr" placeholder="0.00" aria-label="سعر الوحدة"></td><td class="num lt" data-l="الإجمالي">—</td><td class="rm-cell">${iconBtn('x', 'حذف السطر', 'data-rm')}</td>`;
      tbody.appendChild(tr);
    };
    const recalc = () => {
      let sub = 0;
      $$('tr', tbody).forEach(tr => { const q = num(tr.querySelector('.q').value), pr = num(tr.querySelector('.pr').value), t = q * pr; sub += t; tr.querySelector('.lt').innerHTML = t ? money(t) : '—'; });
      sub = r2(sub);
      const disc = Math.min(r2(discV), sub), net = r2(sub - disc), vat = $('#invVat').checked ? r2(net * num(DB.settings.vat) / 100) : 0, total = r2(net + vat);
      $('#invTotals').innerHTML = `<div><span>الإجمالي</span>${money(sub)}</div><div><span>الخصم</span><input id="invDisc" class="num-in sm" inputmode="decimal" dir="ltr" value="${discV || ''}" placeholder="0.00"></div><div><span>الصافي</span>${money(net)}</div><div><span>الضريبة</span>${money(vat)}</div><div class="grand"><span>الإجمالي المستحق</span>${money(total)} <small>${esc(cur())}</small></div>`;
      $('#invWords').textContent = total ? tafqeet(total, DB.settings.curName, DB.settings.subName) : '';
      const d = $('#invDisc'); d.oninput = () => { discV = num(d.value); clearTimeout(d._t); d._t = setTimeout(() => { recalc(); const n = $('#invDisc'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 500); };
    };
    tbody.addEventListener('change', e => {
      const s = e.target.closest('.it-sel'); if (!s) return;
      const it = itemById(s.value), tr = s.closest('tr');
      if (it) { tr.querySelector('.pr').value = isSale ? it.price : r2(it.cost); tr.querySelector('.it-hint').textContent = `المتاح: ${fN(it.qty, 0)} ${it.unit} · التكلفة ${f2(it.cost)}`; }
      recalc();
    });
    tbody.addEventListener('input', recalc);
    tbody.addEventListener('click', e => { if (e.target.closest('[data-rm]')) { if (tbody.rows.length > 1) e.target.closest('tr').remove(); recalc(); } });
    $('#invAdd').onclick = () => addRow();
    $('#invVat').onchange = recalc;
    $('#invPay').value = isSale ? 'credit' : 'credit';
    addRow(); addRow(); recalc();
    PAGES['inv-new'].onRefresh = () => { itemO = fillOpts(); };
    $('#invForm').onsubmit = e => {
      e.preventDefault();
      try {
        const lines = $$('tr', tbody).map(tr => ({ item: tr.querySelector('.it-sel').value, qty: num(tr.querySelector('.q').value), price: num(tr.querySelector('.pr').value) }));
        const inv = saveInvoice(kind, { date: $('#invDate').value, party: $('#invParty').value, pay: $('#invPay').value, vat: $('#invVat').checked, disc: discV, note: $('#invNote').value, lines });
        toast(`تم حفظ ${K.t} ${inv.code}`);
        go(isSale ? 'sales' : 'purchases'); viewInvoice(inv);
      } catch (err) { toast(err.message, 'err'); }
    };
  },
  onRefresh() { },
});

/* =========================================================
   العملاء والموردون
   ========================================================= */
function partyPage(id, t, title) {
  page(id, title, p => {
    const list = partyList(t), q = normAr(p.q || '');
    const rows = list.filter(x => !q || normAr(x.name + x.phone + x.code).includes(q)).map(x => ({ ...x, bal: t === 'c' ? partyBal('c:' + x.id) : -partyBal('s:' + x.id) }));
    const sales = memo('salesBy' + t, () => { const m = {}; DB.invoices.filter(i => i.status === 'posted' && i.kind === (t === 'c' ? 'sale' : 'purchase')).forEach(i => { m[i.party] = (m[i.party] || 0) + i.total; }); return m; });
    return head(title, `${digits(list.length)} ${t === 'c' ? 'عميلاً' : 'مورداً'} · إجمالي الأرصدة ${f2(sum(rows, r => r.bal))}`, opBtn(t === 'c' ? 'cust-add' : 'supp-add', t === 'c' ? 'عميل جديد' : 'مورد جديد', 'pri') + goBtn('rep-aging', 'أعمار الأرصدة', { t }, 'ghost', 'clock'))
      + `<form class="filters" data-filter><label class="field sm grow"><span>بحث</span><input type="search" name="q" value="${esc(p.q || '')}" placeholder="الاسم أو الجوال أو الرمز"></label><button class="btn" type="submit">${icon('search')}<span>بحث</span></button></form>`
      + card('', table([
        { h: 'الرمز', f: x => `<span class="code">${esc(x.code)}</span>` }, { h: 'الاسم', f: x => `<button type="button" class="link" data-go="ledger" data-params="${esc(JSON.stringify({ party: t + ':' + x.id }))}">${esc(x.name)}</button>` },
        { h: 'الجوال', cls: 'hide-sm', f: x => `<span dir="ltr">${esc(x.phone || '')}</span>` }, { h: 'المدينة', cls: 'hide-sm', f: x => esc(x.city || '') },
        { h: t === 'c' ? 'إجمالي المبيعات' : 'إجمالي المشتريات', n: 1, cls: 'hide-sm', f: x => money(sales[x.id] || 0) },
        { h: t === 'c' ? 'الرصيد المستحق' : 'المستحق له', n: 1, f: x => money(x.bal) + (t === 'c' && x.limit && x.bal > x.limit ? ' ' + badge('تجاوز الحد', 'bad') : '') },
        { h: '', cls: 'actions no-csv', f: x => iconBtn('eye', 'كشف حساب', `data-go="ledger" data-params="${esc(JSON.stringify({ party: t + ':' + x.id }))}"`) + iconBtn('swap', t === 'c' ? 'سند قبض' : 'سند صرف', `data-op="${t === 'c' ? 'rv-cust' : 'pv-supp'}" data-preset="${esc(JSON.stringify({ party: x.id, amount: Math.max(0, x.bal) || '' }))}"`) },
      ], rows, { foot: ['', 'الإجمالي', '', '', money(sum(rows, x => sales[x.id] || 0)), money(sum(rows, x => x.bal)), ''], emptyMsg: `لا يوجد ${t === 'c' ? 'عملاء' : 'موردون'} بعد`, action: opBtn(t === 'c' ? 'cust-add' : 'supp-add', 'إضافة', 'pri sm') }));
  });
}
partyPage('customers', 'c', 'العملاء');
partyPage('suppliers', 's', 'الموردون');

/* =========================================================
   المخزون
   ========================================================= */
page('items', 'المخزون', p => {
  const q = normAr(p.q || '');
  const rows = DB.items.filter(i => (!p.low || (i.min > 0 && i.qty <= i.min)) && (!q || normAr(i.name + i.code + (i.cat || '')).includes(q)));
  const val = sum(rows, i => i.qty * i.cost);
  return head(p.low ? 'أصناف بلغت حد الطلب' : 'المخزون', `${digits(rows.length)} صنفاً · قيمة المخزون بالتكلفة ${f2(val)}`, opBtn('item-add', 'صنف جديد', 'pri') + opBtn('stock-adj', 'تسوية جرد', 'ghost', 'edit') + goBtn('rep-stock', 'تقييم المخزون', null, 'ghost', 'chart'))
    + `<form class="filters" data-filter><label class="field sm grow"><span>بحث</span><input type="search" name="q" value="${esc(p.q || '')}" placeholder="اسم الصنف أو رمزه"></label><label class="field check sm"><input type="checkbox" name="low" value="1"${p.low ? ' checked' : ''}><span>تحت حد الطلب فقط</span></label><button class="btn" type="submit">${icon('search')}<span>بحث</span></button></form>`
    + card('', table([
      { h: 'الرمز', f: i => `<span class="code">${esc(i.code)}</span>` }, { h: 'الصنف', f: i => `<button type="button" class="link" data-go="item-card" data-params="${esc(JSON.stringify({ id: i.id }))}">${esc(i.name)}</button>${i.cat ? ` <small class="muted">${esc(i.cat)}</small>` : ''}` },
      { h: 'الكمية', n: 1, f: i => `${fN(i.qty, i.qty % 1 ? 2 : 0)} <small>${esc(i.unit)}</small>` }, { h: 'متوسط التكلفة', n: 1, cls: 'hide-sm', f: i => money(i.cost) }, { h: 'سعر البيع', n: 1, f: i => money(i.price) },
      { h: 'هامش الربح', n: 1, cls: 'hide-sm', f: i => (i.price ? pct((i.price - i.cost) / i.price * 100, 1) : '—') }, { h: 'القيمة', n: 1, f: i => money(i.qty * i.cost) },
      { h: 'الحالة', f: i => (i.qty <= 0 ? badge('نفد', 'bad') : i.min > 0 && i.qty <= i.min ? badge('حد الطلب', 'warn') : badge('متوفر', 'ok')) },
      { h: '', cls: 'actions no-csv', f: i => iconBtn('eye', 'بطاقة الصنف', `data-go="item-card" data-params="${esc(JSON.stringify({ id: i.id }))}"`) + iconBtn('edit', 'تعديل السعر', `data-op="item-price" data-preset="${esc(JSON.stringify({ item: i.id, price: i.price, min: i.min }))}"`) + iconBtn('scale', 'تسوية جرد', `data-op="stock-adj" data-preset="${esc(JSON.stringify({ item: i.id }))}"`) },
    ], rows, { foot: ['', 'الإجمالي', '', '', '', '', money(val), '', ''], emptyMsg: p.low ? 'لا توجد أصناف تحت حد الطلب' : 'لا توجد أصناف بعد', action: p.low ? '' : opBtn('item-add', 'إضافة صنف', 'pri sm') }));
});
page('item-card', 'بطاقة صنف', p => {
  const it = itemById(p.id);
  if (!it) return head('بطاقة صنف') + empty('الصنف غير موجود', goBtn('items', 'العودة للمخزون', null, 'pri sm'));
  const KN = { sale: 'مبيعات', sret: 'مرتجع مبيعات', purchase: 'مشتريات', pret: 'مرتجع مشتريات', open: 'رصيد افتتاحي', adj: 'تسوية جرد', cancel: 'إلغاء مستند' };
  let run = 0; const rows = DB.moves.filter(m => m.item === it.id).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map(m => { run += m.qty; return { ...m, bal: run }; });
  return head(`بطاقة صنف: ${esc(it.name)}`, `${esc(it.code)} · الرصيد ${fN(it.qty, 0)} ${esc(it.unit)} · متوسط التكلفة ${f2(it.cost)} · القيمة ${f2(it.qty * it.cost)}`, goBtn('items', 'المخزون', null, 'ghost', 'box') + opBtn('stock-adj', 'تسوية جرد', 'ghost', 'edit', { item: it.id }) + repActions())
    + card('', table([{ h: 'التاريخ', f: m => fdate(m.date) }, { h: 'الحركة', f: m => KN[m.kind] || m.kind }, { h: 'المرجع', f: m => esc(m.ref) }, { h: 'وارد', n: 1, f: m => (m.qty > 0 ? fN(m.qty, 2) : '') }, { h: 'صادر', n: 1, f: m => (m.qty < 0 ? fN(-m.qty, 2) : '') }, { h: 'الرصيد', n: 1, f: m => fN(m.bal, 2) }, { h: 'السعر', n: 1, f: m => money(m.price) }, { h: 'التكلفة بعد الحركة', n: 1, f: m => money(m.cost) }], rows, { emptyMsg: 'لا توجد حركات لهذا الصنف' }));
});

/* =========================================================
   الخزينة: السندات والشيكات
   ========================================================= */
page('vouchers', 'سندات القبض والصرف', p => {
  withDefaults(p, { from: yearStart, to: today, type: '' });
  const list = DB.vouchers.filter(v => (!p.type || v.type === p.type) && (!p.from || v.date >= p.from) && (!p.to || v.date <= p.to)).slice().reverse();
  const tin = sum(list.filter(v => v.type === 'rv'), v => v.amount), tout = sum(list.filter(v => v.type === 'pv'), v => v.amount);
  return head('سندات القبض والصرف', periodLabel(p), opBtn('rv-cust', 'سند قبض من عميل', 'pri') + opBtn('pv-supp', 'سند صرف لمورد', '') + opBtn('rv-gen', 'قبض عام', 'ghost') + opBtn('pv-gen', 'صرف عام', 'ghost'))
    + `<div class="kpis sm"><div class="kpi static"><span class="k-label">إجمالي المقبوضات</span><span class="k-val">${money(tin)}</span></div><div class="kpi static"><span class="k-label">إجمالي المدفوعات</span><span class="k-val">${money(tout)}</span></div><div class="kpi static"><span class="k-label">الصافي</span><span class="k-val">${money(tin - tout)}</span></div></div>`
    + dateBar(p, `<label class="field sm"><span>النوع</span><select name="type"><option value="">الكل</option><option value="rv">سندات القبض</option><option value="pv">سندات الصرف</option></select></label>`)
    + card('', table([
      { h: 'الرقم', f: v => `<button type="button" class="link" data-act="v-view" data-id="${v.id}">${esc(v.code)}</button>` }, { h: 'النوع', f: v => (v.type === 'rv' ? badge('قبض', 'ok') : badge('صرف', 'info')) }, { h: 'التاريخ', f: v => fdate(v.date) },
      { h: 'البيان', f: v => esc(v.desc) }, { h: 'الحساب المقابل', cls: 'hide-sm', f: v => esc(accName(v.acc)) }, { h: 'النقدية/البنك', cls: 'hide-sm', f: v => esc(accName(v.cash)) }, { h: 'المبلغ', n: 1, f: v => money(v.amount) },
      { h: '', cls: 'actions no-csv', f: v => iconBtn('eye', 'عرض', `data-act="v-view" data-id="${v.id}"`) },
    ], list, { emptyMsg: 'لا توجد سندات في الفترة المحددة' }));
}, { after(p) { const s = $('select[name=type]'); if (s) s.value = p.type || ''; } });
ACT['v-view'] = t => {
  const v = DB.vouchers.find(x => x.id === t.dataset.id); if (!v) return;
  const S = DB.settings, rv = v.type === 'rv';
  openModal(`${rv ? 'سند قبض' : 'سند صرف'} ${v.code}`, `<article class="doc voucher">
    <header class="doc-head"><div><h2>${esc(S.company)}</h2>${S.taxNo ? `<p>الرقم الضريبي: <b dir="ltr">${esc(S.taxNo)}</b></p>` : ''}</div><div class="doc-title"><span>${rv ? 'سند قبض' : 'سند صرف'}</span><b>${esc(v.code)}</b></div></header>
    <dl class="v-lines"><div><dt>التاريخ</dt><dd>${fdate(v.date)} — ${esc(hijri(v.date))}</dd></div><div><dt>${rv ? 'استلمنا من' : 'صرفنا إلى'}</dt><dd>${esc(v.party ? partyName(v.party) : accName(v.acc))}</dd></div>
      <div><dt>مبلغاً وقدره</dt><dd>${money(v.amount)} ${esc(cur())}</dd></div><div><dt>المبلغ كتابةً</dt><dd>${esc(tafqeet(v.amount, S.curName, S.subName))}</dd></div><div><dt>وذلك عن</dt><dd>${esc(v.desc)}</dd></div><div><dt>${rv ? 'أودع في' : 'صُرف من'}</dt><dd>${esc(accName(v.cash))}</dd></div></dl>
    <div class="signs"><span>المحاسب</span><span>المستلم</span><span>المدير المالي</span></div></article>
    <div class="form-actions">${btn('عرض القيد', `data-act="je-view" data-id="${v.je}"`, 'ghost', 'book')}${IN_FRAME ? '' : btn('طباعة', 'data-act="print"', 'ghost', 'print')}</div>`, { wide: true });
};
page('cheques', 'الشيكات', p => {
  const st = p.st ?? 'pending', t = today();
  const SN = { pending: ['في المحفظة', 'warn'], cleared: ['محصّل/مصروف', 'ok'], bounced: ['مرتد', 'bad'] };
  const list = DB.cheques.filter(c => !st || c.status === st).sort((a, b) => (a.due < b.due ? -1 : 1));
  const pin = sum(DB.cheques.filter(c => c.status === 'pending' && c.kind === 'in'), c => c.amount), pout = sum(DB.cheques.filter(c => c.status === 'pending' && c.kind === 'out'), c => c.amount);
  return head('الشيكات وأوراق القبض والدفع', 'متابعة الشيكات الواردة والصادرة حتى التحصيل أو الصرف', opBtn('chq-in', 'شيك وارد', 'pri') + opBtn('chq-out', 'شيك صادر', ''))
    + `<div class="kpis sm"><div class="kpi static"><span class="k-label">شيكات واردة في المحفظة</span><span class="k-val">${money(pin)}</span></div><div class="kpi static"><span class="k-label">شيكات صادرة لم تُصرف</span><span class="k-val">${money(pout)}</span></div></div>`
    + `<div class="tabs">${[['pending', 'في المحفظة'], ['cleared', 'محصّلة ومصروفة'], ['bounced', 'مرتدة'], ['', 'الكل']].map(([k, l]) => `<button type="button" class="tab${st === k ? ' on' : ''}" data-go="cheques" data-params="${esc(JSON.stringify({ st: k }))}">${l}</button>`).join('')}</div>`
    + card('', table([
      { h: 'النوع', f: c => (c.kind === 'in' ? badge('وارد', 'ok') : badge('صادر', 'info')) }, { h: 'رقم الشيك', f: c => `<span class="code">${esc(c.chqNo)}</span>` }, { h: 'البنك', cls: 'hide-sm', f: c => esc(c.kind === 'out' ? accName(c.bank) : c.bank) },
      { h: 'الطرف', f: c => esc(partyName(c.party)) }, { h: 'الاستحقاق', f: c => { const d = daysBetween(t, c.due); return fdate(c.due) + (c.status === 'pending' ? ` <small class="${d < 0 ? 'st-bad' : d <= 7 ? 'st-warn' : 'muted'}">${d < 0 ? 'متأخر ' + digits(-d) + ' يوم' : d ? 'بعد ' + digits(d) + ' يوم' : 'اليوم'}</small>` : ''); } },
      { h: 'المبلغ', n: 1, f: c => money(c.amount) }, { h: 'الحالة', f: c => badge(SN[c.status][0], SN[c.status][1]) },
      { h: '', cls: 'actions no-csv', f: c => (c.status === 'pending' ? iconBtn('check', c.kind === 'in' ? 'تحصيل' : 'صرف', `data-op="chq-clear" data-preset="${esc(JSON.stringify({ chq: c.id }))}"`) + iconBtn('undo', 'ارتداد', `data-op="chq-bounce" data-preset="${esc(JSON.stringify({ chq: c.id }))}"`) : '') + iconBtn('book', 'القيد', `data-act="je-view" data-id="${c.je}"`) },
    ], list, { emptyMsg: 'لا توجد شيكات في هذه القائمة' }));
});

/* =========================================================
   الأصول الثابتة والموظفون
   ========================================================= */
page('assets', 'الأصول الثابتة', () => {
  const list = DB.assets, act = list.filter(a => a.status === 'active');
  return head('سجل الأصول الثابتة', `${digits(act.length)} أصلاً نشطاً · صافي القيمة الدفترية ${f2(sum(act, a => a.cost - a.accDep))}`, opBtn('asset-add', 'أصل جديد', 'pri') + opBtn('dep-run', 'ترحيل إهلاك شهر', '', 'play') + opBtn('asset-dispose', 'بيع أو استبعاد', 'ghost', 'x'))
    + card('', table([
      { h: 'الرمز', f: a => `<span class="code">${esc(a.code)}</span>` }, { h: 'الأصل', f: a => esc(a.name) }, { h: 'الحساب', cls: 'hide-sm', f: a => esc(accName(a.acc)) }, { h: 'تاريخ الشراء', cls: 'hide-sm', f: a => fdate(a.date) },
      { h: 'التكلفة', n: 1, f: a => money(a.cost) }, { h: 'مجمع الإهلاك', n: 1, f: a => money(a.accDep) }, { h: 'القيمة الدفترية', n: 1, f: a => money(a.cost - a.accDep) },
      { h: 'الإهلاك الشهري', n: 1, cls: 'hide-sm', f: a => money(depForMonth(a, today().slice(0, 7))) },
      { h: 'الطريقة', cls: 'hide-sm', f: a => `${a.method === 'ddb' ? 'متناقص مضاعف' : 'قسط ثابت'} · ${digits(a.life)} سنوات` },
      { h: 'الحالة', f: a => (a.status === 'active' ? badge('نشط', 'ok') : badge('مستبعد', 'muted')) },
      { h: '', cls: 'actions no-csv', f: a => (a.status === 'active' ? iconBtn('x', 'بيع/استبعاد', `data-op="asset-dispose" data-preset="${esc(JSON.stringify({ asset: a.id }))}"`) : '') + iconBtn('book', 'قيد الشراء', `data-act="je-view" data-id="${a.je}"`) },
    ], list, { foot: ['', 'الإجمالي', '', '', money(sum(act, a => a.cost)), money(sum(act, a => a.accDep)), money(sum(act, a => a.cost - a.accDep)), money(sum(act, a => depForMonth(a, today().slice(0, 7)))), '', '', ''], emptyMsg: 'لا توجد أصول مسجلة', action: opBtn('asset-add', 'إضافة أصل', 'pri sm') }));
});
page('employees', 'الموظفون والرواتب', () => {
  const t = today();
  const emps = DB.employees.map(e => ({ ...e, gross: empGross(e), g: empGosi(e), eos: eosAward(r2(e.basic + e.housing), Math.max(0, daysBetween(e.hire, t)) / 365, 'end').full }));
  return head('الموظفون والرواتب', `${digits(emps.length)} موظفين · إجمالي الرواتب الشهرية ${f2(sum(emps, e => e.gross))}`, opBtn('emp-add', 'موظف جديد', 'pri') + opBtn('payroll-run', 'مسير رواتب', '', 'play') + opBtn('eos-prov', 'تحديث مخصص نهاية الخدمة', 'ghost', 'scale'))
    + card('بيانات الموظفين', table([
      { h: 'الرمز', f: e => `<span class="code">${esc(e.code)}</span>` }, { h: 'الاسم', f: e => `${esc(e.name)}<small class="muted"> ${esc(e.job || '')}</small>` }, { h: 'المباشرة', cls: 'hide-sm', f: e => fdate(e.hire) },
      { h: 'الأساسي', n: 1, f: e => money(e.basic) }, { h: 'البدلات', n: 1, cls: 'hide-sm', f: e => money(e.housing + e.transport + e.other) }, { h: 'الإجمالي', n: 1, f: e => money(e.gross) },
      { h: 'التأمينات', n: 1, cls: 'hide-sm', f: e => money(e.g) }, { h: 'الصافي', n: 1, f: e => money(e.gross - e.g) }, { h: 'نهاية الخدمة المتراكمة', n: 1, cls: 'hide-sm', f: e => money(e.eos) },
      { h: '', cls: 'actions no-csv', f: e => iconBtn('eye', 'كشف حساب السلف', `data-go="ledger" data-params="${esc(JSON.stringify({ party: 'e:' + e.id }))}"`) },
    ], emps, { foot: ['', 'الإجمالي', '', money(sum(emps, e => e.basic)), money(sum(emps, e => e.housing + e.transport + e.other)), money(sum(emps, e => e.gross)), money(sum(emps, e => e.g)), money(sum(emps, e => e.gross - e.g)), money(sum(emps, e => e.eos)), ''], emptyMsg: 'لا يوجد موظفون بعد', action: opBtn('emp-add', 'إضافة موظف', 'pri sm') }))
    + card('مسيرات الرواتب', table([
      { h: 'الشهر', f: r => monthName(r.month) }, { h: 'عدد الموظفين', n: 1, f: r => digits(r.rows.length) }, { h: 'الإجمالي', n: 1, f: r => money(r.gross) }, { h: 'التأمينات', n: 1, f: r => money(r.gosi) }, { h: 'الصافي', n: 1, f: r => money(r.net) },
      { h: 'الحالة', f: r => (r.paid ? badge('مصروف', 'ok') : badge('مستحق', 'warn')) },
      { h: '', cls: 'actions no-csv', f: r => (r.paid ? '' : iconBtn('check', 'صرف الرواتب', `data-op="payroll-pay" data-preset="${esc(JSON.stringify({ pr: r.id }))}"`)) + iconBtn('book', 'القيد', `data-act="je-view" data-id="${r.je}"`) },
    ], DB.payrolls.slice().reverse(), { emptyMsg: 'لم يُرحّل أي مسير رواتب بعد' }));
});

/* =========================================================
   مركز التقارير
   ========================================================= */
const REPORTS = [
  ['القوائم المالية', [['rep-is', 'قائمة الدخل', 'الإيرادات والتكاليف ومجمل وصافي الربح مع النسب'], ['rep-bs', 'قائمة المركز المالي', 'الأصول والخصوم وحقوق الملكية كما في تاريخ'], ['rep-cf', 'قائمة التدفقات النقدية', 'التشغيلية والاستثمارية والتمويلية'], ['rep-eq', 'التغيرات في حقوق الملكية', 'حركة رأس المال والاحتياطيات والأرباح']]],
  ['الدفاتر', [['rep-tb', 'ميزان المراجعة', 'أرصدة أول المدة والحركة والأرصدة الختامية'], ['journal', 'دفتر اليومية', 'جميع القيود مع البحث والتصفية'], ['ledger', 'كشف حساب', 'دفتر الأستاذ لأي حساب أو طرف'], ['log', 'سجل العمليات', 'مسار التدقيق لكل عملية']]],
  ['المبيعات والمشتريات', [['rep-sales', 'تحليل المبيعات', 'حسب الصنف أو العميل أو الشهر'], ['rep-purch', 'تحليل المشتريات', 'حسب الصنف أو المورد أو الشهر'], ['rep-sales', 'ربحية الأصناف', 'الإيراد والتكلفة والهامش لكل صنف', { by: 'item' }], ['rep-sales', 'أفضل العملاء', 'ترتيب العملاء حسب صافي المبيعات', { by: 'party' }], ['rep-aging', 'أعمار ديون العملاء', 'شرائح ٣٠/٦٠/٩٠ يوماً', { t: 'c' }], ['rep-aging', 'أعمار أرصدة الموردين', 'المستحقات حسب العمر', { t: 's' }], ['rep-stock', 'تقييم المخزون', 'الكميات والتكلفة والقيمة البيعية']]],
  ['الخزينة والضرائب', [['rep-cash', 'حركة النقدية والبنوك', 'المقبوضات والمدفوعات والرصيد'], ['rep-vat', 'إقرار ضريبة القيمة المضافة', 'المخرجات والمدخلات والصافي']]],
  ['التحليل والرقابة', [['rep-ratios', 'التحليل المالي الشامل', 'السيولة والربحية والنشاط والمديونية'], ['rep-monthly', 'المقارنة الشهرية', 'الإيرادات والمصروفات شهراً بشهر'], ['rep-expenses', 'تحليل المصروفات', 'توزيع المصروفات حسب البند'], ['rep-budget', 'الموازنة مقابل الفعلي', 'الانحرافات ونسب التحقق'], ['rep-cc', 'مراكز التكلفة', 'الإيرادات والمصروفات لكل مركز']]],
];
page('reports', 'مركز التقارير', () => head('مركز التقارير', 'كل التقارير تُحسب لحظياً من القيود المرحّلة')
  + REPORTS.map(([g, list]) => `<section class="rep-sec"><h2>${g}</h2><div class="rep-grid">${list.map(([id, t, d, pr]) => `<button type="button" class="rep-card" data-go="${id}"${pr ? ` data-params="${esc(JSON.stringify(pr))}"` : ''}><b>${t}</b><span>${d}</span></button>`).join('')}</div></section>`).join(''));

/* ---------- ميزان المراجعة ---------- */
page('rep-tb', 'ميزان المراجعة', p => {
  withDefaults(p, { from: yearStart, to: today, lvl: 'leaf' });
  const list = p.lvl === 'all' ? accTree().map(x => x) : leaves().map(a => ({ a, depth: 0 }));
  const ob = p.from ? totals('', dayBefore(p.from)) : new Map(), per = totals(p.from, p.to);
  const split = v => (v >= 0 ? [v, 0] : [0, -v]);
  const rows = [];
  for (const { a, depth } of list) {
    const o = ob.get(a.code), m = per.get(a.code);
    const ov = o ? r2(o.d - o.c) : 0, md = m ? r2(m.d) : 0, mc = m ? r2(m.c) : 0;
    if (!ov && !md && !mc) continue;
    const cv = r2(ov + md - mc);
    rows.push({ a, depth, o: split(ov), md, mc, c: split(cv) });
  }
  const lf = rows.filter(r => !r.a.grp);
  const T = i => r2(sum(lf, i));
  const tot = [T(r => r.o[0]), T(r => r.o[1]), T(r => r.md), T(r => r.mc), T(r => r.c[0]), T(r => r.c[1])];
  const ok = tot[4] === tot[5] && tot[2] === tot[3];
  return head('ميزان المراجعة', periodLabel(p), repActions())
    + dateBar(p, `<label class="field sm"><span>المستوى</span><select name="lvl"><option value="leaf">الحسابات الفرعية</option><option value="all">شجري بالمجاميع</option></select></label>`)
    + `<div class="balance-check ${ok ? 'ok' : 'bad'}">${icon(ok ? 'check' : 'alert')}${ok ? 'الميزان متوازن: مجموع الأرصدة المدينة يساوي مجموع الأرصدة الدائنة' : 'تنبيه: الميزان غير متوازن'}</div>`
    + card('', `<div class="tbl-wrap"><table class="tbl tb"><thead><tr><th rowspan="2">الرمز</th><th rowspan="2">اسم الحساب</th><th colspan="2" class="c">رصيد أول المدة</th><th colspan="2" class="c">حركة الفترة</th><th colspan="2" class="c">الرصيد الختامي</th></tr>
      <tr><th class="num">مدين</th><th class="num">دائن</th><th class="num">مدين</th><th class="num">دائن</th><th class="num">مدين</th><th class="num">دائن</th></tr></thead>
      <tbody>${rows.map(r => `<tr class="${r.a.grp ? 'row-grp' : ''}"><td><span class="code">${digits(r.a.code)}</span></td><td><span class="tree d${Math.min(r.depth, 4)}"><button type="button" class="link" data-go="ledger" data-params="${esc(JSON.stringify({ acc: r.a.code, from: p.from, to: p.to }))}">${esc(r.a.name)}</button></span></td>${[r.o[0], r.o[1], r.md, r.mc, r.c[0], r.c[1]].map(v => `<td class="num">${amt(v)}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td></td><td>الإجمالي</td>${tot.map(v => `<td class="num">${money(v)}</td>`).join('')}</tr></tfoot></table></div>${rows.length ? '' : empty('لا توجد أرصدة')}`);
}, { after(p) { const s = $('select[name=lvl]'); if (s) s.value = p.lvl; } });

/* ---------- قائمة الدخل ---------- */
function stLines(group, from, to, exclude = []) {
  const out = [];
  const walk = code => (kids().get(code) || []).forEach(a => { if (exclude.includes(a.code)) return; if (a.grp) walk(a.code); else { const v = bal(a.code, from, to); if (v) out.push({ code: a.code, name: a.name, v }); } });
  walk(group); return out;
}
function statement(rows, base) {
  return `<div class="tbl-wrap"><table class="tbl statement"><thead><tr><th>البند</th><th class="num">المبلغ</th><th class="num">الإجمالي</th>${base ? '<th class="num hide-sm">٪ من المبيعات</th>' : ''}</tr></thead><tbody>${rows.map(r => {
    if (r.sec) return `<tr class="st-sec"><td colspan="${base ? 4 : 3}">${r.sec}</td></tr>`;
    const pc = base && (r.t !== undefined ? r.t : r.v) !== undefined ? `<td class="num hide-sm muted">${pct(((r.t ?? r.v) / base) * 100, 1)}</td>` : base ? '<td class="hide-sm"></td>' : '';
    if (r.t !== undefined) return `<tr class="${r.grand ? 'st-grand' : 'st-sub'}"><td>${r.l}</td><td></td><td class="num">${money(r.t)}</td>${pc}</tr>`;
    return `<tr class="st-item"><td>${r.code ? `<button type="button" class="link" data-go="ledger" data-params="${esc(JSON.stringify({ acc: r.code }))}">${esc(r.l)}</button>` : esc(r.l)}</td><td class="num">${money(r.v)}</td><td></td>${pc}</tr>`;
  }).join('')}</tbody></table></div>`;
}
function incomeData(from, to) {
  const rev = stLines('41', from, to), cogs = stLines('51', from, to), opex = stLines('52', from, to, ['5215', '5222']), oth = stLines('42', from, to);
  const extraR = (kids().get('4') || []).filter(a => !['41', '42'].includes(a.code)).flatMap(a => (a.grp ? stLines(a.code, from, to) : bal(a.code, from, to) ? [{ code: a.code, name: a.name, v: bal(a.code, from, to) }] : []));
  const extraX = (kids().get('5') || []).filter(a => !['51', '52'].includes(a.code)).flatMap(a => (a.grp ? stLines(a.code, from, to) : bal(a.code, from, to) ? [{ code: a.code, name: a.name, v: bal(a.code, from, to) }] : []));
  const S = l => r2(sum(l, x => x.v));
  const sales = S(rev), gp = r2(sales - S(cogs)), op = r2(gp - S(opex)), fin = bal('5215', from, to), zak = bal('5222', from, to);
  const pbz = r2(op + S(oth) + S(extraR) - S(extraX) - fin), np = r2(pbz - zak);
  return { rev, cogs, opex, oth, extraR, extraX, sales, gp, op, fin, zak, pbz, np, S };
}
page('rep-is', 'قائمة الدخل', p => {
  withDefaults(p, { from: yearStart, to: today });
  const d = incomeData(p.from, p.to), it = l => l.map(x => ({ l: x.name, v: x.v, code: x.code }));
  const rows = [
    { sec: 'إيرادات النشاط' }, ...it(d.rev), { l: 'صافي المبيعات والإيرادات', t: d.sales },
    { sec: 'تكلفة المبيعات' }, ...it(d.cogs), { l: 'إجمالي تكلفة المبيعات', t: d.S(d.cogs) },
    { l: 'مجمل الربح', t: d.gp, grand: 1 },
    { sec: 'المصروفات التشغيلية' }, ...it(d.opex), { l: 'إجمالي المصروفات التشغيلية', t: d.S(d.opex) },
    { l: 'الربح التشغيلي', t: d.op, grand: 1 },
    ...(d.oth.length || d.extraR.length ? [{ sec: 'إيرادات أخرى' }, ...it(d.oth), ...it(d.extraR), { l: 'إجمالي الإيرادات الأخرى', t: r2(d.S(d.oth) + d.S(d.extraR)) }] : []),
    ...(d.extraX.length ? [{ sec: 'مصروفات أخرى' }, ...it(d.extraX), { l: 'إجمالي المصروفات الأخرى', t: d.S(d.extraX) }] : []),
    ...(d.fin ? [{ l: 'تكلفة التمويل', v: d.fin, code: '5215' }] : []),
    { l: 'صافي الربح قبل الزكاة والضريبة', t: d.pbz },
    ...(d.zak ? [{ l: 'الزكاة وضريبة الدخل', v: d.zak, code: '5222' }] : []),
    { l: d.np >= 0 ? 'صافي الربح' : 'صافي الخسارة', t: d.np, grand: 1 },
  ];
  return head('قائمة الدخل', `${esc(DB.settings.company)} · ${periodLabel(p)}`, repActions()) + dateBar(p)
    + `<div class="kpis sm"><div class="kpi static"><span class="k-label">صافي المبيعات</span><span class="k-val">${money(d.sales)}</span></div><div class="kpi static"><span class="k-label">مجمل الربح</span><span class="k-val">${money(d.gp)}</span><span class="k-sub">${d.sales ? pct(d.gp / d.sales * 100, 1) : '—'}</span></div><div class="kpi static"><span class="k-label">الربح التشغيلي</span><span class="k-val">${money(d.op)}</span><span class="k-sub">${d.sales ? pct(d.op / d.sales * 100, 1) : '—'}</span></div><div class="kpi static"><span class="k-label">صافي الربح</span><span class="k-val">${money(d.np)}</span><span class="k-sub">${d.sales ? pct(d.np / d.sales * 100, 1) : '—'}</span></div></div>`
    + card('', statement(rows, d.sales));
});

/* ---------- المركز المالي ---------- */
page('rep-bs', 'قائمة المركز المالي', p => {
  withDefaults(p, { to: today });
  const it = l => l.map(x => ({ l: x.name, v: x.v, code: x.code }));
  const secs = top => (kids().get(top) || []).flatMap(g => { if (!g.grp) { const v = bal(g.code, '', p.to); return v ? [{ l: g.name, v, code: g.code }] : []; } const l = stLines(g.code, '', p.to); return l.length ? [{ sec: g.name }, ...it(l), { l: 'إجمالي ' + g.name, t: r2(sum(l, x => x.v)) }] : []; });
  const ta = bal('1', '', p.to), tl = bal('2', '', p.to), np = profit('', p.to), te = r2(bal('3', '', p.to) + np);
  const ok = r2(ta - tl - te) === 0;
  const rows = [{ sec: 'الأصول' }, ...secs('1'), { l: 'إجمالي الأصول', t: ta, grand: 1 },
    { sec: 'الخصوم' }, ...secs('2'), { l: 'إجمالي الخصوم', t: tl, grand: 1 },
    { sec: 'حقوق الملكية' }, ...it(stLines('3', '', p.to)), { l: 'صافي ربح (خسارة) الفترة غير المقفل', v: np }, { l: 'إجمالي حقوق الملكية', t: te, grand: 1 },
    { l: 'إجمالي الخصوم وحقوق الملكية', t: r2(tl + te), grand: 1 }];
  return head('قائمة المركز المالي', `${esc(DB.settings.company)} · كما في ${fdate(p.to)}`, repActions()) + dateBar(p, '', false)
    + `<div class="balance-check ${ok ? 'ok' : 'bad'}">${icon(ok ? 'check' : 'alert')}${ok ? 'المعادلة المحاسبية متحققة: الأصول = الخصوم + حقوق الملكية' : 'تنبيه: المعادلة المحاسبية غير متحققة'}</div>`
    + card('', statement(rows));
});

/* ---------- التدفقات النقدية ---------- */
function cashFlowData(from, to) {
  const cash = new Set(cashAccs().map(a => a.code));
  const cls = code => (isUnder(code, '12') || isUnder(code, '13') || code === '1111' ? 'inv' : isUnder(code, '3') || ['2107', '2201', '2203', '2109'].includes(code) ? 'fin' : 'op');
  const groups = { op: new Map(), inv: new Map(), fin: new Map() };
  for (const j of DB.journals) {
    if ((from && j.date < from) || (to && j.date > to)) continue;
    let delta = 0, best = null, bestV = -1;
    for (const l of j.lines) { if (cash.has(l.acc)) delta += l.debit - l.credit; else { const v = l.debit + l.credit; if (v > bestV) { bestV = v; best = l.acc; } } }
    delta = r2(delta);
    if (!delta || !best) continue;
    const g = groups[cls(best)], key = accName(best);
    g.set(key, r2((g.get(key) || 0) + delta));
  }
  return groups;
}
page('rep-cf', 'قائمة التدفقات النقدية', p => {
  withDefaults(p, { from: yearStart, to: today });
  const g = cashFlowData(p.from, p.to);
  const sec = (k, title, tl) => { const l = [...g[k].entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); const t = r2(sum(l, x => x[1])); return { rows: [{ sec: title }, ...l.map(([n, v]) => ({ l: (v >= 0 ? 'متحصلات — ' : 'مدفوعات — ') + n, v })), { l: tl, t }], t }; };
  const a = sec('op', 'التدفقات النقدية من الأنشطة التشغيلية', 'صافي النقد من الأنشطة التشغيلية'), b = sec('inv', 'التدفقات النقدية من الأنشطة الاستثمارية', 'صافي النقد من الأنشطة الاستثمارية'), c = sec('fin', 'التدفقات النقدية من الأنشطة التمويلية', 'صافي النقد من الأنشطة التمويلية');
  const open = p.from ? cashTotal(dayBefore(p.from)) : 0, net = r2(a.t + b.t + c.t), close = cashTotal(p.to);
  return head('قائمة التدفقات النقدية', `${periodLabel(p)} · الطريقة المباشرة`, repActions()) + dateBar(p)
    + card('', statement([...a.rows, ...b.rows, ...c.rows, { l: 'صافي التغير في النقدية', t: net, grand: 1 }, { l: 'النقدية أول الفترة', t: open }, { l: 'النقدية آخر الفترة', t: r2(open + net), grand: 1 }])
      + `<p class="res-note">${r2(open + net) === close ? 'رصيد النقدية آخر الفترة يطابق أرصدة حسابات النقدية والبنوك في الدفاتر.' : `فرق مطابقة: الرصيد الدفتري ${f2(close)}`} يُصنَّف كل قيد نقدي حسب الحساب المقابل الأكبر فيه.</p>`);
});

/* ---------- التغيرات في حقوق الملكية ---------- */
page('rep-eq', 'التغيرات في حقوق الملكية', p => {
  withDefaults(p, { from: yearStart, to: today });
  const cols = leaves().filter(a => a.type === 'E');
  const before = p.from ? dayBefore(p.from) : '';
  const ob = cols.map(a => (p.from ? bal(a.code, '', before) : 0)), mv = cols.map(a => bal(a.code, p.from, p.to));
  const op0 = p.from ? profit('', before) : 0, opm = profit(p.from, p.to);
  const row = (l, vals, pr, cls = '') => `<tr class="${cls}"><td>${l}</td>${vals.map(v => `<td class="num">${amt(v)}</td>`).join('')}<td class="num">${amt(pr)}</td><td class="num">${money(sum(vals) + pr)}</td></tr>`;
  return head('قائمة التغيرات في حقوق الملكية', periodLabel(p), repActions()) + dateBar(p)
    + card('', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>البيان</th>${cols.map(a => `<th class="num">${esc(a.name)}</th>`).join('')}<th class="num">أرباح غير مقفلة</th><th class="num">الإجمالي</th></tr></thead><tbody>
      ${row('الرصيد أول الفترة', ob, op0, 'row-grp')}${row('الإضافات (التخفيضات) خلال الفترة', mv, 0)}${row('صافي ربح (خسارة) الفترة', cols.map(() => 0), opm)}${row('الرصيد آخر الفترة', ob.map((v, i) => v + mv[i]), op0 + opm, 'row-grp')}
    </tbody></table></div>`);
});

/* ---------- التحليل المالي ---------- */
page('rep-ratios', 'التحليل المالي الشامل', p => {
  withDefaults(p, { from: yearStart, to: today });
  const f = p.from, t = p.to, ca = bal('11', '', t), cl = bal('21', '', t), inv = bal('1104', '', t), cash = r2(cashTotal(t) + bal('1111', '', t));
  const ta = bal('1', '', t), tl = bal('2', '', t), eq = r2(bal('3', '', t) + profit('', t)), d = incomeData(f, t);
  const ar = bal('1103', '', t), ap = bal('2101', '', t), cogs = d.S(d.cogs), days = Math.max(1, daysBetween(f || yearStart(), t) + 1);
  const dv = (a, b) => (b ? a / b : NaN);
  const R_ = (n, v, fmt, good, hint) => ({ n, v, fmt, good, hint });
  const groups = [
    ['السيولة', [R_('نسبة التداول', dv(ca, cl), X, v => v >= 1.5, 'المقبول ١٫٥ – ٢'), R_('النسبة السريعة', dv(ca - inv, cl), X, v => v >= 1, 'يُفضّل ≥ ١'), R_('نسبة النقدية', dv(cash, cl), X, v => v >= 0.5, 'يُفضّل ≥ ٠٫٥'), R_('رأس المال العامل', ca - cl, M, v => v > 0, 'يجب أن يكون موجباً')]],
    ['الربحية', [R_('هامش مجمل الربح', dv(d.gp, d.sales) * 100, Pc, v => v >= 20, ''), R_('هامش الربح التشغيلي', dv(d.op, d.sales) * 100, Pc, v => v >= 10, ''), R_('هامش صافي الربح', dv(d.np, d.sales) * 100, Pc, v => v >= 5, ''), R_('العائد على الأصول', dv(d.np, ta) * 100, Pc, v => v >= 5, 'للفترة'), R_('العائد على حقوق الملكية', dv(d.np, eq) * 100, Pc, v => v >= 10, 'للفترة')]],
    ['النشاط (محوّلة لسنة كاملة)', [R_('معدل دوران المخزون', dv(cogs * 365 / days, inv), X, v => v >= 4, ''), R_('فترة التخزين', dv(inv * days, cogs), Dy, v => v <= 90, ''), R_('فترة التحصيل', dv(ar * days, d.sales), Dy, v => v <= 60, ''), R_('فترة السداد للموردين', dv(ap * days, cogs), Dy, v => v <= 90, ''), R_('معدل دوران الأصول', dv(d.sales * 365 / days, ta), X, v => v >= 1, '')]],
    ['الهيكل التمويلي', [R_('نسبة المديونية', dv(tl, ta) * 100, Pc, v => v <= 60, 'يُفضّل ≤ ٦٠٪'), R_('الديون إلى حقوق الملكية', dv(tl, eq), X, v => v <= 1.5, ''), R_('نسبة الملكية', dv(eq, ta) * 100, Pc, v => v >= 40, ''), R_('تغطية الفوائد', dv(d.pbz + d.fin, d.fin), X, v => v >= 3, '')]],
  ];
  return head('التحليل المالي الشامل', `${periodLabel(p)} · محسوب من الدفاتر`, repActions() + goBtn('ops', 'حاسبات النسب', { q: 'نسبة' }, 'ghost', 'calc')) + dateBar(p)
    + `<div class="grid g2">${groups.map(([g, list]) => card(g, `<table class="kv ratios">${list.map(r => { const okv = isFinite(r.v); return `<tr><th>${r.n}${r.hint ? `<small>${r.hint}</small>` : ''}</th><td>${okv ? r.fmt(r.v) : '—'}</td><td class="no-csv">${okv ? (r.good(r.v) ? badge('جيد', 'ok') : badge('يحتاج متابعة', 'warn')) : badge('غير متاح', 'muted')}</td></tr>`; }).join('')}</table>`)).join('')}</div>`;
});

/* ---------- أعمار الديون ---------- */
function agingBuckets(t, asOf) {
  const rows = [], totalsB = [0, 0, 0, 0];
  for (const p of partyList(t)) {
    const key = t + ':' + p.id, items = []; let pay = 0;
    for (const j of sortedJournals()) {
      if (j.date > asOf) break;
      for (const l of j.lines) if (l.party === key) { const a = t === 'c' ? l.debit - l.credit : l.credit - l.debit; if (a > 0) items.push({ date: j.date, a }); else pay -= a; }
    }
    for (const it of items) { const u = Math.min(it.a, pay); it.a -= u; pay -= u; }
    const b = [0, 0, 0, 0];
    for (const it of items) if (it.a > 0.004) { const d = daysBetween(it.date, asOf); b[d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3] += it.a; }
    const total = r2(sum(b) - pay);
    if (total || sum(b)) { rows.push({ p, b: b.map(r2), credit: r2(pay), total }); b.forEach((v, i) => { totalsB[i] += v; }); }
  }
  return { rows, totals: totalsB.map(r2) };
}
page('rep-aging', 'أعمار الأرصدة', p => {
  withDefaults(p, { to: today, t: 'c' });
  const { rows, totals: tb } = agingBuckets(p.t, p.to), all = r2(sum(rows, r => r.total));
  const H = ['٠ – ٣٠ يوماً', '٣١ – ٦٠ يوماً', '٦١ – ٩٠ يوماً', 'أكثر من ٩٠ يوماً'];
  return head(p.t === 'c' ? 'أعمار ديون العملاء' : 'أعمار أرصدة الموردين', `كما في ${fdate(p.to)} · طريقة الوارد أولاً (تُخصم الدفعات من أقدم المستحقات)`, repActions() + goBtn('rep-aging', p.t === 'c' ? 'أعمار الموردين' : 'أعمار العملاء', { t: p.t === 'c' ? 's' : 'c', to: p.to }, 'ghost') + (p.t === 'c' ? opBtn('bad-debt-prov', 'احتساب مخصص الديون', 'ghost', 'scale') : ''))
    + dateBar(p, '', false)
    + `<div class="aging-bar">${tb.map((v, i) => `<div class="ab ab${i}" style="flex:${Math.max(v, 0) || 0.0001}"><span>${H[i]}</span><b>${f2(v)}</b></div>`).join('')}</div>`
    + card('', table([
      { h: p.t === 'c' ? 'العميل' : 'المورد', f: r => `<button type="button" class="link" data-go="ledger" data-params="${esc(JSON.stringify({ party: p.t + ':' + r.p.id }))}">${esc(r.p.name)}</button>` },
      ...H.map((h, i) => ({ h, n: 1, f: r => amt(r.b[i]) })), { h: 'دفعات غير مخصصة', n: 1, cls: 'hide-sm', f: r => amt(-r.credit) }, { h: 'الإجمالي', n: 1, f: r => money(r.total) },
    ], rows, { foot: ['الإجمالي', ...tb.map(money), money(-sum(rows, r => r.credit)), money(all)], emptyMsg: 'لا توجد أرصدة مستحقة' }));
});

/* ---------- تحليل المبيعات والمشتريات ---------- */
function docAnalysis(id, title, kinds, pt) {
  page(id, title, p => {
    withDefaults(p, { from: yearStart, to: today, by: 'item' });
    const m = new Map();
    for (const i of DB.invoices) {
      if (i.status !== 'posted' || !kinds.includes(i.kind) || (p.from && i.date < p.from) || (p.to && i.date > p.to)) continue;
      const sg = i.kind === kinds[1] ? -1 : 1, f = i.sub ? i.net / i.sub : 1;
      for (const l of i.lines) {
        const key = p.by === 'item' ? l.item : p.by === 'party' ? i.party || '-' : ym(i.date);
        const name = p.by === 'item' ? l.name : p.by === 'party' ? (partyName(pt + ':' + i.party) || 'نقدي') : monthName(ym(i.date));
        const r = m.get(key) || { name, qty: 0, net: 0, cost: 0, docs: new Set() };
        r.qty += sg * l.qty; r.net += sg * l.qty * l.price * f; r.cost += sg * l.qty * (l.cost || 0); r.docs.add(i.id); m.set(key, r);
      }
    }
    const rows = [...m.entries()].map(([k, r]) => ({ k, ...r, net: r2(r.net), cost: r2(r.cost), n: r.docs.size })).sort((a, b) => (p.by === 'month' ? (a.k < b.k ? -1 : 1) : b.net - a.net));
    const tn = sum(rows, r => r.net), isS = pt === 'c';
    return head(title, periodLabel(p), repActions()) + dateBar(p, `<label class="field sm"><span>التجميع حسب</span><select name="by"><option value="item">الصنف</option><option value="party">${isS ? 'العميل' : 'المورد'}</option><option value="month">الشهر</option></select></label>`)
      + card('', table([
        { h: p.by === 'item' ? 'الصنف' : p.by === 'party' ? (isS ? 'العميل' : 'المورد') : 'الشهر', f: r => esc(r.name) }, { h: 'عدد المستندات', n: 1, cls: 'hide-sm', f: r => digits(r.n) }, { h: 'الكمية', n: 1, f: r => fN(r.qty, 0) },
        { h: 'الصافي', n: 1, f: r => money(r.net) }, { h: 'النسبة', n: 1, cls: 'hide-sm', f: r => `<span class="bar-cell"><i style="width:${tn ? Math.max(0, r.net / tn * 100) : 0}%"></i>${pct(tn ? r.net / tn * 100 : 0, 1)}</span>` },
        ...(isS ? [{ h: 'التكلفة', n: 1, f: r => money(r.cost) }, { h: 'مجمل الربح', n: 1, f: r => money(r.net - r.cost) }, { h: 'الهامش', n: 1, cls: 'hide-sm', f: r => (r.net ? pct((r.net - r.cost) / r.net * 100, 1) : '—') }] : []),
      ], rows, { foot: ['الإجمالي', '', fN(sum(rows, r => r.qty), 0), money(tn), '', ...(isS ? [money(sum(rows, r => r.cost)), money(tn - sum(rows, r => r.cost)), tn ? pct((tn - sum(rows, r => r.cost)) / tn * 100, 1) : ''] : [])] }));
  }, { after(p) { const s = $('select[name=by]'); if (s) s.value = p.by; } });
}
docAnalysis('rep-sales', 'تحليل المبيعات', ['sale', 'sret'], 'c');
docAnalysis('rep-purch', 'تحليل المشتريات', ['purchase', 'pret'], 's');

/* ---------- تقييم المخزون ---------- */
page('rep-stock', 'تقييم المخزون', () => {
  const rows = DB.items.map(i => ({ ...i, val: r2(i.qty * i.cost), retail: r2(i.qty * i.price) }));
  const tv = r2(sum(rows, r => r.val)), gl = bal('1104'), diff = r2(gl - tv);
  return head('تقييم المخزون', `بطريقة المتوسط المرجح · كما في ${fdate(today())}`, repActions())
    + `<div class="kpis sm"><div class="kpi static"><span class="k-label">قيمة المخزون بالتكلفة</span><span class="k-val">${money(tv)}</span></div><div class="kpi static"><span class="k-label">القيمة البيعية</span><span class="k-val">${money(sum(rows, r => r.retail))}</span></div><div class="kpi static"><span class="k-label">الربح المتوقع</span><span class="k-val">${money(sum(rows, r => r.retail) - tv)}</span></div><div class="kpi static"><span class="k-label">رصيد حساب المخزون</span><span class="k-val">${money(gl)}</span><span class="k-sub">${diff ? 'فرق ' + f2(diff) : 'مطابق'}</span></div></div>`
    + card('', table([{ h: 'الرمز', f: i => esc(i.code) }, { h: 'الصنف', f: i => esc(i.name) }, { h: 'الكمية', n: 1, f: i => fN(i.qty, 2) }, { h: 'متوسط التكلفة', n: 1, f: i => money(i.cost) }, { h: 'القيمة بالتكلفة', n: 1, f: i => money(i.val) }, { h: 'سعر البيع', n: 1, cls: 'hide-sm', f: i => money(i.price) }, { h: 'القيمة البيعية', n: 1, cls: 'hide-sm', f: i => money(i.retail) }, { h: '٪ من المخزون', n: 1, cls: 'hide-sm', f: i => pct(tv ? i.val / tv * 100 : 0, 1) }],
      rows, { foot: ['', 'الإجمالي', '', '', money(tv), '', money(sum(rows, r => r.retail)), ''] }));
});

/* ---------- حركة النقدية ---------- */
page('rep-cash', 'حركة النقدية والبنوك', p => {
  withDefaults(p, { from: () => today().slice(0, 8) + '01', to: today, acc: '' });
  const set = new Set(p.acc ? [p.acc] : cashAccs().map(a => a.code));
  let open = 0; const rows = [];
  for (const j of sortedJournals()) {
    if (p.to && j.date > p.to) break;
    for (const l of j.lines) if (set.has(l.acc)) { const v = l.debit - l.credit; if (p.from && j.date < p.from) open += v; else rows.push({ j, l, v }); }
  }
  let run = open; rows.forEach(r => { run += r.v; r.bal = run; });
  return head('حركة النقدية والبنوك', periodLabel(p), repActions() + opBtn('cash-xfer', 'تحويل', 'ghost', 'swap'))
    + dateBar(p, `<label class="field sm"><span>الحساب</span><select name="acc"><option value="">جميع الحسابات النقدية</option>${accOptions('cash')}</select></label>`)
    + `<div class="kpis sm">${cashAccs().map(a => `<div class="kpi static"><span class="k-label">${esc(a.name)}</span><span class="k-val">${money(rawBal(a.code, '', p.to))}</span></div>`).join('')}</div>`
    + card('', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>القيد</th><th>البيان</th><th>الحساب</th><th class="num">مقبوضات</th><th class="num">مدفوعات</th><th class="num">الرصيد</th></tr></thead><tbody>
      <tr class="row-grp"><td colspan="6">الرصيد أول الفترة</td><td class="num">${money(open)}</td></tr>
      ${rows.map(r => `<tr><td>${fdate(r.j.date)}</td><td><button type="button" class="link" data-act="je-view" data-id="${r.j.id}">#${digits(r.j.no)}</button></td><td>${esc(r.j.desc)}</td><td><small>${esc(accName(r.l.acc))}</small></td><td class="num">${amt(r.l.debit)}</td><td class="num">${amt(r.l.credit)}</td><td class="num">${money(r.bal)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="4">الإجمالي</td><td class="num">${money(sum(rows, r => r.l.debit))}</td><td class="num">${money(sum(rows, r => r.l.credit))}</td><td class="num">${money(run)}</td></tr></tfoot></table></div>`);
}, { after(p) { const s = $('select[name=acc]'); if (s) s.value = p.acc || ''; } });

/* ---------- إقرار الضريبة ---------- */
page('rep-vat', 'إقرار ضريبة القيمة المضافة', p => {
  const q = Math.floor((+today().slice(5, 7) - 1) / 3) * 3 + 1;
  withDefaults(p, { from: () => today().slice(0, 5) + String(q).padStart(2, '0') + '-01', to: today });
  const s = vatSummary(p.from, p.to), rate = num(DB.settings.vat) / 100 || 1;
  const lines = [];
  for (const j of sortedJournals()) { if (j.src === 'vat' || (p.from && j.date < p.from) || (p.to && j.date > p.to)) continue; for (const l of j.lines) if (l.acc === '2105' || l.acc === '1108') lines.push({ j, l }); }
  return head('إقرار ضريبة القيمة المضافة', `${periodLabel(p)} · النسبة الأساسية ${digits(DB.settings.vat)}٪`, repActions() + opBtn('vat-settle', 'تسوية وسداد', 'pri', 'check', { from: p.from, to: p.to }))
    + dateBar(p)
    + card('ملخص الإقرار', `<table class="kv vat"><tr><th>١. المبيعات الخاضعة للنسبة الأساسية (محتسبة)</th><td>${M(s.out / rate)}</td></tr><tr><th>ضريبة المخرجات المستحقة</th><td>${M(s.out)}</td></tr><tr><th>٢. المشتريات الخاضعة للنسبة الأساسية (محتسبة)</th><td>${M(s.inp / rate)}</td></tr><tr><th>ضريبة المدخلات القابلة للخصم</th><td>${M(s.inp)}</td></tr><tr class="main"><th>${s.net >= 0 ? 'صافي الضريبة المستحقة السداد' : 'صافي الضريبة القابلة للاسترداد'}</th><td>${M(Math.abs(s.net))}</td></tr></table>`)
    + card('الحركات الضريبية في الفترة', table([{ h: 'التاريخ', f: r => fdate(r.j.date) }, { h: 'القيد', f: r => `<button type="button" class="link" data-act="je-view" data-id="${r.j.id}">#${digits(r.j.no)}</button>` }, { h: 'البيان', f: r => esc(r.j.desc) }, { h: 'النوع', f: r => (r.l.acc === '2105' ? badge('مخرجات', 'info') : badge('مدخلات', 'ok')) }, { h: 'مدين', n: 1, f: r => amt(r.l.debit) }, { h: 'دائن', n: 1, f: r => amt(r.l.credit) }], lines, { emptyMsg: 'لا توجد حركات ضريبية في الفترة' }));
});

/* ---------- الموازنة، مراكز التكلفة، المقارنة الشهرية، المصروفات ---------- */
page('rep-budget', 'الموازنة مقابل الفعلي', p => {
  withDefaults(p, { year: () => today().slice(0, 4) });
  const y = String(p.year), list = DB.budgets.filter(b => b.year === y);
  const rows = list.map(b => { const act = bal(b.acc, y + '-01-01', y + '-12-31'); return { ...b, act, varc: r2(act - b.amount), p: b.amount ? act / b.amount * 100 : 0, isRev: acc(b.acc)?.type === 'R' }; });
  return head('الموازنة التقديرية مقابل الفعلي', `السنة ${digits(y)}`, repActions() + opBtn('budget-set', 'إضافة موازنة', 'pri'))
    + `<form class="filters" data-filter><label class="field sm"><span>السنة</span><input type="number" name="year" value="${esc(y)}" min="2000" max="2100"></label><button class="btn" type="submit">عرض</button></form>`
    + card('', table([
      { h: 'الحساب', f: r => esc(accLabel(r.acc)) }, { h: 'الموازنة', n: 1, f: r => money(r.amount) }, { h: 'الفعلي', n: 1, f: r => money(r.act) }, { h: 'الانحراف', n: 1, f: r => money(r.varc) },
      { h: 'نسبة التحقق', n: 1, f: r => `<span class="bar-cell ${r.isRev ? (r.p >= 100 ? 'good' : '') : (r.p > 100 ? 'over' : '')}"><i style="width:${Math.min(100, Math.max(0, r.p))}%"></i>${pct(r.p, 0)}</span>` },
      { h: 'التقييم', f: r => (r.isRev ? (r.varc >= 0 ? badge('ملائم', 'ok') : badge('أقل من المستهدف', 'warn')) : (r.varc <= 0 ? badge('ضمن الموازنة', 'ok') : badge('تجاوز الموازنة', 'bad'))) },
    ], rows, { emptyMsg: 'لم تُحدد موازنات لهذه السنة', action: opBtn('budget-set', 'تحديد موازنة', 'pri sm') }));
});
page('rep-cc', 'مراكز التكلفة', p => {
  withDefaults(p, { from: yearStart, to: today });
  const m = new Map([['', { r: 0, x: 0 }]]); DB.costCenters.forEach(c => m.set(c.code, { r: 0, x: 0 }));
  for (const j of DB.journals) { if ((p.from && j.date < p.from) || (p.to && j.date > p.to)) continue; for (const l of j.lines) { const t = acc(l.acc)?.type; if (t !== 'R' && t !== 'X') continue; const k = m.has(l.cc || '') ? l.cc || '' : ''; const o = m.get(k); if (t === 'R') o.r += l.credit - l.debit; else o.x += l.debit - l.credit; } }
  const rows = [...m.entries()].map(([k, o]) => ({ k, name: k ? DB.costCenters.find(c => c.code === k).name : 'غير موزّع على مركز', r: r2(o.r), x: r2(o.x) })).filter(r => r.k || r.r || r.x);
  return head('تقرير مراكز التكلفة', periodLabel(p), repActions() + opBtn('cc-add', 'مركز جديد', 'ghost')) + dateBar(p)
    + card('', table([{ h: 'الرمز', f: r => esc(r.k || '—') }, { h: 'المركز', f: r => esc(r.name) }, { h: 'الإيرادات', n: 1, f: r => money(r.r) }, { h: 'المصروفات', n: 1, f: r => money(r.x) }, { h: 'الصافي', n: 1, f: r => money(r.r - r.x) }], rows, { foot: ['', 'الإجمالي', money(sum(rows, r => r.r)), money(sum(rows, r => r.x)), money(sum(rows, r => r.r - r.x))] }));
});
page('rep-monthly', 'المقارنة الشهرية', p => {
  withDefaults(p, { year: () => today().slice(0, 4) });
  const y = String(p.year);
  const rows = MONTHS.map((mn, i) => { const s = `${y}-${String(i + 1).padStart(2, '0')}-01`, e = monthEnd(s.slice(0, 7)); const d = incomeData(s, e); return { mn, sales: d.sales, cogs: d.S(d.cogs), gp: d.gp, opex: d.S(d.opex), np: d.np }; });
  const T = k => sum(rows, r => r[k]);
  return head('المقارنة الشهرية', `السنة ${digits(y)}`, repActions())
    + `<form class="filters" data-filter><label class="field sm"><span>السنة</span><input type="number" name="year" value="${esc(y)}" min="2000" max="2100"></label><button class="btn" type="submit">عرض</button></form>`
    + card('', table([{ h: 'الشهر', f: r => r.mn }, { h: 'صافي المبيعات', n: 1, f: r => amt(r.sales) }, { h: 'تكلفة المبيعات', n: 1, f: r => amt(r.cogs) }, { h: 'مجمل الربح', n: 1, f: r => amt(r.gp) }, { h: 'المصروفات التشغيلية', n: 1, f: r => amt(r.opex) }, { h: 'صافي الربح', n: 1, f: r => amt(r.np) }, { h: 'الهامش', n: 1, cls: 'hide-sm', f: r => (r.sales ? pct(r.np / r.sales * 100, 1) : '—') }],
      rows, { foot: ['الإجمالي', money(T('sales')), money(T('cogs')), money(T('gp')), money(T('opex')), money(T('np')), T('sales') ? pct(T('np') / T('sales') * 100, 1) : ''] }));
});
page('rep-expenses', 'تحليل المصروفات', p => {
  withDefaults(p, { from: yearStart, to: today });
  const rows = stLines('5', p.from, p.to).sort((a, b) => b.v - a.v), t = sum(rows, r => r.v);
  return head('تحليل المصروفات حسب البند', periodLabel(p), repActions()) + dateBar(p)
    + card('', table([{ h: 'الرمز', f: r => digits(r.code) }, { h: 'البند', f: r => `<button type="button" class="link" data-go="ledger" data-params="${esc(JSON.stringify({ acc: r.code, from: p.from, to: p.to }))}">${esc(r.name)}</button>` }, { h: 'المبلغ', n: 1, f: r => money(r.v) }, { h: 'النسبة من الإجمالي', n: 1, f: r => `<span class="bar-cell"><i style="width:${t ? Math.max(0, r.v / t * 100) : 0}%"></i>${pct(t ? r.v / t * 100 : 0, 1)}</span>` }], rows, { foot: ['', 'الإجمالي', money(t), ''] }));
});

/* ---------- سجل العمليات ---------- */
page('log', 'سجل العمليات', p => {
  const q = normAr(p.q || ''), list = DB.log.filter(l => !q || normAr(l.d).includes(q)).slice(0, 500);
  const fmt = new Intl.DateTimeFormat(DB.settings.digits === 'arab' ? 'ar-SA-u-ca-gregory' : 'ar-SA-u-ca-gregory-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
  return head('سجل العمليات ومسار التدقيق', `${digits(DB.log.length)} عملية مسجلة`, repActions())
    + `<form class="filters" data-filter><label class="field sm grow"><span>بحث</span><input type="search" name="q" value="${esc(p.q || '')}"></label><button class="btn" type="submit">${icon('search')}<span>بحث</span></button></form>`
    + card('', table([{ h: 'الوقت', f: l => `<span class="nowrap">${fmt.format(new Date(l.t))}</span>` }, { h: 'العملية', f: l => esc(l.d) }], list, { emptyMsg: 'لا توجد عمليات مسجلة' }));
});

/* ---------- الإعدادات ---------- */
const SETTINGS_FIELDS = [['company', 'اسم المنشأة', '', 'text', { req: 1, full: 1 }], ['taxNo', 'الرقم الضريبي', '', 'text'], ['phone', 'الهاتف', '', 'text'], ['address', 'العنوان', '', 'text', { full: 1 }],
  ['currency', 'رمز العملة', '', 'text'], ['curName', 'اسم العملة (للتفقيط)', '', 'text'], ['subName', 'اسم الجزء (للتفقيط)', '', 'text'], ['vat', 'نسبة ضريبة القيمة المضافة', '', 'pct'],
  ['fyStart', 'بداية السنة المالية', '', 'date'], ['digits', 'نمط الأرقام', '', 'select', { opts: [['latn', 'لاتينية 0123'], ['arab', 'عربية ٠١٢٣']] }]].map(normField);
page('settings', 'الإعدادات', () => {
  const size = (() => { try { return JSON.stringify(DB).length; } catch (e) { return 0; } })();
  return head('الإعدادات', 'بيانات المنشأة وخيارات النظام')
    + card('بيانات المنشأة', `<form id="setForm" class="form-grid" novalidate>${SETTINGS_FIELDS.map(fieldHtml).join('')}<div class="form-actions full"><button class="btn pri" type="submit">${icon('check')}<span>حفظ الإعدادات</span></button></div></form>`)
    + `<div class="grid g2">`
    + card('الأمان', `<p class="muted">كلمة المرور الحالية تُستخدم لفتح النظام على هذا الجهاز. ${DB.settings.pass === '1234' ? '<b class="st-warn">ما زلت تستخدم كلمة المرور المؤقتة ١٢٣٤ — غيّرها الآن.</b>' : ''}</p><div class="btn-row">${opBtn('pass', 'تغيير كلمة المرور', 'pri', 'lock')}${opBtn('lock', 'قفل الفترة المحاسبية', 'ghost', 'lock')}${opBtn('logout', 'تسجيل الخروج', 'ghost', 'logout')}</div>${DB.settings.lockDate ? `<p class="res-note">الفترة مقفلة حتى ${fdate(DB.settings.lockDate)}</p>` : ''}`)
    + card('البيانات والنسخ الاحتياطي', `<p class="muted">تُحفظ البيانات في متصفحك على هذا الجهاز (${digits((size / 1024).toFixed(1))} كيلوبايت). نزّل نسخة احتياطية بانتظام.</p><div class="btn-row">${opBtn('backup', 'تنزيل نسخة احتياطية', 'pri', 'download')}${opBtn('restore', 'استعادة نسخة', 'ghost', 'undo')}${opBtn('demo', 'تحميل بيانات تجريبية', 'ghost', 'play')}${opBtn('reset', 'تصفير النظام', 'ghost danger-text', 'trash')}</div>`)
    + card('مراكز التكلفة', table([{ h: 'الرمز', f: c => esc(c.code) }, { h: 'الاسم', f: c => esc(c.name) }], DB.costCenters, { cls: 'compact' }) + `<div class="btn-row">${opBtn('cc-add', 'إضافة مركز', 'ghost')}</div>`)
    + card('إحصاءات النظام', `<table class="kv">${[['الحسابات', DB.accounts.length], ['القيود', DB.journals.length], ['الفواتير والمستندات', DB.invoices.length], ['السندات', DB.vouchers.length], ['العملاء', DB.customers.length], ['الموردون', DB.suppliers.length], ['الأصناف', DB.items.length], ['الأصول', DB.assets.length], ['الموظفون', DB.employees.length], ['العمليات المتاحة', OPS_COUNT]].map(([l, v]) => `<tr><th>${l}</th><td>${digits(v)}</td></tr>`).join('')}</table>`)
    + `</div>`;
}, {
  after() {
    const f = $('#setForm');
    setValues(f, SETTINGS_FIELDS, DB.settings);
    f.onsubmit = e => {
      e.preventDefault();
      const v = readForm(f);
      if (!v.company) return toast('أدخل اسم المنشأة', 'err');
      if (!(num(v.vat) >= 0 && num(v.vat) <= 100)) return toast('نسبة الضريبة غير صحيحة', 'err');
      Object.assign(DB.settings, { ...v, vat: num(v.vat) });
      setDB(DB); commit('تعديل إعدادات المنشأة');
      renderShell(); refresh(); toast('تم حفظ الإعدادات');
    };
  },
});
