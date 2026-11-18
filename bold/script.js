/* Bold — illustrations + interactions */
(() => {
  const C = {
    ink: "#163A3F", ink2: "#1D454B", terracotta: "#D2683F", orange: "#EE9F27",
    mustard: "#E2AE3B", green: "#456A3F", greenD: "#2F4E2B", cream: "#F2E6DC",
    skin: "#F2C7A3", skin2: "#E3A57F", skinD: "#C98A63", red: "#C9532E", brown: "#5B3424",
    dark: "#1F2B2D", white: "#F6F1EA"
  };


  /* ---------- language (Arabic / English) ---------- */
  const AR = {
    home: "الرئيسية", types: "أنواع الشخصية", teams: "الفرق", resources: "المصادر", login: "تسجيل الدخول",
    heroTitle: 'نمكّنك من احتضان شخصيتك <span class="pill-avatars"><i class="pa pa-1"></i><i class="pa pa-2">∞</i></span> الفريدة وإطلاق كامل إمكاناتك',
    start: "ابدأ الاختبار", stat1: "اختبار أُجري اليوم", stat2: "نسبة الرضا عن النتائج",
    tag1: "شخصية جريئة", tag2: "اكتشاف الذات", tag3: "النمو الشخصي",
    missionTitle: "مهمتنا أن نقدّم لكل فرد رؤى قيّمة تساعده على فهم شخصيته",
    badge: "اعرف المزيد عنّا • اعرف المزيد عنّا • ",
    about: "من نحن", m1tag: "مهمتنا", m2tag: "خبرتنا", m3tag: "منهجنا",
    m1h: "مهمتنا تمكين الأفراد من احتضان جرأتهم والعيش بأصالة",
    m1p: "نؤمن بأن لكل شخص سمات ونقاط قوة فريدة، وحين يحتضنها تقوده إلى النمو الشخصي والرضا والنجاح.",
    m2h: "بخبرة سنوات طويلة في مجال تطوير الشخصية وتحسين الذات",
    m2p: "يحمل خبراؤنا شهادات عليا في علم النفس، ولديهم تدريب واسع في الكوتشينج والإرشاد.",
    m3h: "في Bold نتبع منهجًا شاملًا يساعد الأفراد على احتضان جرأتهم",
    m3p: "ندرك أن الجرأة تشمل جوانب كثيرة من الحياة، منها طريقة التفكير والتواصل والثقة بالنفس ووضع الأهداف.",
    quote: "«أهلًا بك في Bold، حيث نؤمن بقدرة تفرّدك على تغيير حياتك حين تحتضنه وتعيش بلا خوف»",
    cite: "غيا، رئيستك التنفيذية الجريئة",
    slide1: 'أوصاف الاختبارات: <span class="pill-avatars sm"><i class="pa pa-1"></i><i class="pa pa-2">∞</i></span> اكتشف نمط شخصيتك، واختبار التوافق في العلاقات، واختبار الميول المهنية.',
    slide2: "تقييم القدرات القيادية: اكتشف كيف تُلهم من حولك وتتخذ قراراتك وتوجّه الآخرين.",
    slide3: "ملف المخاطرة: افهم مدى ارتياحك مع الغموض والخطوات الجريئة.",
    readMore: "اقرأ المزيد",
    traitsTitle: "نؤمن بأن الجرأة تضم مجموعة من الصفات المميزة التي تشكّل الإنسان وتمنحه القوة",
    traitsP: "هذه السمات لا تقتصر على تعريف واحد، بل تشكّل طيفًا غنيًا من الصفات التي تقود عند احتضانها إلى النمو الشخصي والمرونة والنجاح.",
    download: "حمّل التطبيق", boldTraits: "سمات الجرأة",
    t1: "الثقة", t2: "المثابرة", t3: "الحزم", t4: "عقلية النمو", t5: "المخاطرة", t6: "الأصالة",
    testimonial: "آراء العملاء",
    ctaTitle: "هل أنت مستعد لاكتشاف جرأتك واحتضان إمكاناتك الحقيقية؟",
    footTitle: "خُض تقييم شخصية Bold، وتقييم القدرات القيادية، وملف المخاطرة",
    credit: 'رسومات الشخصيات: <a href="https://personas.draftbit.com/" target="_blank" rel="noopener">Personas by Draftbit</a> (CC BY 4.0) بعد إعادة تلوينها.'
  };
  const META = {
    ar: { title: "Bold — احتضن شخصيتك", desc: "يساعدك Bold على اكتشاف شخصيتك واحتضان تفرّدك وإطلاق كامل إمكاناتك." },
    en: { title: "Bold — Embrace Your Personality", desc: "Bold helps you discover your personality, embrace your uniqueness and unleash your full potential." }
  };
  const EN = {};
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if (!(el.dataset.i18n in EN)) EN[el.dataset.i18n] = el.innerHTML;
  });
  const params = new URLSearchParams(location.search);
  let lang = params.get("lang");
  if (!lang) { try { lang = localStorage.getItem("bold-lang"); } catch (e) {} }
  if (lang !== "en" && lang !== "ar") lang = "ar";

  function applyLang(l) {
    lang = l;
    const dict = l === "ar" ? AR : EN;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = dict[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    const tp = document.querySelector(".spin-badge textPath");
    if (tp) { if (l === "ar") { tp.removeAttribute("textLength"); tp.removeAttribute("lengthAdjust"); } else { tp.setAttribute("textLength", "222"); tp.setAttribute("lengthAdjust", "spacing"); } }
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.title = META[l].title;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.content = META[l].desc;
    document.getElementById("langLabel").textContent = l === "ar" ? "EN" : "ع";
    document.getElementById("langBtn").setAttribute("aria-label", l === "ar" ? "Switch to English" : "التبديل إلى العربية");
    try { localStorage.setItem("bold-lang", l); } catch (e) {}
  }
  applyLang(lang);
  document.getElementById("langBtn").addEventListener("click", () => {
    applyLang(lang === "ar" ? "en" : "ar");
    renderTesti(current);
    setHero(lang);
  });

  /* ---------- characters (Personas illustration set, recoloured) ---------- */
  const im = (n, x, y, w, flip = false) =>
    `<image href="img/${n}.svg" x="${x}" y="${y}" width="${w}" height="${w}"${flip ? ` transform="translate(${2 * x + w} 0) scale(-1 1)"` : ""}/>`;
  const svg = (vb, inner, extra = "") =>
    `<svg class="illo" viewBox="${vb}" preserveAspectRatio="xMidYMax meet" ${extra}>${inner}</svg>`;
  const sparkle = (x, y, r, c) =>
    `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${c}"/>`;

  /* ---------- HERO (AI illustration, one per language) ---------- */
  const HERO_ALT = {
    en: "Three friends relaxing together around an orange infinity ribbon",
    ar: "ثلاثة أصدقاء يجلسون معًا حول شريط برتقالي على شكل علامة اللانهاية"
  };
  function setHero(l) {
    const art = document.getElementById("heroArt");
    let img = art.querySelector("img");
    if (!img) {
      art.innerHTML = '<img class="hero-img" width="1254" height="1254" fetchpriority="high">';
      img = art.querySelector("img");
      img.addEventListener("load", () => img.classList.add("loaded"));
    }
    img.classList.remove("loaded");
    img.src = `img/hero-${l}.webp`;
    img.alt = HERO_ALT[l];
    if (img.complete) img.classList.add("loaded");
  }
  setHero(lang);
  // preload the other language so switching is instant
  new Image().src = `img/hero-${lang === "ar" ? "en" : "ar"}.webp`;

  /* ---------- people in cards ---------- */
  const people = {
    mission: svg("0 0 300 300", `<circle cx="150" cy="170" r="110" fill="#000" opacity=".07"/>${im("mission", 25, 50, 250)}`),
    expertise: svg("0 0 300 300", `<circle cx="150" cy="170" r="110" fill="#fff" opacity=".18"/>${im("expertise", 25, 50, 250)}${sparkle(240, 80, 14, "#fff")}`),
    approach: svg("0 0 300 300", `<circle cx="150" cy="170" r="110" fill="#000" opacity=".1"/>${im("approach", 25, 50, 250)}${sparkle(60, 90, 12, C.mustard)}`),
    ceo: svg("0 0 220 240", im("ceo", 0, 10, 230)),
    cap: svg("0 0 220 240", im("capguy", 0, 20, 220, true))
  };
  document.querySelectorAll("[data-person]").forEach((el) => {
    el.insertAdjacentHTML("afterbegin", people[el.dataset.person] || "");
  });

  /* ---------- duo (types section) ---------- */
  document.getElementById("hifive").innerHTML = svg("0 0 800 440", `
    <path d="M400 220 C330 90 170 90 170 220 C170 350 330 350 400 220 C470 90 630 90 630 220 C630 350 470 350 400 220Z"
      fill="none" stroke="${C.green}" stroke-width="34" opacity=".8"/>
    <circle cx="400" cy="320" r="200" fill="${C.ink2}" opacity=".7"/>
    ${im("five1", 140, 130, 310)}
    ${im("five2", 350, 130, 310, true)}
    ${sparkle(400, 110, 22, C.mustard)} ${sparkle(350, 70, 10, "#fff")} ${sparkle(455, 75, 12, C.orange)}
    <circle cx="80" cy="60" r="5" fill="${C.mustard}"/><circle cx="740" cy="80" r="4" fill="#fff"/>
  `, 'preserveAspectRatio="xMidYMax slice"');

  /* ---------- lounge ---------- */
  document.getElementById("lounge").innerHTML = svg("0 0 420 300", `${im("lounge", 140, 0, 300)}${sparkle(380, 60, 14, C.mustard)}`);

  /* ---------- footer person ---------- */
  document.getElementById("footPerson").innerHTML = svg("0 0 260 190", `${im("footer", 20, 0, 190)}${sparkle(225, 50, 14, C.mustard)}${sparkle(200, 110, 8, "#fff")}`);

  /* ---------- testimonials ---------- */
  const avatar = (n, bg) => `<div style="background:${bg}"><img src="img/${n}.svg" alt="" style="width:100%;height:100%;display:block;transform:translateY(8%)"></div>`;
  const testimonials = [
    { name: "Amber Augustin", role: "Adventurer (ISFP-A)", q: "Bold helped me recognize my strengths and step outside my comfort zone. I'm now living a more fulfilling and adventurous life.", a: "t1", ar: { name: "أمبر أوغستين", role: "المغامر (ISFP-A)", q: "ساعدني Bold على اكتشاف نقاط قوتي والخروج من منطقة راحتي، وأعيش الآن حياة أكثر رضا ومغامرة." }, bg: C.cream },
    { name: "Liam Carter", role: "Commander (ENTJ-A)", q: "The Leadership Potential Assessment showed me how I actually lead. My team noticed the difference within weeks.", a: "t2", ar: { name: "ليام كارتر", role: "القائد (ENTJ-A)", q: "أظهر لي تقييم القدرات القيادية كيف أقود فعلًا، ولاحظ فريقي الفرق خلال أسابيع." }, bg: C.mustard },
    { name: "Sofia Reyes", role: "Mediator (INFP-T)", q: "I always felt too quiet. Bold taught me that my calm is a strength, and now I speak up when it matters.", a: "t3", ar: { name: "صوفيا رييس", role: "الوسيط (INFP-T)", q: "كنت أظن أنني هادئة أكثر من اللازم، فعلّمني Bold أن هدوئي نقطة قوة، وصرت أتكلم حين يلزم الأمر." }, bg: C.terracotta },
    { name: "Noah Kim", role: "Virtuoso (ISTP-A)", q: "The Risk-Taking Profile pushed me to finally start my own studio. Best decision I've ever made.", a: "t4", ar: { name: "نوح كيم", role: "الفنان الماهر (ISTP-A)", q: "دفعني ملف المخاطرة لأبدأ أخيرًا الاستوديو الخاص بي، وكان أفضل قرار اتخذته." }, bg: C.mustard },
    { name: "Maya Brooks", role: "Campaigner (ENFP-A)", q: "Understanding my personality type changed how I communicate with friends, family and colleagues.", a: "t5", ar: { name: "مايا بروكس", role: "الناشط (ENFP-A)", q: "فهمُ نمط شخصيتي غيّر طريقة تواصلي مع أصدقائي وعائلتي وزملائي." }, bg: C.green },
    { name: "Omar Hassan", role: "Logistician (ISTJ-A)", q: "Clear, honest insights. Bold gave me a practical plan to grow my confidence step by step.", a: "t6", ar: { name: "عمر حسن", role: "اللوجستي (ISTJ-A)", q: "رؤى واضحة وصادقة، وأعطاني Bold خطة عملية لأبني ثقتي خطوة بخطوة." }, bg: C.terracotta }
  ];
  const tq = document.getElementById("testiQuote"), ta = document.getElementById("testiAvatar"),
    tn = document.getElementById("testiName"), tr = document.getElementById("testiRole");
  let current = 0;
  const orbits = [...document.querySelectorAll(".orbit")];

  function renderTesti(i) {
    current = i;
    const t = lang === "ar" ? Object.assign({}, testimonials[i], testimonials[i].ar) : testimonials[i];
    [tq, ta].forEach((el) => (el.style.opacity = 0));
    setTimeout(() => {
      tq.textContent = lang === "ar" ? `«${t.q}»` : `"${t.q}"`;
      ta.innerHTML = avatar(t.a, t.bg);
      tn.textContent = t.name;
      tr.textContent = t.role;
      [tq, ta].forEach((el) => (el.style.opacity = 1));
      // orbit buttons show the others
      const others = testimonials.map((_, k) => k).filter((k) => k !== i);
      orbits.forEach((b, k) => {
        b.dataset.i = others[k];
        b.innerHTML = avatar(testimonials[others[k]].a, testimonials[others[k]].bg);
        b.setAttribute("aria-label", (lang === "ar" ? "عرض رأي " + testimonials[others[k]].ar.name : "Show testimonial from " + testimonials[others[k]].name));
      });
    }, 250);
  }
  renderTesti(0);
  orbits.forEach((b) => b.addEventListener("click", () => { renderTesti(+b.dataset.i); restartTesti(); }));
  let testiTimer;
  const restartTesti = () => { clearInterval(testiTimer); testiTimer = setInterval(() => renderTesti((current + 1) % testimonials.length), 7000); };
  restartTesti();

  /* ---------- personality types slider ---------- */
  const slides = [...document.querySelectorAll(".types-slide")];
  const dots = [...document.querySelectorAll("#slideDots button")];
  let si = 0;
  const showSlide = (i) => {
    si = i;
    slides.forEach((s, k) => s.classList.toggle("active", k === i));
    dots.forEach((d, k) => d.classList.toggle("on", k === i));
  };
  dots.forEach((d, k) => d.addEventListener("click", () => showSlide(k)));
  setInterval(() => showSlide((si + 1) % slides.length), 5000);

  /* ---------- mobile menu ---------- */
  const burger = document.getElementById("burger"), links = document.getElementById("navLinks");
  burger.addEventListener("click", () => { burger.classList.toggle("open"); links.classList.toggle("open"); });
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { burger.classList.remove("open"); links.classList.remove("open"); }));

  /* ---------- reveal + counters ---------- */
  const countUp = (el) => {
    const end = +el.dataset.count, suf = el.dataset.suffix || "", t0 = performance.now();
    const step = (t) => {
      const k = Math.min((t - t0) / 1600, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.querySelectorAll("[data-count]").forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
