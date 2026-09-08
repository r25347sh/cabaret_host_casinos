/**
 * regist.html - 新規入場 / 再入場
 */
(function () {
  "use strict";

  const form = document.getElementById("regist-form");
  const nameInput = document.getElementById("nickname");
  const msgEl = document.getElementById("regist-msg");
  const idPreview = document.getElementById("id-preview");
  const submitBtn = document.getElementById("btn-regist");

  const reForm = document.getElementById("relogin-form");
  const reNameInput = document.getElementById("re-nickname");
  const reMsg = document.getElementById("relogin-msg");
  const reBtn = document.getElementById("btn-relogin");
  const candidatesEl = document.getElementById("relogin-candidates");

  const tabNew = document.getElementById("tab-new");
  const tabRe = document.getElementById("tab-re");

  let guestId = null;

  function showMsg(el, text, isErr) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("error", !!isErr);
  }

  function setMode(mode) {
    const isNew = mode === "new";
    tabNew.classList.toggle("active", isNew);
    tabRe.classList.toggle("active", !isNew);
    form.classList.toggle("hidden", !isNew);
    reForm.classList.toggle("hidden", isNew);
    showMsg(msgEl, "");
    showMsg(reMsg, "");
    if (candidatesEl) {
      candidatesEl.classList.add("hidden");
      candidatesEl.innerHTML = "";
    }
  }

  function enterAs(guest) {
    localStorage.setItem("cabaret_guest_id", guest.id);
    localStorage.setItem("cabaret_guest_name", guest.name || "");
    location.replace("index.html");
  }

  async function boot() {
    const existing = localStorage.getItem("cabaret_guest_id");
    const existingName = localStorage.getItem("cabaret_guest_name");
    if (existing && existingName) {
      try {
        const g = await CabaretSB.getGuest(existing);
        if (g && g.name) {
          location.replace("index.html");
          return;
        }
      } catch (e) {}
      localStorage.removeItem("cabaret_guest_id");
      localStorage.removeItem("cabaret_guest_name");
    }

    guestId = CabaretSB.generateId();
    localStorage.setItem("cabaret_guest_id", guestId);
    if (idPreview) idPreview.textContent = "ID: " + guestId.slice(0, 8) + "…";
  }

  async function onSubmitNew(e) {
    e.preventDefault();
    const name = (nameInput.value || "").trim();
    if (!name) {
      showMsg(msgEl, "ニックネームを入力してください", true);
      return;
    }
    if (name.length > 20) {
      showMsg(msgEl, "ニックネームは20文字以内で", true);
      return;
    }

    if (!guestId) guestId = CabaretSB.generateId();

    submitBtn.disabled = true;
    showMsg(msgEl, "登録中…");

    try {
      await CabaretSB.upsertGuest({
        id: guestId,
        name: name,
        point1: 0,
        point2: 0,
        point3: 0,
      });
      localStorage.setItem("cabaret_guest_id", guestId);
      localStorage.setItem("cabaret_guest_name", name);
      showMsg(msgEl, "登録完了！移動します…");
      setTimeout(() => location.replace("index.html"), 500);
    } catch (err) {
      console.error(err);
      showMsg(msgEl, "登録に失敗しました: " + (err.message || err), true);
      submitBtn.disabled = false;
    }
  }

  function renderCandidates(rows) {
    if (!candidatesEl) return;
    candidatesEl.classList.remove("hidden");
    candidatesEl.innerHTML =
      "<p class='cand-hint'>同名が複数います。自分のアカウントを選んでください</p>" +
      rows
        .map((g) => {
          const t =
            Number(g.point1 || 0) +
            Number(g.point2 || 0) +
            Number(g.point3 || 0);
          return (
            '<button type="button" class="cand-btn" data-id="' +
            g.id +
            '"><strong>' +
            (g.name || "—") +
            "</strong><span>" +
            g.id.slice(0, 8) +
            "… · " +
            t +
            " pt</span></button>"
          );
        })
        .join("");

    candidatesEl.querySelectorAll(".cand-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const g = rows.find((r) => r.id === id);
        if (g) enterAs(g);
      });
    });
  }

  async function onSubmitRe(e) {
    e.preventDefault();
    const name = (reNameInput.value || "").trim();
    if (!name) {
      showMsg(reMsg, "ニックネームを入力してください", true);
      return;
    }

    reBtn.disabled = true;
    showMsg(reMsg, "検索中…");
    if (candidatesEl) {
      candidatesEl.classList.add("hidden");
      candidatesEl.innerHTML = "";
    }

    try {
      const rows = await CabaretSB.findGuestsByName(name);
      if (!rows || !rows.length) {
        showMsg(
          reMsg,
          "アカウントが見つかりません（削除されたか未登録です）",
          true
        );
        reBtn.disabled = false;
        return;
      }
      if (rows.length === 1) {
        showMsg(reMsg, "見つかりました。入場します…");
        enterAs(rows[0]);
        return;
      }
      showMsg(reMsg, rows.length + "件見つかりました");
      renderCandidates(rows);
      reBtn.disabled = false;
    } catch (err) {
      showMsg(reMsg, "検索失敗: " + (err.message || err), true);
      reBtn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    boot();
    if (tabNew) tabNew.addEventListener("click", () => setMode("new"));
    if (tabRe) tabRe.addEventListener("click", () => setMode("re"));
    if (form) form.addEventListener("submit", onSubmitNew);
    if (reForm) reForm.addEventListener("submit", onSubmitRe);
  });
})();
