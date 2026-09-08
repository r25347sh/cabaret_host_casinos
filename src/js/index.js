/**
 * index.html - ゲストダッシュボード + マイQR表示
 */
(function () {
  "use strict";

  const nameEl = document.getElementById("guest-name");
  const idEl = document.getElementById("guest-id");
  const p1 = document.getElementById("point1");
  const p2 = document.getElementById("point2");
  const p3 = document.getElementById("point3");
  const totalEl = document.getElementById("point-total");
  const btnRefresh = document.getElementById("btn-refresh-points");
  const refreshMsg = document.getElementById("refresh-msg");

  let guestId = null;

  function renderPoints(g) {
    const a = Number(g.point1 || 0);
    const b = Number(g.point2 || 0);
    const c = Number(g.point3 || 0);
    if (p1) p1.textContent = a;
    if (p2) p2.textContent = b;
    if (p3) p3.textContent = c;
    if (totalEl) totalEl.textContent = a + b + c;
  }

  function showMyQr(id) {
    const el = document.getElementById("my-qrcode");
    if (!el) return;
    el.innerHTML = "";
    const payload = JSON.stringify({ t: "guest", id: id });
    if (window.QRCode) {
      new QRCode(el, {
        text: payload,
        width: 220,
        height: 220,
        colorDark: "#0a0712",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      el.textContent = payload;
    }
  }

  async function loadGuest() {
    guestId = localStorage.getItem("cabaret_guest_id");
    const name = localStorage.getItem("cabaret_guest_name");
    if (!guestId || !name) {
      location.replace("regist.html");
      return;
    }
    if (nameEl) nameEl.textContent = name;
    if (idEl) idEl.textContent = guestId;
    showMyQr(guestId);

    try {
      const g = await CabaretSB.getGuest(guestId);
      if (g) {
        if (g.name) {
          localStorage.setItem("cabaret_guest_name", g.name);
          if (nameEl) nameEl.textContent = g.name;
        }
        renderPoints(g);
      } else {
        renderPoints({ point1: 0, point2: 0, point3: 0 });
      }
    } catch (e) {
      console.warn(e);
      renderPoints({ point1: 0, point2: 0, point3: 0 });
    }
  }

  async function refreshPoints() {
    if (!guestId) return;
    if (refreshMsg) refreshMsg.textContent = "更新中…";
    try {
      const g = await CabaretSB.getGuest(guestId);
      if (g) {
        renderPoints(g);
        if (refreshMsg) refreshMsg.textContent = "最新のポイントを反映しました";
      } else {
        if (refreshMsg) refreshMsg.textContent = "データが見つかりません";
      }
    } catch (e) {
      if (refreshMsg) refreshMsg.textContent = "更新失敗: " + (e.message || e);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadGuest();
    if (btnRefresh) btnRefresh.addEventListener("click", refreshPoints);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshPoints();
    });
  });
})();
