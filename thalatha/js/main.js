(function () {
  'use strict';

  var D = window.DATA;
  var app = document.getElementById('app');
  var $ = function (id) { return document.getElementById(id); };
  var by = function (list, id) { return list.filter(function (x) { return x.id === id; })[0]; };
  var ar = function (n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); };

  /* ---------- رسومات مولّدة (بلا صور خارجية) ---------- */
  var TONES = [
    ['#0b6b4f', '#f2c94c'], ['#2747d8', '#e9a8c0'], ['#e8672b', '#111111'],
    ['#111111', '#0b6b4f'], ['#f2c94c', '#e8672b'], ['#e9c9c2', '#2747d8'], ['#dfe6c8', '#0b6b4f']
  ];
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function artStyle(seed) {
    var h = hash(seed), t = TONES[h % TONES.length];
    var x = 15 + (h >> 3) % 70, y = 15 + (h >> 7) % 70, r = 28 + (h >> 11) % 30;
    return 'background:radial-gradient(circle at ' + x + '% ' + y + '%,' + t[1] + ' 0 ' + r + '%,transparent ' + (r + 0.5) + '%),' + t[0];
  }
  function thumb(seed, cls) { return '<span class="thumb ' + (cls || '') + '" style="' + artStyle(seed) + '" aria-hidden="true"></span>'; }
  function avatar(name) {
    var dark = ['#0b6b4f', '#2747d8', '#e8672b', '#111111', '#8a3b6b'];
    var t = [dark[hash(name) % dark.length]];
    return '<span class="avatar" style="background:' + t[0] + '" aria-hidden="true">' + name.replace(/^د\. /, '').charAt(0) + '</span>';
  }
  function cover(item, href) {
    return '<a class="cover" href="' + href + '" style="background:' + item.bg + ';color:' + item.fg + '" aria-label="' + item.name + '">' +
      '<span>' + item.word.replace('\n', '<br>') + '</span></a>';
  }

  /* ---------- مكوّنات ---------- */
  function meta(a) {
    var nl = by(D.newsletters, a.nl);
    return '<p class="meta">في <a href="#/n/' + nl.id + '">' + nl.name + '</a> من <b>٣</b> · ' + a.date + '</p>';
  }
  function articleRow(a) {
    return '<article class="row">' + thumb(a.id) +
      '<div class="row-body">' +
      '<h3><a href="#/a/' + a.id + '">' + a.title + '</a></h3>' +
      '<p class="excerpt">' + a.excerpt + '</p>' +
      '<p class="author">' + avatar(a.author) + a.author + '</p>' + meta(a) +
      '</div></article>';
  }
  function episodeRow(e) {
    var s = by(D.shows, e.show);
    return '<article class="row">' +
      '<button class="thumb thumb-play" type="button" data-play="' + e.id + '" style="background:' + s.bg + ';color:' + s.fg + '" aria-label="تشغيل: ' + e.title + '">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></button>' +
      '<div class="row-body">' +
      '<h3><button class="linklike" type="button" data-play="' + e.id + '">' + e.title + '</button></h3>' +
      '<p class="excerpt">' + e.excerpt + '</p>' +
      '<p class="meta">في <a href="#/radio">' + s.name + '</a> من <b>٣</b> · ' + e.date + ' · ' + ar(e.min) + ' دقيقة</p>' +
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
    mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z M6 11v1a6 6 0 0 0 12 0v-1 M12 18v3"/>',
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
  function covers(items, base) {
    return '<div class="covers">' + items.map(function (i) { return cover(i, base ? base + i.id : '#/radio'); }).join('') + '</div>';
  }
  function lead(a) {
    return '<article class="lead">' +
      '<a class="lead-art" href="#/a/' + a.id + '" style="' + artStyle(a.id) + '" aria-hidden="true" tabindex="-1"></a>' +
      '<h1><a href="#/a/' + a.id + '">' + a.title + '</a></h1>' +
      '<p class="lead-excerpt">' + a.excerpt + '</p>' +
      '<p class="author">' + avatar(a.author) + a.author + '</p>' + meta(a) + '</article>';
  }

  /* ---------- الصفحات ---------- */
  var moreShown = 6;
  var views = {
    home: function () {
      var A = D.articles;
      return '<div class="home-top">' +
        '<a class="banner" href="#/radio">' +
        '<span class="banner-kicker">الإذاعة · موسم جديد</span>' +
        '<strong>أفضل طريقة لتسمع<br>ما لا يُقال في العناوين</strong>' +
        '<span class="banner-cta">استمع الآن</span>' +
        '<span class="banner-num" aria-hidden="true">٣</span></a>' +
        list(A.slice(0, 3), articleRow) + '</div>' +
        section('mic', 'الحلقات الجديدة', '#/radio', list(D.episodes.slice(0, 2), episodeRow) + covers(D.shows)) +
        section('mail', 'نشرات بريدية مميّزة', null, covers(D.newsletters, '#/n/')) +
        section('video', 'جديد البرامج', '#/programs', '<div class="videos">' + D.programs.slice(0, 3).map(programCard).join('') + '</div>') +
        section('text', 'المقالات الجديدة', '#/articles', list(A.slice(3, 9), articleRow) +
          '<div class="center"><a class="btn btn-line" href="#/articles">المزيد</a></div>');
    },
    articles: function () {
      var A = D.articles, rest = A.slice(5, 5 + moreShown);
      return lead(A[0]) + list(A.slice(1, 5), articleRow) +
        section('mail', 'نشرات بريدية مميّزة', null, covers(D.newsletters, '#/n/')) +
        '<section class="sec">' + list(rest, articleRow) +
        (5 + moreShown < A.length ? '<div class="center"><button class="btn btn-line" type="button" id="loadMore">المزيد</button></div>' : '') +
        '</section>';
    },
    radio: function () {
      return '<h1 class="page-title">الإذاعة</h1><p class="page-sub">برامج صوتية تُسمع على مهل.</p>' +
        covers(D.shows) + section('mic', 'الحلقات الجديدة', null, list(D.episodes, episodeRow));
    },
    programs: function () {
      return '<h1 class="page-title">البرامج</h1><p class="page-sub">حوارات ووثائقيات مرئية.</p>' +
        '<div class="videos">' + D.programs.map(programCard).join('') + '</div>';
    },
    n: function (id) {
      var nl = by(D.newsletters, id);
      if (!nl) return views.notFound();
      var items = D.articles.filter(function (a) { return a.nl === id; });
      return '<div class="nl-hero"><div class="cover" style="background:' + nl.bg + ';color:' + nl.fg + '"><span>' + nl.word.replace('\n', '<br>') + '</span></div>' +
        '<div><h1 class="page-title">' + nl.name + '</h1><p class="page-sub">' + nl.desc + '</p>' +
        '<button class="btn btn-dark" type="button" data-open="subscribe"><span class="badge"></span>اشترك في النشرة</button></div></div>' +
        section('text', 'أعداد النشرة', null, list(items, articleRow));
    },
    a: function (id) {
      var a = by(D.articles, id);
      if (!a) return views.notFound();
      var nl = by(D.newsletters, a.nl);
      var body = (a.body || [a.excerpt].concat(D.filler)).map(function (p) {
        return p.indexOf('## ') === 0 ? '<h2>' + p.slice(3) + '</h2>' : '<p>' + p + '</p>';
      }).join('');
      var others = D.articles.filter(function (x) { return x.id !== id && x.nl === a.nl; })
        .concat(D.articles.filter(function (x) { return x.id !== id && x.nl !== a.nl; })).slice(0, 4);
      return '<article class="article">' +
        '<h1>' + a.title + '</h1>' +
        '<p class="lead-excerpt">' + a.excerpt + '</p>' +
        '<p class="author">' + avatar(a.author) + a.author + '</p>' +
        '<p class="meta">في <a href="#/n/' + nl.id + '">' + nl.name + '</a> من <b>٣</b> · ' + a.date + ' · ' + ar(a.min) + ' دقائق قراءة</p>' +
        '<div class="article-art" style="' + artStyle(a.id) + '" aria-hidden="true"></div>' +
        '<div class="prose">' + body + '</div>' +
        '<aside class="nl-box"><div class="cover" style="background:' + nl.bg + ';color:' + nl.fg + '"><span>' + nl.word.replace('\n', '<br>') + '</span></div>' +
        '<div><strong>' + nl.name + '</strong><p>' + nl.desc + '</p>' +
        '<button class="btn btn-dark" type="button" data-open="subscribe"><span class="badge"></span>اشترك</button></div></aside>' +
        '</article>' + section('text', 'اقرأ أيضًا', '#/articles', list(others, articleRow));
    },
    notFound: function () {
      return '<div class="empty"><h1 class="page-title">الصفحة غير موجودة</h1><a class="btn btn-line" href="#/">العودة للرئيسية</a></div>';
    }
  };

  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var name = parts[0] || 'home';
    var view = views[name] && name !== 'notFound' ? name : 'notFound';
    app.innerHTML = views[view](parts[1]);
    var tab = view === 'a' || view === 'n' ? 'articles' : view;
    document.querySelectorAll('.tabs a').forEach(function (t) {
      if (t.dataset.tab === tab) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    var art = view === 'a' && by(D.articles, parts[1]);
    document.title = art ? art.title + ' — ٣' : '٣';
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------- النوافذ ---------- */
  function openDlg(name) {
    var d = $('dlg-' + name);
    if (d && !d.open) d.showModal();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-close],[data-play],#loadMore');
    if (!t) {
      if (e.target.tagName === 'DIALOG') e.target.close();
      return;
    }
    if (t.dataset.open) openDlg(t.dataset.open);
    else if (t.hasAttribute('data-close')) t.closest('dialog').close();
    else if (t.dataset.play) play(t.dataset.play);
    else if (t.id === 'loadMore') { moreShown += 6; route(); }
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
    var hit = function (x) { return norm(x.title + ' ' + x.excerpt + ' ' + (x.author || '')).indexOf(q) > -1; };
    var html = D.articles.filter(hit).map(articleRow).join('') + D.episodes.filter(hit).map(episodeRow).join('');
    sOut.innerHTML = html || '<p class="muted pad">لا نتائج لـ «' + sInput.value.replace(/[<>&]/g, '') + '».</p>';
  }
  sInput.addEventListener('input', search);
  sOut.addEventListener('click', function (e) { if (e.target.closest('a,[data-play]')) $('dlg-search').close(); });

  /* ---------- المشغّل (تجريبي بلا صوت) ---------- */
  var player = $('player'), bar = $('playerBar'), progress = 0, timer = null;
  function setPlaying(on) {
    player.classList.toggle('paused', !on);
    $('playerToggle').setAttribute('aria-label', on ? 'إيقاف مؤقت' : 'تشغيل');
    clearInterval(timer);
    if (on) timer = setInterval(function () { progress = (progress + 0.25) % 100; bar.style.width = progress + '%'; }, 200);
  }
  function play(id) {
    var e = by(D.episodes, id), s = by(D.shows, e.show);
    $('playerTitle').textContent = e.title;
    $('playerShow').textContent = s.name;
    $('playerArt').style.cssText = 'background:' + s.bg + ';color:' + s.fg;
    $('playerArt').textContent = '٣';
    progress = 0; bar.style.width = '0%';
    player.hidden = false;
    setPlaying(true);
  }
  $('playerToggle').addEventListener('click', function () { setPlaying(player.classList.contains('paused')); });
  $('playerClose').addEventListener('click', function () { setPlaying(false); player.hidden = true; });

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
