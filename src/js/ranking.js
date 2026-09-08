/**
 * ranking.html - 3Dキューブ リアルタイムランキング
 */
(function () {
  "use strict";

  const FACE_LABELS = ["総合ポイント", "ブラックジャック", "ポーカー", "大富豪"];
  const FACE_KEYS = ["total", "point1", "point2", "point3"];
  const LIST_IDS = ["list-total", "list-p1", "list-p2", "list-p3"];
  const ROTATE_MS = 8000;
  const POLL_MS = 4000;
  const TOP_N = 10;

  const cube = document.getElementById("rank-cube");
  const caption = document.getElementById("face-caption");
  const clockEl = document.getElementById("rank-clock");
  const dots = document.querySelectorAll("#face-dots .dot");

  let faceIndex = 0;
  let rotateTimer = null;

  function scoreOf(g, key) {
    if (key === "total") {
      return (
        Number(g.point1 || 0) +
        Number(g.point2 || 0) +
        Number(g.point3 || 0)
      );
    }
    return Number(g[key] || 0);
  }

  function renderList(elId, guests, key) {
    const el = document.getElementById(elId);
    if (!el) return;
    const sorted = guests
      .map((g) => ({ g, s: scoreOf(g, key) }))
      .sort((a, b) => b.s - a.s || (a.g.name || "").localeCompare(b.g.name || ""))
      .slice(0, TOP_N);

    if (!sorted.length) {
      el.innerHTML = '<li class="empty">まだデータがありません</li>';
      return;
    }

    el.innerHTML = sorted
      .map((row, i) => {
        const rank = i + 1;
        const medal =
          rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        const cls =
          rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "";
        return (
          '<li class="' +
          cls +
          '"><span class="r-pos">' +
          medal +
          '</span><span class="r-name">' +
          (row.g.name || "—") +
          '</span><span class="r-score">' +
          row.s +
          "</span></li>"
        );
      })
      .join("");
  }

  async function refresh() {
    try {
      const guests = await CabaretSB.listGuests();
      FACE_KEYS.forEach((key, i) => renderList(LIST_IDS[i], guests, key));
      if (clockEl) {
        const d = new Date();
        clockEl.textContent =
          "更新 " +
          d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
          " · " +
          guests.length +
          " guests";
      }
    } catch (err) {
      if (clockEl) clockEl.textContent = "取得失敗: " + (err.message || err);
    }
  }

  function setFace(i) {
    faceIndex = ((i % 4) + 4) % 4;
    const deg = -faceIndex * 90;
    if (cube) cube.style.transform = "translateZ(-160px) rotateY(" + deg + "deg)";
    if (caption) caption.textContent = FACE_LABELS[faceIndex];
    dots.forEach((d) => {
      d.classList.toggle("active", Number(d.getAttribute("data-i")) === faceIndex);
    });
  }

  function nextFace() {
    setFace(faceIndex + 1);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setFace(0);
    refresh();
    setInterval(refresh, POLL_MS);
    rotateTimer = setInterval(nextFace, ROTATE_MS);

    dots.forEach((d) => {
      d.addEventListener("click", () => {
        setFace(Number(d.getAttribute("data-i")));
        clearInterval(rotateTimer);
        rotateTimer = setInterval(nextFace, ROTATE_MS);
      });
    });
  });
})();
