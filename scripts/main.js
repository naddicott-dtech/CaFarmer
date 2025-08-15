// scripts/main.js
// Restores the menu (Play / Run tests), boots the game UI, and provides
// a lightweight in-browser test harness.

import { UIManager } from "./ui.js";

log("Loading main.js for UI game...");

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", onReady, { once: true });
} else {
  onReady();
}

function onReady() {
  log("DOM ready - Initializing UI game controls...");

  // Sections
  const menu = byId("menu");
  const game = byId("game");
  const tests = byId("tests");

  // Menu buttons
  const startBtn = byId("startGameBtn");
  const runTestsBtn = byId("runTestsBtn");

  // Game controls
  const backToMenuBtn = byId("backToMenuBtn");
  const fpsEl = byId("fps");
  const errorEl = byId("error");

  // Wire menu -> game
  if (!startBtn) {
    console.warn("Start Regular Game button not found! Cannot start game.");
  } else {
    startBtn.addEventListener("click", () => {
      show(game); hide(menu); hide(tests);
      startGameLoop({ fpsEl, errorEl, backToMenuBtn, menu, game });
    });
  }

  // Wire menu -> tests
  if (!runTestsBtn) {
    console.warn("Run Tests button not found!");
  } else {
    runTestsBtn.addEventListener("click", () => {
      hide(menu); show(tests); hide(game);
      runInBrowserTests();
    });
  }

  // Back buttons
  byId("backFromTestsBtn")?.addEventListener("click", () => {
    show(menu); hide(tests); hide(game);
    clearTests();
  });
  backToMenuBtn?.addEventListener("click", () => {
    show(menu); hide(game); hide(tests);
    stopGameLoop();
  });
}

/* --------------------------- Game bootstrap --------------------------- */

let rafId = null;
let ui = null;

function startGameLoop({ fpsEl, errorEl, backToMenuBtn, menu, game }) {
  try {
    const canvas = byId("farmCanvas");
    if (!canvas) throw new Error("UI Initialization Failed\nFarm grid canvas not found!");

    ui = new UIManager(canvas, { rows: 20, cols: 20 });

    // Overlay controls
    document.querySelectorAll('input[name="overlay"]').forEach(input => {
      input.addEventListener("change", () => ui.setOverlay(input.value));
    });

    // RAF loop with FPS meter
    let last = performance.now(), frames = 0, acc = 0;
    function frame(now) {
      ui.render();

      const dt = now - last; last = now; frames++; acc += dt;
      if (acc >= 500) {
        const fps = Math.round((frames / acc) * 1000);
        if (fpsEl) fpsEl.textContent = `${fps} fps`;
        frames = 0; acc = 0;
      }
      rafId = window.requestAnimationFrame(frame);
    }
    rafId = window.requestAnimationFrame(frame);

    // Clear any old error
    if (errorEl) { errorEl.style.display = "none"; errorEl.textContent = ""; }

  } catch (err) {
    if (errorEl) {
      errorEl.style.display = "block";
      errorEl.textContent = err?.message ?? String(err);
    }
    console.error(err);
  }
}

function stopGameLoop() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (ui) {
    ui.destroy();
    ui = null;
  }
}

/* ----------------------------- Tests UI ------------------------------ */

function runInBrowserTests() {
  const out = byId("testOutput");
  if (!out) return;
  out.textContent = "Running tests…\n";

  // Minimal sanity checks to demonstrate the button works in-browser.
  const tests = [
    {
      name: "UIManager throws if canvas is missing",
      run() {
        let threw = false;
        try { /* @ts-ignore */ new UIManager(null); } catch { threw = true; }
        if (!threw) throw new Error("Expected constructor to throw");
      }
    },
    {
      name: "UIManager initializes with a real canvas",
      run() {
        const c = document.createElement("canvas");
        c.style.width = "300px"; c.style.height = "200px";
        document.body.appendChild(c);
        try {
          const u = new UIManager(c, { rows: 10, cols: 10 });
          u.render(); u.destroy();
        } finally {
          c.remove();
        }
      }
    }
  ];

  let passed = 0;
  for (const t of tests) {
    try { t.run(); out.textContent += `✓ ${t.name}\n`; passed++; }
    catch (e) { out.textContent += `✗ ${t.name}\n   ${e}\n`; }
  }
  out.textContent += `\n${passed}/${tests.length} tests passed.\n`;
}

function clearTests() {
  const out = byId("testOutput");
  if (out) out.textContent = "Ready.";
}

/* ----------------------------- Utilities ----------------------------- */

function byId(id) { return document.getElementById(id); }
function show(el) { if (el) el.style.display = "block"; }
function hide(el) { if (el) el.style.display = "none"; }
function log(...a) { console.log(...a); }
