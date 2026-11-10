(function () {
  'use strict';

  var root = document.documentElement;
  var arabic = function (n) {
    return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; });
  };

  /* المظهر: فاتح / داكن */
  var themeBtn = document.getElementById('themeToggle');
  themeBtn.addEventListener('click', function () {
    var current = root.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('thalatha-theme', next); } catch (e) {}
  });

  /* قائمة الجوال */
  var menuBtn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  function closeMenu() {
    nav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* شريط البودكاست */
  var rail = document.getElementById('podcastRail');
  document.querySelectorAll('[data-scroll]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var step = rail.clientWidth * 0.8;
      // في RTL: «التالي» يعني التمرير نحو اليسار (قيمة سالبة)
      rail.scrollBy({ left: btn.dataset.scroll === 'next' ? -step : step, behavior: 'smooth' });
    });
  });

  /* تصفية المقالات */
  var filters = document.querySelectorAll('.filter');
  var posts = document.querySelectorAll('#articleGrid .post');
  filters.forEach(function (f) {
    f.addEventListener('click', function () {
      filters.forEach(function (x) { x.classList.toggle('is-active', x === f); });
      var cat = f.dataset.filter;
      posts.forEach(function (p) {
        p.hidden = cat !== 'all' && p.dataset.cat !== cat;
      });
    });
  });

  /* المشغّل المصغّر (عرض تجريبي بلا صوت) */
  var player = document.getElementById('player');
  var bar = document.getElementById('playerBar');
  var progress = 0;
  var timer = null;
  function tick() {
    progress = (progress + 0.25) % 100;
    bar.style.width = progress + '%';
  }
  function setPlaying(on) {
    player.classList.toggle('paused', !on);
    document.getElementById('playerToggle').setAttribute('aria-label', on ? 'إيقاف مؤقت' : 'تشغيل');
    clearInterval(timer);
    if (on) timer = setInterval(tick, 200);
  }
  document.querySelectorAll('.play-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.getElementById('playerTitle').textContent = btn.dataset.title;
      document.getElementById('playerShow').textContent = btn.dataset.show;
      progress = 0;
      bar.style.width = '0%';
      player.hidden = false;
      setPlaying(true);
    });
  });
  document.getElementById('playerToggle').addEventListener('click', function () {
    setPlaying(player.classList.contains('paused'));
  });
  document.getElementById('playerClose').addEventListener('click', function () {
    setPlaying(false);
    player.hidden = true;
  });

  /* النشرة البريدية */
  var form = document.getElementById('nlForm');
  var msg = document.getElementById('nlMsg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    msg.classList.toggle('err', !ok);
    if (!ok) {
      msg.textContent = 'اكتب بريدًا إلكترونيًا صحيحًا من فضلك.';
      form.email.focus();
      return;
    }
    msg.textContent = 'تم! نلتقي في بريدك يوم الثلاثاء.';
    form.reset();
  });

  /* الظهور عند التمرير + عدّاد الأرقام */
  var revealEls = document.querySelectorAll('.section-head, .show, .post, .film, .stats li, .newsletter, .big-quote');
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    var target = +el.dataset.count;
    var start = null;
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / 1400, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = arabic(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.dataset.count) runCounter(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
    counters.forEach(function (el) { io.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = arabic(el.dataset.count); });
  }

  document.getElementById('year').textContent = arabic(new Date().getFullYear());
})();
