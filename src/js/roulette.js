/**
 * Cabaret Host Casinos - Roulette (4 segments: 1, 2, 3, 4)
 *
 * Segment layout (wheel local, clockwise from top):
 *   1  pink   center 0°   range [-45°, 45°)
 *   2  dark   center 90°  range [45°, 135°)
 *   3  cyan   center 180° range [135°, 225°)
 *   4  purple center 270° range [225°, 315°)
 *
 * CSS rotate positive = clockwise.
 * After rotation R, local angle under the top pointer =
 *   (360 - (R % 360)) % 360
 */
(function () {
  "use strict";

  const SEGMENTS = ["1", "2", "3", "4"];
  const CENTERS = [0, 90, 180, 270]; // degrees, wheel-local

  const FLAVORS = {
    "1": ["ピンクが熱い！", "1番乗り！", "ラッキーピンク ✨", "キレてる1！"],
    "2": ["ダークサイド…", "2で決めろ", "クールに2", "影の主役"],
    "3": ["シアン炸裂！", "3の勝ち！", "水色チャージ ⚡", "清涼フィニッシュ"],
    "4": ["パープル降臨", "4でキメ！", "紫のオーラ", "最終兵器4"]
  };

  const wheel = document.getElementById("wheel");
  const btnSpin = document.getElementById("btn-spin");
  const resultLabel = document.getElementById("result-label");
  const resultValue = document.getElementById("result-value");
  const resultFlavor = document.getElementById("result-flavor");
  const stage = document.getElementById("stage");
  const spinGlow = document.getElementById("spin-glow");
  const confettiLayer = document.getElementById("confetti");

  if (!wheel || !btnSpin) return;

  // Place labels at segment centers (polar)
  document.querySelectorAll(".seg-label").forEach((el) => {
    const i = Number(el.dataset.i);
    el.style.setProperty("--angle", CENTERS[i] + "deg");
  });

  let currentRotation = 0;
  let spinning = false;

  function pickIndex() {
    return Math.floor(Math.random() * SEGMENTS.length);
  }

  function pickFlavor(num) {
    const list = FLAVORS[num] || ["Nice!"];
    return list[Math.floor(Math.random() * list.length)];
  }

  /** Map final rotation → segment index (must match visual) */
  function indexFromRotation(R) {
    const mod = ((R % 360) + 360) % 360;
    // local angle under pointer
    const local = (360 - mod) % 360;
    // [-45, 45) → 0, [45,135) → 1, ...  wrap for 1
    if (local >= 315 || local < 45) return 0;
    if (local < 135) return 1;
    if (local < 225) return 2;
    return 3;
  }

  function burstConfetti() {
    if (!confettiLayer) return;
    const colors = ["#ff2d95", "#00f5ff", "#ffd700", "#9b5de5", "#fff", "#ff6b8a"];
    const n = 36;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = 20 + Math.random() * 60 + "%";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", (Math.random() - 0.5) * 220 + "px");
      p.style.setProperty("--rot", 200 + Math.random() * 520 + "deg");
      p.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
      p.style.animationDelay = Math.random() * 0.15 + "s";
      p.style.width = 6 + Math.random() * 6 + "px";
      p.style.height = 8 + Math.random() * 8 + "px";
      confettiLayer.appendChild(p);
      p.addEventListener("animationend", () => p.remove(), { once: true });
    }
  }

  function spin() {
    if (spinning) return;
    spinning = true;
    btnSpin.disabled = true;
    wheel.classList.add("spinning");
    stage.classList.remove("landing");
    if (spinGlow) spinGlow.classList.add("active");

    resultValue.textContent = "";
    resultValue.classList.remove("pop");
    resultFlavor.textContent = "";
    resultFlavor.classList.remove("show");
    resultLabel.textContent = "回転中… 運命は？";

    const index = pickIndex();
    const target = SEGMENTS[index];
    const center = CENTERS[index];

    // Land somewhere inside the segment, not always dead-center (±28°)
    const jitter = (Math.random() - 0.5) * 56;

    // Extra full turns for drama (5–8)
    const extraSpins = 5 + Math.floor(Math.random() * 4);

    // θ such that local under pointer ≈ center + jitter
    // local = (360 - (R % 360)) % 360  ≈ center + jitter
    // ⇒ R % 360 ≈ 360 - (center + jitter)
    const desiredMod = (360 - (center + jitter) + 360) % 360;
    const prevMod = ((currentRotation % 360) + 360) % 360;
    let delta = desiredMod - prevMod;
    if (delta <= 0) delta += 360;
    delta += 360 * extraSpins;

    currentRotation += delta;
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    const finish = () => {
      if (!spinning) return;
      spinning = false;
      btnSpin.disabled = false;
      wheel.classList.remove("spinning");
      if (spinGlow) spinGlow.classList.remove("active");
      stage.classList.add("landing");

      // Derive result from actual final rotation (guarantees visual match)
      const resolvedIndex = indexFromRotation(currentRotation);
      const resolved = SEGMENTS[resolvedIndex];

      resultLabel.textContent = "結果";
      resultValue.textContent = resolved;
      resultValue.classList.add("pop");
      resultFlavor.textContent = pickFlavor(resolved);
      resultFlavor.classList.add("show");

      burstConfetti();

      // clear landing state after animation
      setTimeout(() => stage.classList.remove("landing"), 600);
    };

    const onEnd = (e) => {
      if (e.propertyName !== "transform") return;
      wheel.removeEventListener("transitionend", onEnd);
      finish();
    };
    wheel.addEventListener("transitionend", onEnd);

    // safety fallback
    setTimeout(finish, 5000);
  }

  btnSpin.addEventListener("click", spin);
})();
