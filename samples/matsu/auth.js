// 整体院 凪 — member sign-up / login backed by Firebase (Authentication + Firestore).
// The config below is meant to be public; access to member data is enforced by Firestore rules
// (see firestore.rules next to this file).
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, updateProfile, signOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult
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
const ERRORS = {
  "auth/email-already-in-use": "このメールアドレスはすでに登録されています。ログインしてください。",
  "auth/invalid-email": "メールアドレスの形式をご確認ください。",
  "auth/weak-password": "パスワードは8文字以上で設定してください。",
  "auth/invalid-credential": "メールアドレスまたはパスワードが正しくありません。",
  "auth/wrong-password": "メールアドレスまたはパスワードが正しくありません。",
  "auth/user-not-found": "メールアドレスまたはパスワードが正しくありません。",
  "auth/too-many-requests": "試行回数が多すぎます。しばらく時間をおいてからお試しください。",
  "auth/network-request-failed": "通信できませんでした。電波の良いところで、もう一度お試しください。",
  "auth/operation-not-allowed": "現在この方法では登録できません。（管理者の方へ：Firebaseでメール／パスワードのログインを有効にしてください）",
  "auth/popup-blocked": "ログイン用の画面が開けませんでした。もう一度お試しください。",
  "auth/account-exists-with-different-credential": "このメールアドレスは別の方法で登録されています。メールアドレスとパスワードでログインしてください。",
  "auth/unauthorized-domain": "このサイトからのログインが許可されていません。（管理者の方へ：Firebaseの承認済みドメインを確認してください）",
  "auth/unauthorized-continue-uri": "このページのアドレスが許可されていません。（管理者の方へ：Firebaseの承認済みドメインを確認してください）"
};
const message = (err) => ERRORS[err && err.code] || "うまくいきませんでした。時間をおいて、もう一度お試しください。" + (err && err.code ? "（" + err.code + "）" : "");
const show = (el, text) => { if (!el) return; el.textContent = text; el.hidden = false; };
const busy = (form, on) => form.querySelectorAll("button, input").forEach((el) => { el.disabled = on; });

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
async function ensureMember(user) {
  const ref = doc(db, "members", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { name: (user.displayName || "会員").slice(0, 40), stamps: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

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
      await setDoc(doc(db, "members", user.uid), { name: name.slice(0, 40), stamps: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
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
        if (auth.currentUser.emailVerified) location.reload();
        else show(out, "まだ確認が済んでいないようです。メールのリンクを押してから、もう一度お試しください。");
      };
      return;
    }

    gate.hidden = true;
    content.hidden = false;
    const ref = doc(db, "members", user.uid);
    let data = { name: user.displayName || "会員", stamps: 0 };
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) data = snap.data();
      else await setDoc(ref, { name: data.name, stamps: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (ex) {
      console.warn("member data", ex);
    }
    body.classList.remove("auth-pending");
    stampCard(ref, Number(data.stamps) || 0);
  });
}

function stampCard(ref, start) {
  const card = document.querySelector("[data-stamp-card]");
  if (!card) return;
  const LEAF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14Z"/><path d="M5 19 13 11"/></svg>';
  const REWARDS = { 5: ["ヘッドケア10分 無料", "スタンプ5個の特典"], 10: ["施術1回 ¥2,000 OFF", "スタンプ10個の特典"] };
  const grid = card.querySelector("[data-stamp-grid]");
  const countEl = card.querySelector("[data-stamp-count]");
  const coupons = document.querySelector("[data-coupons]");
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

  const btn = card.querySelector("[data-stamp-demo]");
  btn.addEventListener("click", async () => {
    const next = stamps >= 10 ? 1 : stamps + 1;
    btn.disabled = true;
    try {
      await updateDoc(ref, { stamps: next, updatedAt: serverTimestamp() });
      stamps = next;
      paint(REWARDS[stamps] ? stamps : 0);
    } catch (ex) {
      console.warn("stamp", ex);
    }
    btn.disabled = false;
  });
}
