/**
 * Fallback renderer for browsers without WebGL (for example macOS with OpenCore Legacy Patcher,
 * where graphics acceleration has to stay off). It draws the same scene on a 2D canvas on the CPU:
 * z-buffer, per-vertex lighting, thin edge lines and the red outline of the highlighted part.
 * Three.js keeps doing camera, controls and animation; only the pixels come from here.
 */

export interface SoftMesh {
  /** Triangle vertices, 9 numbers per triangle, in the mesh's local space. */
  pos: Float32Array;
  /** One normal per vertex, same layout as `pos`. */
  nor: Float32Array;
  /** Edge segments, 6 numbers per segment. */
  edges: Float32Array;
  /** World offset of the mesh (the parts are only translated, never rotated or scaled). */
  ox: number;
  oy: number;
  oz: number;
  /** Surface colour, sRGB 0..1. */
  color: [number, number, number];
  /** Red tint 0..1 for the glow highlight. */
  glow: number;
  /** Red outline strength 0..1. */
  outline: number;
  /** Opacity 0..1 while the part fades in (1 = solid). */
  alpha?: number;
}

/** Background as a pixel value (ABGR); light by default, see setSoftBackground. */
let BG = (255 << 24) | (0xee << 16) | (0xea << 8) | 0xe8;

/** Background colour of the CPU renderer as 0xRRGGBB (changes with the light / dark setting of the system). */
export function setSoftBackground(hex: number): void {
  BG = (255 << 24) | ((hex & 255) << 16) | (((hex >> 8) & 255) << 8) | ((hex >> 16) & 255);
}

// Light from the upper right front, matching the WebGL scene.
const LIGHT = norm3(0.45, 0.82, 0.55);

function norm3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

export class SoftRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private img: ImageData;
  private px: Uint32Array;
  private depth: Float32Array;
  private w = 1;
  private h = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Neither WebGL nor a 2D canvas is available.');
    this.ctx = ctx;
    this.img = ctx.createImageData(1, 1);
    this.px = new Uint32Array(this.img.data.buffer);
    this.depth = new Float32Array(1);
  }

  /** Size in CSS pixels. Large screens are drawn at a lower resolution to keep it fluid. */
  resize(cssW: number, cssH: number, maxPixels = 1_300_000): void {
    const scale = Math.min(1, Math.sqrt(maxPixels / (cssW * cssH)));
    this.w = Math.max(2, Math.floor(cssW * scale));
    this.h = Math.max(2, Math.floor(cssH * scale));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.img = this.ctx.createImageData(this.w, this.h);
    this.px = new Uint32Array(this.img.data.buffer);
    this.depth = new Float32Array(this.w * this.h);
  }

  /**
   * @param vp   view-projection matrix, column-major (THREE.Matrix4 elements)
   * @param toEye unit vector from the model towards the camera
   */
  render(meshes: SoftMesh[], vp: ArrayLike<number>, toEye: [number, number, number]): void {
    this.px.fill(BG);
    this.depth.fill(Infinity);

    const hv = norm3(LIGHT[0] + toEye[0], LIGHT[1] + toEye[1], LIGHT[2] + toEye[2]);
    // Solid parts first; parts that are fading in are blended over them afterwards, without writing depth.
    const solid = (m: SoftMesh): boolean => (m.alpha ?? 1) >= 0.999;
    for (const m of meshes) if (solid(m)) this.drawMesh(m, vp, hv);
    for (const m of meshes) if (solid(m)) this.drawEdges(m, vp);
    for (const m of meshes) if (!solid(m) && (m.alpha ?? 1) > 0.002) this.drawMesh(m, vp, hv);
    for (const m of meshes) if (!solid(m) && (m.alpha ?? 1) > 0.002) this.drawEdges(m, vp);
    this.ctx.putImageData(this.img, 0, 0);
  }

  // ------------------------------------------------------------ triangles

  private drawMesh(m: SoftMesh, e: ArrayLike<number>, hv: [number, number, number]): void {
    const { pos, nor } = m;
    const W = this.w;
    const H = this.h;
    const e0 = e[0], e1 = e[1], e2 = e[2], e3 = e[3];
    const e4 = e[4], e5 = e[5], e6 = e[6], e7 = e[7];
    const e8 = e[8], e9 = e[9], e10 = e[10], e11 = e[11];
    const e12 = e[12], e13 = e[13], e14 = e[14], e15 = e[15];
    const [lx, ly, lz] = LIGHT;
    const [hx, hy, hz] = hv;
    // Base colour as given; the shading keeps the form readable.
    const br = m.color[0] * 1.03;
    const bg = m.color[1] * 1.03;
    const bb = m.color[2] * 1.03;
    const glow = m.glow;

    const X = [0, 0, 0];
    const Y = [0, 0, 0];
    const Z = [0, 0, 0];
    const R = [0, 0, 0];
    const G = [0, 0, 0];
    const B = [0, 0, 0];

    for (let t = 0; t < pos.length; t += 9) {
      let visible = true;
      for (let k = 0; k < 3; k++) {
        const i = t + k * 3;
        const x = pos[i] + m.ox;
        const y = pos[i + 1] + m.oy;
        const z = pos[i + 2] + m.oz;
        const w = e3 * x + e7 * y + e11 * z + e15;
        if (w <= 0.05) {
          visible = false;
          break;
        }
        const iw = 1 / w;
        X[k] = ((e0 * x + e4 * y + e8 * z + e12) * iw * 0.5 + 0.5) * W;
        Y[k] = (0.5 - (e1 * x + e5 * y + e9 * z + e13) * iw * 0.5) * H;
        Z[k] = (e2 * x + e6 * y + e10 * z + e14) * iw;
      }
      if (!visible) continue;

      // Back faces (screen y points down, so front faces have a negative area).
      const area = (X[1] - X[0]) * (Y[2] - Y[0]) - (X[2] - X[0]) * (Y[1] - Y[0]);
      if (area >= 0) continue;
      if (Math.max(X[0], X[1], X[2]) < 0 || Math.min(X[0], X[1], X[2]) > W) continue;
      if (Math.max(Y[0], Y[1], Y[2]) < 0 || Math.min(Y[0], Y[1], Y[2]) > H) continue;

      for (let k = 0; k < 3; k++) {
        const i = t + k * 3;
        const nx = nor[i], ny = nor[i + 1], nz = nor[i + 2];
        const nl = Math.max(0, nx * lx + ny * ly + nz * lz);
        const nh = Math.max(0, nx * hx + ny * hy + nz * hz);
        const n2 = nh * nh;
        const n4 = n2 * n2;
        const n8 = n4 * n4;
        const spec = n8 * n8 * n8 * n4 * 0.1; // roughly nh^28
        const shade = 0.36 + 0.22 * (0.5 + 0.5 * ny) + 0.5 * nl;
        R[k] = br * shade + spec + glow * 0.75;
        G[k] = bg * shade + spec + glow * 0.1;
        B[k] = bb * shade + spec + glow * 0.14;
      }
      this.tri(X, Y, Z, R, G, B, m.alpha ?? 1);
    }
  }

  private tri(X: number[], Y: number[], Z: number[], R: number[], G: number[], B: number[], alpha = 1): void {
    const blend = alpha < 0.999;
    const keep = 1 - alpha;
    const W = this.w;
    const H = this.h;
    const x0 = X[0], y0 = Y[0], x1 = X[1], y1 = Y[1], x2 = X[2], y2 = Y[2];
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    const inv = 1 / area;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    if (maxX < minX || maxY < minY) return;

    const d1x = (y2 - y0) * inv;
    const d1y = -(x2 - x0) * inv;
    const d2x = -(y1 - y0) * inv;
    const d2y = (x1 - x0) * inv;
    let rowW1 = ((minX + 0.5 - x0) * (y2 - y0) - (x2 - x0) * (minY + 0.5 - y0)) * inv;
    let rowW2 = ((x1 - x0) * (minY + 0.5 - y0) - (minX + 0.5 - x0) * (y1 - y0)) * inv;
    const z0 = Z[0], z1 = Z[1], z2 = Z[2];
    const r0 = R[0], r1 = R[1], r2 = R[2];
    const g0 = G[0], g1 = G[1], g2 = G[2];
    const b0 = B[0], b1 = B[1], b2 = B[2];
    const px = this.px;
    const depth = this.depth;
    const eps = -1e-6;

    for (let y = minY; y <= maxY; y++) {
      let w1 = rowW1;
      let w2 = rowW2;
      let idx = y * W + minX;
      let entered = false;
      for (let x = minX; x <= maxX; x++, idx++, w1 += d1x, w2 += d2x) {
        const w0 = 1 - w1 - w2;
        if (w0 < eps || w1 < eps || w2 < eps) {
          if (entered) break; // left the triangle on this row
          continue;
        }
        entered = true;
        const z = w0 * z0 + w1 * z1 + w2 * z2;
        if (z >= depth[idx]) continue;
        if (!blend) depth[idx] = z;
        let r = (w0 * r0 + w1 * r1 + w2 * r2) * 255;
        let g = (w0 * g0 + w1 * g1 + w2 * g2) * 255;
        let b = (w0 * b0 + w1 * b1 + w2 * b2) * 255;
        r = r < 0 ? 0 : r > 255 ? 255 : r;
        g = g < 0 ? 0 : g > 255 ? 255 : g;
        b = b < 0 ? 0 : b > 255 ? 255 : b;
        if (blend) {
          const old = px[idx];
          r = (old & 255) * keep + r * alpha;
          g = ((old >> 8) & 255) * keep + g * alpha;
          b = ((old >> 16) & 255) * keep + b * alpha;
        }
        px[idx] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
      rowW1 += d1y;
      rowW2 += d2y;
    }
  }

  // ---------------------------------------------------------------- lines

  private drawEdges(m: SoftMesh, e: ArrayLike<number>): void {
    const edges = m.edges;
    const W = this.w;
    const H = this.h;
    const e0 = e[0], e1 = e[1], e2 = e[2], e3 = e[3];
    const e4 = e[4], e5 = e[5], e6 = e[6], e7 = e[7];
    const e8 = e[8], e9 = e[9], e10 = e[10], e11 = e[11];
    const e12 = e[12], e13 = e[13], e14 = e[14], e15 = e[15];
    const outline = m.outline;
    const a = m.alpha ?? 1;

    for (let s = 0; s < edges.length; s += 6) {
      const sx = [0, 0];
      const sy = [0, 0];
      const sz = [0, 0];
      let ok = true;
      for (let k = 0; k < 2; k++) {
        const i = s + k * 3;
        const x = edges[i] + m.ox;
        const y = edges[i + 1] + m.oy;
        const z = edges[i + 2] + m.oz;
        const w = e3 * x + e7 * y + e11 * z + e15;
        if (w <= 0.05) {
          ok = false;
          break;
        }
        const iw = 1 / w;
        sx[k] = ((e0 * x + e4 * y + e8 * z + e12) * iw * 0.5 + 0.5) * W;
        sy[k] = (0.5 - (e1 * x + e5 * y + e9 * z + e13) * iw * 0.5) * H;
        sz[k] = (e2 * x + e6 * y + e10 * z + e14) * iw;
      }
      if (!ok) continue;
      this.line(sx[0], sy[0], sz[0], sx[1], sy[1], sz[1], 0x6a, 0x6d, 0x78, 0.5 * a, 0);
      if (outline * a > 0.01) this.line(sx[0], sy[0], sz[0], sx[1], sy[1], sz[1], 0xe5, 0x20, 0x2b, outline * a, 1); // a fading part shows its hidden edges too, so its outline stays faint
    }
  }

  /** Depth-tested line. `radius` 0 draws one pixel, 1 draws a 3 pixel wide stroke. */
  private line(
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    cr: number, cg: number, cb: number,
    alpha: number, radius: number,
  ): void {
    const W = this.w;
    const H = this.h;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    if (n > 4000) return;
    const px = this.px;
    const depth = this.depth;
    const bias = 0.00003;
    const inv = 1 - alpha;
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const cx = Math.round(x0 + dx * f);
      const cy = Math.round(y0 + dy * f);
      const z = z0 + (z1 - z0) * f;
      for (let oy = -radius; oy <= radius; oy++) {
        const y = cy + oy;
        if (y < 0 || y >= H) continue;
        for (let ox = -radius; ox <= radius; ox++) {
          const x = cx + ox;
          if (x < 0 || x >= W) continue;
          const idx = y * W + x;
          if (z > depth[idx] + bias) continue;
          const old = px[idx];
          const r = (old & 255) * inv + cr * alpha;
          const g = ((old >> 8) & 255) * inv + cg * alpha;
          const b = ((old >> 16) & 255) * inv + cb * alpha;
          px[idx] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
        }
      }
    }
  }
}
