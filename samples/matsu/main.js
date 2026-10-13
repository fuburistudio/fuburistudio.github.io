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

  // ---------- hero video ----------
  var heroVideo = document.querySelector(".hero-video");
  if (heroVideo) {
    if (reduce) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
    } else {
      // browsers hold autoplay while the tab is in the background; resume once it is shown
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden && heroVideo.paused) {
          var p = heroVideo.play();
          if (p && p.catch) p.catch(function () { /* the poster stays */ });
        }
      });
    }
  }

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

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function getStore(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function setStore(key, val) { try { sessionStorage.setItem(key, val); } catch (e) { /* storage blocked */ } }

  // ---------- news & price list from a spreadsheet ----------
  // In production these point at the shop's Google Sheet ("File > Share > Publish to web > CSV").
  var SHEETS = { news: "data/news.csv", menu: "data/menu.csv" };
  var sheetData = {};

  function parseCSV(text) {
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
  }

  var renderers = {
    news: function (rows) {
      return rows.slice(1).map(function (r) {
        return '<li class="news-item"><time>' + esc((r[0] || "").replace(/-/g, ".")) + '</time><span class="news-tag">' + esc(r[1] || "") +
          '</span><div><h3>' + esc(r[2] || "") + "</h3><p>" + esc(r[3] || "") + "</p></div></li>";
      }).join("");
    },
    menu: function (rows) {
      return rows.slice(1).map(function (r) {
        var yen = Number(String(r[3] || "").replace(/[^\d]/g, ""));
        return '<div class="menu-row"><div><h3>' + esc(r[0] || "") + "</h3><p>" + esc(r[1] || "") + '</p></div><span class="time">' +
          esc(r[2] || "") + '</span><span class="price">' + (yen ? "¥" + yen.toLocaleString("ja-JP") : esc(r[3] || "")) + "</span></div>";
      }).join("");
    }
  };

  function paintSheet(name, flash) {
    var target = document.querySelector('[data-sheet="' + name + '"]');
    if (!target || !sheetData[name]) return;
    target.innerHTML = renderers[name](sheetData[name]);
    if (flash) {
      target.classList.remove("is-fresh");
      void target.offsetWidth;
      target.classList.add("is-fresh");
    }
  }

  var sheetView = document.querySelector("[data-sheet-view]");
  var sheetTab = "news";
  function paintGrid() {
    if (!sheetView || !sheetData[sheetTab]) return;
    var rows = sheetData[sheetTab];
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
  }

  if (sheetView) {
    sheetView.addEventListener("input", function (e) {
      var td = e.target.closest("td[data-r]");
      if (!td) return;
      sheetData[sheetTab][+td.getAttribute("data-r")][+td.getAttribute("data-c")] = td.textContent;
      paintSheet(sheetTab, true);
    });
    document.querySelectorAll("[data-sheet-tab]").forEach(function (b) {
      b.addEventListener("click", function () {
        sheetTab = b.getAttribute("data-sheet-tab");
        document.querySelectorAll("[data-sheet-tab]").forEach(function (x) { x.classList.toggle("on", x === b); });
        paintGrid();
      });
    });
  }

  Object.keys(SHEETS).forEach(function (name) {
    if (!document.querySelector('[data-sheet="' + name + '"]')) return;
    fetch(SHEETS[name], { cache: "no-store" })
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
      .then(function (text) {
        sheetData[name] = parseCSV(text);
        paintSheet(name, false);
        if (name === sheetTab) paintGrid();
      })
      .catch(function () { /* keep the fallback markup */ });
  });

  // ---------- web reservation (demo) ----------
  var rsvForm = document.querySelector(".rsv-form");
  if (rsvForm) {
    var WEEK = ["日", "月", "火", "水", "木", "金", "土"];
    var dateIn = rsvForm.elements.date;
    var slotsBox = rsvForm.querySelector(".rsv-slots");
    var closedMsg = rsvForm.querySelector(".rsv-closed");
    var errBox = rsvForm.querySelector(".rsv-error");
    var picked = "";

    var tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
    dateIn.min = iso(tmr);
    var max = new Date();
    max.setDate(max.getDate() + 60);
    dateIn.max = iso(max);

    function parseDate(v) { var p = v.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function jpDate(d) { return (d.getMonth() + 1) + "月" + d.getDate() + "日（" + WEEK[d.getDay()] + "）"; }

    function drawSlots() {
      slotsBox.innerHTML = "";
      picked = "";
      closedMsg.hidden = true;
      if (!dateIn.value) return;
      var d = parseDate(dateIn.value);
      if (d.getDay() === 4) { closedMsg.hidden = false; return; }
      var seed = d.getDate() * 7 + d.getMonth() * 3;
      for (var h = 10; h <= 19; h++) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "slot";
        b.textContent = h + ":00";
        b.disabled = (seed + h * 5) % 4 === 0;
        slotsBox.appendChild(b);
      }
    }
    dateIn.addEventListener("change", drawSlots);
    slotsBox.addEventListener("click", function (e) {
      var b = e.target.closest(".slot");
      if (!b || b.disabled) return;
      slotsBox.querySelectorAll(".slot").forEach(function (x) { x.classList.toggle("on", x === b); });
      picked = b.textContent;
    });

    function mail(to, subject, body) {
      return '<div class="mail"><div class="mail-head"><b>整体院 凪</b> &lt;info@nagi.example&gt; → ' + esc(to) +
        '<span class="mail-subject">' + esc(subject) + '</span></div><div class="mail-body">' + body + "</div></div>";
    }

    rsvForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = rsvForm.elements.name.value.trim();
      var email = rsvForm.elements.email.value.trim();
      var miss = [];
      if (!dateIn.value || !closedMsg.hidden) miss.push("ご希望日");
      if (!picked) miss.push("時間");
      if (!name) miss.push("お名前");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) miss.push("メールアドレス");
      if (miss.length) {
        errBox.textContent = miss.join("・") + "をご確認ください。";
        errBox.hidden = false;
        return;
      }
      errBox.hidden = true;

      var menu = rsvForm.querySelector('input[name="menu"]:checked').value.split("|");
      var d = parseDate(dateIn.value);
      var startH = parseInt(picked, 10);
      var endM = startH * 60 + parseInt(menu[1], 10);
      var end = Math.floor(endM / 60) + ":" + ("0" + (endM % 60)).slice(-2);
      var when = jpDate(d) + " " + picked;
      var next = new Date(d);
      next.setDate(next.getDate() + 1);
      var prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      var nm = esc(name);

      var steps = [
        { when: "いますぐ", title: "お客様に確認メール", html: mail(email, "【整体院 凪】ご予約を承りました",
          nm + " 様\n\nご予約ありがとうございます。\n以下の内容で承りました。\n\n日時：" + esc(when) + "〜" + end + "\nメニュー：" + esc(menu[0]) +
          "（" + menu[1] + "分）\n場所：○○市○○町 7-8-9\n\n変更・キャンセルは、マイページまたはこのメールへの返信で承ります。") },
        { when: "いますぐ", title: "お店のGoogleカレンダーに登録", html: '<div class="gcal"><div class="gcal-day"><small>' + (d.getMonth() + 1) + "月</small><b>" +
          d.getDate() + "</b><small>" + WEEK[d.getDay()] + '</small></div><div class="gcal-ev"><b>' + nm + " 様｜" + esc(menu[0]) + "</b><small>" + picked + " – " + end +
          "　／　" + esc(email) + "</small></div></div>" },
        { when: jpDate(prev) + " 18:00", title: "前日のリマインドメール", html: mail(email, "【整体院 凪】明日のご予約のお知らせ",
          nm + " 様\n\n明日 " + esc(when) + " からのご予約をお待ちしております。\n動きやすい服装でお越しください。\n\nご来院を楽しみにしております。") },
        { when: jpDate(next) + " 10:00", title: "口コミのお願いメール", html: mail(email, "【整体院 凪】昨日はありがとうございました",
          nm + " 様\n\n昨日はご来院ありがとうございました。その後、おからだの調子はいかがですか。\nもしよろしければ、ご感想をGoogleの口コミでお聞かせください。\n\n" +
          '<span class="mail-btn">Googleで口コミを書く</span>') }
      ];

      var flow = document.querySelector("[data-auto-flow]");
      flow.innerHTML = steps.map(function (s, i) {
        return '<li class="af"><span class="af-check">0' + (i + 1) + '</span><div class="af-head"><h3>' + s.title + '</h3><span class="af-when">' + esc(s.when) +
          "</span></div><div>" + s.html + "</div></li>";
      }).join("");
      document.querySelector("[data-rsv-summary]").textContent = when + "〜 ／ " + menu[0];

      rsvForm.hidden = true;
      document.querySelector(".rsv-side").hidden = true;
      var done = document.querySelector(".rsv-done");
      done.hidden = false;
      window.scrollTo({ top: done.getBoundingClientRect().top + window.scrollY - 120, behavior: reduce ? "auto" : "smooth" });
      flow.querySelectorAll(".af").forEach(function (li, i) {
        setTimeout(function () { li.classList.add("on"); }, 250 + i * 450);
        setTimeout(function () { li.classList.add("done"); li.querySelector(".af-check").textContent = "✓"; }, 750 + i * 450);
      });
    });
  }

  // ---------- stamp card (demo) ----------
  var card = document.querySelector("[data-stamp-card]");
  if (card) {
    var STAMP_KEY = "nagi-demo-stamps";
    var LEAF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14Z"/><path d="M5 19 13 11"/></svg>';
    var REWARDS = { 5: ["ヘッドケア10分 無料", "スタンプ5個の特典"], 10: ["施術1回 ¥2,000 OFF", "スタンプ10個の特典"] };
    var grid = card.querySelector("[data-stamp-grid]");
    var countEl = card.querySelector("[data-stamp-count]");
    var couponList = document.querySelector("[data-coupons]");
    var stamps = parseInt(getStore(STAMP_KEY) || "7", 10);

    for (var n = 1; n <= 10; n++) {
      var li = document.createElement("li");
      li.className = "stamp" + (REWARDS[n] ? " gift" : "");
      li.innerHTML = n + LEAF;
      grid.appendChild(li);
    }

    function paintStamps(fresh) {
      grid.querySelectorAll(".stamp").forEach(function (s, i) { s.classList.toggle("on", i < stamps); });
      countEl.textContent = stamps;
      var html = "";
      [10, 5].forEach(function (k) {
        if (stamps >= k) {
          html += '<li class="coupon' + (fresh === k ? " is-new" : "") + '"><b>' + REWARDS[k][0] + "</b><small>" + REWARDS[k][1] + "・次回のご来院で使えます</small></li>";
        }
      });
      couponList.innerHTML = html || '<li class="coupon-empty">スタンプ5個でクーポンが届きます。</li>';
    }
    paintStamps(0);

    card.querySelector("[data-stamp-demo]").addEventListener("click", function () {
      stamps = stamps >= 10 ? 1 : stamps + 1;
      setStore(STAMP_KEY, String(stamps));
      paintStamps(REWARDS[stamps] ? stamps : 0);
    });
  }
})();
