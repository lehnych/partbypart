import { DERIVED } from './derived-parts.ts';
import type { PartDef, Rot, Solid, Vec2 } from './types.ts';

/** Geometry constants in stud units (1 stud = 8 mm). */
export const PLATE_H = 0.4; // 3.2 mm
export const STUD_R = 0.3; // 4.8 mm diameter
export const STUD_H = 0.2; // 1.6 mm

// The parts are drawn from the LDraw library (see parts/bricks); this catalogue only holds what the model logic needs:
// the occupied cells (`solids`) for collision and support checks, and the footprint size.

/** Integer grid cells whose centre lies inside the solid's footprint. */
export function solidCells(s: Solid): Vec2[] {
  const b = bbox(s.poly);
  const out: Vec2[] = [];
  if (s.fill) {
    for (let x = Math.floor(b.x0); x < Math.ceil(b.x1); x++) for (let y = Math.floor(b.y0); y < Math.ceil(b.y1); y++) out.push([x, y]);
    return out;
  }
  for (let x = Math.floor(b.x0); x < Math.ceil(b.x1); x++) {
    for (let y = Math.floor(b.y0); y < Math.ceil(b.y1); y++) {
      if (pointInPoly([x + 0.5, y + 0.5], s.poly)) out.push([x, y]);
    }
  }
  return out;
}

function pointInPoly(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function bbox(poly: Vec2[]): { x0: number; y0: number; x1: number; y1: number } {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function rectAt(x: number, y: number, w: number, d: number, z0: number, z1: number): Solid {
  return {
    poly: [
      [x, y],
      [x + w, y],
      [x + w, y + d],
      [x, y + d],
    ],
    z0,
    z1,
  };
}

function def(id: string, solids: Solid[]): PartDef {
  let w = 0;
  let d = 0;
  for (const s of solids) {
    const b = bbox(s.poly);
    w = Math.max(w, b.x1);
    d = Math.max(d, b.y1);
  }
  return { id, solids, w, d };
}

// ------------------------------------------------------------- catalogue
//
// Naming: `plate_AxB` = A studs deep (y) by B studs long (x) in rotation 0, the way booklets label their parts.
// Heights are plate heights: plate = 1, brick = 3.
// Simple boxes can be added here with `box(id, a, b, h)`; parts taken over from LDraw with `derive: true`
// (parts/bricks/map.mjs) get their collision cells from the real mesh (derived-parts.ts).

export const box = (id: string, a: number, b: number, h: number): PartDef => def(id, [rectAt(0, 0, b, a, 0, h)]);

const list: PartDef[] = [
  ...Object.entries(DERIVED).map(([id, p]) => ({ id, solids: p.solids, w: p.w, d: p.d })),
];

export const PARTS: Readonly<Record<string, PartDef>> = Object.fromEntries(list.map((p) => [p.id, p]));

// --------------------------------------------------------------- rotation

/** Rotate a point of an unrotated part (size w x d) and keep the minimum corner at 0. */
export function xform(p: Vec2, rot: Rot, w: number, d: number): Vec2 {
  switch (rot) {
    case 0:
      return [p[0], p[1]];
    case 90:
      return [d - p[1], p[0]];
    case 180:
      return [w - p[0], d - p[1]];
    case 270:
      return [p[1], w - p[0]];
  }
}

const cache = new Map<string, PartDef>();

/** The part as it stands after rotation; w and d are swapped for 90 and 270. */
export function orientedPart(id: string, rot: Rot): PartDef {
  const key = `${id}|${rot}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = PARTS[id];
  if (!base) throw new Error(`Unknown part "${id}"`);
  const swap = rot === 90 || rot === 270;
  const out: PartDef = {
    id: base.id,
    w: swap ? base.d : base.w,
    d: swap ? base.w : base.d,
    solids: base.solids.map((s) => ({
      z0: s.z0,
      z1: s.z1,
      ...(s.fill ? { fill: true } : {}),
      poly: s.poly.map((p) => xform(p, rot, base.w, base.d)),
    })),
  };
  cache.set(key, out);
  return out;
}
