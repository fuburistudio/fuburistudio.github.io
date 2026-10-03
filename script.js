(function () {
  "use strict";

  var doc = document.documentElement;
  var body = document.body;
  var LANG_KEY = "fuburi-lang";
  var VISIT_KEY = "fuburi-visited";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function getStore(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function setStore(store, key, val) { try { store.setItem(key, val); } catch (e) { /* storage blocked */ } }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // ---------- language ----------
  var langButtons = document.querySelectorAll("[data-lang-btn]");

  function setLang(lang) {
    document.querySelectorAll("[data-lang]").forEach(function (el) {
      el.hidden = el.getAttribute("data-lang") !== lang;
    });
    doc.lang = lang;
    langButtons.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang-btn") === lang);
    });
    setStore(localStorage, LANG_KEY, lang);
    requestScrollUpdate();
  }

  langButtons.forEach(function (btn) {
    btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang-btn")); });
  });

  // ---------- active nav ----------
  var currentPage = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a, .menu-links a").forEach(function (a) {
    if (a.getAttribute("href") === currentPage) a.classList.add("is-active");
  });

  // ---------- smooth scroll ----------
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      anchors: true
    });
    var lenisRaf = function (time) {
      lenis.raf(time);
      requestAnimationFrame(lenisRaf);
    };
    requestAnimationFrame(lenisRaf);
  }

  // ---------- menu ----------
  var menuBtn = document.querySelector(".menu-btn");
  var menu = document.getElementById("menu");

  function toggleMenu(open) {
    if (!menu || !menuBtn) return;
    menu.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () { toggleMenu(!menu.classList.contains("is-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggleMenu(false); });
  }

  // ---------- loader ----------
  var loader = document.querySelector(".loader");

  function finishLoad() {
    body.classList.add("is-loaded");
    requestScrollUpdate();
  }

  if (!loader || reduce) {
    finishLoad();
  } else if (getStore(sessionStorage, VISIT_KEY)) {
    loader.classList.add("loader--quick");
    setTimeout(finishLoad, 120);
  } else {
    setStore(sessionStorage, VISIT_KEY, "1");
    var loaderNum = loader.querySelector(".loader-num");
    var loadStart = null;
    var loadTick = function (ts) {
      if (!loadStart) loadStart = ts;
      var p = Math.min((ts - loadStart) / 1300, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      if (loaderNum) loaderNum.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      if (p < 1) requestAnimationFrame(loadTick);
      else setTimeout(finishLoad, 200);
    };
    requestAnimationFrame(loadTick);
  }

  // ---------- page transitions ----------
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("download")) return;
    if (/^(mailto|tel):/i.test(href)) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (reduce || !loader) return;
    e.preventDefault();
    toggleMenu(false);
    loader.classList.add("loader--quick");
    body.classList.add("is-leaving");
    setTimeout(function () { location.href = url.href; }, 650);
  });

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      body.classList.remove("is-leaving");
      finishLoad();
    }
  });

  // ---------- local clock ----------
  var clocks = document.querySelectorAll("[data-clock]");
  function updateClocks() {
    var t;
    try {
      t = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit" });
    } catch (err) {
      return;
    }
    clocks.forEach(function (el) { el.textContent = "SGT " + t; });
  }
  if (clocks.length) { updateClocks(); setInterval(updateClocks, 30000); }

  // ---------- count-up ----------
  function animateCount(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    var target = parseInt(el.getAttribute("data-count-to"), 10);
    var prefix = el.getAttribute("data-prefix") || "";
    if (isNaN(target)) return;
    if (reduce) { el.textContent = prefix + target.toLocaleString("en-US"); return; }
    var start = null;
    var step = function (ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 1400, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + Math.round(target * eased).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function triggerCounts(container) {
    container.querySelectorAll(".count-num").forEach(animateCount);
  }

  // ---------- reveal on view ----------
  function revealEl(el) {
    el.classList.add("is-visible");
    triggerCounts(el);
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          revealEl(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { observer.observe(el); });

    // Safety net for backgrounded tabs where the observer may not fire.
    setTimeout(function () {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) revealEl(el);
      });
    }, 2500);
  } else {
    document.querySelectorAll(".reveal").forEach(revealEl);
  }

  // ---------- manifesto word split ----------
  var manifestos = document.querySelectorAll(".manifesto-text");
  manifestos.forEach(function (el) {
    var text = el.textContent.trim();
    var isJa = el.getAttribute("data-lang") === "ja";
    var tokens = isJa ? Array.from(text) : text.split(/(\s+)/);
    el.textContent = "";
    tokens.forEach(function (t) {
      if (!t) return;
      if (/^\s+$/.test(t)) { el.appendChild(document.createTextNode(t)); return; }
      var s = document.createElement("span");
      s.className = "w";
      s.textContent = t;
      el.appendChild(s);
    });
    el.__words = el.querySelectorAll(".w");
    if (reduce) el.__words.forEach(function (w) { w.style.opacity = 1; });
  });

  // ---------- scroll-driven effects ----------
  var progressBar = document.querySelector(".scroll-progress");
  var showcase = document.querySelector(".showcase-frame");
  var kineticRows = document.querySelectorAll("[data-kinetic]");
  var hscroll = document.querySelector(".hscroll");
  var hTrack = hscroll ? hscroll.querySelector(".hscroll-track") : null;
  var parallaxImgs = document.querySelectorAll("[data-parallax]");
  var hsActive = false;
  var hsDist = 0;

  function layoutHScroll() {
    if (!hscroll || !hTrack) return;
    hsActive = !reduce && window.innerWidth > 900;
    if (hsActive) {
      hsDist = Math.max(0, hTrack.scrollWidth - hTrack.clientWidth);
      hscroll.style.height = (hsDist + window.innerHeight) + "px";
    } else {
      hscroll.style.height = "";
      hTrack.style.transform = "";
    }
  }

  function updateScroll() {
    scrollTicking = false;
    var vh = window.innerHeight;

    if (progressBar) {
      var max = doc.scrollHeight - vh;
      progressBar.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
    }

    if (reduce) return;

    if (showcase) {
      var sr = showcase.getBoundingClientRect();
      var sp = clamp((vh - sr.top) / (vh * 0.9), 0, 1);
      var inset = window.innerWidth < 600 ? 5 : 10;
      showcase.style.setProperty("--sc-x", ((1 - sp) * inset).toFixed(2) + "%");
      showcase.style.setProperty("--sc-r", (4 + (1 - sp) * 24).toFixed(1) + "px");
      showcase.style.setProperty("--sc-s", (1.18 - 0.18 * sp).toFixed(3));
    }

    kineticRows.forEach(function (row) {
      var r = row.parentElement.getBoundingClientRect();
      var speed = parseFloat(row.getAttribute("data-kinetic"));
      var base = speed < 0 ? 0 : -row.scrollWidth / 3;
      row.style.transform = "translate3d(" + (base + (vh - r.top) * speed).toFixed(1) + "px,0,0)";
    });

    manifestos.forEach(function (el) {
      if (el.hidden || !el.__words) return;
      var r = el.getBoundingClientRect();
      var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
      var lit = p * el.__words.length * 1.08;
      el.__words.forEach(function (w, i) {
        w.style.opacity = (0.14 + 0.86 * clamp(lit - i, 0, 1)).toFixed(2);
      });
    });

    if (hsActive) {
      var hr = hscroll.getBoundingClientRect();
      var total = hscroll.offsetHeight - vh;
      var hp = total > 0 ? clamp(-hr.top / total, 0, 1) : 0;
      hTrack.style.transform = "translate3d(" + (-hp * hsDist).toFixed(1) + "px,0,0)";
    }

    parallaxImgs.forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.transform = "translate3d(0," + (p * -12).toFixed(2) + "%,0)";
    });
  }

  var scrollTicking = false;
  function requestScrollUpdate() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(updateScroll);
    }
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", function () { layoutHScroll(); requestScrollUpdate(); });
  window.addEventListener("load", function () { layoutHScroll(); requestScrollUpdate(); });
  layoutHScroll();

  // ---------- language init (after effects are wired) ----------
  setLang(getStore(localStorage, LANG_KEY) || "en");

  // ---------- service hover preview ----------
  var preview = document.querySelector(".svc-preview");
  if (preview && finePointer && !reduce) {
    var pImg = preview.querySelector("img");
    var pX = 0, pY = 0, tX = 0, tY = 0;
    document.querySelectorAll(".svc-row[data-img]").forEach(function (row) {
      var src = row.getAttribute("data-img");
      new Image().src = src;
      row.addEventListener("mouseenter", function () {
        pImg.src = src;
        preview.classList.add("is-on");
      });
      row.addEventListener("mouseleave", function () { preview.classList.remove("is-on"); });
    });
    window.addEventListener("mousemove", function (e) { tX = e.clientX; tY = e.clientY; });
    var previewLoop = function () {
      pX += (tX - pX) * 0.12;
      pY += (tY - pY) * 0.12;
      preview.style.left = pX.toFixed(1) + "px";
      preview.style.top = pY.toFixed(1) + "px";
      requestAnimationFrame(previewLoop);
    };
    previewLoop();
  }

  // ---------- custom cursor + magnetic buttons ----------
  if (finePointer && !reduce) {
    doc.classList.add("has-cursor");
    var cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.innerHTML = '<span class="cursor-label">View</span>';
    body.appendChild(cursor);

    var cX = 0, cY = 0, mX = 0, mY = 0, ready = false;
    window.addEventListener("mousemove", function (e) {
      mX = e.clientX;
      mY = e.clientY;
      if (!ready) {
        ready = true;
        cX = mX;
        cY = mY;
        doc.classList.add("cursor-ready");
      }
    });

    document.addEventListener("mouseover", function (e) {
      var t = e.target;
      cursor.classList.toggle("is-view", !!t.closest("[data-cursor='view']"));
      cursor.classList.toggle("is-hover", !!t.closest("a, button, summary, label"));
    });

    var cursorLoop = function () {
      cX += (mX - cX) * 0.22;
      cY += (mY - cY) * 0.22;
      cursor.style.transform = "translate3d(" + cX.toFixed(1) + "px," + cY.toFixed(1) + "px,0)";
      requestAnimationFrame(cursorLoop);
    };
    cursorLoop();

    document.querySelectorAll(".btn-pill, .btn").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - r.left - r.width / 2;
        var dy = e.clientY - r.top - r.height / 2;
        btn.style.transition = "transform .15s linear";
        btn.style.transform = "translate(" + (dx * 0.18).toFixed(1) + "px," + (dy * 0.3).toFixed(1) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transition = "transform .7s cubic-bezier(.16,1,.3,1)";
        btn.style.transform = "";
      });
    });
  }
})();
