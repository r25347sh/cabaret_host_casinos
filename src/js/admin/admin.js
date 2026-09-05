/**
 * admin.html - ポイントQR生成 + ゲスト一覧
 */
(function () {
  "use strict";

  const loginSection = document.getElementById("login-section");
  const adminPanel = document.getElementById("admin-panel");
  const loginForm = document.getElementById("login-form");
  const loginMsg = document.getElementById("login-msg");
  const userLabel = document.getElementById("admin-user-label");
  const btnLogout = document.getElementById("btn-logout");

  const gameSelect = document.getElementById("game-type");
  const pointInput = document.getElementById("point-value");
  const btnGen = document.getElementById("btn-gen-qr");
  const qrMeta = document.getElementById("qr-meta");
  const qrcodeEl = document.getElementById("qrcode");

  const guestListEl = document.getElementById("guest-list");
  const btnRefresh = document.getElementById("btn-refresh-guests");

  const GAMES = {
    1: "ブラックジャック",
    2: "ポーカー",
    3: "チンチロ",
    4: "大富豪",
  };

  function showLoginMsg(text, isErr) {
    if (!loginMsg) return;
    loginMsg.textContent = text;
    loginMsg.classList.toggle("error", !!isErr);
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

  function generateQR() {
    const game = Number(gameSelect.value);
    const value = Number(pointInput.value);
    if (!game || game < 1 || game > 4) {
      alert("ゲームを選択してください");
      return;
    }
    if (!value || value <= 0) {
      alert("ポイントは1以上で入力してください");
      return;
    }

    const payload = {
      t: "pt",
      g: game,
      v: value,
      n: GAMES[game] || "ゲーム" + game,
    };
    const text = JSON.stringify(payload);

    if (qrcodeEl) qrcodeEl.innerHTML = "";
    if (window.QRCode) {
      new QRCode(qrcodeEl, {
        text: text,
        width: 220,
        height: 220,
        colorDark: "#0a0712",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      qrcodeEl.textContent = text;
    }

    if (qrMeta) {
      qrMeta.innerHTML =
        "<strong>+" +
        value +
        " pt</strong><br>" +
        (GAMES[game] || "") +
        "<br><span style='font-size:0.75rem;opacity:0.6'>" +
        text +
        "</span>";
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
            Number(g.point3 || 0) +
            Number(g.point4 || 0);
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
            "/" +
            (g.point4 || 0) +
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
    if (btnGen) btnGen.addEventListener("click", generateQR);
    if (btnRefresh) btnRefresh.addEventListener("click", loadGuests);
  });
})();
