(() => {
  const root = document.documentElement;
  root.classList.remove('no-js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Real refraction only where SVG backdrop filters work ---------- */
  const isChromium = !!(navigator.userAgentData && navigator.userAgentData.brands
    && navigator.userAgentData.brands.some(b => /Chromium/.test(b.brand)));
  if (isChromium && !reduceMotion) root.classList.add('supports-refract');

  /* ---------- Opening hours (Europe/Warsaw) ---------- */
  const HOURS = {
    0: null,          // niedziela
    1: [5, 19], 2: [5, 19], 3: [5, 19], 4: [5, 19], 5: [5, 19],
    6: [6, 14],       // sobota
  };
  const DAY_NAMES = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
  const pad = n => String(n).padStart(2, '0');

  function warsawNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Warsaw', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, minutes: +get('hour') * 60 + +get('minute') };
  }

  function nextOpening(day, minutes) {
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      const h = HOURS[d];
      if (!h) continue;
      if (i === 0 && minutes >= h[0] * 60) continue;
      const when = i === 0 ? 'dziś' : i === 1 ? 'jutro' : `w ${DAY_NAMES[d]}`;
      return `${when} o ${pad(h[0])}:00`;
    }
    return '';
  }

  function updateStatus() {
    const { day, minutes } = warsawNow();
    const h = HOURS[day];
    const open = !!h && minutes >= h[0] * 60 && minutes < h[1] * 60;

    let long, short;
    if (open) {
      const left = h[1] * 60 - minutes;
      long = left <= 60
        ? `Otwarte teraz · zamykamy za ${left} min`
        : `Otwarte teraz · do ${pad(h[1])}:00`;
      short = 'Otwarte';
    } else {
      long = `Zamknięte · otwieramy ${nextOpening(day, minutes)}`;
      short = 'Zamknięte';
    }

    document.querySelectorAll('[data-status]').forEach(el => {
      el.classList.toggle('is-open', open);
      el.classList.toggle('is-closed', !open);
    });
    document.querySelectorAll('[data-status-text]').forEach(el => { el.textContent = long; });
    document.querySelectorAll('[data-status-short]').forEach(el => { el.textContent = short; });
    document.querySelectorAll('[data-hours] li').forEach(li => {
      li.classList.toggle('today', +li.dataset.day === day);
    });
  }
  updateStatus();
  setInterval(updateStatus, 30000);

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- Navigation ---------- */
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobile-menu');

  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    menu.hidden = !open;
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 761px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  const dock = document.querySelector('[data-dock]');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
    // quick-action dock appears once the hero buttons are scrolled away
    if (dock) dock.classList.toggle('show', window.scrollY > 520);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // active link highlight
  const links = [...document.querySelectorAll('.nav-links a')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ---------- Scroll reveal ---------- */
  const reveals = document.querySelectorAll('.reveal');
  const groups = new Map();
  reveals.forEach(el => {
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    el.style.setProperty('--d', `${Math.min(i, 5) * 0.08}s`);
    groups.set(parent, i + 1);
  });
  const revealer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  reveals.forEach(el => revealer.observe(el));

  /* ---------- Word-by-word statement (Apple style) ---------- */
  const statement = document.querySelector('[data-words]');
  if (statement) {
    const highlight = /^(piątej|rano|kanapkami,)$/i;
    const highlightOrange = /^(gorącą|kawą)$/i;
    const words = statement.textContent.trim().split(/\s+/);
    statement.innerHTML = words
      .map(w => `<span class="w${highlight.test(w) ? ' hl' : highlightOrange.test(w) ? ' hl-o' : ''}">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`)
      .join(' ');
    const spans = [...statement.querySelectorAll('.w')];

    const paint = () => {
      const r = statement.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the block's top hits 85% of the viewport, 1 when its bottom reaches 45%
      const start = vh * 0.85;
      const end = vh * 0.45;
      const progress = (start - r.top) / (start - end + r.height);
      const lit = Math.round(Math.max(0, Math.min(1, progress)) * spans.length);
      spans.forEach((s, i) => s.classList.toggle('lit', i < lit));
    };
    if (reduceMotion) spans.forEach(s => s.classList.add('lit'));
    else {
      paint();
      window.addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
      window.addEventListener('resize', paint);
    }
  }

  /* ---------- Hero parallax ---------- */
  const parallax = [...document.querySelectorAll('[data-parallax]')];
  if (!reduceMotion && parallax.length && window.matchMedia('(min-width: 961px)').matches) {
    let ticking = false;
    const move = () => {
      const y = window.scrollY;
      if (y < window.innerHeight * 1.2) {
        parallax.forEach(el => {
          el.style.transform = `translate3d(0, ${y * parseFloat(el.dataset.parallax) * 1.5}px, 0)`;
        });
      }
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(move); ticking = true; }
    }, { passive: true });
  }

  /* ---------- Glass sheen follows the pointer ---------- */
  if (finePointer) {
    document.querySelectorAll('.glass').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
        el.style.setProperty('--sheen', '1');
      });
      el.addEventListener('pointerleave', () => el.style.setProperty('--sheen', '0.6'));
    });

    /* ---------- Tilt on product tiles ---------- */
    if (!reduceMotion) {
      document.querySelectorAll('[data-tilt]').forEach(el => {
        el.addEventListener('pointermove', e => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          el.style.setProperty('--ry', `${x * 6}deg`);
          el.style.setProperty('--rx', `${-y * 6}deg`);
        });
        el.addEventListener('pointerleave', () => {
          el.style.setProperty('--ry', '0deg');
          el.style.setProperty('--rx', '0deg');
        });
      });
    }
  }
})();
