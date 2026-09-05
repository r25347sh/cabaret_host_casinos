/**
 * index.html - ゲストダッシュボード + QRスキャンでポイント加算
 */
(function () {
  "use strict";

  const nameEl = document.getElementById("guest-name");
  const idEl = document.getElementById("guest-id");
  const p1 = document.getElementById("point1");
  const p2 = document.getElementById("point2");
  const p3 = document.getElementById("point3");
  const p4 = document.getElementById("point4");
  const totalEl = document.getElementById("point-total");
  const scanResult = document.getElementById("scan-result");
  const btnScan = document.getElementById("btn-start-scan");
  const btnStop = document.getElementById("btn-stop-scan");

  let guestId = null;
  let html5QrCode = null;
  let scanning = false;

  function showResult(text, isErr) {
    if (!scanResult) return;
    scanResult.textContent = text;
    scanResult.classList.toggle("error", !!isErr);
    scanResult.classList.remove("hidden");
  }

  function renderPoints(g) {
    const a = Number(g.point1 || 0);
    const b = Number(g.point2 || 0);
    const c = Number(g.point3 || 0);
    const d = Number(g.point4 || 0);
    if (p1) p1.textContent = a;
    if (p2) p2.textContent = b;
    if (p3) p3.textContent = c;
    if (p4) p4.textContent = d;
    if (totalEl) totalEl.textContent = a + b + c + d;
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

    try {
      const g = await CabaretSB.getGuest(guestId);
      if (g) {
        if (g.name) {
          localStorage.setItem("cabaret_guest_name", g.name);
          if (nameEl) nameEl.textContent = g.name;
        }
        renderPoints(g);
      } else {
        renderPoints({ point1: 0, point2: 0, point3: 0, point4: 0 });
      }
    } catch (e) {
      console.warn(e);
      renderPoints({ point1: 0, point2: 0, point3: 0, point4: 0 });
    }
  }

  async function handleQr(text) {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      showResult("無効なQRです", true);
      return;
    }
    if (payload.t !== "pt" || !payload.g || payload.v == null) {
      showResult("ポイントQRではありません", true);
      return;
    }
    const game = Number(payload.g);
    if (game < 1 || game > 4) {
      showResult("ゲーム番号が不正です", true);
      return;
    }
    const amount = Number(payload.v);
    if (!amount || amount <= 0) {
      showResult("ポイント値が不正です", true);
      return;
    }

    const key = "point" + game;
    showResult("ポイント加算中…");

    try {
      const updated = await CabaretSB.addPoints(guestId, key, amount);
      renderPoints(updated || {});
      const label = payload.n || "ゲーム" + game;
      showResult("+" + amount + " pt 獲得！（" + label + "）");
      stopScan();
    } catch (err) {
      console.error(err);
      showResult("加算失敗: " + (err.message || err), true);
    }
  }

  async function startScan() {
    if (scanning) return;
    if (!window.Html5Qrcode) {
      showResult("QRライブラリ未読込", true);
      return;
    }
    scanning = true;
    btnScan.classList.add("hidden");
    btnStop.classList.remove("hidden");
    showResult("カメラを起動中…");

    html5QrCode = new Html5Qrcode("reader");
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded) => {
          if (!scanning) return;
          scanning = false;
          await handleQr(decoded);
        },
        () => {}
      );
      showResult("QRを枠内に合わせてください");
    } catch (err) {
      showResult("カメラ起動失敗: " + (err.message || err), true);
      scanning = false;
      btnScan.classList.remove("hidden");
      btnStop.classList.add("hidden");
    }
  }

  async function stopScan() {
    scanning = false;
    btnStop.classList.add("hidden");
    btnScan.classList.remove("hidden");
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch (e) {}
      html5QrCode = null;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadGuest();
    if (btnScan) btnScan.addEventListener("click", startScan);
    if (btnStop) btnStop.addEventListener("click", stopScan);
  });
})();
