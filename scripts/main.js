// scripts/main.js
// Bootstraps the UI and runs the animation loop.

import { UIManager } from "./ui.js";

(function bootstrap() {
  // Guard both ways: script is after DOM, but also listen for DOMContentLoaded.
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

function start() {
  const errorEl = document.getElementById("error");
  try {
    const canvas = document.getElementById("farmCanvas");
    if (!canvas) throw new Error("UI Initialization Failed\nFarm grid canvas not found!");

    // Initialize UI
    const ui = new UIManager(canvas, { rows: 20, cols: 20 });

    // Wire overlay controls
    for (const input of document.querySelectorAll('input[name="overlay"]')) {
      input.addEventListener("change", () => ui.setOverlay(input.value));
    }

    // Simple RAF loop with FPS readout
    const fpsEl = document.getElementById("fps");
    let last = performance.now();
    let frames = 0, acc = 0;

    function frame(now) {
      const dt = now - last;
      last = now;

      ui.render();

      // FPS meter (updated ~2x/sec)
      frames++; acc += dt;
      if (acc >= 500) {
        const fps = Math.round((frames / acc) * 1000);
        if (fpsEl) fpsEl.textContent = `${fps} fps`;
        frames = 0; acc = 0;
      }

      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  } catch (err) {
    // Show a friendly error in the UI and rethrow to console.
    if (errorEl) {
      errorEl.style.display = "block";
      errorEl.textContent = (err && err.message) ? err.message : String(err);
    }
    console.error(err);
  }
}
