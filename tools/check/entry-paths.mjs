// Checks the way every part (or intermediate step) travels when it is shown: does it cut through parts that are already there?
// Run: node --experimental-strip-types tools/check/entry-paths.mjs <instruction folder or its model.json>
// Exceptions of one instruction (parts that pass through each other in the grid, stages checked against the top of the model)
// come from `checks.json` next to its model.json: { "entryPaths": { "passes": [{ "mover", "other" }], "topCheckStages": [] } }.
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { validateModel, sortElements, buildUnits, voxelsOf } from '../../app/src/ts/model.ts';

const PLATE = 0.4;
const arg = process.argv[2];
if (!arg) {
  console.error('usage: entry-paths.mjs <instruction folder or its model.json>');
  process.exit(2);
}
const modelFile = fs.statSync(arg).isDirectory() ? join(arg, 'model.json') : arg;
const checksFile = join(dirname(modelFile), 'checks.json');
const checks = (fs.existsSync(checksFile) ? JSON.parse(fs.readFileSync(checksFile, 'utf8')).entryPaths : null) ?? {};
const model = sortElements(validateModel(JSON.parse(fs.readFileSync(modelFile, 'utf8'))));
const allUnits = buildUnits(model);
const units = allUnits.filter((u) => !u.join);
// try another build height for staged sub-assemblies: LIFT=beams:4 (studs)
const tryLift = Object.fromEntries((process.env.LIFT ?? '').split(',').filter(Boolean).map((p) => { const [k, v] = p.split(':'); return [k, Number(v)]; }));
const liftOf = (e) => (e.stage && tryLift[e.stage] !== undefined ? tryLift[e.stage] : e.stageLift ?? 10);
const key = (v) => v.join(',');
const placed = new Map(); // one occupancy map per place where things are built: the model itself and every staged sub-assembly
const mapFor = (e) => { const k = e.stage ?? 'model'; if (!placed.has(k)) placed.set(k, new Map()); return placed.get(k); };
const byId = new Map(model.map((e) => [e.id, e]));
// pairs of parts that the grid sees in the same cells although they do not meet (e.g. an axle through the hole of a Technic brick)
const PASSES = (checks.passes ?? []).map((p) => [new RegExp(p.mover), new RegExp(p.other)]);
const passes = (mover, other) => PASSES.some(([m, o]) => m.test(mover) && o.test(other));
const out = [];
// stages whose parts coming from below must start above the top of the model
const TOP_CHECK = new Set(checks.topCheckStages ?? []);
// highest top (plate height) of the model in the columns under / around the given cells (margin in studs)
function modelTopNear(cells, margin) {
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const x0 = Math.min(...xs) - margin, x1 = Math.max(...xs) + margin, y0 = Math.min(...ys) - margin, y1 = Math.max(...ys) + margin;
  let top = -Infinity;
  for (const k of placed.get('model').keys()) {
    const [x, y, z] = k.split(',').map(Number);
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) top = Math.max(top, z + 1);
  }
  return top;
}

// offsets (in grid units: x/y studs, z plates) along the way from the start to the final place, final place excluded
function path(from, studs) {
  const steps = [];
  const n = from === '+x' || from === '-x' || from === '+y' || from === '-y' ? Math.ceil(studs) : Math.ceil(studs / PLATE);
  for (let i = n; i >= 1; i--) {
    if (from === '+x') steps.push([i, 0, 0]);
    else if (from === '-x') steps.push([-i, 0, 0]);
    else if (from === '+y') steps.push([0, i, 0]);
    else if (from === '-y') steps.push([0, -i, 0]);
    else if (from === 'below') steps.push([0, 0, -i]);
    else steps.push([0, 0, i]);
  }
  return steps;
}
let current = null; // the element / unit being checked (its stage decides the second test)
function hit(map, cells, off, own, movers) {
  // a staged sub-assembly is built higher up (its build height); while it is built it must not reach into the model below
  const lift = current?.stage ? Math.round(liftOf(current) / PLATE) : null;
  const model = placed.get('model');
  for (const c of cells) {
    const k = key([c[0] + off[0], c[1] + off[1], c[2] + off[2]]);
    const o = map.get(k);
    if (o && !own.has(o) && !movers.some((m) => passes(m, byId.get(o).part))) return o;
    if (lift !== null && model) {
      const o2 = model.get(key([c[0] + off[0], c[1] + off[1], c[2] + off[2] + lift]));
      if (o2) return o2 + ' (model below)';
    }
  }
  return null;
}
for (const u of allUnits) {
  if (u.join) {
    // the staged sub-assembly is set down: from now on its parts belong to the model
    const m = placed.get('model') ?? new Map();
    placed.set('model', m);
    for (const [k, v] of placed.get(u.join) ?? []) m.set(k, v);
    continue;
  }
  const els = u.elements;
  current = els[0];
  const map = mapFor(els[0]);
  const own = new Set(els.map((e) => e.id));
  const label = `step ${u.step} ` + els.map((e) => e.id).join('+');
  const problems = [];
  if (els.length === 1) {
    const e = els[0];
    const studs = e.slideDistance ?? 5;
    for (const off of path(e.from ?? 'above', studs)) {
      const o = hit(map, voxelsOf(e), off, own, [e.part]);
      if (o) { problems.push(`${e.id} (${e.from ?? 'above'}) hits ${o} ${off.join('/')}`); break; }
    }
  } else {
    const first = els[0];
    const side = first.assemblyFrom;
    const hoverDir = side ? side : (first.hoverSide ?? (first.from === 'below' ? 'below' : 'above'));
    const hover = path(hoverDir, first.hoverSlide ?? 5);
    const all = els.flatMap((e) => voxelsOf(e));
    for (const off of hover) {
      const o = hit(map, all, off, own, els.map((e) => e.part));
      if (o) { problems.push(`unit (${hoverDir}) hits ${o} ${off.join('/')}`); break; }
    }
    const h0 = hover[0] ?? [0, 0, 0];
    for (const e of els) {
      for (const off of path(e.from ?? 'above', e.slideDistance ?? 2.5)) {
        const o = hit(map, voxelsOf(e), [off[0] + h0[0], off[1] + h0[1], off[2] + h0[2]], own, [e.part]);
        if (o) { problems.push(`${e.id} joining (${e.from ?? 'above'}) hits ${o}`); break; }
      }
    }
  }
  // A staged sub-assembly floats above the model; a part that comes from below must start above the top of the model
  // around it, even where the cells right under it are empty (a gap between tall bricks is still inside the model).
  if (current?.stage && TOP_CHECK.has(current.stage) && placed.get('model')) {
    const lift = liftOf(current) / PLATE;
    const first = els[0];
    const hoverDir = els.length > 1 ? (first.assemblyFrom ?? first.hoverSide ?? (first.from === 'below' ? 'below' : 'above')) : null;
    const hoverOff = hoverDir === 'below' ? -(first.hoverSlide ?? 5) / PLATE : hoverDir === 'above' ? (first.hoverSlide ?? 5) / PLATE : 0;
    for (const e of els) {
      const sd = e.slideDistance ?? (els.length > 1 ? 2.5 : 5);
      const ownOff = e.from === 'below' ? -sd / PLATE : e.from === undefined || e.from === 'above' ? sd / PLATE : 0;
      if (hoverOff >= 0 && ownOff >= 0) continue;
      const cells = voxelsOf(e);
      const low = Math.min(...cells.map((c) => c[2])) + lift + hoverOff + Math.min(ownOff, 0);
      const top = modelTopNear(cells, 2);
      if (low < top - 1e-6) problems.push(`${e.id} starts at z ${low.toFixed(2)}, below the top of the model (z ${top})`);
    }
  }
  if (problems.length) out.push(`${label}: ${problems.join('; ')}`);
  for (const e of els) for (const v of voxelsOf(e)) map.set(key(v), e.id);
}
console.log(out.length ? out.join('\n') : 'no part cuts through another on its way in');
console.log(`${out.length} of ${units.length} segments`);
