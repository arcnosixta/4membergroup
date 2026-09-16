(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Header on scroll =====
  var header = document.getElementById('siteHeader');
  var spBar = document.querySelector('.sp-bar');

  // ===== Scroll progress + header state =====
  var ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? y / max : 0;
        if (spBar) spBar.style.transform = 'scaleY(' + p + ')';
        header.classList.toggle('on', y > 40);
        ticking = false;
      });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ===== Reveal on scroll =====
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  // ===== Counters =====
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      var num = el.querySelector('.stat-num');
      var target = +el.dataset.count;
      var dur = 1300, start = performance.now();
      (function tick(now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        num.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      })(start);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat').forEach(function (el) {
    if (el.querySelector('.stat-num.special')) return;
    cio.observe(el);
  });

  // ===== Nav active =====
  var links = document.querySelectorAll('.nav .nav-link');
  var secIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { threshold: 0.3 });
  ['intro', 'skills', 'projects', 'contact'].forEach(function (id) {
    var s = document.getElementById(id);
    if (s) secIO.observe(s);
  });
})();