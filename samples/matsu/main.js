(function () {
  var doc = document.documentElement;
  var body = document.body;
  var MEMBER_KEY = "nagi-demo-member";
  var DEMO_EMAIL = "demo@nagi.example";
  var DEMO_PASS = "demo1234";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (window.self !== window.top) doc.classList.add("in-frame");

  function isMember() {
    try { return sessionStorage.getItem(MEMBER_KEY) === "1"; } catch (e) { return false; }
  }

  // ---------- auth guard (demo) ----------
  if (body.hasAttribute("data-requires-login") && !isMember()) {
    location.replace("login.html");
    return;
  }

  document.querySelectorAll("[data-member-link]").forEach(function (a) {
    if (isMember()) {
      a.textContent = "マイページ";
      a.setAttribute("href", a.getAttribute("href").replace("login.html", "mypage.html"));
    }
  });

  var logout = document.querySelector("[data-logout]");
  if (logout) {
    logout.addEventListener("click", function () {
      try { sessionStorage.removeItem(MEMBER_KEY); } catch (e) { /* storage blocked */ }
      location.href = "login.html";
    });
  }

  var form = document.querySelector(".auth-form");
  if (form) {
    var err = form.querySelector(".auth-error");
    var fill = document.querySelector(".demo-fill");
    if (fill) {
      fill.addEventListener("click", function () {
        form.email.value = DEMO_EMAIL;
        form.password.value = DEMO_PASS;
      });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.email.value.trim() === DEMO_EMAIL && form.password.value === DEMO_PASS) {
        try { sessionStorage.setItem(MEMBER_KEY, "1"); } catch (er) { /* storage blocked */ }
        location.href = "mypage.html";
      } else {
        err.hidden = false;
      }
    });
  }

  // ---------- nav ----------
  var btn = document.querySelector(".nav-btn");
  if (btn) {
    btn.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      btn.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () { body.classList.remove("nav-open"); });
    });
  }

  var header = document.querySelector(".header");
  function onScroll() {
    if (header && body.classList.contains("home")) header.classList.toggle("solid", window.scrollY > window.innerHeight * 0.7);
    if (reduce) return;
    document.querySelectorAll("[data-speed]").forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      var speed = parseFloat(el.getAttribute("data-speed"));
      el.style.transform = "translate3d(0," + (r.top * -speed).toFixed(1) + "px,0)";
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- split title ----------
  document.querySelectorAll(".split").forEach(function (el) {
    var i = 0;
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      Array.from(node.nodeValue).forEach(function (ch) {
        var s = document.createElement("span");
        s.className = "ch";
        s.textContent = ch;
        s.style.transitionDelay = (0.5 + i * 0.07).toFixed(2) + "s";
        i += 1;
        frag.appendChild(s);
      });
      el.replaceChild(frag, node);
    });
  });

  // ---------- intro ----------
  function ready() { doc.classList.add("is-ready"); }
  if (reduce || doc.classList.contains("in-frame") || !document.querySelector(".intro")) {
    ready();
  } else {
    setTimeout(ready, 900);
  }

  // ---------- reveal + counters ----------
  function count(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduce) { el.textContent = target.toLocaleString("ja-JP"); return; }
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 1600, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString("ja-JP");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("on");
      e.target.querySelectorAll("[data-count]").forEach(count);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });

  // ---------- blog filter ----------
  var chips = document.querySelectorAll(".chip");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.classList.toggle("on", c === chip); });
      document.querySelectorAll(".post-card[data-cat]").forEach(function (card) {
        card.hidden = f !== "all" && card.getAttribute("data-cat") !== f;
      });
    });
  });
})();
