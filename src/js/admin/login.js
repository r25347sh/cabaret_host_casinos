/**
 * admin login - 5G-staff の users.json をそのまま利用
 */
(function () {
  "use strict";

  const ALLOWED = ["admin", "teacher", "temporary"];

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem("cabaret_staff_session") || "null");
    } catch (e) {
      return null;
    }
  }

  function setSession(user) {
    sessionStorage.setItem(
      "cabaret_staff_session",
      JSON.stringify({ id: user.id, name: user.name || user.id, role: user.role })
    );
  }

  function clearSession() {
    sessionStorage.removeItem("cabaret_staff_session");
  }

  async function loginWithCredentials(id, pass) {
    id = String(id || "").trim();
    pass = String(pass || "");
    const res = await fetch("src/data/users.json?t=" + Date.now());
    if (!res.ok) throw new Error("ユーザーデータ取得失敗");
    const users = await res.json();
    const u = users.find((x) => x.id === id && x.pass === pass);
    if (!u) throw new Error("IDまたはパスワードが違います");
    if (ALLOWED.indexOf(u.role) === -1) {
      throw new Error("管理権限がありません");
    }
    setSession(u);
    return u;
  }

  window.CabaretAdminAuth = {
    getSession,
    setSession,
    clearSession,
    loginWithCredentials,
    ALLOWED,
  };
})();
