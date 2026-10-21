(function () {
  var doc = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.self !== window.top) doc.classList.add("in-frame");

  var btn = document.querySelector(".nav-btn");
  if (btn) {
    btn.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  // ---------- reveal on scroll ----------
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
  requestAnimationFrame(function () { body.classList.add("is-ready"); });

  // ---------- page veil between pages ----------
  var veil = document.createElement("div");
  veil.className = "veil";
  veil.setAttribute("aria-hidden", "true");
  veil.innerHTML = "<span>AME</span>";
  body.appendChild(veil);
  requestAnimationFrame(function () { veil.classList.add("is-off"); });
  setTimeout(function () { veil.classList.add("is-off"); }, 400);
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || a.target === "_blank" || /^(mailto|tel):/i.test(href)) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault();
    veil.classList.remove("is-off");
    veil.classList.add("is-on");
    setTimeout(function () { location.href = url.href; }, 600);
  });
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { veil.classList.remove("is-on"); veil.classList.add("is-off"); }
  });

  // ---------- floating reservation button ----------
  if (!document.querySelector(".rsv-form")) {
    var fab = document.createElement("a");
    fab.className = "fab";
    fab.href = "access.html#reserve";
    fab.setAttribute("aria-label", "ご予約");
    fab.innerHTML =
      '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><path id="fab-ring" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0"/></defs>' +
      '<text><textPath href="#fab-ring">RESERVE ONLINE · 24H · RESERVE ONLINE · 24H · </textPath></text></svg><span>予約</span>';
    body.appendChild(fab);
    var hero = document.querySelector(".hero, .sub-head");
    var showFab = function () {
      var limit = hero ? hero.offsetHeight * 0.6 : 300;
      fab.classList.toggle("is-shown", window.scrollY > limit);
    };
    window.addEventListener("scroll", showFab, { passive: true });
    showFab();
  }

  // ---------- style gallery ----------
  var track = document.querySelector(".gallery-track");
  if (track) {
    var count = document.querySelector(".gallery-count b");
    var items = track.querySelectorAll("figure");
    var step = function () { return items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0); };
    document.querySelectorAll(".gallery-ctrl button").forEach(function (b) {
      b.addEventListener("click", function () {
        track.scrollBy({ left: step() * Number(b.getAttribute("data-dir")), behavior: reduce ? "auto" : "smooth" });
      });
    });
    track.addEventListener("scroll", function () {
      var i = Math.round(track.scrollLeft / step());
      count.textContent = String(Math.min(i + 1, items.length)).padStart(2, "0");
    }, { passive: true });
    // drag with the mouse on desktop
    var down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
      track.classList.add("is-drag");
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", function () { down = false; track.classList.remove("is-drag"); });
    track.addEventListener("click", function (e) { if (moved) e.preventDefault(); }, true);
  }

  // ---------- news from a spreadsheet ----------
  // In production this points at the salon's Google Sheet ("File > Share > Publish to web > CSV").
  var newsBox = document.querySelector('[data-sheet="news"]');
  var sheetView = document.querySelector("[data-sheet-view]");
  if (newsBox) {
    var esc = function (t) {
      return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
    };
    var parseCSV = function (text) {
      var rows = [], row = [], cell = "", q = false;
      for (var i = 0; i < text.length; i++) {
        var c = text[i];
        if (q) {
          if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
          else if (c === '"') q = false;
          else cell += c;
        } else if (c === '"') q = true;
        else if (c === ",") { row.push(cell); cell = ""; }
        else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          row.push(cell); rows.push(row); row = []; cell = "";
        } else cell += c;
      }
      if (cell || row.length) { row.push(cell); rows.push(row); }
      return rows.filter(function (r) { return r.join("").trim() !== ""; });
    };
    var rows = null;
    var paintNews = function (flash) {
      newsBox.innerHTML = rows.slice(1).map(function (r) {
        return "<li><time>" + esc((r[0] || "").replace(/-/g, ".")) + '</time><span class="tag">' + esc(r[1] || "") + "</span>" + esc(r[2] || "") + "</li>";
      }).join("");
      if (flash) {
        newsBox.classList.remove("is-fresh");
        void newsBox.offsetWidth;
        newsBox.classList.add("is-fresh");
      }
    };
    var paintGrid = function () {
      if (!sheetView) return;
      var cols = rows[0].length;
      var html = "<table><thead><tr><th></th>";
      for (var c = 0; c < cols; c++) html += "<th>" + String.fromCharCode(65 + c) + "</th>";
      html += "</tr></thead><tbody>";
      rows.forEach(function (r, ri) {
        html += '<tr class="' + (ri === 0 ? "hdr" : "") + '"><th>' + (ri + 1) + "</th>";
        for (var ci = 0; ci < cols; ci++) {
          html += "<td" + (ri > 0 ? ' contenteditable="true" spellcheck="false"' : "") + ' data-r="' + ri + '" data-c="' + ci + '">' + esc(r[ci] || "") + "</td>";
        }
        html += "</tr>";
      });
      sheetView.innerHTML = html + "</tbody></table>";
    };
    if (sheetView) {
      sheetView.addEventListener("input", function (e) {
        var td = e.target.closest("td[data-r]");
        if (!td) return;
        rows[+td.getAttribute("data-r")][+td.getAttribute("data-c")] = td.textContent;
        paintNews(true);
      });
    }
    fetch("data/news.csv", { cache: "no-store" })
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
      .then(function (text) { rows = parseCSV(text); paintNews(false); paintGrid(); })
      .catch(function () { /* keep the fallback markup */ });
  }

  // ---------- web reservation (demo) ----------
  var form = document.querySelector(".rsv-form");
  if (form) {
    var menuSel = form.elements.menu;
    var wanted = new URLSearchParams(location.search).get("menu");
    if (wanted && menuSel.querySelector('option[value="' + wanted + '"]')) menuSel.value = wanted;

    var dateIn = form.elements.date;
    var closed = form.querySelector(".closed");
    var slots = form.querySelectorAll(".slot");
    var err = form.querySelector(".form-error");
    var picked = "";
    var pad = function (n) { return ("0" + n).slice(-2); };
    var tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    dateIn.min = tmr.getFullYear() + "-" + pad(tmr.getMonth() + 1) + "-" + pad(tmr.getDate());

    var paint = function () {
      picked = "";
      closed.hidden = true;
      slots.forEach(function (s) { s.classList.remove("on"); s.disabled = false; });
      if (!dateIn.value) return;
      var p = dateIn.value.split("-");
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      if (d.getDay() === 2) {
        closed.hidden = false;
        slots.forEach(function (s) { s.disabled = true; });
        return;
      }
      var seed = d.getDate() + d.getMonth() * 5;
      slots.forEach(function (s, i) { s.disabled = (seed + i * 3) % 5 === 0; });
    };
    dateIn.addEventListener("change", paint);
    slots.forEach(function (s) {
      s.addEventListener("click", function () {
        if (s.disabled) return;
        slots.forEach(function (x) { x.classList.toggle("on", x === s); });
        picked = s.textContent;
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var miss = [];
      if (!dateIn.value || !closed.hidden) miss.push("ご希望日");
      if (!picked) miss.push("時間");
      if (!form.elements.name.value.trim()) miss.push("お名前");
      if (!/^[\d-]{10,13}$/.test(form.elements.tel.value.trim())) miss.push("電話番号");
      if (miss.length) { err.textContent = miss.join("・") + "をご確認ください。"; err.hidden = false; return; }
      err.hidden = true;
      var p = dateIn.value.split("-");
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      var week = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
      var menuText = menuSel.options[menuSel.selectedIndex].text.split(" ／ ")[0];
      var done = document.querySelector(".rsv-done");
      done.querySelector(".rsv-summary").textContent = (d.getMonth() + 1) + "月" + d.getDate() + "日（" + week + "） " + picked + "〜　" + menuText;
      form.hidden = true;
      done.hidden = false;
      done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
  }
})();
