/**
 * regist.html - ゲスト初回登録
 */
(function () {
  "use strict";

  const form = document.getElementById("regist-form");
  const nameInput = document.getElementById("nickname");
  const msgEl = document.getElementById("regist-msg");
  const idPreview = document.getElementById("id-preview");
  const submitBtn = document.getElementById("btn-regist");

  let guestId = null;

  function showMsg(text, isErr) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.classList.toggle("error", !!isErr);
  }

  async function boot() {
    const existing = localStorage.getItem("cabaret_guest_id");
    const existingName = localStorage.getItem("cabaret_guest_name");
    if (existing && existingName) {
      location.replace("index.html");
      return;
    }

    guestId = await CabaretSB.ensureGuest();
    if (idPreview) {
      idPreview.textContent = "ID: " + guestId.slice(0, 8) + "…";
    }

    try {
      const g = await CabaretSB.getGuest(guestId);
      if (g && g.name) {
        localStorage.setItem("cabaret_guest_name", g.name);
        location.replace("index.html");
        return;
      }
    } catch (e) {}
  }

  async function onSubmit(e) {
    e.preventDefault();
    const name = (nameInput.value || "").trim();
    if (!name || name.length < 1) {
      showMsg("ニックネームを入力してください", true);
      return;
    }
    if (name.length > 20) {
      showMsg("ニックネームは20文字以内で", true);
      return;
    }

    submitBtn.disabled = true;
    showMsg("登録中…");

    try {
      await CabaretSB.upsertGuest({
        id: guestId,
        name: name,
        point1: 0,
        point2: 0,
        point3: 0,
        point4: 0,
      });
      localStorage.setItem("cabaret_guest_id", guestId);
      localStorage.setItem("cabaret_guest_name", name);
      showMsg("登録完了！移動します…");
      setTimeout(() => {
        location.replace("index.html");
      }, 600);
    } catch (err) {
      console.error(err);
      showMsg("登録に失敗しました: " + (err.message || err), true);
      submitBtn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    boot();
    if (form) form.addEventListener("submit", onSubmit);
  });
})();
