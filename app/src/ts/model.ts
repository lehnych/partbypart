import { orientedPart, PARTS, solidCells } from './parts.ts';
import type { Issue, ModelElement, Rot, Unit, Vec3 } from './types.ts';

const ROTS: readonly number[] = [0, 90, 180, 270];

export class ModelError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`model.json is invalid:\n- ${problems.join('\n- ')}`);
    this.problems = problems;
  }
}

/** Hand-written validation, so the project needs no schema library. */
export function validateModel(raw: unknown): ModelElement[] {
  const problems: string[] = [];
  if (!Array.isArray(raw)) throw new ModelError(['top level must be an array of elements']);
  const ids = new Set<string>();
  const stepOrder = new Set<string>();
  const out: ModelElement[] = [];

  raw.forEach((item, i) => {
    const where = `element #${i}${item && typeof item === 'object' && 'id' in item ? ` (${String((item as { id: unknown }).id)})` : ''}`;
    if (!item || typeof item !== 'object') {
      problems.push(`${where}: not an object`);
      return;
    }
    const e = item as Record<string, unknown>;
    const str = (k: string): string | null => {
      if (typeof e[k] === 'string' && (e[k] as string).length > 0) return e[k] as string;
      problems.push(`${where}: "${k}" must be a non-empty string`);
      return null;
    };
    const int = (k: string, min: number): number | null => {
      if (Number.isInteger(e[k]) && (e[k] as number) >= min) return e[k] as number;
      problems.push(`${where}: "${k}" must be an integer >= ${min}`);
      return null;
    };

    const id = str('id');
    const part = str('part');
    const color = str('color');
    const group = str('group');
    const step = int('step', 1);
    const order = int('order', 1);
    if (id) {
      if (ids.has(id)) problems.push(`${where}: duplicate id`);
      ids.add(id);
    }
    if (part && !PARTS[part]) problems.push(`${where}: unknown part "${part}"`);
    if (!ROTS.includes(e.rot as number)) problems.push(`${where}: "rot" must be 0, 90, 180 or 270`);
    const pos = e.pos;
    const posOk = Array.isArray(pos) && pos.length === 3 && pos.every((n) => Number.isInteger(n));
    if (!posOk) problems.push(`${where}: "pos" must be [x, y, z] with integers`);
    if (step !== null && order !== null) {
      const key = `${step}/${order}`;
      if (stepOrder.has(key)) problems.push(`${where}: step ${step} already has order ${order}`);
      stepOrder.add(key);
    }
    if (e.stage !== undefined && typeof e.stage !== 'string') problems.push(`${where}: "stage" must be a string`);
    if (e.assembly !== undefined && typeof e.assembly !== 'string') problems.push(`${where}: "assembly" must be a string`);
    if (e.from !== undefined && e.from !== 'above' && e.from !== 'below' && e.from !== '+x' && e.from !== '-x' && e.from !== '+y' && e.from !== '-y') problems.push(`${where}: "from" must be "above", "below", "+x", "-x", "+y" or "-y"`);
    if (e.clamped !== undefined && typeof e.clamped !== 'boolean') problems.push(`${where}: "clamped" must be true or false`);
    if (e.confidence !== undefined && e.confidence !== 'measured' && e.confidence !== 'estimate') {
      problems.push(`${where}: "confidence" must be "measured" or "estimate"`);
    }

    if (id && part && color && group && step !== null && order !== null && posOk && ROTS.includes(e.rot as number)) {
      out.push({
        id,
        step,
        order,
        part,
        color,
        group,
        pos: pos as Vec3,
        rot: e.rot as Rot,
        ...(typeof e.assembly === 'string' ? { assembly: e.assembly } : {}),
        ...(e.assemblyFrom === '+x' || e.assemblyFrom === '-x' || e.assemblyFrom === '+y' || e.assemblyFrom === '-y' ? { assemblyFrom: e.assemblyFrom } : {}),
        ...(typeof e.slideDistance === 'number' && e.slideDistance > 0 ? { slideDistance: e.slideDistance } : {}),
        ...(typeof e.fadeStuds === 'number' && e.fadeStuds > 0 ? { fadeStuds: e.fadeStuds } : {}),
        ...(typeof e.stageLift === 'number' && e.stageLift >= 0 ? { stageLift: e.stageLift } : {}),
        ...(e.hoverSide === 'above' || e.hoverSide === 'below' ? { hoverSide: e.hoverSide } : {}),
        ...(typeof e.hoverSlide === 'number' && e.hoverSlide > 0 ? { hoverSlide: e.hoverSlide } : {}),
        ...(typeof e.stage === 'string' ? { stage: e.stage } : {}),
        ...(e.from === 'below' || e.from === '+x' || e.from === '-x' || e.from === '+y' || e.from === '-y' ? { from: e.from } : {}),
        ...(e.clamped === true ? { clamped: true } : {}),
        ...(e.confidence ? { confidence: e.confidence as 'measured' | 'estimate' } : {}),
        ...(typeof e.note === 'string' ? { note: e.note } : {}),
      });
    }
  });

  if (problems.length) throw new ModelError(problems);
  return sortElements(out);
}

export function sortElements(els: ModelElement[]): ModelElement[] {
  return [...els].sort((a, b) => a.step - b.step || a.order - b.order);
}

/** Start distances in studs (the viewer uses the same pattern): 5 for a single part, 2.5 for a part of an intermediate step. */
export const SINGLE_STUDS = 5;
export const ASSEMBLY_STUDS = 2.5;

/**
 * How long a segment lasts on the timeline. The speed is kept about the same everywhere: the longer the way, the longer the
 * segment (5 studs = one segment; a part that starts closer gets a shorter one, never less than 0.7).
 */
export function unitSpan(els: ModelElement[]): number {
  const clampTo = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  if (els.length <= 1) {
    const e = els[0];
    if (!e) return 1;
    return clampTo((e.slideDistance ?? SINGLE_STUDS) / SINGLE_STUDS, 0.7, 1.5);
  }
  // an assembly: one phase per part, then the hover phase. Longer ways stretch the whole segment.
  const rel = els.map((e) => (e.slideDistance ?? ASSEMBLY_STUDS) / ASSEMBLY_STUDS);
  rel.push((els[0].hoverSlide ?? SINGLE_STUDS) / SINGLE_STUDS);
  return (els.length + 1) * clampTo(Math.max(...rel), 1, 1.6);
}

/**
 * Scroll segments. Consecutive elements of one assembly share a segment,
 * everything else gets one segment per element.
 */
export function buildUnits(sorted: ModelElement[]): Unit[] {
  const units: Unit[] = [];
  for (const el of sorted) {
    const last = units[units.length - 1];
    if (el.assembly && last && last.assembly === el.assembly && last.step === el.step) {
      last.elements.push(el);
    } else {
      units.push({ index: units.length, step: el.step, elements: [el], span: 1, ...(el.assembly ? { assembly: el.assembly } : {}) });
    }
  }
  for (const u of units) u.span = unitSpan(u.elements);
  // A staged sub-assembly is joined in a step of its own, right after its last part.
  const out: Unit[] = [];
  units.forEach((u, i) => {
    out.push(u);
    const stage = u.elements[0]?.stage;
    const next = units[i + 1]?.elements[0]?.stage;
    if (stage && next !== stage) {
      const parts = units.filter((x) => x.elements[0]?.stage === stage).flatMap((x) => x.elements);
      out.push({ index: 0, step: u.step + 1, elements: parts, join: stage, span: 2 });
    }
  });
  out.forEach((u, i) => (u.index = i));
  return out;
}

/** Scroll position (in segments) at which each unit starts to animate; units before `startVisible` are always there. */
export function unitStarts(units: Unit[], startVisible: number): number[] {
  let t = 0;
  return units.map((u, i) => {
    if (i < startVisible) return 0;
    const start = t;
    t += u.span;
    return start;
  });
}

export function animatedLength(units: Unit[], startVisible: number): number {
  return units.slice(startVisible).reduce((n, u) => n + u.span, 0);
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

/** Bounding box in model coordinates: x, y in studs, z in plate heights. */
export function elementBounds(el: ModelElement): Bounds {
  const p = orientedPart(el.part, el.rot);
  let zMax = 0;
  for (const s of p.solids) zMax = Math.max(zMax, s.z1);
  return {
    min: [el.pos[0], el.pos[1], el.pos[2]],
    max: [el.pos[0] + p.w, el.pos[1] + p.d, el.pos[2] + zMax],
  };
}

export function mergeBounds(list: Bounds[]): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of list) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], b.min[i]);
      max[i] = Math.max(max[i], b.max[i]);
    }
  }
  return { min, max };
}

// ------------------------------------------------------------- occupancy

const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;

/** Voxels (x, y, plate layer) filled by one element. */
export function voxelsOf(el: ModelElement): Vec3[] {
  const p = orientedPart(el.part, el.rot);
  const out: Vec3[] = [];
  for (const s of p.solids) {
    for (const [cx, cy] of solidCells(s)) {
      for (let z = s.z0; z < s.z1; z++) out.push([el.pos[0] + cx, el.pos[1] + cy, el.pos[2] + z]);
    }
  }
  return out;
}

/**
 * Looks for placement errors in build order: two parts in the same space, or a part
 * that touches nothing below it. These catch most mistakes made while reading the booklet.
 */
export function checkPlacement(sorted: ModelElement[]): Issue[] {
  const issues: Issue[] = [];
  const placed = new Map<string, string>();

  for (const el of sorted) {
    const p = orientedPart(el.part, el.rot);
    const clash = new Set<string>();
    for (const v of voxelsOf(el)) {
      const other = placed.get(key(...v));
      if (other) clash.add(other);
    }
    if (clash.size) {
      issues.push({
        kind: 'collision',
        ids: [el.id, ...clash],
        message: `${el.id} overlaps ${[...clash].join(', ')}`,
      });
    }

    let supported = false;
    for (const s of p.solids) {
      const bottom = el.pos[2] + s.z0;
      if (bottom === 0) {
        supported = true;
        break;
      }
      for (const [cx, cy] of solidCells(s)) {
        if (placed.has(key(el.pos[0] + cx, el.pos[1] + cy, bottom - 1))) {
          supported = true;
          break;
        }
      }
      if (supported) break;
    }
    if (!supported && !el.clamped) {
      issues.push({ kind: 'floating', ids: [el.id], message: `${el.id} (step ${el.step}) rests on nothing` });
    }

    for (const v of voxelsOf(el)) placed.set(key(...v), el.id);
  }
  return issues;
}

/** Part counts per step, used to compare against the parts box printed in the booklet. */
export function countPartsByStep(els: ModelElement[]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const e of els) {
    const s = (out[String(e.step)] ??= {});
    const key = e.part.replace(/_[hc]m?$/, ''); // placement variants (…_h) count as their base part
    s[key] = (s[key] ?? 0) + 1;
  }
  return out;
}
