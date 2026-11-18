/* Bold — illustrations + interactions */
(() => {
  const C = {
    ink: "#163A3F", ink2: "#1D454B", terracotta: "#D2683F", orange: "#EE9F27",
    mustard: "#E2AE3B", green: "#456A3F", greenD: "#2F4E2B", cream: "#F2E6DC",
    skin: "#F2C7A3", skin2: "#E3A57F", skinD: "#C98A63", red: "#C9532E", brown: "#5B3424",
    dark: "#1F2B2D", white: "#F6F1EA"
  };

  /* ---------- characters (Personas illustration set, recoloured) ---------- */
  const im = (n, x, y, w, flip = false) =>
    `<image href="img/${n}.svg" x="${x}" y="${y}" width="${w}" height="${w}"${flip ? ` transform="translate(${2 * x + w} 0) scale(-1 1)"` : ""}/>`;
  const svg = (vb, inner, extra = "") =>
    `<svg class="illo" viewBox="${vb}" preserveAspectRatio="xMidYMax meet" ${extra}>${inner}</svg>`;
  const sparkle = (x, y, r, c) =>
    `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${c}"/>`;

  /* ---------- HERO ---------- */
  const heroArt = document.getElementById("heroArt");
  heroArt.innerHTML = svg("0 0 600 560", `
    <circle cx="330" cy="350" r="215" fill="${C.ink2}"/>
    <path class="ribbon" d="M120 540 C40 450 110 330 220 350 C330 370 300 250 380 200 C460 150 480 70 410 45 C340 20 300 110 360 150 C420 190 530 160 540 80"
      fill="none" stroke="${C.orange}" stroke-width="26" stroke-linecap="round"/>
    ${im("hero2", 330, 20, 250, true)}
    ${im("hero1", 40, 120, 300)}
    ${im("hero3", 230, 250, 330, true)}
    ${sparkle(530, 300, 16, C.mustard)} ${sparkle(70, 80, 10, "#fff")}
    <circle cx="30" cy="300" r="4" fill="#fff"/><circle cx="450" cy="20" r="6" fill="${C.mustard}"/>
  `);
  const ribbon = heroArt.querySelector(".ribbon");
  if (ribbon) {
    const L = ribbon.getTotalLength();
    ribbon.style.strokeDasharray = L;
    ribbon.style.strokeDashoffset = L;
    ribbon.getBoundingClientRect();
    ribbon.style.transition = "stroke-dashoffset 2.4s ease";
    requestAnimationFrame(() => (ribbon.style.strokeDashoffset = 0));
  }

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
    { name: "Amber Augustin", role: "Adventurer (ISFP-A)", q: "Bold helped me recognize my strengths and step outside my comfort zone. I'm now living a more fulfilling and adventurous life.", a: "t1", bg: C.cream },
    { name: "Liam Carter", role: "Commander (ENTJ-A)", q: "The Leadership Potential Assessment showed me how I actually lead. My team noticed the difference within weeks.", a: "t2", bg: C.mustard },
    { name: "Sofia Reyes", role: "Mediator (INFP-T)", q: "I always felt too quiet. Bold taught me that my calm is a strength, and now I speak up when it matters.", a: "t3", bg: C.terracotta },
    { name: "Noah Kim", role: "Virtuoso (ISTP-A)", q: "The Risk-Taking Profile pushed me to finally start my own studio. Best decision I've ever made.", a: "t4", bg: C.mustard },
    { name: "Maya Brooks", role: "Campaigner (ENFP-A)", q: "Understanding my personality type changed how I communicate with friends, family and colleagues.", a: "t5", bg: C.green },
    { name: "Omar Hassan", role: "Logistician (ISTJ-A)", q: "Clear, honest insights. Bold gave me a practical plan to grow my confidence step by step.", a: "t6", bg: C.terracotta }
  ];
  const tq = document.getElementById("testiQuote"), ta = document.getElementById("testiAvatar"),
    tn = document.getElementById("testiName"), tr = document.getElementById("testiRole");
  let current = 0;
  const orbits = [...document.querySelectorAll(".orbit")];

  function renderTesti(i) {
    current = i;
    const t = testimonials[i];
    [tq, ta].forEach((el) => (el.style.opacity = 0));
    setTimeout(() => {
      tq.textContent = `"${t.q}"`;
      ta.innerHTML = avatar(t.a, t.bg);
      tn.textContent = t.name;
      tr.textContent = t.role;
      [tq, ta].forEach((el) => (el.style.opacity = 1));
      // orbit buttons show the others
      const others = testimonials.map((_, k) => k).filter((k) => k !== i);
      orbits.forEach((b, k) => {
        b.dataset.i = others[k];
        b.innerHTML = avatar(testimonials[others[k]].a, testimonials[others[k]].bg);
        b.setAttribute("aria-label", "Show testimonial from " + testimonials[others[k]].name);
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
