// 整体院 凪 — member area backed by Firebase (Authentication + Firestore).
// The config below is meant to be public; access to member data is enforced by Firestore rules
// (see firebase/firestore.rules in the site repo).
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, updateProfile, signOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  applyActionCode, verifyPasswordResetCode, confirmPasswordReset
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8RgSVwlRcJAW41whSHPiudIhLqSP9lbA",
  authDomain: "fuburi-demo.firebaseapp.com",
  projectId: "fuburi-demo",
  storageBucket: "fuburi-demo.firebasestorage.app",
  messagingSenderId: "452989486184",
  appId: "1:452989486184:web:0482edab6b99e92760a7dd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "ja";
const db = getFirestore(app);

const body = document.body;
const here = (name) => new URL(name, location.href).href;
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const ERRORS = {
  "auth/email-already-in-use": "このメールアドレスはすでに登録されています。ログインしてください。",
  "auth/invalid-email": "メールアドレスの形式をご確認ください。",
  "auth/weak-password": "パスワードは8文字以上で設定してください。",
  "auth/invalid-credential": "メールアドレスまたはパスワードが正しくありません。",
  "auth/wrong-password": "メールアドレスまたはパスワードが正しくありません。",
  "auth/user-not-found": "メールアドレスまたはパスワードが正しくありません。",
  "auth/too-many-requests": "試行回数が多すぎます。しばらく時間をおいてからお試しください。",
  "auth/network-request-failed": "通信できませんでした。電波の良いところで、もう一度お試しください。",
  "auth/operation-not-allowed": "現在この方法では登録できません。（管理者の方へ：Firebaseでログイン方法を有効にしてください）",
  "auth/popup-blocked": "ログイン用の画面が開けませんでした。もう一度お試しください。",
  "auth/account-exists-with-different-credential": "このメールアドレスは別の方法で登録されています。メールアドレスとパスワードでログインしてください。",
  "auth/unauthorized-domain": "このサイトからのログインが許可されていません。（管理者の方へ：Firebaseの承認済みドメインを確認してください）",
  "auth/unauthorized-continue-uri": "このページのアドレスが許可されていません。（管理者の方へ：Firebaseの承認済みドメインを確認してください）",
  "auth/expired-action-code": "このリンクは有効期限が切れています。お手数ですが、もう一度メールを送ってください。",
  "auth/invalid-action-code": "このリンクはすでに使われたか、正しくありません。お手数ですが、もう一度メールを送ってください。",
  "permission-denied": "保存できませんでした。（管理者の方へ：Firestoreのルールを確認してください）",
  "not-found": "会員情報が見つかりませんでした。ページを再読み込みしてください。",
  "unavailable": "通信できませんでした。電波の良いところで、もう一度お試しください。"
};
const message = (err) => ERRORS[err && err.code] || "うまくいきませんでした。時間をおいて、もう一度お試しください。" + (err && err.code ? "（" + err.code + "）" : "");
const show = (el, text) => { if (!el) return; el.textContent = text; el.hidden = false; };
const busy = (form, on) => form.querySelectorAll("button, input").forEach((el) => { el.disabled = on; });
const memberRef = (user) => doc(db, "members", user.uid);
const jpDate = (iso) => { const p = iso.split("-"); const d = new Date(+p[0], +p[1] - 1, +p[2]); return (d.getMonth() + 1) + "月" + d.getDate() + "日（" + WEEK[d.getDay()] + "）"; };

// Rules check the email_verified claim inside the ID token, which is cached for up to an hour.
// Refresh it once so a member who has just verified can save straight away.
async function freshToken(user) {
  try { await user.getIdToken(true); } catch (e) { /* offline: the old token is still usable for reads */ }
}

async function ensureMember(user) {
  const ref = memberRef(user);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const data = { name: (user.displayName || "会員").slice(0, 40), stamps: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(ref, data);
  return { name: data.name, stamps: 0 };
}

// ---------- header link: ログイン / マイページ ----------
onAuthStateChanged(auth, (user) => {
  document.querySelectorAll("[data-member-link]").forEach((a) => {
    const href = a.getAttribute("href");
    if (user) {
      a.textContent = "マイページ";
      a.setAttribute("href", href.replace("login.html", "mypage.html"));
    } else {
      a.textContent = a.classList.contains("btn") ? "会員ログイン" : "ログイン";
      a.setAttribute("href", href.replace("mypage.html", "login.html"));
    }
  });
});

// ---------- continue with Google ----------
const googleButtons = document.querySelectorAll("[data-google]");
if (googleButtons.length) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const errBox = document.querySelector("[data-google-error]");
  getRedirectResult(auth).then(async (res) => {
    if (res && res.user) { await ensureMember(res.user); location.href = "mypage.html"; }
  }).catch((ex) => show(errBox, message(ex)));
  googleButtons.forEach((b) => b.addEventListener("click", async () => {
    if (errBox) errBox.hidden = true;
    b.disabled = true;
    try {
      const { user } = await signInWithPopup(auth, provider);
      await ensureMember(user);
      location.href = "mypage.html";
    } catch (ex) {
      b.disabled = false;
      if (ex.code === "auth/popup-closed-by-user" || ex.code === "auth/cancelled-popup-request") return;
      if (ex.code === "auth/popup-blocked") { await signInWithRedirect(auth, provider); return; }
      show(errBox, message(ex));
    }
  }));
}

// ---------- sign up ----------
const reg = document.querySelector(".reg-form");
if (reg) {
  const err = reg.querySelector(".auth-error");
  reg.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    const name = reg.elements.name.value.trim();
    const email = reg.elements.email.value.trim();
    const pass = reg.elements.password.value;
    const miss = [];
    if (!name) miss.push("お名前");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) miss.push("メールアドレス");
    if (pass.length < 8) miss.push("パスワード（8文字以上）");
    if (!reg.elements.agree.checked) miss.push("規約への同意");
    if (miss.length) { show(err, miss.join("・") + "をご確認ください。"); return; }
    busy(reg, true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(user, { displayName: name.slice(0, 40) });
      await setDoc(memberRef(user), { name: name.slice(0, 40), stamps: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await sendEmailVerification(user, { url: here("mypage.html") });
      location.href = "mypage.html";
    } catch (ex) {
      busy(reg, false);
      show(err, message(ex));
    }
  });
}

// ---------- log in + password reset ----------
const login = document.querySelector(".login-form");
if (login) {
  const err = login.querySelector(".auth-error");
  onAuthStateChanged(auth, (user) => { if (user) location.replace("mypage.html"); });
  login.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    busy(login, true);
    try {
      await signInWithEmailAndPassword(auth, login.elements.email.value.trim(), login.elements.password.value);
      location.href = "mypage.html";
    } catch (ex) {
      busy(login, false);
      show(err, message(ex));
    }
  });

  const resetForm = document.querySelector(".reset-form");
  const resetToggle = document.querySelector("[data-reset-toggle]");
  if (resetForm && resetToggle) {
    resetToggle.addEventListener("click", () => {
      resetForm.hidden = !resetForm.hidden;
      if (!resetForm.hidden) resetForm.elements.email.value = login.elements.email.value.trim();
    });
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const note = resetForm.querySelector(".auth-note-ok");
      const rErr = resetForm.querySelector(".auth-error");
      note.hidden = true;
      rErr.hidden = true;
      try {
        await sendPasswordResetEmail(auth, resetForm.elements.email.value.trim(), { url: here("login.html") });
        show(note, "再設定用のメールを送りました。届いたメールのリンクから、新しいパスワードを設定してください。");
      } catch (ex) {
        show(rErr, message(ex));
      }
    });
  }
}

// ---------- links from the emails (verify address / reset password) ----------
const actionPage = document.querySelector("[data-action-page]");
if (actionPage) {
  const q = new URLSearchParams(location.search);
  const mode = q.get("mode");
  const code = q.get("oobCode");
  const next = q.get("continueUrl") || here("mypage.html");
  const title = actionPage.querySelector("[data-action-title]");
  const text = actionPage.querySelector("[data-action-text]");
  const go = actionPage.querySelector("[data-action-go]");
  const resetBox = actionPage.querySelector(".newpass-form");
  const fail = (ex) => { title.textContent = "うまくいきませんでした"; text.textContent = message(ex); go.textContent = "ログイン画面へ"; go.href = "login.html"; go.hidden = false; };

  if (!code) {
    fail({ code: "auth/invalid-action-code" });
  } else if (mode === "verifyEmail") {
    applyActionCode(auth, code).then(async () => {
      if (auth.currentUser) { await auth.currentUser.reload(); await freshToken(auth.currentUser); }
      actionPage.classList.add("is-done");
      title.textContent = "メールアドレスの確認が完了しました";
      text.textContent = "ありがとうございます。マイページのすべての機能がご利用いただけます。";
      go.textContent = "マイページへ進む";
      go.href = next;
      go.hidden = false;
    }).catch(fail);
  } else if (mode === "resetPassword") {
    verifyPasswordResetCode(auth, code).then((email) => {
      title.textContent = "新しいパスワードを設定";
      text.textContent = email + " の新しいパスワードを入力してください。";
      resetBox.hidden = false;
      resetBox.addEventListener("submit", async (e) => {
        e.preventDefault();
        const rErr = resetBox.querySelector(".auth-error");
        rErr.hidden = true;
        const pass = resetBox.elements.password.value;
        if (pass.length < 8) { show(rErr, "パスワードは8文字以上で設定してください。"); return; }
        busy(resetBox, true);
        try {
          await confirmPasswordReset(auth, code, pass);
          resetBox.hidden = true;
          actionPage.classList.add("is-done");
          title.textContent = "パスワードを変更しました";
          text.textContent = "新しいパスワードでログインしてください。";
          go.textContent = "ログイン画面へ";
          go.href = "login.html";
          go.hidden = false;
        } catch (ex) {
          busy(resetBox, false);
          show(rErr, message(ex));
        }
      });
    }).catch(fail);
  } else {
    fail({});
  }
}

// ---------- reservation page: book as a member ----------
const rsvForm = document.querySelector(".rsv-form");
if (rsvForm) {
  let member = null;
  onAuthStateChanged(auth, async (user) => {
    if (!user || !user.emailVerified) return;
    member = user;
    const banner = document.querySelector("[data-rsv-member]");
    rsvForm.elements.name.value = user.displayName || "";
    rsvForm.elements.email.value = user.email || "";
    rsvForm.classList.add("is-member");
    if (banner) {
      banner.querySelector("[data-rsv-member-name]").textContent = user.displayName || "会員";
      try {
        const snap = await getDoc(memberRef(user));
        const b = snap.exists() && snap.data().booking;
        if (b) show(banner.querySelector("[data-rsv-member-note]"), "現在のご予約（" + jpDate(b.date) + " " + b.time + "〜 " + b.menu + "）は、この新しい予約に置きかわります。日時だけ変えたいときは、マイページの「日時を変更する」からどうぞ。");
      } catch (e) { /* the note is optional */ }
      banner.hidden = false;
    }
  });

  document.addEventListener("nagi:reserved", async (e) => {
    if (!member) return;
    const out = document.querySelector("[data-rsv-saved]");
    try {
      await freshToken(member);
      await updateDoc(memberRef(member), { booking: e.detail, updatedAt: serverTimestamp() });
      if (out) out.hidden = false;
    } catch (ex) {
      if (out) { out.hidden = false; out.textContent = message(ex); }
    }
  });
}

// ---------- my page ----------
if (body.hasAttribute("data-requires-login")) {
  const gate = document.querySelector("[data-verify]");
  const content = document.querySelector("[data-member-content]");
  document.querySelectorAll("[data-logout]").forEach((b) => b.addEventListener("click", async () => {
    await signOut(auth);
    location.href = "login.html";
  }));

  onAuthStateChanged(auth, async (user) => {
    if (!user) { location.replace("login.html"); return; }
    document.querySelectorAll("[data-member-name]").forEach((el) => { el.textContent = user.displayName || "会員"; });

    if (!user.emailVerified) {
      body.classList.remove("auth-pending");
      content.hidden = true;
      gate.hidden = false;
      gate.querySelector("[data-verify-email]").textContent = user.email;
      const out = gate.querySelector(".auth-note-ok");
      gate.querySelector("[data-verify-resend]").onclick = async () => {
        try {
          await sendEmailVerification(user, { url: here("mypage.html") });
          show(out, "確認メールをもう一度送りました。");
        } catch (ex) { show(out, message(ex)); }
      };
      gate.querySelector("[data-verify-check]").onclick = async () => {
        await user.reload();
        if (auth.currentUser.emailVerified) { await freshToken(auth.currentUser); location.reload(); }
        else show(out, "まだ確認が済んでいないようです。メールのリンクを押してから、もう一度お試しください。");
      };
      return;
    }

    gate.hidden = true;
    content.hidden = false;
    await freshToken(user);
    let data = { name: user.displayName || "会員", stamps: 0 };
    let loadError = null;
    try { data = await ensureMember(user); } catch (ex) { loadError = ex; console.warn("member data", ex); }
    body.classList.remove("auth-pending");
    stampCard(user, Number(data.stamps) || 0, loadError);
    bookingCard(user, data.booking || null);
  });
}

function stampCard(user, start, loadError) {
  const card = document.querySelector("[data-stamp-card]");
  if (!card) return;
  const LEAF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14Z"/><path d="M5 19 13 11"/></svg>';
  const REWARDS = { 5: ["ヘッドケア10分 無料", "スタンプ5個の特典"], 10: ["施術1回 ¥2,000 OFF", "スタンプ10個の特典"] };
  const grid = card.querySelector("[data-stamp-grid]");
  const countEl = card.querySelector("[data-stamp-count]");
  const coupons = document.querySelector("[data-coupons]");
  const note = card.querySelector("[data-stamp-msg]");
  let stamps = start;

  grid.innerHTML = "";
  for (let n = 1; n <= 10; n++) {
    const li = document.createElement("li");
    li.className = "stamp" + (REWARDS[n] ? " gift" : "");
    li.innerHTML = n + LEAF;
    grid.appendChild(li);
  }

  const paint = (fresh) => {
    grid.querySelectorAll(".stamp").forEach((s, i) => s.classList.toggle("on", i < stamps));
    countEl.textContent = stamps;
    let html = "";
    [10, 5].forEach((k) => {
      if (stamps >= k) html += '<li class="coupon' + (fresh === k ? " is-new" : "") + '"><b>' + REWARDS[k][0] + "</b><small>" + REWARDS[k][1] + "・次回のご来院で使えます</small></li>";
    });
    coupons.innerHTML = html || '<li class="coupon-empty">スタンプ5個でクーポンが届きます。</li>';
  };
  paint(0);
  if (loadError) show(note, message(loadError));

  const btn = card.querySelector("[data-stamp-demo]");
  btn.addEventListener("click", async () => {
    const next = stamps >= 10 ? 1 : stamps + 1;
    btn.disabled = true;
    if (note) note.hidden = true;
    try {
      await updateDoc(memberRef(user), { stamps: next, updatedAt: serverTimestamp() });
      stamps = next;
      paint(stamps === 5 || stamps === 10 ? stamps : 0);
    } catch (ex) {
      if (ex.code === "not-found") {
        try { await ensureMember(user); show(note, "会員情報を用意しました。もう一度押してください。"); } catch (e2) { show(note, message(e2)); }
      } else {
        show(note, message(ex));
      }
    }
    btn.disabled = false;
  });
}

function bookingCard(user, booking) {
  const card = document.querySelector("[data-booking]");
  if (!card) return;
  const view = card.querySelector("[data-booking-view]");
  const empty = card.querySelector("[data-booking-empty]");
  const edit = card.querySelector("[data-booking-edit]");
  const msg = card.querySelector("[data-booking-msg]");
  const slotsBox = edit.querySelector("[data-edit-slots]");
  const closed = edit.querySelector(".rsv-closed");
  const err = edit.querySelector(".auth-error");
  let current = booking;
  let picked = "";

  const paint = () => {
    edit.hidden = true;
    if (!current) { view.hidden = true; empty.hidden = false; return; }
    empty.hidden = true;
    view.hidden = false;
    view.querySelector("[data-booking-when]").textContent = jpDate(current.date) + " " + current.time;
    view.querySelector("[data-booking-menu]").textContent = current.menu + "（" + current.minutes + "分）／ 担当：凪 院長";
  };
  paint();

  const drawSlots = () => {
    slotsBox.innerHTML = "";
    picked = "";
    closed.hidden = true;
    const v = edit.elements.date.value;
    if (!v) return;
    const p = v.split("-");
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (d.getDay() === 4) { closed.hidden = false; return; }
    const seed = d.getDate() * 7 + d.getMonth() * 3;
    for (let h = 10; h <= 19; h++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "slot";
      b.textContent = h + ":00";
      b.disabled = (seed + h * 5) % 4 === 0;
      slotsBox.appendChild(b);
    }
  };
  slotsBox.addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b || b.disabled) return;
    slotsBox.querySelectorAll(".slot").forEach((x) => x.classList.toggle("on", x === b));
    picked = b.textContent;
  });
  edit.elements.date.addEventListener("change", drawSlots);

  card.querySelector("[data-booking-change]").addEventListener("click", () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const pad = (n) => ("0" + n).slice(-2);
    edit.elements.date.min = tmr.getFullYear() + "-" + pad(tmr.getMonth() + 1) + "-" + pad(tmr.getDate());
    edit.elements.date.value = current.date;
    drawSlots();
    msg.hidden = true;
    err.hidden = true;
    view.hidden = true;
    edit.hidden = false;
  });
  edit.querySelector("[data-edit-close]").addEventListener("click", paint);

  edit.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    if (!edit.elements.date.value || !closed.hidden || !picked) { show(err, "新しい日付と時間を選んでください。"); return; }
    const changed = { menu: current.menu, minutes: current.minutes, date: edit.elements.date.value, time: picked };
    busy(edit, true);
    try {
      await updateDoc(memberRef(user), { booking: changed, updatedAt: serverTimestamp() });
      current = changed;
      paint();
      show(msg, "ご予約を " + jpDate(current.date) + " " + current.time + " に変更しました。確認のメールをお送りします（サンプルのため実際には届きません）。");
    } catch (ex) {
      show(err, message(ex));
    }
    busy(edit, false);
  });

  card.querySelector("[data-booking-cancel]").addEventListener("click", async () => {
    if (!window.confirm(jpDate(current.date) + " " + current.time + " のご予約をキャンセルしますか？")) return;
    try {
      await updateDoc(memberRef(user), { booking: null, updatedAt: serverTimestamp() });
      current = null;
      paint();
      show(msg, "ご予約をキャンセルしました。");
    } catch (ex) {
      show(msg, message(ex));
    }
  });
}
