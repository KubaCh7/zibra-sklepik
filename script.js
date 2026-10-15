(() => {
  const root = document.documentElement;
  root.classList.remove('no-js');

  /* ---------- Always start at the top on load / refresh ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Real refraction only where SVG backdrop filters work ---------- */
  const isChromium = !!(navigator.userAgentData && navigator.userAgentData.brands
    && navigator.userAgentData.brands.some(b => /Chromium/.test(b.brand)));
  if (isChromium && !reduceMotion) root.classList.add('supports-refract');

  /* ---------- Highlight today in the hours list (Europe/Warsaw) ---------- */
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', weekday: 'short' }).format(new Date());
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  document.querySelectorAll('[data-hours] li').forEach(li => {
    li.classList.toggle('today', +li.dataset.day === today);
  });

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
    const highlight = /^(szóstej|rano|kanapkami,)$/i;
    const highlightOrange = /^(ciastami)$/i;
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

  /* ---------- In-page links: smooth scroll without touching the URL ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? null : document.querySelector(id);
    if (id !== '#top' && !target) return;
    e.preventDefault();
    const y = target ? target.getBoundingClientRect().top + window.scrollY - 90 : 0;
    window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (a.classList.contains('skip-link')) document.getElementById('top').focus({ preventScroll: true });
  });

  /* ---------- Count-up numbers ---------- */
  const counters = [...document.querySelectorAll('.stat-num')]
    .map(el => ({ el, m: el.textContent.trim().match(/^(\d+)(%?)$/) }))
    .filter(c => c.m);
  if (!reduceMotion && counters.length) {
    counters.forEach(c => { c.el.textContent = `0${c.m[2]}`; });
    const countIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        countIO.unobserve(entry.target);
        const c = counters.find(x => x.el === entry.target);
        const end = +c.m[1];
        const t0 = performance.now();
        const step = now => {
          const k = Math.min(1, (now - t0) / 1400);
          c.el.textContent = `${Math.round(end * (1 - Math.pow(1 - k, 3)))}${c.m[2]}`;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(c => countIO.observe(c.el));
  }

  /* ---------- Scroll-expanding photo ---------- */
  const zoom = document.querySelector('[data-zoom]');
  if (zoom) {
    const setZoom = () => {
      const r = zoom.getBoundingClientRect();
      const travel = (r.height - window.innerHeight) * 0.7;
      const p = reduceMotion ? 1 : Math.min(1, Math.max(0, -r.top / travel));
      zoom.style.setProperty('--p', p.toFixed(3));
      zoom.style.setProperty('--i', (1 - p).toFixed(3));
    };
    setZoom();
    let zTick = false;
    window.addEventListener('scroll', () => {
      if (!zTick) { zTick = true; requestAnimationFrame(() => { setZoom(); zTick = false; }); }
    }, { passive: true });
    window.addEventListener('resize', setZoom);
  }

  /* ---------- Gallery arrows ---------- */
  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const btns = document.querySelectorAll('[data-gal]');
    const syncBtns = () => {
      const max = gallery.scrollWidth - gallery.clientWidth - 4;
      btns.forEach(b => { b.disabled = +b.dataset.gal < 0 ? gallery.scrollLeft <= 4 : gallery.scrollLeft >= max; });
    };
    btns.forEach(b => b.addEventListener('click', () => {
      gallery.scrollBy({ left: +b.dataset.gal * gallery.clientWidth * 0.75, behavior: reduceMotion ? 'auto' : 'smooth' });
    }));
    gallery.addEventListener('scroll', () => requestAnimationFrame(syncBtns), { passive: true });
    window.addEventListener('resize', syncBtns);
    syncBtns();
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
