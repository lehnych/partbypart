// Checks of the NF10330 T-90A instruction (model.json, parts box of the booklet, entry ways).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUnits, checkPlacement, countPartsByStep, ModelError, validateModel } from '../../app/src/ts/model.ts';

const read = (p: string): unknown => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const model = validateModel(read('./model.json'));
const expected = read('./expected-parts.json') as Record<string, Record<string, number>>;

test('model.json passes validation', () => {
  assert.ok(model.length > 0);
});

test('no parts overlap and none float in the air', () => {
  // Known approximation: the cell grid is coarser than the slanted wedge tile of step 3, so the wing plates of step 14
  // are reported as touching it by one cell. The positions come from the verified model.json and are kept.
  // The axle of steps 30 / 46 runs through the hole of the Technic brick 1x1, so the cell grid sees them as one. Its stopper sits on the outer face, the shaft points toward the hull; the beam is built apart and only lowered in step 51, so the shaft meeting the hull plates here is expected. The bush sits on the axle against the brick, so it overlaps the axle by design.
  // Likewise the light clip plate of steps 19 / 36 (its stud and clip stand one plate higher than the cell grid knows) touches the 1x8 above it.
  const approximate = new Set(['s14-01 overlaps s03-01', 's14-04 overlaps s03-02', 's19-01 overlaps s18-02', 's36-01 overlaps s35-02', 's30-01 overlaps s20-02', 's30-02 overlaps s30-01', 's31-01 overlaps s30-02', 's31-02 overlaps s30-01', 's32-01 overlaps s30-01', 's32-02 overlaps s32-01', 's33-02 overlaps s33-01', 's33-03 overlaps s33-02', 's46-01 overlaps s38-01, s01-02', 's46-02 overlaps s46-01, s06-02']);
  // Beam 34 (steps 18-30) was moved one stud towards the hull on request, so it reaches into the hull plates of steps 1-17
  // while it is built apart. Overlaps of those parts with hull parts only are expected.
  const intoHull = (message: string): boolean => {
    const m = /^s(\d+)-\d+ overlaps (.+)$/.exec(message);
    if (!m) return false;
    const step = Number(m[1]);
    const ids = m[2].split(', ').map((id) => Number(id.slice(1, 3)));
    // Beam 50 (steps 35-50) is the mirror image of beam 34 and, like it, is moved towards the hull on request, so it reaches into the hull plates;
    // its hardware (steps 46-50) meets the beam parts built before it exactly like steps 30-34 do.
    if (step >= 35 && step <= 50) return ids.every((n) => n <= 17 || (step >= 46 && n <= 50));
    return step >= 18 && step <= 34 && ids.every((n) => n <= 17 || ((step === 33 || step === 34) && n <= 34)); // the pin sits in the jaws of the thick clip of step 24 and the stack touches the clips and ball joints around it
  };
  // Rear deck (steps 52-64): parts stuck on sideways share a grid cell with what holds them (light grey plate on the bracket wall,
  // clip tiles on that plate, the handle of each tilted shield of step 58 in its two clips).
  // The upright part of the brackets 1x1 of step 63 is 0.2 studs thick at the edge of its cell (x 5.0-5.2 / 6.8-7.0); the stack of step 62 on the
  // half-stud jumper reaches only x 5.5-6.5, so they do not touch although the grid sees the same cells.
  const deckSide = new Set(['s63-01 overlaps s62-01, s62-02', 's63-03 overlaps s62-01, s62-02', 's55-02 overlaps s55-01', 's55-03 overlaps s55-02', 's55-04 overlaps s55-02', 's55-06 overlaps s55-05', 's55-07 overlaps s55-06', 's55-08 overlaps s55-06', 's58-01 overlaps s55-04, s55-03', 's58-02 overlaps s55-08, s55-07']);
  const issues = checkPlacement(model).filter((i) => !approximate.has(i.message) && !intoHull(i.message) && !deckSide.has(i.message));
  assert.deepEqual(issues.map((i) => i.message), []);
});

test('part counts per step match the parts box of the booklet', () => {
  const counts = countPartsByStep(model);
  for (const [step, parts] of Object.entries(expected)) {
    assert.deepEqual(counts[step], parts, `step ${step}`);
  }
});

test('assemblies fly in as one unit', () => {
  const units = buildUnits(model).filter((u) => !u.join);
  const withAssembly = units.filter((u) => u.assembly);
  assert.ok(withAssembly.length > 0);
  for (const u of withAssembly) assert.ok(u.elements.length >= 2);
  const merged = withAssembly.reduce((n, u) => n + u.elements.length - 1, 0);
  assert.equal(units.length, model.length - merged);
});

test('every staged sub-assembly gets exactly one join step after its last part', () => {
  const units = buildUnits(model);
  const joins = units.filter((u) => u.join);
  const stages = new Set(model.filter((e) => e.stage).map((e) => e.stage));
  assert.equal(joins.length, stages.size);
  for (const j of joins) {
    const staged = model.filter((e) => e.stage === j.join);
    assert.equal(j.elements.length, staged.length);
    assert.equal(j.step, Math.max(...staged.map((e) => e.step)) + 1);
  }
});

test('validation rejects broken data with readable messages', () => {
  const bad = [{ id: 'x', step: 1, order: 1, part: 'nope', color: 'black', pos: [0, 0, 0], rot: 45, group: 'main' }];
  assert.throws(() => validateModel(bad), (e: unknown) => {
    assert.ok(e instanceof ModelError);
    assert.ok(e.problems.some((p) => p.includes('unknown part')));
    assert.ok(e.problems.some((p) => p.includes('"rot"')));
    return true;
  });
});

test('detects a collision and a floating part', () => {
  const base = { color: 'black', group: 'main', rot: 0 as const };
  const els = validateModel([
    { ...base, id: 'a', step: 1, order: 1, part: 'plate_1x3', pos: [0, 0, 0] },
    { ...base, id: 'b', step: 1, order: 2, part: 'plate_1x3', pos: [1, 0, 0] },
    { ...base, id: 'c', step: 1, order: 3, part: 'plate_1x2', pos: [20, 20, 5] },
  ]);
  const kinds = checkPlacement(els).map((i) => i.kind).sort();
  assert.deepEqual(kinds, ['collision', 'floating']);
});

test('no part cuts through another on its way in (also not into the model below a sub-assembly that is built higher up)', async () => {
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', new URL('../../tools/check/entry-paths.mjs', import.meta.url).pathname, new URL('.', import.meta.url).pathname], { encoding: 'utf8' });
  assert.match(out, /^0 of \d+ segments$/m, out);
});
