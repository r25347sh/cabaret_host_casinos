/**
 * admin.html - ゲストQR読取 → 自由入力でポイント付与
 */
(function () {
  "use strict";

  const loginSection = document.getElementById("login-section");
  const adminPanel = document.getElementById("admin-panel");
  const loginForm = document.getElementById("login-form");
  const loginMsg = document.getElementById("login-msg");
  const userLabel = document.getElementById("admin-user-label");
  const btnLogout = document.getElementById("btn-logout");

  const btnStartScan = document.getElementById("btn-start-scan");
  const btnStopScan = document.getElementById("btn-stop-scan");
  const scanMsg = document.getElementById("scan-msg");
  const grantForm = document.getElementById("grant-form");
  const grantName = document.getElementById("grant-name");
  const grantIdEl = document.getElementById("grant-id");
  const gameSelect = document.getElementById("game-type");
  const pointInput = document.getElementById("point-value");
  const btnGrant = document.getElementById("btn-grant");
  const btnClearGuest = document.getElementById("btn-clear-guest");
  const grantMsg = document.getElementById("grant-msg");

  const guestListEl = document.getElementById("guest-list");
  const btnRefresh = document.getElementById("btn-refresh-guests");

  const GAMES = {
    1: "ブラックジャック",
    2: "ポーカー",
    3: "大富豪",
  };

  let html5QrCode = null;
  let scanning = false;
  let currentGuestId = null;

  function showLoginMsg(text, isErr) {
    if (!loginMsg) return;
    loginMsg.textContent = text;
    loginMsg.classList.toggle("error", !!isErr);
  }

  function showScanMsg(text, isErr) {
    if (!scanMsg) return;
    scanMsg.textContent = text || "";
    scanMsg.classList.toggle("error", !!isErr);
  }

  function showGrantMsg(text, isErr) {
    if (!grantMsg) return;
    grantMsg.textContent = text || "";
    grantMsg.classList.toggle("error", !!isErr);
  }

  function enterAdmin(u) {
    if (loginSection) loginSection.classList.add("hidden");
    if (adminPanel) adminPanel.classList.remove("hidden");
    if (userLabel) userLabel.textContent = (u.name || u.id) + "（" + u.role + "）";
    loadGuests();
  }

  async function doLogin(e) {
    e.preventDefault();
    const id = document.getElementById("login-id").value.trim();
    const pass = document.getElementById("login-pass").value;
    try {
      const u = await CabaretAdminAuth.loginWithCredentials(id, pass);
      enterAdmin(u);
    } catch (err) {
      showLoginMsg(err.message || String(err), true);
    }
  }

  function parseGuestPayload(raw) {
    const text = String(raw || "").trim();
    if (!text) throw new Error("空のQRです");
    try {
      const obj = JSON.parse(text);
      if (obj.t === "guest" && obj.id) return String(obj.id);
      if (obj.id) return String(obj.id);
    } catch (e) {
      if (/^[0-9a-f-]{8,}$/i.test(text)) return text;
    }
    throw new Error("ゲストQRではありません");
  }

  async function onGuestScanned(raw) {
    try {
      const id = parseGuestPayload(raw);
      showScanMsg("ゲスト情報を取得中…");
      const g = await CabaretSB.getGuest(id);
      if (!g) {
        showScanMsg("未登録のゲストです", true);
        return;
      }
      currentGuestId = id;
      if (grantName) grantName.textContent = g.name || "—";
      if (grantIdEl) grantIdEl.textContent = id.slice(0, 8) + "…";
      if (grantForm) grantForm.classList.remove("hidden");
      if (pointInput) {
        pointInput.value = "";
        pointInput.focus();
      }
      showScanMsg("ゲストを読み取りました。点数を入力してください");
      showGrantMsg("");
      await stopScan();
    } catch (err) {
      showScanMsg(err.message || String(err), true);
    }
  }

  async function startScan() {
    if (scanning) return;
    if (!window.Html5Qrcode) {
      showScanMsg("QRライブラリ未読込", true);
      return;
    }
    scanning = true;
    btnStartScan.classList.add("hidden");
    btnStopScan.classList.remove("hidden");
    showScanMsg("カメラ起動中…");

    html5QrCode = new Html5Qrcode("staff-reader");
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          if (!scanning) return;
          scanning = false;
          await onGuestScanned(decoded);
        },
        () => {}
      );
      showScanMsg("ゲストのマイQRを枠内に合わせてください");
    } catch (err) {
      showScanMsg("カメラ起動失敗: " + (err.message || err), true);
      scanning = false;
      btnStartScan.classList.remove("hidden");
      btnStopScan.classList.add("hidden");
    }
  }

  async function stopScan() {
    scanning = false;
    if (btnStopScan) btnStopScan.classList.add("hidden");
    if (btnStartScan) btnStartScan.classList.remove("hidden");
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch (e) {}
      html5QrCode = null;
    }
  }

  function clearGuest() {
    currentGuestId = null;
    if (grantForm) grantForm.classList.add("hidden");
    if (grantName) grantName.textContent = "—";
    if (grantIdEl) grantIdEl.textContent = "";
    if (pointInput) pointInput.value = "";
    showGrantMsg("");
    showScanMsg("");
  }

  async function grantPoints() {
    if (!currentGuestId) {
      showGrantMsg("先にゲストQRを読んでください", true);
      return;
    }
    const game = Number(gameSelect.value);
    const value = Number(pointInput.value);
    if (!game || game < 1 || game > 3) {
      showGrantMsg("ゲームを選択してください", true);
      return;
    }
    if (!value || value <= 0 || !Number.isFinite(value)) {
      showGrantMsg("1以上の点数を入力してください", true);
      return;
    }

    btnGrant.disabled = true;
    showGrantMsg("付与中…");

    try {
      const key = "point" + game;
      const updated = await CabaretSB.addPoints(currentGuestId, key, value);
      const label = GAMES[game] || "ゲーム" + game;
      const total =
        Number(updated.point1 || 0) +
        Number(updated.point2 || 0) +
        Number(updated.point3 || 0);
      showGrantMsg(
        "+" + value + " pt（" + label + "）→ " +
        (grantName.textContent || "") + " 合計 " + total + " pt"
      );
      if (pointInput) pointInput.value = "";
      loadGuests();
    } catch (err) {
      showGrantMsg("付与失敗: " + (err.message || err), true);
    } finally {
      btnGrant.disabled = false;
    }
  }

  async function loadGuests() {
    if (!guestListEl) return;
    guestListEl.innerHTML = "<p class='form-msg'>読込中…</p>";
    try {
      const res = await fetch(
        CabaretSB.SUPABASE_URL + "/rest/v1/guests?select=*&order=name.asc",
        {
          headers: {
            apikey: CabaretSB.SUPABASE_ANON_KEY,
            Authorization: "Bearer " + CabaretSB.SUPABASE_ANON_KEY,
          },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      if (!rows.length) {
        guestListEl.innerHTML = "<p class='form-msg'>まだゲストがいません</p>";
        return;
      }
      guestListEl.innerHTML = rows
        .map((g) => {
          const t =
            Number(g.point1 || 0) +
            Number(g.point2 || 0) +
            Number(g.point3 || 0);
          return (
            '<div class="guest-row"><span>' +
            (g.name || "—") +
            '<br><small style="opacity:0.5">' +
            (g.id || "").slice(0, 8) +
            "…</small></span>" +
            '<span class="pts">' +
            t +
            " pt<br><small style='opacity:0.7'>[" +
            (g.point1 || 0) +
            "/" +
            (g.point2 || 0) +
            "/" +
            (g.point3 || 0) +
            "]</small></span></div>"
          );
        })
        .join("");
    } catch (err) {
      guestListEl.innerHTML =
        "<p class='form-msg error'>取得失敗: " + (err.message || err) + "</p>";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const sess = CabaretAdminAuth.getSession();
    if (sess && CabaretAdminAuth.ALLOWED.indexOf(sess.role) !== -1) {
      enterAdmin(sess);
    }

    if (loginForm) loginForm.addEventListener("submit", doLogin);
    if (btnLogout)
      btnLogout.addEventListener("click", () => {
        CabaretAdminAuth.clearSession();
        location.reload();
      });
    if (btnStartScan) btnStartScan.addEventListener("click", startScan);
    if (btnStopScan) btnStopScan.addEventListener("click", stopScan);
    if (btnGrant) btnGrant.addEventListener("click", grantPoints);
    if (btnClearGuest) btnClearGuest.addEventListener("click", clearGuest);
    if (btnRefresh) btnRefresh.addEventListener("click", loadGuests);
  });
})();
