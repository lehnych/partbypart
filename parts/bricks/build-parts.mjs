// Converts the LDraw parts used by the instructions into parts/bricks/ldraw-meshes.json.
//
//   npm run ldraw            (parts from parts/bricks/library, if it exists)
//   npm run ldraw -- <path to another ldraw folder with parts/ and p/>
//
// The stud primitives (stud.dat, stud2.dat and what they use) always come from parts/bricks/ldraw-base: they belong to
// the engine, not to an instruction. The part library is only needed once parts/bricks/map.mjs lists parts.
//
// Output per catalogue part: triangles of the body (without studs) and the stud positions, both in the
// catalogue frame (x, y in studs, z in plate heights, minimum corner at 0), so that `pos` / `rot` in model.json stay valid.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARTS, solidCells } from '../../app/src/ts/parts.ts';
import { MAP } from './map.mjs';

const root = path.resolve(fileURLToPath(import.meta.url), '../../..');
const base = path.join(root, 'parts/bricks/ldraw-base');
const lib = path.resolve(process.argv[2] ?? path.join(root, 'parts/bricks/library'));
const hasLib = fs.existsSync(path.join(lib, 'parts'));
if (process.argv[2] && !hasLib) {
  console.error(`no LDraw folder (with parts/ and p/) at ${lib}`);
  process.exit(1);
}
if (!hasLib && Object.keys(MAP).length) {
  console.error('parts/bricks/map.mjs lists parts, but there is no LDraw library: put the .dat files into parts/bricks/library or pass a folder: npm run ldraw -- <ldraw folder>');
  process.exit(1);
}

// ------------------------------------------------------------------ reading
// The engine's own primitives first (so the studs look the same whatever library is used), then the part library.
const roots = [base, ...(hasLib ? [lib] : [])];
const dirs = ['parts', 'parts/s', 'p', 'p/48', 'p/8'];
const fileCache = new Map();
function find(name) {
  const n = name.replace(/\\/g, '/').toLowerCase();
  for (const r of roots) {
    for (const d of dirs) {
      const f = path.join(r, d, n);
      if (fs.existsSync(f)) return f;
    }
  }
  throw new Error(`missing LDraw file ${name}`);
}
function lines(name) {
  const f = find(name);
  if (!fileCache.has(f)) fileCache.set(f, fs.readFileSync(f, 'utf8').split(/\r?\n/));
  return fileCache.get(f);
}

// Stud primitives become stud instances instead of triangles.
const STUD = { 'stud.dat': 'solid', 'stud2.dat': 'hollow' };

// ---------------------------------------------------------------- flattening
const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];
const apply = (m, t, p) => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + t[0],
  m[3] * p[0] + m[4] * p[1] + m[5] * p[2] + t[1],
  m[6] * p[0] + m[7] * p[1] + m[8] * p[2] + t[2],
];
const det = (m) => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);

function flatten(name, m, t, inverted, out) {
  let cw = false;
  let invertNext = false;
  for (const raw of lines(name)) {
    const l = raw.trim();
    if (!l) continue;
    const w = l.split(/\s+/);
    const type = w[0];
    if (type === '0') {
      if (w[1] === 'BFC') {
        if (w.includes('INVERTNEXT')) invertNext = true;
        else if (w.includes('CW')) cw = true;
        else if (w.includes('CCW')) cw = false;
      }
      continue;
    }
    const n = w.slice(2).map(Number);
    if (type === '1') {
      const sub = w[14].toLowerCase();
      const lm = n.slice(3, 12);
      const lt = [n[0], n[1], n[2]];
      const nm = mul(m, lm);
      const nt = apply(m, t, lt);
      const kind = STUD[sub];
      if (kind) {
        const c = apply(nm, nt, [0, 0, 0]);
        const up = apply(nm, [0, 0, 0], [0, -1, 0]);
        out.studs.push({ c, up, kind });
      } else {
        flatten(sub, nm, nt, inverted !== (det(lm) < 0) !== invertNext, out);
      }
      invertNext = false;
    } else if (type === '2') {
      out.lines.push([apply(m, t, n.slice(0, 3)), apply(m, t, n.slice(3, 6))]);
    } else if (type === '3' || type === '4') {
      const pts = [];
      for (let i = 0; i < (type === '3' ? 3 : 4); i++) pts.push(apply(m, t, n.slice(i * 3, i * 3 + 3)));
      const flip = cw !== inverted;
      const tri = (a, b, c) => out.tris.push(flip ? [a, c, b] : [a, b, c]);
      tri(pts[0], pts[1], pts[2]);
      if (type === '4') tri(pts[0], pts[2], pts[3]);
    }
  }
}

// ------------------------------------------------- LDraw -> catalogue frame
// x_m = x / 20, y_m = z / 20, z_m = -y / 8  (rotation: LDraw is y-down).
const toModel = (p) => [p[0] / 20, p[2] / 20, -p[1] / 8];

function variants(tris, studs, lie, lines, stand = false) {
  const res = [];
  for (const mirror of [false, true]) {
    for (const k of [0, 1, 2, 3]) {
      if (stand === 'conn' && (k !== 0 || mirror)) continue; // only the raw orientation is turned below
      const f = (p, isDir = false) => {
        let [x, y, z] = p;
        if (mirror) x = -x;
        for (let i = 0; i < k; i++) [x, y] = [-y, x];
        if (lie === 'back') [y, z] = isDir ? [z, -y] : [z * 0.4, -y * 2.5]; // turned the other way: up (+z) -> back (+y), front (-y) -> up
        else if (lie) [y, z] = isDir ? [-z, y] : [-z * 0.4, y * 2.5]; // lie down on its side: up (+z) -> front (-y); plates <-> studs
        if (stand === 'conn') [x, y, z] = isDir ? [x, z, -y] : [x, z * 0.4, -y * 2.5]; // axle/bush connector: cross-hole barrel on top with its hole along x, the bush (pin) hanging down
        else if (stand === 'y') [x, y, z] = isDir ? [z, x, y] : [z * 0.4, x, y * 2.5]; // long part lying along y with its holes along x (raw thickness -> x, raw length -> y, raw width -> up)
        else if (stand) [x, z] = isDir ? [z, x] : [z * 0.4, x * 2.5]; // stand a lying long part upright: its x axis becomes the vertical axis
        return [x, y, z];
      };
      const flip = mirror;
      res.push({
        mirror,
        k,
        tris: tris.map((t) => {
          const q = t.map((p) => f(p));
          return flip ? [q[0], q[2], q[1]] : q;
        }),
        studs: studs.map((s) => ({ ...s, c: f(s.c), up: f(s.up, true) })),
        lines: lines.map((l) => l.map((p) => f(p))),
      });
    }
  }
  return res;
}

function minCorner(tris, studs) {
  let m = [Infinity, Infinity, Infinity];
  const eat = (p) => (m = m.map((v, i) => Math.min(v, p[i])));
  for (const t of tris) t.forEach(eat);
  // the part's own frame: studs do not count for x, y but sit on the top, so z uses the body only
  return m;
}

const SUB = 4;
const samples = (w, d) => {
  const out = [];
  for (let x = 0; x < w * SUB; x++) for (let y = 0; y < d * SUB; y++) out.push([(x + 0.5) / SUB, (y + 0.5) / SUB]);
  return out;
};

// Top height of the body at sample points, by vertical ray casting.
function topHeights(tris, w, d) {
  return samples(w, d).map(([px, py]) => {
    let top = 0;
    for (const [a, b, c] of tris) {
      const d0 = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
      if (Math.abs(d0) < 1e-9) continue;
      const u = ((px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1])) / d0;
      const v = ((b[0] - a[0]) * (py - a[1]) - (px - a[0]) * (b[1] - a[1])) / d0;
      if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
      top = Math.max(top, a[2] + u * (b[2] - a[2]) + v * (c[2] - a[2]));
    }
    return top;
  });
}

function inPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function oldHeights(part) {
  return samples(part.w, part.d).map((p) => {
    let h = 0;
    for (const s of part.solids) {
      const xs = s.poly.map((q) => q[0]), ys = s.poly.map((q) => q[1]);
      const inside = s.fill ? p[0] >= Math.min(...xs) && p[0] <= Math.max(...xs) && p[1] >= Math.min(...ys) && p[1] <= Math.max(...ys) : inPoly(p, s.poly);
      if (inside) h = Math.max(h, s.z1);
    }
    return h;
  });
}


// Collision solids from the mesh: grid cells whose column is at least 18 % covered by the part, layer by layer (one plate high).
// trueLow: count a column only from the lowest point the mesh really reaches (a tilted part leaves empty space under it)
function voxelSolids(tris, trueLow = false) {
  const all = tris.flat();
  const W = Math.ceil(Math.max(...all.map((p) => p[0])) - 0.01);
  const D = Math.ceil(Math.max(...all.map((p) => p[1])) - 0.01);
  const Hh = Math.ceil(Math.max(...all.map((p) => p[2])) - 0.01);
  const cells = []; // [x, y, z0, z1]
  for (let x = 0; x < W; x++) for (let y = 0; y < D; y++) {
    const cover = new Array(Hh).fill(0);
    for (let sx = 0; sx < SUB; sx++) for (let sy = 0; sy < SUB; sy++) {
      const px = x + (sx + 0.5) / SUB, py = y + (sy + 0.5) / SUB;
      let lo = Infinity, hi = -Infinity;
      for (const [a, b, c] of tris) {
        const d0 = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
        if (Math.abs(d0) < 1e-9) continue;
        const u = ((px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1])) / d0;
        const v = ((b[0] - a[0]) * (py - a[1]) - (px - a[0]) * (b[1] - a[1])) / d0;
        if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
        const z = a[2] + u * (b[2] - a[2]) + v * (c[2] - a[2]);
        lo = trueLow ? Math.min(lo, z) : 0; hi = Math.max(hi, z);
      }
      if (hi < lo) continue;
      for (let k = 0; k < Hh; k++) if (lo < k + 0.5 && hi > k + 0.5) cover[k]++;
    }
    let k = 0;
    while (k < Hh) {
      if (cover[k] / (SUB * SUB) < 0.18) { k++; continue; }
      let e = k;
      while (e < Hh && cover[e] / (SUB * SUB) >= 0.18) e++;
      cells.push([x, y, k, e]);
      k = e;
    }
  }
  // merge cells along x with the same y and z run
  const rects = [];
  for (const c of cells) {
    const r = rects.find((q) => q.y === c[1] && q.z0 === c[2] && q.z1 === c[3] && q.x + q.w === c[0]);
    if (r) r.w++; else rects.push({ x: c[0], y: c[1], w: 1, z0: c[2], z1: c[3] });
  }
  return { w: W, d: D, solids: rects.map((r) => ({ poly: [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + 1], [r.x, r.y + 1]], z0: r.z0, z1: r.z1 })) };
}

// -------------------------------------------------------------------- main
const q = (v) => Math.round(v * 1000) / 1000;
const result = {};
const derived = {};
const report = [];
for (const [id, spec] of Object.entries(MAP)) {
  const part = spec.derive ? { w: 99, d: 99, solids: [] } : PARTS[id];
  if (!part) throw new Error(`catalogue has no part ${id}`);
  const raw = { tris: [], studs: [], lines: [] };
  flatten(`${spec.file}.dat`, I, [0, 0, 0], false, raw);
  const tris0 = raw.tris.map((t) => t.map(toModel));
  const lines0 = raw.lines.map((l) => l.map(toModel));
  const studs0 = raw.studs.map((s) => ({ kind: s.kind, c: toModel(s.c), up: [s.up[0] / 20, s.up[2] / 20, -s.up[1] / 8].map((v, i, a) => v / Math.hypot(...a) ) }));
  // the 3 conversion axes have different scales: treat directions in LDraw space, not model space
  studs0.forEach((s, i) => {
    const u = raw.studs[i].up;
    const l = Math.hypot(...u);
    s.up = [u[0] / l, u[2] / l, -u[1] / l];
  });
  {
    const all = tris0.flat();
    const r = [0, 1, 2].map((i) => [Math.min(...all.map((p) => p[i])), Math.max(...all.map((p) => p[i]))].map((v) => v.toFixed(2)).join('..'));
    if (!MAP[id].quiet) report.push(`  ${id} raw bbox x ${r[0]}  y ${r[1]}  z ${r[2]}`);
  }
  let best = null;
  for (const v of variants(tris0, studs0, spec.lie, lines0, spec.stand)) {
    if (spec.mirror !== undefined && v.mirror !== spec.mirror) continue;
    const m = minCorner(v.tris, v.studs);
    if (spec.xShift) m[0] -= spec.xShift; // fine shift in studs along the part's own x
    if (spec.zShift) m[2] -= spec.zShift; // fine height adjustment in plate heights (the model grid only knows whole plates)
    if (spec.axisShift) m[1] -= spec.axisShift; // a thin round part that sits in the far half of its cell along its axis
    if (spec.axle) {
      // an axle: centre it in the cell (y) and put its axis 1.5 plate heights above pos z, the middle of a brick hole
      const all = v.tris.flat();
      const mid = (i) => (Math.min(...all.map((p) => p[i])) + Math.max(...all.map((p) => p[i]))) / 2;
      if (!spec.edgeY) m[1] = mid(1) - 0.5; // edgeY: keep the part against the low-y edge of the cell (a short bush that must touch its neighbour)
      if (spec.edgeY) m[0] = mid(0) - 0.5;
      m[2] = mid(2) - 1.75;
      if (spec.axleY) m[1] -= spec.axleY; // fine shifts for an axle that must meet a hole between grid cells
      if (spec.axleZ) m[2] -= spec.axleZ;
    }
    if (spec.grid && v.studs.length) {
      // snap the minimum corner to the stud grid, so overhangs (clips, ball joints) sit outside the stud cells
      for (const i of [0, 1]) {
        const o = (((v.studs[0].c[i] - 0.5) % 1) + 1) % 1;
        m[i] = Math.floor(m[i] - o + 1e-6) + o;
      }
      m[2] = v.studs[0].c[2] - 1; // the plate body (1 plate high) starts at 0, the clip hangs below it
    }
    const mb = m.map((c) => c);
    const dy = spec.lie ? -0.2 : 0; // a lying slope is 1.2 studs thick; its back face sits on the grid line
    const tris = v.tris.map((t) => t.map((p) => [p[0] - m[0], p[1] - m[1] + dy, p[2] - m[2]]));
    const studs = v.studs.map((s) => ({ ...s, c: [s.c[0] - m[0], s.c[1] - m[1] + dy, s.c[2] - m[2]] }));
    const lines = v.lines.map((l) => l.map((p) => [p[0] - m[0], p[1] - m[1] + dy, p[2] - m[2]]));
    if (spec.yaw) {
      // turn the part about the vertical axis through the middle of its footprint by a free angle; yaw > 0 = clockwise seen from above
      // (the grid rotations of model.json only know 90-degree steps). The part may reach out of its cell; the footprint grows with it.
      const pts = tris.flat();
      const cx = (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2;
      const cy = (Math.min(...pts.map((p) => p[1])) + Math.max(...pts.map((p) => p[1]))) / 2;
      const a = (spec.yaw * Math.PI) / 180;
      const turn = (p) => {
        const dx = p[0] - cx, dy = p[1] - cy;
        p[0] = cx + dx * Math.cos(a) + dy * Math.sin(a);
        p[1] = cy - dx * Math.sin(a) + dy * Math.cos(a);
      };
      tris.forEach((t) => t.forEach(turn));
      lines.forEach((l) => l.forEach(turn));
      studs.forEach((st) => {
        turn(st.c);
        const [ux, uy] = st.up;
        st.up = [ux * Math.cos(a) + uy * Math.sin(a), -ux * Math.sin(a) + uy * Math.cos(a), st.up[2]];
      });
      // keep the whole part on the positive side of the cell grid, shifted by whole studs (so the centre stays on the stud)
      const all = tris.flat();
      const sx = Math.min(0, Math.floor(Math.min(...all.map((p) => p[0])))), sy = Math.min(0, Math.floor(Math.min(...all.map((p) => p[1]))));
      const mv = (p) => { p[0] -= sx; p[1] -= sy; };
      tris.forEach((t) => t.forEach(mv)); lines.forEach((l) => l.forEach(mv)); studs.forEach((st) => mv(st.c));
    }
    if (spec.spin) {
      // turn the part about the y axis through the middle of its x-z extent (a part stuck on a side stud, turned about that stud);
      // spin 90 = clockwise seen from the front (-y side): up -> +x. x in studs, z in plate heights (0.4 stud)
      const pts = tris.flat();
      const cx = (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2;
      const cz = (Math.min(...pts.map((p) => p[2])) + Math.max(...pts.map((p) => p[2]))) / 2;
      const a = (spec.spin * Math.PI) / 180;
      const turn = (p) => {
        const dx = p[0] - cx, dz = (p[2] - cz) * 0.4;
        p[0] = cx + dx * Math.cos(a) + dz * Math.sin(a);
        p[2] = cz + (-dx * Math.sin(a) + dz * Math.cos(a)) / 0.4;
      };
      tris.forEach((t) => t.forEach(turn));
      lines.forEach((l) => l.forEach(turn));
      studs.forEach((st) => {
        turn(st.c);
        const [ux, , uz] = st.up;
        st.up = [ux * Math.cos(a) + uz * Math.sin(a), st.up[1], -ux * Math.sin(a) + uz * Math.cos(a)];
      });
    }
    if (spec.tilt) {
      // turn the part about its axle hole (the pivot) in the u-z plane: u = x (default) or y (tiltAxis 'y'), z in plate heights (0.4 stud)
      const u = spec.tiltAxis === 'y' ? 1 : 0;
      const pts = tris.flat();
      const cu = (Math.min(...pts.map((p) => p[u])) + Math.max(...pts.map((p) => p[u]))) / 2;
      const cz = Math.min(...pts.map((p) => p[2])) + (spec.tiltPivotZ ?? 1.125); // joiner: the lower hole centre (ring radius 1.125 plates)
      const a = (spec.tilt * Math.PI) / 180;
      const turn = (p) => {
        const du = p[u] - cu;
        const dz = (p[2] - cz) * 0.4;
        p[u] = cu + du * Math.cos(a) + dz * Math.sin(a);
        p[2] = cz + (-du * Math.sin(a) + dz * Math.cos(a)) / 0.4;
      };
      tris.forEach((t) => t.forEach(turn));
      lines.forEach((l) => l.forEach(turn));
      studs.forEach((st) => turn(st.c));
      const lo = Math.min(...tris.flat().map((p) => p[u]));
      if (u === 0 && lo < 0) { tris.forEach((t) => t.forEach((p) => (p[0] -= lo))); lines.forEach((l) => l.forEach((p) => (p[0] -= lo))); studs.forEach((st) => (st.c[0] -= lo)); }
      if (spec.tiltRebase) {
        // a tilted part that reaches below its own bottom: lift it so its lowest point is at 0 again (and inside the cell along u)
        const shift = (i) => {
          const m0 = Math.min(...tris.flat().map((p) => p[i]));
          tris.forEach((t) => t.forEach((p) => (p[i] -= m0))); lines.forEach((l) => l.forEach((p) => (p[i] -= m0))); studs.forEach((st) => (st.c[i] -= m0));
        };
        shift(2);
        if (u === 1) shift(1);
      }
      if (spec.nudge) {
        // fine shift after tilting, in studs (x, y) and plate heights (z)
        const n = spec.nudge;
        tris.forEach((t) => t.forEach((p) => { p[0] += n[0]; p[1] += n[1]; p[2] += n[2]; }));
        lines.forEach((l) => l.forEach((p) => { p[0] += n[0]; p[1] += n[1]; p[2] += n[2]; }));
        studs.forEach((st) => { st.c[0] += n[0]; st.c[1] += n[1]; st.c[2] += n[2]; });
      }
    }
    const bw = Math.max(...tris.flat().map((p) => p[0]));
    const bd = Math.max(...tris.flat().map((p) => p[1]));
    if (spec.derive) {
      // derived parts: long side along x
      if (bd > bw + 0.01 && spec.lie !== 'any' && !spec.stand) continue;
      if (spec.lie === true && bw < 2) continue;
    } else if (Math.abs(bw - part.w) > 0.15 || Math.abs(bd - part.d) > 0.15) {
      // size must agree with the catalogue (the booklet position was measured with it)
      if (!(spec.allowSizeChange)) continue;
    }
    const a = spec.derive ? [] : topHeights(tris, part.w, part.d);
    const b = spec.derive ? [] : oldHeights(part);
    let score = 0;
    for (let i = 0; i < b.length; i++) score += Math.abs(b[i] - a[i]) > 0.3 ? 1 : 0;
    if (spec.derive && spec.rot !== undefined && v.k * 90 !== spec.rot) continue;
    if (spec.studEnd) {
      const xs = tris.flat().map((p) => p[0]);
      const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
      const sx = studs.find((st) => st.up[2] === 0 || true).c[0];
      if ((spec.studEnd === 'xmin') !== (sx < mid)) continue;
    }
    if (!best || score < best.score) best = { ...v, tris, studs, lines, score, bw, bd };
  }
  if (!best) {
    report.push(`${id}: NO transform with matching size (${part.w}x${part.d}) from ${spec.file}`);
    continue;
  }
  report.push(`${id.padEnd(22)} ${spec.file.padEnd(8)} rot=${best.k * 90} mirror=${best.mirror} size=${best.bw.toFixed(2)}x${best.bd.toFixed(2)} (catalogue ${part.w}x${part.d}) mismatch=${spec.derive ? 'derived' : best.score} tris=${best.tris.length} studs=${best.studs.length}`);
  // indexed mesh
  const pos = [];
  const idx = [];
  const map = new Map();
  // accent 'clip': triangles outside the plate body (beyond the stud cells or below the plate) are the black clip
  const sc = best.studs.map((st) => st.c);
  const fx0 = Math.min(...sc.map((c) => c[0])) - 0.5 - 0.02, fx1 = Math.max(...sc.map((c) => c[0])) + 0.5 + 0.02;
  const fy0 = Math.min(...sc.map((c) => c[1])) - 0.5 - 0.02, fy1 = Math.max(...sc.map((c) => c[1])) + 0.5 + 0.02;
  const isClip = (t) => {
    const c = [0, 1, 2].map((i) => (t[0][i] + t[1][i] + t[2][i]) / 3);
    return c[0] < fx0 || c[0] > fx1 || c[1] < fy0 || c[1] > fy1 || c[2] < -0.02;
  };
  const accIdx = [];
  // 'endStud': the small round stud at the low-y end of a lying part (only its first 0.2 studs along y, the stud itself) is black
  const minTy = Math.min(...best.tris.flat().map((p) => p[1]));
  // 'openTopStuds': the open studs (with a hole) on the top are black; LDraw draws them as triangles above the top face,
  // the solid studs are separate stud instances and keep the part colour
  const maxTz = Math.max(...best.tris.flat().map((p) => p[2]));
  for (const t of best.tris) {
    // 'clipSides': only the two outer flanges of the clip ring are black, the middle stays in the part colour
    const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    // 'oppositeStud': the open stud on the far cell of the part (the one without a solid stud) is black
    const oc = sc.length ? [best.bw - sc[0][0], best.bd - sc[0][1]] : [0, 0];
    const nearOpp = t.every((p) => Math.hypot(p[0] - oc[0], p[1] - oc[1]) <= 0.34 && p[2] >= 2.4);
    const target = (spec.accent === 'clipSides' && isClip(t) && (cy < 0.35 || cy > 0.65)) || (spec.accent === 'oppositeStud' && nearOpp) || (spec.accent === 'endStud' && t.every((p) => p[1] <= minTy + 0.2 + 1e-6)) || (spec.accent === 'openTopStuds' && (t[0][2] + t[1][2] + t[2][2]) / 3 > maxTz - 0.5 + 0.02) ? accIdx : idx;
    for (const p of t) {
      const key = p.map(q).join(',');
      if (!map.has(key)) { map.set(key, pos.length / 3); pos.push(...p.map(q)); }
      target.push(map.get(key));
    }
  }
  // drop degenerate triangles
  const dropDegenerate = (list) => {
    const out = [];
    for (let i = 0; i < list.length; i += 3) if (list[i] !== list[i + 1] && list[i + 1] !== list[i + 2] && list[i] !== list[i + 2]) out.push(list[i], list[i + 1], list[i + 2]);
    return out;
  };
  const clean = dropDegenerate(idx);
  const studsOut = spec.noStuds ? [] : best.studs.map((s) => ({ p: s.c.map(q), up: s.up.map((v) => Math.round(v)), hollow: s.kind === 'hollow' }));
  // edge lines (LDraw line type 2), each pair once
  const seen = new Set();
  const lineOut = [];
  for (const [a, b] of best.lines) {
    const ka = a.map(q).join(','), kb = b.map(q).join(',');
    if (ka === kb) continue;
    // short chord segments of curved surfaces (clip rings, ball joints) would draw as a dense black fringe
    if (spec.sparseEdges && Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] - b[2]) * 0.4) < 0.14) continue;
    const key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
    if (seen.has(key)) continue;
    seen.add(key);
    lineOut.push(...a.map(q), ...b.map(q));
  }
  if (spec.derive) derived[id] = voxelSolids(best.tris, !!spec.tiltRebase);
  result[id] = { file: spec.file, accent: spec.accent ?? null, pos, idx: clean, accentIdx: dropDegenerate(accIdx), lines: lineOut, studs: studsOut };
}
// Stud primitives of the LDraw library, in stud units with +y up (three.js axes): x / 20, -y / 20, -z / 20.
const templates = {};
for (const [name, kind] of Object.entries(STUD)) {
  const raw = { tris: [], studs: [], lines: [] };
  flatten(name, I, [0, 0, 0], false, raw);
  const pos = [];
  const idx = [];
  const map = new Map();
  for (const t of raw.tris) for (const p of t) {
    const v = [p[0] / 20, -p[1] / 20, -p[2] / 20].map((x) => Math.round(x * 10000) / 10000);
    const key = v.join(',');
    if (!map.has(key)) { map.set(key, pos.length / 3); pos.push(...v); }
    idx.push(map.get(key));
  }
  templates[kind] = { file: name, pos, idx };
}
result._studs = templates;
console.log(report.join('\n'));
const ts = `// Generated by parts/bricks/build-parts.mjs from the LDraw meshes - do not edit.
// Collision solids of the parts that are taken over from LDraw (grid cells, plate heights).
import type { Solid } from './types.ts';

export const DERIVED: Record<string, { w: number; d: number; solids: Solid[] }> = ${JSON.stringify(derived, null, 1).replace(/\n\s+/g, ' ').replace(/\{ "w"/g, '\n  { "w"')};
`;
fs.writeFileSync(path.join(root, 'app/src/ts/derived-parts.ts'), ts);
const outFile = path.join(root, 'parts/bricks/ldraw-meshes.json');
fs.writeFileSync(outFile, JSON.stringify(result));
console.log(`wrote ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);
