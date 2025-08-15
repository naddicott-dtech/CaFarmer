// scripts/ui.js
// Canvas UI manager: sizing, drawing, simple overlays, and click highlight.

export class UIManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{rows:number, cols:number}} options
   */
  constructor(canvas, { rows = 20, cols = 20 } = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("UI Initialization Failed\nFarm grid canvas not found!");
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) throw new Error("2D context not available");

    // Grid config
    this.rows = rows;
    this.cols = cols;
    this.gridColor = "rgba(0,0,0,0.25)";
    this.highlight = null; // {r,c}
    this.overlay = "none"; // 'none' | 'soil' | 'water' | 'yield'

    // Derived sizing (updated in resize())
    this.cellW = 0;
    this.cellH = 0;

    // Bind & wire
    this._onResize = this.resize.bind(this);
    this._onClick = this.handleClick.bind(this);
    window.addEventListener("resize", this._onResize, { passive: true });
    this.canvas.addEventListener("click", this._onClick);

    this.resize(); // initial
  }

  setOverlay(kind) { this.overlay = kind || "none"; }
  destroy() {
    window.removeEventListener("resize", this._onResize);
    this.canvas.removeEventListener("click", this._onClick);
  }

  // High-DPI backing store with CSS-sized drawing
  resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = this.canvas.clientWidth || 1;
    const cssH = this.canvas.clientHeight || 1;
    const targetW = Math.max(1, Math.floor(cssW * dpr));
    const targetH = Math.max(1, Math.floor(cssH * dpr));
    if (this.canvas.width !== targetW) this.canvas.width = targetW;
    if (this.canvas.height !== targetH) this.canvas.height = targetH;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr); // draw in CSS px

    this.cellW = cssW / this.cols;
    this.cellH = cssH / this.rows;
  }

  handleClick(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const c = Math.floor(x / this.cellW);
    const r = Math.floor(y / this.cellH);
    this.highlight = {
      r: Math.min(this.rows - 1, Math.max(0, r)),
      c: Math.min(this.cols - 1, Math.max(0, c)),
    };
  }

  sampleOverlayValue(r, c) {
    const v = (r * 73856093 ^ c * 19349663) >>> 0;
    return (v % 100) / 100; // 0..1
  }

  drawGrid() {
    const { ctx } = this;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // Clear + background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0, 120, 0, 0.10)";
    ctx.fillRect(0, 0, w, h);

    // Overlay
    if (this.overlay !== "none") {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const v = this.sampleOverlayValue(r, c);
          let color = "transparent";
          if (this.overlay === "soil")  color = `rgba(121,85,72, ${0.15 + 0.5 * v})`;
          if (this.overlay === "water") color = `rgba(33,150,243, ${0.15 + 0.5 * v})`;
          if (this.overlay === "yield") color = `rgba(76,175,80, ${0.15 + 0.5 * v})`;
          ctx.fillStyle = color;
          ctx.fillRect(c * this.cellW, r * this.cellH, this.cellW, this.cellH);
        }
      }
    }

    // Grid lines
    ctx.beginPath();
    for (let r = 0; r <= this.rows; r++) {
      const y = Math.round(r * this.cellH) + 0.5;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = Math.round(c * this.cellW) + 0.5;
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Highlight
    if (this.highlight) {
      const { r, c } = this.highlight;
      ctx.strokeStyle = "rgba(255,165,0,0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.floor(c * this.cellW) + 1,
        Math.floor(r * this.cellH) + 1,
        Math.ceil(this.cellW) - 2,
        Math.ceil(this.cellH) - 2
      );
    }
  }

  render() {
    this.resize(); // stay crisp on layout changes
    this.drawGrid();
  }
}
