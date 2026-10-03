(function () {
  if (window.self !== window.top) document.documentElement.classList.add("in-frame");

  var btn = document.querySelector(".nav-btn");
  if (btn) {
    btn.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
})();
