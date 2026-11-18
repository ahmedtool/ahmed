/* Bold — illustrations + interactions */
(() => {
  const C = {
    ink: "#163A3F", ink2: "#1D454B", terracotta: "#D2683F", orange: "#EE9F27",
    mustard: "#E2AE3B", green: "#456A3F", greenD: "#2F4E2B", cream: "#F2E6DC",
    skin: "#F2C7A3", skin2: "#E3A57F", skinD: "#C98A63", red: "#C9532E", brown: "#5B3424",
    dark: "#1F2B2D", white: "#F6F1EA"
  };

  /* ---------- character builder (flat, grainy busts) ---------- */
  function bust(o = {}) {
    const p = Object.assign({
      x: 0, y: 0, s: 1, flip: false, skin: C.skin, shade: C.skin2,
      hair: C.brown, style: "short", shirt: C.mustard, collar: null,
      stripe: null, cap: null, hand: false, tilt: 0
    }, o);
    const tx = p.flip ? p.x + 200 * p.s : p.x;
    const sx = p.flip ? -p.s : p.s;
    let g = `<g transform="translate(${tx} ${p.y}) scale(${sx} ${p.s}) rotate(${p.tilt} 100 150)">`;

    // hair behind
    if (p.style === "long")
      g += `<path d="M60 78 C44 150 34 205 58 240 L150 240 C168 200 158 140 140 78Z" fill="${p.hair}"/>`;
    if (p.style === "wavy")
      g += `<path d="M62 80 C40 120 58 150 44 180 C60 200 90 190 96 170 L140 160 C160 140 150 100 140 78Z" fill="${p.hair}"/>`;
    if (p.style === "bun") g += `<circle cx="100" cy="42" r="15" fill="${p.hair}"/>`;

    // body
    g += `<path d="M18 240 C20 176 55 150 100 150 C145 150 180 176 182 240Z" fill="${p.shirt}"/>`;
    g += `<path d="M100 150 C145 150 180 176 182 240 L120 240 C128 200 118 170 100 150Z" fill="#000" opacity=".1"/>`;
    if (p.stripe)
      g += `<path d="M66 154 L100 206 L134 154" fill="none" stroke="${p.stripe}" stroke-width="11" stroke-linejoin="round"/>`;

    // neck
    g += `<path d="M87 112 h26 v40 c0 10 -26 10 -26 0Z" fill="${p.shade}"/>`;
    if (p.collar)
      g += `<path d="M76 148 L100 172 L124 148 L114 142 L100 160 L86 142Z" fill="${p.collar}"/>`;

    // head
    g += `<circle cx="70" cy="94" r="7" fill="${p.shade}"/><circle cx="130" cy="94" r="7" fill="${p.shade}"/>`;
    g += `<ellipse cx="100" cy="88" rx="30" ry="36" fill="${p.skin}"/>`;

    // face
    g += `<path d="M84 84 q5 -4 10 0 M106 84 q5 -4 10 0" stroke="${C.dark}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    g += `<circle cx="89" cy="93" r="2.8" fill="${C.dark}"/><circle cx="111" cy="93" r="2.8" fill="${C.dark}"/>`;
    g += `<path d="M100 96 q-4 8 1 9" stroke="${p.shade}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    g += `<path d="M91 110 Q100 117 109 110" stroke="${C.dark}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    g += `<circle cx="81" cy="104" r="5" fill="${C.terracotta}" opacity=".35"/><circle cx="119" cy="104" r="5" fill="${C.terracotta}" opacity=".35"/>`;

    // hair front
    const fronts = {
      short: `<path d="M67 86 C62 46 96 36 114 46 C132 46 140 66 133 86 C128 68 114 60 100 64 C86 68 74 70 67 86Z" fill="${p.hair}"/>`,
      long: `<path d="M64 98 C58 50 92 40 110 46 C134 50 142 78 136 104 C130 78 116 62 98 60 C84 66 74 78 64 98Z" fill="${p.hair}"/>`,
      wavy: `<path d="M64 96 C56 52 92 38 112 46 C134 52 140 74 134 92 C120 76 98 70 84 62 C78 74 70 84 64 96Z" fill="${p.hair}"/>`,
      bun: `<path d="M68 86 C64 52 96 44 112 50 C130 54 138 70 132 86 C124 66 110 58 96 62 C84 64 74 72 68 86Z" fill="${p.hair}"/>`
    };
    g += fronts[p.style] || fronts.short;
    if (p.cap) {
      g += `<path d="M66 76 C64 42 136 42 134 76Z" fill="${p.cap}"/>`;
      g += `<path d="M96 74 L156 70 C156 80 124 84 96 80Z" fill="${p.cap}"/>`;
      g += `<path d="M66 76 C64 42 136 42 134 76Z" fill="#000" opacity=".08"/>`;
    }

    // hand on chin
    if (p.hand) {
      g += `<path d="M168 240 C166 196 150 160 128 132 L114 140 C126 170 138 204 136 240Z" fill="${p.shirt}"/>`;
      g += `<path d="M168 240 C166 196 150 160 128 132 L114 140 C126 170 138 204 136 240Z" fill="#000" opacity=".12"/>`;
      g += `<ellipse cx="120" cy="124" rx="13" ry="16" fill="${p.skin}" transform="rotate(-20 120 124)"/>`;
    }
    return g + `</g>`;
  }

  const svg = (vb, inner, extra = "") =>
    `<svg class="illo" viewBox="${vb}" preserveAspectRatio="xMidYMax meet" ${extra}>${inner}</svg>`;

  /* ---------- HERO ---------- */
  const heroArt = document.getElementById("heroArt");
  heroArt.innerHTML = svg("0 0 600 560", `
    <circle cx="330" cy="340" r="210" fill="${C.ink2}"/>
    <path class="ribbon" d="M170 520 C60 450 120 330 230 360 C340 390 300 250 380 200 C460 150 470 60 400 40 C330 20 300 110 360 150 C420 190 520 160 520 90"
      fill="none" stroke="${C.orange}" stroke-width="26" stroke-linecap="round"/>
    ${bust({ x: 330, y: 20, s: 1.18, shirt: C.green, hair: C.brown, cap: C.orange, stripe: C.mustard, style: "short", flip: true })}
    ${bust({ x: 110, y: 90, s: 1.25, shirt: C.mustard, hair: C.terracotta, collar: C.terracotta, hand: true })}
    ${bust({ x: 250, y: 260, s: 1.2, shirt: C.white, hair: C.red, style: "long", flip: true, tilt: -8 })}
    <path d="M330 545 C390 520 470 520 560 548" stroke="${C.ink}" stroke-width="60" fill="none" stroke-linecap="round"/>
    <circle cx="80" cy="70" r="5" fill="#fff"/><circle cx="560" cy="300" r="5" fill="${C.mustard}"/>
    <circle cx="30" cy="300" r="4" fill="#fff"/><circle cx="430" cy="20" r="6" fill="${C.mustard}"/>
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
    mission: svg("0 0 300 300", bust({ x: 40, y: 60, s: 1.15, shirt: C.terracotta, collar: C.mustard, hair: C.dark, hand: true })),
    expertise: svg("0 0 300 300", `
      ${bust({ x: 40, y: 50, s: 1.1, shirt: C.green, hair: C.red, style: "wavy", stripe: C.mustard })}
      <rect x="0" y="262" width="300" height="38" fill="${C.terracotta}"/>
      <rect x="0" y="262" width="300" height="8" fill="${C.brown}" opacity=".5"/>`),
    approach: svg("0 0 300 300", `
      ${bust({ x: 40, y: 50, s: 1.15, shirt: C.ink, hair: C.dark, style: "long", stripe: C.mustard, hand: true })}
      <path d="M0 270 C80 240 180 250 300 236 L300 300 L0 300Z" fill="${C.white}"/>
      <path d="M0 280 C80 252 180 262 300 250" stroke="${C.mustard}" stroke-width="7" fill="none"/>`),
    ceo: svg("0 0 220 240", bust({ x: 10, y: 0, s: 1.05, shirt: C.white, hair: C.terracotta, style: "long", tilt: -6 })),
    cap: svg("0 0 220 240", bust({ x: 15, y: 10, s: 1.0, shirt: C.green, hair: C.brown, cap: C.mustard, stripe: C.orange, flip: true }))
  };
  document.querySelectorAll("[data-person]").forEach((el) => {
    el.insertAdjacentHTML("afterbegin", people[el.dataset.person] || "");
  });

  /* ---------- high five ---------- */
  document.getElementById("hifive").innerHTML = svg("0 0 800 440", `
    <path d="M400 220 C330 90 170 90 170 220 C170 350 330 350 400 220 C470 90 630 90 630 220 C630 350 470 350 400 220Z"
      fill="none" stroke="${C.green}" stroke-width="34" opacity=".75"/>
    <circle cx="400" cy="300" r="190" fill="${C.ink2}" opacity=".7"/>
    <path d="M300 340 C330 260 360 180 380 120" stroke="${C.white}" stroke-width="40" stroke-linecap="round" fill="none"/>
    <path d="M500 340 C470 260 440 180 420 120" stroke="${C.orange}" stroke-width="40" stroke-linecap="round" fill="none"/>
    <ellipse cx="384" cy="104" rx="20" ry="26" fill="${C.skin}"/>
    <ellipse cx="416" cy="104" rx="20" ry="26" fill="${C.skin2}"/>
    ${bust({ x: 150, y: 150, s: 1.25, shirt: C.white, hair: C.terracotta, collar: C.green })}
    ${bust({ x: 400, y: 150, s: 1.25, shirt: C.orange, hair: C.dark, cap: C.ink2, collar: C.white, flip: true })}
    <circle cx="80" cy="60" r="5" fill="${C.mustard}"/><circle cx="740" cy="80" r="4" fill="#fff"/>
  `, 'preserveAspectRatio="xMidYMid slice"');

  /* ---------- lounge (reclining woman) ---------- */
  document.getElementById("lounge").innerHTML = svg("0 0 420 300", `
    <g transform="rotate(-8 200 240)">
      <rect x="20" y="210" width="260" height="56" rx="28" fill="${C.white}"/>
      <path d="M40 222 H260 M40 238 H260 M40 254 H260" stroke="${C.mustard}" stroke-width="5"/>
      <ellipse cx="34" cy="250" rx="30" ry="18" fill="${C.ink}"/>
    </g>
    ${bust({ x: 210, y: 30, s: 1.05, shirt: C.ink, hair: C.dark, style: "long", stripe: C.mustard, hand: true, tilt: 10 })}
  `);

  /* ---------- footer person ---------- */
  document.getElementById("footPerson").innerHTML = svg("0 0 260 190", `
    <path d="M150 170 C190 150 220 120 250 110" stroke="${C.mustard}" stroke-width="30" stroke-linecap="round" fill="none"/>
    <circle cx="252" cy="108" r="14" fill="${C.skin}"/>
    ${bust({ x: 40, y: 10, s: 0.95, shirt: C.mustard, hair: C.terracotta, collar: C.terracotta })}
  `);

  /* ---------- testimonials ---------- */
  const avatar = (o, bg) => `<div>${svg("0 0 200 200", `<rect width="200" height="200" fill="${bg}"/>${bust(Object.assign({ x: 10, y: 10, s: 0.95 }, o))}`)}</div>`;
  const testimonials = [
    { name: "Amber Augustin", role: "Adventurer (ISFP-A)", q: "Bold helped me recognize my strengths and step outside my comfort zone. I'm now living a more fulfilling and adventurous life.", a: { shirt: C.white, hair: C.terracotta, style: "long" }, bg: C.cream },
    { name: "Liam Carter", role: "Commander (ENTJ-A)", q: "The Leadership Potential Assessment showed me how I actually lead. My team noticed the difference within weeks.", a: { shirt: C.terracotta, hair: C.dark, collar: C.mustard }, bg: C.mustard },
    { name: "Sofia Reyes", role: "Mediator (INFP-T)", q: "I always felt too quiet. Bold taught me that my calm is a strength, and now I speak up when it matters.", a: { shirt: C.green, hair: C.red, style: "wavy" }, bg: C.terracotta },
    { name: "Noah Kim", role: "Virtuoso (ISTP-A)", q: "The Risk-Taking Profile pushed me to finally start my own studio. Best decision I've ever made.", a: { shirt: C.orange, hair: C.brown, cap: C.ink2 }, bg: C.mustard },
    { name: "Maya Brooks", role: "Campaigner (ENFP-A)", q: "Understanding my personality type changed how I communicate with friends, family and colleagues.", a: { shirt: C.ink, hair: C.dark, style: "long", stripe: C.mustard }, bg: C.green },
    { name: "Omar Hassan", role: "Logistician (ISTJ-A)", q: "Clear, honest insights. Bold gave me a practical plan to grow my confidence step by step.", a: { shirt: C.mustard, hair: C.dark, style: "bun" }, bg: C.terracotta }
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
