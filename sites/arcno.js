
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Intro splash =====
  var op = document.getElementById('op');

  function finishSplash() {
    op.classList.add('done');
    document.body.classList.add('opened');
    setTimeout(function () { op.style.pointerEvents = 'none'; op.style.display = 'none'; }, 1300);
    try { sessionStorage.setItem('op', '1'); } catch (e) {}
  }

  function startReveals() {
    var lines = document.querySelectorAll('.hero-title .line > span');
    lines.forEach(function (s, i) { s.style.animationDelay = (0.55 + i * 0.14) + 's'; });
  }

  if (reduce || !sessionStorage.getItem('op')) {
    document.body.classList.add('opened');
    startReveals();
    setTimeout(finishSplash, reduce ? 10 : 2450);
  } else {
    document.body.classList.add('opened');
    op.style.display = 'none';
    startReveals();
  }

  // ===== Reveal on scroll =====
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.rv, .rvl, .skill').forEach(function (el) { io.observe(el); });

  // ===== Counters =====
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      var num = el.querySelector('.stat-num');
      var target = +el.dataset.count;
      var suffix = el.dataset.suffix || '';
      var dur = 1300, start = performance.now();
      (function tick(now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        num.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(start);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat').forEach(function (el) { cio.observe(el); });

  // ===== Nav active =====
  var links = document.querySelectorAll('.navlinks a');
  var secIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { threshold: 0.3 });
  ['about', 'skills', 'work', 'contact'].forEach(function (id) {
    var s = document.getElementById(id);
    if (s) secIO.observe(s);
  });
})();
