import * as THREE from 'three';

/**
 * Optical aid: the model's X / Y / Z axes, drawn on a transparent 2D canvas above the stage.
 * It works the same for the WebGL and the CPU renderer because it only needs the camera.
 *   X = along the length of the model, Y = depth, Z = height (up).
 * Model axes map to world axes as x → X, y → −Z, z → Y (see README, "Coordinates").
 */
const AXES = [
  { label: 'X', color: '#e2362f', dir: new THREE.Vector3(1, 0, 0) },
  { label: 'Y', color: '#2f9e44', dir: new THREE.Vector3(0, 0, -1) },
  { label: 'Z', color: '#2f6fe2', dir: new THREE.Vector3(0, 1, 0) },
];

export class AxesOverlay {
  private readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D | null;
  /** Where the axes cross (world) and how far they reach to each side along world X, Y, Z. */
  private center = new THREE.Vector3();
  private half: [number, number, number] = [8, 4, 8];
  private on = true;
  /** Dark design: the disc behind the orientation gizmo is dark too. */
  dark = false;
  private dpr = 1;
  private w = 0;
  private h = 0;

  constructor() {
    this.canvas.className = 'axes-overlay';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d');
    document.body.append(this.canvas);
  }

  private targetCenter = new THREE.Vector3();
  private targetHalf: [number, number, number] = [8, 4, 8];
  private placed = false;

  setFrame(center: THREE.Vector3, half: [number, number, number]): void {
    this.targetCenter.copy(center);
    this.targetHalf = half;
    if (!this.placed) {
      this.center.copy(center);
      this.half = half;
      this.placed = true;
    }
  }

  setVisible(on: boolean): void {
    this.on = on;
    this.canvas.style.display = on ? '' : 'none';
  }

  private fit(): void {
    // The overlay lies exactly over the stage canvas (style.scss), so it has the same size.
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  draw(camera: THREE.PerspectiveCamera): void {
    const ctx = this.ctx;
    if (!ctx || !this.on) return;
    this.fit();
    // Glide to the new middle when a part is added.
    this.center.lerp(this.targetCenter, 0.18);
    this.half = this.half.map((h, i) => h + (this.targetHalf[i] - h) * 0.18) as [number, number, number];
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    camera.updateMatrixWorld();
    const view = camera.matrixWorldInverse;
    const vp = camera.projectionMatrix.clone().multiply(view);
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1) Axes crossing in the middle of the model, so the directions can be read on the model itself.
    const po = this.project(this.center, vp);
    if (po) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      AXES.forEach((a) => {
        const len = Math.abs(a.dir.x) * this.half[0] + Math.abs(a.dir.y) * this.half[1] + Math.abs(a.dir.z) * this.half[2];
        const pe = this.project(this.center.clone().addScaledVector(a.dir, len), vp);
        const pn = this.project(this.center.clone().addScaledVector(a.dir, -len), vp);
        if (!pe || !pn) return;
        ctx.strokeStyle = a.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(pn[0], pn[1]);
        ctx.lineTo(pe[0], pe[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        this.arrowHead(ctx, po, pe, a.color);
        ctx.setLineDash([5, 4]);
        ctx.globalAlpha = 1;
        this.tag(ctx, a.label, a.color, pe[0], pe[1], 9);
      });
      ctx.setLineDash([]);
    }

    // 2) Orientation gizmo in the top right corner. It turns with the camera.
    const size = Math.min(this.w, this.h) < 520 ? 26 : 36;
    const cx = this.w - size - 22;
    const cy = 24 + size;
    const items = AXES.map((a) => {
      const d = a.dir.clone().transformDirection(view); // direction in camera space
      return { a, x: d.x, y: -d.y, z: d.z };
    }).sort((p, q) => p.z - q.z); // far axes first
    ctx.fillStyle = this.dark ? 'rgba(20,25,22,0.85)' : 'rgba(239,244,240,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, size + 14, 0, Math.PI * 2);
    ctx.fill();
    for (const it of items) {
      const ex = cx + it.x * size;
      const ey = cy + it.y * size;
      ctx.globalAlpha = it.z < -0.05 ? 0.55 : 1; // axes pointing away from the viewer are paler
      ctx.strokeStyle = it.a.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      this.tag(ctx, it.a.label, it.a.color, ex, ey, 9, true);
    }
    ctx.globalAlpha = 1;
  }

  private project(p: THREE.Vector3, vp: { elements: ArrayLike<number> }): [number, number] | null {
    const e = vp.elements;
    const w = e[3] * p.x + e[7] * p.y + e[11] * p.z + e[15];
    if (w <= 0.05) return null;
    const x = (e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12]) / w;
    const y = (e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13]) / w;
    return [(x * 0.5 + 0.5) * this.w, (0.5 - y * 0.5) * this.h];
  }

  private arrowHead(ctx: CanvasRenderingContext2D, from: [number, number], to: [number, number], color: string): void {
    const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
    const s = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to[0], to[1]);
    ctx.lineTo(to[0] - s * Math.cos(ang - 0.4), to[1] - s * Math.sin(ang - 0.4));
    ctx.lineTo(to[0] - s * Math.cos(ang + 0.4), to[1] - s * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  private tag(ctx: CanvasRenderingContext2D, text: string, color: string, x: number, y: number, r: number, keepAlpha = false): void {
    const a = ctx.globalAlpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y + 0.5);
    if (!keepAlpha) ctx.globalAlpha = a;
  }
}
