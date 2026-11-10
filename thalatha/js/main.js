(function () {
  'use strict';

  var D = window.DATA;
  var app = document.getElementById('app');
  var $ = function (id) { return document.getElementById(id); };
  var by = function (list, id) { return list.filter(function (x) { return x.id === id; })[0]; };
  var ar = function (n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); };
  var NUMS = ['١', '٢', '٣'];

  /* ---------- رسومات مولّدة (بلا صور خارجية) ---------- */
  var TONES = [
    ['#0b6b4f', '#f2c94c'], ['#2747d8', '#e9a8c0'], ['#e8672b', '#111111'],
    ['#111111', '#0b6b4f'], ['#f2c94c', '#e8672b'], ['#e9c9c2', '#2747d8'], ['#dfe6c8', '#0b6b4f']
  ];
  var DARK = ['#0b6b4f', '#2747d8', '#e8672b', '#111111', '#8a3b6b'];
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function artStyle(seed) {
    var h = hash(seed), t = TONES[h % TONES.length];
    var x = 15 + (h >> 3) % 70, y = 15 + (h >> 7) % 70, r = 28 + (h >> 11) % 30;
    return 'background:radial-gradient(circle at ' + x + '% ' + y + '%,' + t[1] + ' 0 ' + r + '%,transparent ' + (r + 0.5) + '%),' + t[0];
  }
  function thumb(seed) { return '<span class="thumb" style="' + artStyle(seed) + '" aria-hidden="true"></span>'; }
  function avatar(name) {
    return '<span class="avatar" style="background:' + DARK[hash(name) % DARK.length] + '" aria-hidden="true">' + name.replace(/^د\. /, '').charAt(0) + '</span>';
  }
  function coverInner(item) { return '<span>' + item.word.replace('\n', '<br>') + '</span>'; }
  function cover(item) {
    return '<a class="cover" href="#/n/' + item.id + '" style="background:' + item.bg + ';color:' + item.fg + '" aria-label="' + item.name + '">' + coverInner(item) + '</a>';
  }

  /* ---------- مكوّنات ---------- */
  function meta(a, extra) {
    var nl = by(D.newsletters, a.nl);
    return '<p class="meta">في <a href="#/n/' + nl.id + '">' + nl.name + '</a> من <b>٣</b> · ' + a.date + (extra || '') + '</p>';
  }
  function articleRow(a) {
    return '<article class="row">' + thumb(a.id) +
      '<div class="row-body">' +
      '<h3><a href="#/a/' + a.id + '">' + a.title + '</a></h3>' +
      '<p class="excerpt">' + a.excerpt + '</p>' +
      '<p class="author">' + avatar(a.author) + a.author + '</p>' + meta(a) +
      '</div></article>';
  }
  function programCard(p) {
    return '<article class="video">' +
      '<div class="video-art" style="background:linear-gradient(135deg,' + p.bg[0] + ',' + p.bg[1] + ')">' +
      '<span class="video-show">' + p.show + '</span>' +
      '<span class="video-line" style="background:' + p.chip + '">' + p.line + '</span>' +
      '<span class="video-play"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>' +
      '<span class="video-dur">' + p.dur + '</span></div>' +
      '<h3>' + p.title + '</h3>' +
      '<p class="meta">في <b>' + p.show + '</b> من <b>٣</b> · ' + p.date + '</p></article>';
  }
  var ICONS = {
    three: '<path d="M5 6h14 M5 12h14 M5 18h14"/>',
    mail: '<path d="M3 6h18v12H3z M3 7l9 6 9-6"/>',
    video: '<path d="M3 7h12v10H3z M15 11l6-3v8l-6-3"/>',
    text: '<path d="M5 4v16 M10 4v16 M15 4v16 M20 4v16"/>'
  };
  function head(icon, title, more) {
    return '<div class="sec-head"><h2><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[icon] + '</svg>' + title + '</h2>' +
      (more ? '<a class="more" href="' + more + '">المزيد</a>' : '') + '</div>';
  }
  function section(icon, title, more, inner) { return '<section class="sec">' + head(icon, title, more) + inner + '</section>'; }
  function list(items, fn) { return '<div class="list">' + items.map(fn).join('') + '</div>'; }
  function covers() { return '<div class="covers">' + D.newsletters.map(cover).join('') + '</div>'; }
  function lead(a) {
    return '<article class="lead">' +
      '<a class="lead-art" href="#/a/' + a.id + '" style="' + artStyle(a.id) + '" aria-hidden="true" tabindex="-1"></a>' +
      '<h1><a href="#/a/' + a.id + '">' + a.title + '</a></h1>' +
      '<p class="lead-excerpt">' + a.excerpt + '</p>' +
      '<p class="author">' + avatar(a.author) + a.author + '</p>' + meta(a) + '</article>';
  }
  function triCards(a) {
    return '<div class="tri">' + a.three.map(function (t, i) {
      return '<a class="tri-card" href="#/a/' + a.id + '"><span class="tri-num">' + NUMS[i] + '</span><strong>' + t[0] + '</strong><p>' + t[1] + '</p></a>';
    }).join('') + '</div>';
  }

  /* ---------- الصفحات ---------- */
  var moreShown = 6;
  var views = {
    home: function () {
      var A = D.articles;
      return '<div class="home-top">' +
        '<a class="banner" href="#/articles">' +
        '<span class="banner-kicker">' + ar(A.length) + ' مقالة · فكرة واحدة</span>' +
        '<strong>كل شيء يُفهم<br>حين تقسمه على ثلاثة</strong>' +
        '<span class="banner-cta">اقرأ المقالات</span>' +
        '<span class="banner-num" aria-hidden="true">٣</span></a>' +
        list(A.slice(0, 3), articleRow) + '</div>' +
        section('three', 'ثلاثية اليوم: ' + A[0].title.replace('ثلاثة أنواع من ', ''), '#/a/' + A[0].id, triCards(A[0])) +
        section('mail', 'نشرات بريدية مميّزة', null, covers()) +
        section('video', 'جديد البرامج', '#/programs', '<div class="videos">' + D.programs.map(programCard).join('') + '</div>') +
        section('text', 'المقالات الجديدة', '#/articles', list(A.slice(3, 9), articleRow) +
          '<div class="center"><a class="btn btn-line" href="#/articles">المزيد</a></div>');
    },
    articles: function () {
      var A = D.articles, rest = A.slice(5, 5 + moreShown);
      return lead(A[0]) + list(A.slice(1, 5), articleRow) +
        section('mail', 'نشرات بريدية مميّزة', null, covers()) +
        '<section class="sec">' + list(rest, articleRow) +
        (5 + moreShown < A.length ? '<div class="center"><button class="btn btn-line" type="button" id="loadMore">المزيد</button></div>' : '') +
        '</section>';
    },
    programs: function () {
      return '<h1 class="page-title">البرامج</h1><p class="page-sub">ثلاثة برامج مرئية، وكلها عن الرقم نفسه.</p>' +
        '<div class="videos">' + D.programs.map(programCard).join('') + '</div>';
    },
    n: function (id) {
      var nl = by(D.newsletters, id);
      if (!nl) return views.notFound();
      var items = D.articles.filter(function (a) { return a.nl === id; });
      return '<div class="nl-hero"><div class="cover" style="background:' + nl.bg + ';color:' + nl.fg + '">' + coverInner(nl) + '</div>' +
        '<div><h1 class="page-title">' + nl.name + '</h1><p class="page-sub">' + nl.desc + '</p>' +
        '<button class="btn btn-dark" type="button" data-open="subscribe"><span class="badge"></span>اشترك في النشرة</button></div></div>' +
        section('text', 'أعداد النشرة', null, list(items, articleRow));
    },
    a: function (id) {
      var a = by(D.articles, id);
      if (!a) return views.notFound();
      var nl = by(D.newsletters, a.nl);
      var others = D.articles.filter(function (x) { return x.id !== id && x.nl === a.nl; })
        .concat(D.articles.filter(function (x) { return x.id !== id && x.nl !== a.nl; })).slice(0, 4);
      return '<article class="article">' +
        '<h1>' + a.title + '</h1>' +
        '<p class="lead-excerpt">' + a.excerpt + '</p>' +
        '<p class="author">' + avatar(a.author) + a.author + '</p>' +
        meta(a, ' · ' + ar(a.min) + ' دقائق قراءة') +
        '<div class="article-art" style="' + artStyle(a.id) + '" aria-hidden="true"></div>' +
        '<div class="prose"><p>' + a.intro + '</p>' +
        a.three.map(function (t, i) {
          return '<section class="three-item"><span class="three-num" aria-hidden="true">' + NUMS[i] + '</span><div><h2>' + t[0] + '</h2><p>' + t[1] + '</p></div></section>';
        }).join('') +
        '<p class="outro">' + a.outro + '</p></div>' +
        '<aside class="nl-box"><div class="cover" style="background:' + nl.bg + ';color:' + nl.fg + '">' + coverInner(nl) + '</div>' +
        '<div><strong>' + nl.name + '</strong><p>' + nl.desc + '</p>' +
        '<button class="btn btn-dark" type="button" data-open="subscribe"><span class="badge"></span>اشترك</button></div></aside>' +
        '</article>' + section('text', 'اقرأ أيضًا', '#/articles', list(others, articleRow));
    },
    notFound: function () {
      return '<div class="empty"><h1 class="page-title">الصفحة غير موجودة</h1><a class="btn btn-line" href="#/">العودة للرئيسية</a></div>';
    }
  };

  /* ---------- حركة الظهور ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    var n = 0;
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.style.transitionDelay = Math.min(n++, 8) * 55 + 'ms';
      en.target.classList.add('in');
      (function (el) { setTimeout(function () { el.style.transitionDelay = ''; }, 1100); })(en.target);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  function reveal(rootEl) {
    if (!io) return;
    rootEl.querySelectorAll('.banner, .row, .cover, .video, .sec-head, .tri-card, .three-item, .lead, .nl-box, .article > h1, .article-art').forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  var bar = $('readBar');
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(scrollY / max, 1) : 0) + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  function route(keepScroll) {
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var name = parts[0] || 'home';
    var view = views[name] && name !== 'notFound' ? name : 'notFound';
    app.innerHTML = views[view](parts[1]);
    app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
    var tab = view === 'a' || view === 'n' ? 'articles' : view;
    document.querySelectorAll('.tabs a').forEach(function (t) {
      if (t.dataset.tab === tab) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    var art = view === 'a' && by(D.articles, parts[1]);
    document.title = art ? art.title + ' — ٣' : '٣';
    bar.hidden = !art;
    if (keepScroll !== true) window.scrollTo(0, 0);
    onScroll();
    reveal(app);
  }
  window.addEventListener('hashchange', route);

  /* ---------- النوافذ ---------- */
  function openDlg(name) {
    var d = $('dlg-' + name);
    if (d && !d.open) d.showModal();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-close],#loadMore');
    if (!t) {
      if (e.target.tagName === 'DIALOG') e.target.close();
      return;
    }
    if (t.dataset.open) openDlg(t.dataset.open);
    else if (t.hasAttribute('data-close')) t.closest('dialog').close();
    else if (t.id === 'loadMore') { moreShown += 6; route(true); }
  });

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('.form-msg');
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim());
      msg.classList.toggle('err', !ok);
      if (!ok) { msg.textContent = 'اكتب بريدًا إلكترونيًا صحيحًا.'; form.email.focus(); return; }
      msg.textContent = form.dataset.form === 'login' ? 'أرسلنا رابط الدخول إلى بريدك.' : 'تم الاشتراك. نلتقي في بريدك!';
      form.reset();
    });
  });

  /* ---------- البحث ---------- */
  var sInput = $('searchInput'), sOut = $('searchResults');
  $('searchBtn').addEventListener('click', function () { openDlg('search'); sInput.value = ''; search(); sInput.focus(); });
  function norm(s) { return s.replace(/[ً-ْ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase(); }
  function search() {
    var q = norm(sInput.value.trim());
    if (!q) { sOut.innerHTML = '<p class="muted pad">اكتب كلمة للبحث.</p>'; return; }
    var html = D.articles.filter(function (x) {
      return norm(x.title + ' ' + x.excerpt + ' ' + x.author + ' ' + x.three.map(function (t) { return t[0]; }).join(' ')).indexOf(q) > -1;
    }).map(articleRow).join('');
    sOut.innerHTML = html || '<p class="muted pad">لا نتائج لـ «' + sInput.value.replace(/[<>&]/g, '') + '».</p>';
  }
  sInput.addEventListener('input', search);
  sOut.addEventListener('click', function (e) { if (e.target.closest('a')) $('dlg-search').close(); });

  /* ---------- المظهر ---------- */
  $('themeToggle').addEventListener('click', function () {
    var root = document.documentElement;
    var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('thalatha-theme', next); } catch (e) {}
  });

  $('year').textContent = ar(new Date().getFullYear());
  route();
})();
