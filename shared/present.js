/* MV Funnel Review: shared presenter engine.
   Flow-through navigation for a scroll presentation:
   - Scroll normally, or step with Arrow keys / Space / PageUp / PageDown / j k.
   - Targets are every [data-beat] and [data-step] element, in document order.
   - A rail of dots shows the beats; click to jump.
   - Fonts gate the first paint so display type never flashes a fallback face.
*/
(function () {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* font gate */
  root.classList.add('mv-wait');
  const reveal = () => root.classList.add('mv-ready');
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(reveal);
  setTimeout(reveal, 2600);

  /* formatting helpers, shared by all concepts */
  const nf = new Intl.NumberFormat('en-AU');
  window.MV = {
    num: (n) => nf.format(Math.round(n)),
    usd: (n) => '$' + nf.format(Math.round(n)),
    pct: (n) => Math.round(n) + '%',
    reduce: () => reduce.matches,
  };

  /* bind [data-bind] text from MV_DATA paths like "scenarios.expected.signed_r" */
  function bind() {
    const D = window.MV_DATA;
    if (!D) return;
    document.querySelectorAll('[data-bind]').forEach((el) => {
      const path = el.dataset.bind.split('.');
      let v = D;
      for (const k of path) v = v == null ? v : v[k];
      if (v == null) return;
      const f = el.dataset.fmt;
      el.textContent = f === 'usd' ? MV.usd(v) : f === 'pct' ? MV.pct(v) : f === 'num' ? MV.num(v) : String(v);
    });
  }

  function targets() {
    return [...document.querySelectorAll('[data-beat], [data-step]')];
  }

  function go(el) {
    if (!el) return;
    const top = el.getBoundingClientRect().top + scrollY;
    scrollTo({ top, behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  function next(dir) {
    const t = targets();
    if (dir > 0) go(t.find((el) => el.getBoundingClientRect().top > 6));
    else {
      const prev = t.filter((el) => el.getBoundingClientRect().top < -6);
      go(prev[prev.length - 1] || t[0]);
    }
  }

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || k === 'j' || (k === ' ' && !e.shiftKey)) {
      e.preventDefault(); next(1);
    } else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp' || k === 'k' || (k === ' ' && e.shiftKey)) {
      e.preventDefault(); next(-1);
    } else if (k === 'Home') { e.preventDefault(); go(targets()[0]); }
    else if (k === 'End') { e.preventDefault(); const t = targets(); go(t[t.length - 1]); }
    else if (k === 'f') {
      if (!document.fullscreenElement) root.requestFullscreen && root.requestFullscreen().catch(() => {});
      else document.exitFullscreen && document.exitFullscreen();
    }
  });

  /* beat rail */
  function rail() {
    const beats = [...document.querySelectorAll('[data-beat]')];
    if (!beats.length) return;
    const nav = document.createElement('nav');
    nav.className = 'mv-rail';
    nav.setAttribute('aria-label', 'Sections');
    const btns = beats.map((b, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', (i + 1) + '. ' + b.dataset.beat);
      btn.title = b.dataset.beat;
      btn.addEventListener('click', () => go(b));
      nav.appendChild(btn);
      return btn;
    });
    document.body.appendChild(nav);
    const update = () => {
      const y = innerHeight * 0.45;
      let cur = 0;
      beats.forEach((b, i) => { if (b.getBoundingClientRect().top <= y) cur = i; });
      btns.forEach((b, i) => b.toggleAttribute('aria-current', i === cur));
    };
    addEventListener('scroll', update, { passive: true });
    update();
  }

  /* reveal-on-enter */
  function reveals() {
    const els = document.querySelectorAll('.rv');
    if (reduce.matches || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  }

  /* progress of a tall sticky section, 0..1 */
  window.MV.progress = (section) => {
    const r = section.getBoundingClientRect();
    const span = r.height - innerHeight;
    if (span <= 0) return r.top <= 0 ? 1 : 0;
    return Math.min(1, Math.max(0, -r.top / span));
  };

  document.addEventListener('DOMContentLoaded', () => { bind(); rail(); reveals(); });
})();
