/**
 * Cabaret Host Casinos - Roulette (4 segments: 1, 2, 3, 4)
 */
(function () {
  "use strict";

  const SEGMENTS = ["1", "2", "3", "4"];
  // conic-gradient from -45deg: each slice 90deg
  // Pointer is at top (0deg / 12 o'clock).
  // Final rotation must land the chosen segment under the pointer.
  // Segment centers relative to wheel (after from -45deg):
  //   1: 0deg, 2: 90deg, 3: 180deg, 4: 270deg  (in wheel local coords)
  // To bring a segment center to top (pointer), rotate by -(center) + extra spins.

  const SEGMENT_CENTER_DEG = [0, 90, 180, 270];

  const wheel = document.getElementById("wheel");
  const btnSpin = document.getElementById("btn-spin");
  const resultLabel = document.getElementById("result-label");
  const resultValue = document.getElementById("result-value");

  if (!wheel || !btnSpin) return;

  let currentRotation = 0;
  let spinning = false;

  function pickIndex() {
    return Math.floor(Math.random() * SEGMENTS.length);
  }

  function spin() {
    if (spinning) return;
    spinning = true;
    btnSpin.disabled = true;
    wheel.classList.add("spinning");
    resultValue.textContent = "";
    resultValue.classList.remove("pop");
    resultLabel.textContent = "回転中…";

    const index = pickIndex();
    const target = SEGMENTS[index];
    const center = SEGMENT_CENTER_DEG[index];

    // Extra full rotations for drama (4–7)
    const extraSpins = 4 + Math.floor(Math.random() * 4);
    // Normalize so pointer (top) lands on segment center
    const targetAngle = 360 * extraSpins + (360 - center);

    // Keep cumulative rotation increasing to avoid jump-back
    currentRotation += targetAngle;

    wheel.style.transform = `rotate(${currentRotation}deg)`;

    const onEnd = () => {
      wheel.removeEventListener("transitionend", onEnd);
      spinning = false;
      btnSpin.disabled = false;
      wheel.classList.remove("spinning");
      resultLabel.textContent = "結果";
      resultValue.textContent = target;
      resultValue.classList.add("pop");
    };

    wheel.addEventListener("transitionend", onEnd, { once: true });

    // Fallback if transitionend is missed
    setTimeout(() => {
      if (spinning) onEnd();
    }, 4800);
  }

  btnSpin.addEventListener("click", spin);
})();
