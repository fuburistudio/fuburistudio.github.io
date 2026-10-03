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

  // ---------- hero title: split into characters ----------
  document.querySelectorAll(".hero-title").forEach(function (title) {
    var i = 0;
    var isJa = title.getAttribute("data-lang") === "ja";
    function splitNode(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) {
          if (child.tagName !== "BR") splitNode(child);
          return;
        }
        if (child.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        var tokens = isJa ? [child.nodeValue] : child.nodeValue.split(/(\s+)/);
        tokens.forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(" ")); return; }
          var word = document.createElement("span");
          word.className = "word";
          Array.from(tok).forEach(function (c) {
            var ch = document.createElement("span");
            ch.className = "ch";
            ch.textContent = c;
            ch.style.transitionDelay = (0.15 + i * 0.035).toFixed(3) + "s";
            i += 1;
            word.appendChild(ch);
          });
          frag.appendChild(word);
        });
        node.replaceChild(frag, child);
      });
    }
    title.querySelectorAll(".line > span").forEach(splitNode);
  });

  // ---------- loader ----------
  var loader = document.querySelector(".loader");

  function finishLoad() {
    body.classList.add("is-loaded");
    requestScrollUpdate();
  }

  function closeLoader(delay) {
    loader.classList.add("is-closing");
    setTimeout(finishLoad, delay);
  }

  if (!loader || reduce) {
    finishLoad();
  } else if (getStore(sessionStorage, VISIT_KEY)) {
    loader.classList.add("loader--quick");
    setTimeout(function () { closeLoader(380); }, 80);
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
      else setTimeout(function () { closeLoader(560); }, 150);
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

  // ---------- odometer digits + letter reveals ----------
  document.querySelectorAll(".odo[data-odo]").forEach(function (el, n) {
    var target = parseInt(el.getAttribute("data-odo"), 10);
    var col = document.createElement("span");
    col.className = "odo-col";
    var digits = [];
    for (var loop = 0; loop < 2; loop++) {
      for (var d = 0; d < 10; d++) digits.push(d);
    }
    digits.push(target);
    digits.forEach(function (d) {
      var s = document.createElement("span");
      s.textContent = d;
      col.appendChild(s);
    });
    el.textContent = "";
    el.appendChild(col);
    el.__steps = digits.length - 1;
    col.style.transitionDelay = (n * 0.18).toFixed(2) + "s";
  });

  document.querySelectorAll(".num-word").forEach(function (el) {
    var text = el.textContent;
    el.textContent = "";
    Array.from(text).forEach(function (c, i) {
      var s = document.createElement("span");
      s.className = "lt";
      s.textContent = c;
      s.style.transitionDelay = (0.45 + i * 0.08).toFixed(2) + "s";
      el.appendChild(s);
    });
  });

  function rollOdometers(container) {
    container.querySelectorAll(".odo").forEach(function (el) {
      var col = el.querySelector(".odo-col");
      if (!col || el.__rolled) return;
      el.__rolled = true;
      col.style.transform = "translateY(-" + (el.__steps * 0.85) + "em)";
    });
  }

  if (reduce) {
    document.querySelectorAll(".odo").forEach(function (el) {
      var col = el.querySelector(".odo-col");
      if (col) { col.style.transition = "none"; col.style.transform = "translateY(-" + (el.__steps * 0.85) + "em)"; }
    });
  }

  // ---------- reveal on view ----------
  function revealEl(el) {
    el.classList.add("is-visible");
    triggerCounts(el);
    rollOdometers(el);
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
  var heroMedia = document.querySelector(".hero-media");
  var heroInner = document.querySelector(".hero-inner");
  var lightSections = document.querySelectorAll("[data-header='light']");
  var depthEls = document.querySelectorAll("[data-depth]");
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

    var light = false;
    for (var i = 0; i < lightSections.length; i++) {
      var lr = lightSections[i].getBoundingClientRect();
      if (lr.top <= 36 && lr.bottom >= 36) { light = true; break; }
    }
    body.classList.toggle("header-light", light);

    if (reduce) return;

    if (heroMedia) {
      var hr0 = heroMedia.parentElement.getBoundingClientRect();
      var hp0 = clamp(-hr0.top / hr0.height, 0, 1);
      heroMedia.style.transform = "translate3d(0," + (hp0 * 22).toFixed(2) + "%,0)";
      if (heroInner) {
        heroInner.style.transform = "translate3d(0," + (hp0 * -60).toFixed(1) + "px,0)";
        heroInner.style.opacity = (1 - hp0 * 1.3).toFixed(3);
      }
    }

    depthEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var depth = parseFloat(el.getAttribute("data-depth"));
      el.style.transform = "translate3d(0," + ((r.top + r.height / 2 - vh / 2) * -depth).toFixed(1) + "px,0)";
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

  // ---------- sample-site mockups: scale the 1440px iframe to fit ----------
  var mockScreens = document.querySelectorAll(".mock-screen");
  function fitMock(screen) {
    screen.style.setProperty("--mock-s", (screen.clientWidth / 1440).toFixed(4));
  }
  mockScreens.forEach(fitMock);
  if ("ResizeObserver" in window) {
    var mockRO = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) { fitMock(entry.target); });
    });
    mockScreens.forEach(function (s) { mockRO.observe(s); });
  }

  // ---------- language init (after effects are wired) ----------
  setLang(getStore(localStorage, LANG_KEY) || "en");

})();
