(function () {
  var STORAGE_KEY = "fuburi-lang";
  var toggleButtons = document.querySelectorAll("[data-lang-btn]");
  var menuToggle = document.querySelector(".menu-toggle");
  var navDrawer = document.querySelector(".nav-drawer");
  var navOverlay = document.querySelector(".nav-overlay");

  function getSavedLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* ignore */
    }
  }

  function setLang(lang) {
    document.querySelectorAll("[data-lang]").forEach(function (el) {
      el.hidden = el.getAttribute("data-lang") !== lang;
    });
    document.documentElement.lang = lang;
    toggleButtons.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang-btn") === lang);
    });
    saveLang(lang);
  }

  toggleButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLang(btn.getAttribute("data-lang-btn"));
    });
  });

  if (menuToggle && navDrawer && navOverlay) {
    var closeMenu = function () {
      menuToggle.classList.remove("is-open");
      navDrawer.classList.remove("is-open");
      navOverlay.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      navDrawer.setAttribute("aria-hidden", "true");
    };
    var openMenu = function () {
      menuToggle.classList.add("is-open");
      navDrawer.classList.add("is-open");
      navOverlay.classList.add("is-open");
      menuToggle.setAttribute("aria-expanded", "true");
      navDrawer.setAttribute("aria-hidden", "false");
    };
    menuToggle.addEventListener("click", function () {
      if (navDrawer.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });
    navOverlay.addEventListener("click", closeMenu);
    navDrawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  var initial = getSavedLang() || "en";
  setLang(initial);

  // ---------- active nav link ----------
  var currentPage = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-inline a, .nav-drawer .nav-links a").forEach(function (a) {
    if (a.getAttribute("href") === currentPage) {
      a.classList.add("is-active");
    }
  });

  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- count-up numbers ----------
  function animateCount(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    var target = parseInt(el.getAttribute("data-count-to"), 10);
    var prefix = el.getAttribute("data-prefix") || "";
    if (prefersReducedMotion || isNaN(target)) {
      el.textContent = prefix + target.toLocaleString("en-US");
      return;
    }
    var duration = 1100;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString("en-US");
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = prefix + target.toLocaleString("en-US");
      }
    }
    requestAnimationFrame(step);
  }

  function triggerCounts(container) {
    container.querySelectorAll(".count-num").forEach(animateCount);
  }

  // ---------- character split-reveal ----------
  function wrapWordsAndChars(el) {
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.nodeValue.split(/(\s+)/).forEach(function (token) {
            if (!token.length) return;
            if (/^\s+$/.test(token)) {
              frag.appendChild(document.createTextNode(token));
              return;
            }
            var word = document.createElement("span");
            word.className = "word";
            token.split("").forEach(function (ch) {
              var span = document.createElement("span");
              span.className = "ch";
              span.textContent = ch;
              word.appendChild(span);
            });
            frag.appendChild(word);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
  }

  function splitAndStagger(el, stepMs, maxDelayMs) {
    wrapWordsAndChars(el);
    el.querySelectorAll(".ch").forEach(function (ch, i) {
      ch.style.transitionDelay = Math.min(i * stepMs, maxDelayMs) + "ms";
    });
  }

  document.querySelectorAll('.hero h1[data-lang="en"]').forEach(function (el) {
    splitAndStagger(el, 22, 600);
  });
  document.querySelectorAll('.section-head h2[data-lang="en"]').forEach(function (el) {
    splitAndStagger(el, 16, 420);
  });

  // ---------- page loader ----------
  var loader = document.querySelector(".page-loader");
  var loaderDelay = prefersReducedMotion ? 0 : 650;
  setTimeout(function () {
    if (loader) loader.classList.add("is-hidden");
    document.body.classList.add("hero-ready");
    document.querySelectorAll(".trust-row .count-num").forEach(animateCount);
  }, loaderDelay);

  // ---------- bottom sticky CTA ----------
  var bottomCta = document.getElementById("bottomCta");
  var heroEl = document.querySelector(".hero");
  var footerEl = document.querySelector("footer");
  var onContactPage = /(^|\/)contact\.html$/.test(location.pathname);
  if (bottomCta && !onContactPage) {
    var toggleBottomCta = function () {
      var pastHero = heroEl ? heroEl.getBoundingClientRect().bottom < 0 : window.scrollY > 280;
      var nearFooter = footerEl && footerEl.getBoundingClientRect().top < window.innerHeight + 60;
      bottomCta.classList.toggle("is-visible", pastHero && !nearFooter);
    };
    window.addEventListener("scroll", toggleBottomCta, { passive: true });
    toggleBottomCta();
  }

  // ---------- scroll progress bar ----------
  var progressBar = document.querySelector(".scroll-progress");
  if (progressBar) {
    var updateProgress = function () {
      var scrollTop = window.pageYOffset;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
  }

  // ---------- parallax ----------
  if (!prefersReducedMotion) {
    var parallaxEls = [
      { el: document.querySelector(".hero-collage"), speed: 0.12 },
      { el: document.querySelector(".about-art"), speed: 0.08 }
    ].filter(function (p) { return p.el; });

    if (parallaxEls.length) {
      var parallaxTicking = false;
      var updateParallax = function () {
        parallaxEls.forEach(function (p) {
          var rect = p.el.getBoundingClientRect();
          var center = rect.top + rect.height / 2 - window.innerHeight / 2;
          p.el.style.transform = "translateY(" + (center * -p.speed) + "px)";
        });
        parallaxTicking = false;
      };
      window.addEventListener("scroll", function () {
        if (!parallaxTicking) {
          requestAnimationFrame(updateParallax);
          parallaxTicking = true;
        }
      }, { passive: true });
      updateParallax();
    }
  }

  // ---------- custom cursor + magnetic buttons ----------
  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.documentElement.classList.add("has-custom-cursor");

    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mouseX = 0, mouseY = 0, ringX = 0, ringY = 0, cursorReady = false;

    window.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + "px";
      dot.style.top = mouseY + "px";
      if (!cursorReady) {
        cursorReady = true;
        ringX = mouseX;
        ringY = mouseY;
        document.documentElement.classList.add("cursor-ready");
      }
    });

    (function ringLoop() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      requestAnimationFrame(ringLoop);
    })();

    document.querySelectorAll("a, button, .plan, .service-card, .who-chip, .faq-item summary").forEach(function (el) {
      el.addEventListener("mouseenter", function () { ring.classList.add("is-active"); });
      el.addEventListener("mouseleave", function () { ring.classList.remove("is-active"); });
    });

    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var relX = e.clientX - rect.left - rect.width / 2;
        var relY = e.clientY - rect.top - rect.height / 2;
        btn.style.transition = "transform 0s";
        btn.style.transform = "translate(" + relX * 0.25 + "px, " + relY * 0.35 + "px) scale(1.03)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transition = "transform .4s cubic-bezier(.22, .8, .2, 1)";
        btn.style.transform = "";
      });
    });
  }

  if ("IntersectionObserver" in window) {
    var revealTargets = document.querySelectorAll(".reveal");
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            triggerCounts(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px 0px 0px" }
    );
    revealTargets.forEach(function (el) {
      observer.observe(el);
    });

    // Safety net: never leave content permanently invisible if the
    // observer misses an element (backgrounded tab, odd viewport, etc).
    var revealFallback = setInterval(function () {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add("is-visible");
          triggerCounts(el);
        }
      });
    }, 400);
    setTimeout(function () {
      clearInterval(revealFallback);
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        el.classList.add("is-visible");
        triggerCounts(el);
      });
    }, 4000);
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
      triggerCounts(el);
    });
  }
})();
