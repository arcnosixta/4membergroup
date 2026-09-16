
// ===== PARTICLE CONSTELLATION =====
(() => {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W, H, pts;
  const COUNT = 70;
  const LINK_DIST = 140;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
    pts = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.fillStyle = 'rgba(230, 25, 25, 0.5)';
      ctx.fillRect(p.x, p.y, 1.5, 1.5);
    }
    ctx.strokeStyle = 'rgba(230, 25, 25, 0.12)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d = Math.hypot(dx, dy);
        if (d < LINK_DIST) {
          ctx.globalAlpha = 1 - d / LINK_DIST;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  addEventListener('resize', init);
  init();
  if (!reduce) frame();
})();

// ===== SVG path lengths =====
document.querySelectorAll('.draw-path').forEach(path => {
  try {
    path.style.setProperty('--len', path.getTotalLength());
  } catch (e) {}
});

// ===== SCROLL REVEAL =====
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('in');
  });
}, { threshold: 0.15 });

document.querySelectorAll('.card, .stat, .section-label, .section-heading').forEach(el => io.observe(el));

// ===== ANIMATED COUNTERS =====
const counterIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const num = el.querySelector('.stat-num');
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const dur = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterIO.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat').forEach(el => counterIO.observe(el));

// ===== CARD 3D TILT =====
document.querySelectorAll('.card').forEach(card => {
  const mousemove = e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-8px) scale(1.02) perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  };
  const mouseleave = () => { card.style.transform = ''; };
  card.addEventListener('mousemove', mousemove);
  card.addEventListener('mouseleave', mouseleave);
});

// ===== CUSTOM CURSOR =====
if (matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  let mx = -100, my = -100, rx = -100, ry = -100;

  document.body.classList.add('cursor-on');

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx - 3}px, ${my - 3}px)`;
  });

  (function lerp() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
    requestAnimationFrame(lerp);
  })();

  document.querySelectorAll('a, button, .card').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

// ===== SCROLL BUTTON =====
const scrollBtn = document.getElementById('scrollBtn');
scrollBtn.addEventListener('click', () => {
  document.getElementById('team').scrollIntoView({ behavior: 'smooth' });
});

// ===== NAV ACTIVE STATE =====
const navLinks = document.querySelectorAll('.nav a');
const secIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('section[id]').forEach(s => secIO.observe(s));
