// Turns the built part of beam 34 (steps 18-30) by 180 degrees about the vertical axis, around the middle of the beam.
// Run after gen-beams.py:  python3 instructions/nf10330-t90a/build/gen-beams.py && node --experimental-strip-types instructions/nf10330-t90a/build/rotate-beam.mjs
import fs from 'node:fs';
import { orientedPart } from '../../../app/src/ts/parts.ts';

const FILE = new URL('../model.json', import.meta.url).pathname;
const model = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const X0 = 12; // beam rows run x 11..13, so x' = 2*12.5 - x - w
const Y_SUM = -17 + 8; // beam core y -17..8, so y' = Y_SUM - y - d
const IN = 1; // the built part moves one stud inward (towards the hull, -x), as asked; it then reaches into the hull plates
const RIGHT = 1; // and one stud to the right as seen in the default view, which is +y (along the beam)
let n = 0;
for (const e of model) {
  if (e.group !== 'beam34' || e.step > 30) continue; // steps 31-34 are loose hardware beside the beam, they stay where they are
  const p = orientedPart(e.part, e.rot);
  e.pos = [2 * X0 + 1 - e.pos[0] - p.w - IN, Y_SUM - e.pos[1] - p.d + RIGHT, e.pos[2]];
  e.rot = (e.rot + 180) % 360;
  if (e.from === '+x') e.from = '-x';
  else if (e.from === '-x') e.from = '+x';
  n++;
}
// Step 31: the 3x3 disc, then the bush with two flanges, are pushed onto the axle of step 30 behind the half bush
// (stack on the shaft: half bush 0.5, disc 0.5, flanged bush 1 stud, all along x from the free end).
{
  const axle = model.find((e) => e.id === 's30-01');
  const bush = model.find((e) => e.id === 's30-02');
  const old = model.filter((e) => e.group === 'beam34' && e.step === 31);
  const mk = (e, id, order, part, pos, rot) => Object.assign(e, { id, order, part, pos, rot, from: '+x', note: 'estimate: pushed onto the axle of step 30 along the X axis' });
  const disc = old.find((e) => e.part === 'disc_3x3');
  const flanged = old.find((e) => e.part === 'bush_flanged');
  mk(disc, 's31-01', 1, 'disc_3x3', [bush.pos[0], axle.pos[1] - 1, -3], 270);
  mk(flanged, 's31-02', 2, 'bush_flanged', [bush.pos[0] + 1, axle.pos[1], -1], 0);
  // the array order follows the build order: disc first, then the flanged bush
  const lo = Math.min(model.indexOf(disc), model.indexOf(flanged));
  const hi = Math.max(model.indexOf(disc), model.indexOf(flanged));
  model[lo] = disc;
  model[hi] = flanged;
}
// Step 32: another 3x3 disc, then a half bush, behind the flanged bush on the same shaft (disc 14..14.5, half bush 14.5..15).
// Rotated by 90 degrees the far half of the disc cell lies at the low end of the cell and the half bush at the high end.
{
  const axle = model.find((e) => e.id === 's30-01');
  const flanged = model.find((e) => e.id === 's31-02');
  const old = model.filter((e) => e.group === 'beam34' && e.step === 32);
  const disc = old.find((e) => e.part === 'disc_3x3');
  const half = old.find((e) => e.part === 'bush_half');
  const x = flanged.pos[0] + 1;
  const mk = (e, id, order, pos) => Object.assign(e, { id, order, pos, rot: 90, from: '+x', note: 'estimate: pushed onto the axle of step 30 along the X axis' });
  mk(disc, 's32-01', 1, [x, axle.pos[1] - 1, -3]);
  mk(half, 's32-02', 2, [x, axle.pos[1], -1]);
  const lo = Math.min(model.indexOf(disc), model.indexOf(half));
  const hi = Math.max(model.indexOf(disc), model.indexOf(half));
  model[lo] = disc;
  model[hi] = half;
}
// Step 33: the three round parts form a short stack along the Y axis to the left of the construction (seen from above, -x):
// the round tile with pin, the round plate with open stud is pushed onto it, the cone with stop is pushed into the plate.
// Each part slides in from -y and runs until it reaches its neighbour: the plate up to the tile, the cone up to the plate.
// So the tile is at the high-y end (y+2), the plate next to it (y+1), the cone at the low-y end (y). The orientations stay as they were; the cell positions are chosen so the meshes touch without a gap.
{
  const axle = model.find((e) => e.id === 's30-01');
  const rank = { round_tile_pin: 0, round_open_stud: 1, cone_stop: 2 };
  const list = model.filter((e) => e.group === 'beam34' && e.step === 33).sort((a, b) => rank[a.part] - rank[b.part]);
  const slots = list.map((e) => model.indexOf(e)).sort((a, b) => a - b);
  const ROT = { round_tile_pin: 180, round_open_stud: 0, cone_stop: 0 }; // top of a lying part points to -y at 0, to +y at 180
  list.forEach((e, i) => {
    model[slots[i]] = e;
    e.order = i + 1;
    e.id = 's33-0' + (i + 1);
    // cells along y: cone y+1, plate and tile y+2 (plate mesh 9.0-9.6 with its far stud in the hole of the tile at 9.4-10.2, cone mesh 7.8-9.2 on the open stud of the plate)
    // the finished stack is pressed into the thick clip of step 24 (right next to the ball joint of step 22): its axis runs along y,
    // centred on the clip, just outside the beam face
    const clip = model.find((c) => c.id === 's24-02');
    e.pos = [clip.pos[0], clip.pos[1] + [0, 0, -1][i], 2];
    e.rot = ROT[e.part];
    e.from = '-y';
    e.assembly = 'a33'; // put together beside the beam first (tile, plate, cone slide together along y) ...
    e.assemblyFrom = '-x'; // ... then the finished stack is pushed into the clip along x, as the arrow in the booklet shows
    e.hoverSlide = 2.5; // asked for: 2.5 studs along x from the clip (the parts 2.5 studs along y)
  });
}
// Step 34: the Technic axles with stop are mirrored (stopper at the other end).
for (const e of model) if (e.group === 'beam34' && e.step === 34 && e.part === 'axle_4_stop') e.rot = (e.rot + 180) % 360;
// Step 34: the axles and flexible axle joiners lie on the side of step 33 (the -x side of the beam, left of it seen from above),
// directly beside the beam: axle x 5..9, joiner x 4 (upright). The orientations stay.
for (const e of model) {
  if (e.group !== 'beam34' || e.step !== 34) continue;
  if (e.part === 'axle_4_stop') { e.pos = [5, e.pos[1], e.pos[2]]; e.from = '-x'; } // slides in along X from the left
  if (e.part === 'axle_joiner') {
    // stands upright at the end of its axle with its lower hole at the height of the axle, and is pushed in along the X axis from the right to the left
    e.pos = [5, e.pos[1], 1]; // pushed along the axle (x 5..9) all the way up to its stopper at x = 5
    e.rot = 90; // rotated 90 degrees about the vertical: its holes run along x, like the axle
    e.from = '+x'; // pushed in along the X axis from the right
  }
}
// Step 34: every axle + joiner pair goes into a hole of the Technic bricks (hole centres y = -9 (step 28), -4 (step 26), -1 (step 24), 4 (step 21)):
// the joiner (x 10..11) sits flush against the brick (x 11..12), the axle runs through the hole. The pair is first put together beside the beam.
{
  const HOLE = { '-13': -9, '-7': -4.5, '-1': 0, '5': 4.5 }; // y of the hole centre; x.5 = a hole in the middle of a cell (Technic brick 1x2 with two holes, step 26)
  // the connectors sit on the free axle ends (axle tip at x 14): cross-hole barrel x 13..14 with the bush hanging down (booklet); pushed in along X from the right
  for (const e of model) {
    if (e.group !== 'beam34' || e.step !== 34 || e.part !== 'connector_axle_bush') continue;
    const h = HOLE[String(e.pos[1])];
    if (h === undefined) continue;
    const mid = h % 1 !== 0;
    e.pos = [12, mid ? h - 0.5 : h - 1, -3]; // cross-hole barrel at x 12..13, flush against the brick and height 0.75, the bush hangs down
    e.rot = 0;
    e.part += mid ? '_c' : '_h';
    e.from = '+x';
  }
  for (const e of model) {
    if (e.group !== 'beam34' || e.step !== 34 || !/^axle_(4_stop|joiner)$/.test(e.part)) continue;
    const h = HOLE[String(e.pos[1])];
    if (h === undefined) continue;
    const mid = h % 1 !== 0; // hole in the middle of a cell
    e.pos = [10, mid ? h - 0.5 : h - 1, e.part === 'axle_joiner' ? 0 : -1];
    if (e.part === 'axle_joiner') e.part += mid ? '_c' : '_h';
    else e.part = 'axle_3_stop' + (mid ? '_c' : '_h'); // the 3-long axle with stop (24316): stopper x 10, tip flush with the connector at x 13
    e.assembly = 'a34-' + String(h);
    e.assemblyFrom = '-x';
    if (e.part.startsWith('axle_3_stop')) e.slideDistance = 2; // starts 2 studs from its place in the pair, fully visible at 1
    if (e.part.startsWith('axle_joiner')) e.slideDistance = 3.5; // appears in front of the construction (x < 10), beyond the axle tip, not inside the clips
  }
}
// Step 34 build order: first all axles together with their joiners, then the connectors (axle/bush)
{
  const s34 = model.filter(e => e.group === 'beam34' && e.step === 34);
  const rank = e => (e.part === 'connector_axle_bush' ? 1 : 0);
  s34.sort((a, b) => rank(a) - rank(b) || a.order - b.order).forEach((e, i) => { e.order = i + 1; });
}

// ---------------------------------------------------------------------------------------------------------------------
// Beam 50 (steps 35-50) is the mirror image of beam 34 (steps 18-34): mirrored across the middle plane of the hull (x = 6),
// y and z stay. Body parts keep their own step/order/slide of the booklet, the hardware (steps 46-50) copies steps 30-34.
{
  const MIRROR_X = 12; // hull x 0..12
  const meshes = JSON.parse(fs.readFileSync(new URL('../../../parts/bricks/ldraw-meshes.json', import.meta.url).pathname, 'utf8'));
  const { PARTS, xform } = await import('../../../app/src/ts/parts.ts');
  const bboxX = (part, rot) => {
    const m = meshes[part], b = PARTS[part];
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < m.pos.length; i += 3) {
      const [x] = xform([m.pos[i], m.pos[i + 1]], rot, b.w, b.d);
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
    return [lo, hi];
  };
  const bboxY = (part, rot) => {
    const m = meshes[part], b = PARTS[part];
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < m.pos.length; i += 3) {
      const [, y] = xform([m.pos[i], m.pos[i + 1]], rot, b.w, b.d);
      lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
    return [lo, hi];
  };
  const map = JSON.parse(fs.readFileSync(new URL('./beam50-map.json', import.meta.url).pathname, 'utf8'));
  const byId = new Map(model.map((e) => [e.id, e]));
  const swap = (v) => (v === '+x' ? '-x' : v === '-x' ? '+x' : v);
  const mirrorPart = (part, rot) => (/^axle_3_stop_[ch]$/.test(part) && rot === 180 ? part + 'm' : part); // the cross profile is tilted the other way
  const out = [];
  let worst = 0;
  for (const e50 of model.filter((e) => e.group === 'beam50')) {
    const e34 = byId.get(map[e50.id]);
    if (!e34) throw new Error('no beam-34 partner for ' + e50.id);
    // mirrored placement: the left edge/front of the part must be the mirror image of the beam-34 part. The candidate rotation whose
    // bounding box matches best wins (the rotation of an asymmetric part flips differently from that of a symmetric one).
    const [lo, hi] = bboxX(e34.part, e34.rot);
    const [ylo, yhi] = bboxY(e34.part, e34.rot);
    let best = null;
    for (const rot of [(180 - e34.rot + 360) % 360, e34.rot, (e34.rot + 180) % 360, (360 - e34.rot) % 360]) {
      const part = mirrorPart(e34.part, rot === e34.rot || rot === (360 - e34.rot) % 360 ? e34.rot : 180);
      const [lo2] = bboxX(part, rot);
      const [ylo2] = bboxY(part, rot);
      const tx = MIRROR_X - (e34.pos[0] + hi) - lo2;
      const ty = e34.pos[1] + ylo - ylo2;
      const px = Math.round(tx), py = Math.round(ty);
      const err = Math.max(Math.abs(tx - px), Math.abs(ty - py));
      const [lo3, hi3] = bboxX(part, rot);
      const size = Math.abs((hi3 - lo3) - (hi - lo));
      if (!best || err + size < best.err - 1e-9) best = { rot, part, pos: [px, py, e34.pos[2]], err: err + size };
    }
    worst = Math.max(worst, best.err);
    const { rot, part } = best;
    const nw = { ...e50, part, rot, pos: best.pos };
    const hw = e50.step >= 46;
    if (hw) {
      for (const k of ['from', 'assembly', 'assemblyFrom', 'hoverSlide', 'slideDistance', 'order', 'note']) delete nw[k];
      for (const k of ['from', 'assembly', 'assemblyFrom', 'hoverSlide', 'slideDistance', 'order', 'note']) if (e34[k] !== undefined) nw[k] = e34[k];
      nw.from = nw.from ? swap(nw.from) : nw.from;
      if (!nw.from) delete nw.from;
      if (nw.assemblyFrom) nw.assemblyFrom = swap(nw.assemblyFrom);
      if (nw.assembly) nw.assembly = nw.assembly.replace(/^a33/, 'a49').replace(/^a34-/, 'a50-');
      nw.id = `s${String(e50.step).padStart(2, '0')}-${String(nw.order).padStart(2, '0')}`;
    } else if (nw.from) {
      nw.from = swap(nw.from);
    }
    out.push(nw);
  }
  // swap the beam-50 elements in the model
  for (let i = model.length - 1; i >= 0; i--) if (model[i].group === 'beam50') model.splice(i, 1);
  model.push(...out);
  // Corrections made by hand on beam 50 (they take priority over the mirror image of beam 34)
  const fix = (id, f) => f(model.find((e) => e.id === id));
  fix('s36-02', (e) => { e.pos = [e.pos[0], 5, -1]; }); // step 36: the brick 1x2 goes under the plate 1x1 with light clip (y 5) and the plate 1x3 beside it (y 6)
  fix('s40-02', (e) => { e.pos = [e.pos[0], 1, -1]; }); // step 40: the other brick 1x2 takes the place the step-36 brick had
  // step 37: the plate 1x2 with side clip is put together with the plate 1x1 first (intermediate step), then pushed up to its place from below
  fix('s37-02', (e) => { e.order = 1; e.assembly = 'a37'; });
  fix('s37-01', (e) => { e.order = 2; e.assembly = 'a37'; });
  // step 43: one intermediate step with all five parts: first the brick 1x3 and the Technic brick 1x2 with holes (they arrive from below),
  // then the plate 1x1, the plate 1x2 with side clip and the plate 1x1 with light clip (they arrive from above); the finished unit is pushed up from below
  [['s43-01', 1, 'below'], ['s43-05', 2, 'below'], ['s43-02', 3, null], ['s43-04', 4, null], ['s43-03', 5, null]].forEach(([id, order, from]) => fix(id, (e) => {
    e.order = order; e.assembly = 'a43';
    if (from) e.from = from; else delete e.from;
  }));
  // step 44: one intermediate step built above the construction: the Technic brick 1x2 with hole arrives from below, the plate 1x2 with ball joint,
  // the plate 1x1 with thick clip and the plate 1x6 arrive from above; the finished unit is then lowered into place
  [['s44-03', 1, 'below'], ['s44-01', 2, null], ['s44-02', 3, null], ['s44-04', 4, null]].forEach(([id, order, from]) => fix(id, (e) => {
    e.order = order; e.assembly = 'a44'; e.hoverSide = 'above';
    if (from) e.from = from; else delete e.from;
  }));
  // beam 50 waits on the inner side (+x) of its holes: an axle that starts 5 studs beyond that would reach into beam 34, so it starts at the usual 2.5
  // (now the same 2 studs as in step 34, copied by the mirror)
  console.log('mirrored', out.length, 'elements of beam50, worst x rounding', worst.toFixed(2));
}
// Step 51: both beams were set down too deep, their bricks reached into the hull plates (top of the hull at z 2, lowest brick at z -1):
// the whole beams sit three plate heights higher, on top of the hull.
for (const e of model) if (e.group === 'beam34' || e.group === 'beam50') e.pos[2] += 3;
// Steps 52-64 (rear deck): the whole construction is turned by 180 degrees about the vertical axis (asked; clockwise seen from above),
// around the middle of the plate 4x12 of step 56, so the plate keeps its place on the beams. Sideways directions turn with it.
{
  const plate = model.find((e) => e.group === 'deck' && e.part === 'plate_4x12');
  const P = orientedPart(plate.part, plate.rot);
  const sx = 2 * plate.pos[0] + P.w, sy = 2 * plate.pos[1] + P.d; // x' = sx - x - w, y' = sy - y - d
  const turn = { '+x': '-x', '-x': '+x', '+y': '-y', '-y': '+y' };
  for (const e of model) {
    if (e.group !== 'deck') continue;
    const p = orientedPart(e.part, e.rot);
    e.pos = [sx - e.pos[0] - p.w, sy - e.pos[1] - p.d, e.pos[2]];
    e.rot = (e.rot + 180) % 360;
    if (turn[e.from]) e.from = turn[e.from];
    if (turn[e.assemblyFrom]) e.assemblyFrom = turn[e.assemblyFrom];
  }
  // after the turn the whole construction moves two studs to the back (+y), as asked
  for (const e of model) if (e.group === 'deck') e.pos[1] += 2;
  // step 57: the inverted slope 3x2 sits one stud further to the back (+y), as asked
  for (const e of model) if (e.group === 'deck' && e.part === 'slope_inv_3x2') e.pos[1] += 1;
  // step 57: the inverted slope 2x2 with pin sits one stud further to the front (-y), as asked
  for (const e of model) if (e.group === 'deck' && e.part === 'slope_inv_2x2_pin') e.pos[1] -= 1;
  // step 59: the plate 1x2 with one stud sits one stud further to the back (+y), as asked
  for (const e of model) if (e.group === 'deck' && e.part === 'plate_1x2_jumper') e.pos[1] += 1;
  // step 59: the two tiles 1x3 and the tile 2x3 also one stud further to the back (the jumper above already moved on its own)
  for (const e of model) if (e.group === 'deck' && e.step === 59 && e.part !== 'plate_1x2_jumper') e.pos[1] += 1;
  // step 60: the four plates 1x3 with 2 studs sit one stud further to the back (+y), as asked
  for (const e of model) if (e.group === 'deck' && e.part === 'plate_1x3_offset') e.pos[1] += 1;
  // step 61: the two plates 1x1 sit one stud further to the back (+y), as asked
  for (const e of model) if (e.group === 'deck' && e.step === 61 && e.part === 'plate_1x1') e.pos[1] += 1;
  // step 61: the first plate 1x1 takes the place of the second one, the second one goes 3 studs further on (same direction, -x), as asked
  {
    const [p1, p2] = model.filter((e) => e.group === 'deck' && e.step === 61 && e.part === 'plate_1x1').sort((a, b) => a.order - b.order);
    const dir = Math.sign(p2.pos[0] - p1.pos[0]);
    p1.pos = [...p2.pos];
    p2.pos = [p2.pos[0] + 3 * dir, p2.pos[1], p2.pos[2]];
  }
  // step 61: the two tiles 1x3 at the edges: only the left one moves one stud inward (the right one stays at the edge, asked),
  // both sit one stud further to the back (+y)
  for (const e of model) if (e.group === 'deck' && e.step === 61 && e.part === 'tile_1x3') {
    if (e.pos[0] < 6) e.pos[0] += 1;
    e.pos[1] += 1;
  }
  // step 63: both brackets 1x1 with their slopes one stud further to the back (+y), as asked
  for (const e of model) if (e.group === 'deck' && e.step === 63) e.pos[1] += 1;
  // step 63: each bracket 1x1 stands on one of the plates 1x1 of step 61, turned 90 degrees counter-clockwise seen from above about its stud
  // (as asked): the face now points to -x, the vertical part sits one cell to -x of the plate
  {
    const plates = model.filter((e) => e.group === 'deck' && e.step === 61 && e.part === 'plate_1x1').sort((a, b) => b.pos[0] - a.pos[0]);
    const brackets = model.filter((e) => e.group === 'deck' && e.step === 63 && e.part === 'bracket_1x1').sort((a, b) => b.pos[0] - a.pos[0]);
    brackets.forEach((b, i) => {
      const slope = model.find((e) => e.group === 'deck' && e.assembly === b.assembly && e.part === 'slope_1x1');
      const p = plates[i];
      b.rot = (b.rot + 90) % 360;
      b.pos = [p.pos[0] - 1, p.pos[1], p.pos[2] + 1];
      // the slope 1x1 sits on top of the bracket, on the stud of its plate (asked), and comes from above
      slope.rot = (b.rot + 90) % 360; // turned another 90 degrees counter-clockwise seen from above, as asked
      slope.pos = [p.pos[0], p.pos[1], p.pos[2] + 2];
      // the right bracket (on the plate at the higher x) the other way round: vertical part to +x, so it misses the stack of step 62 (asked);
      // its slope turns with it
      if (i === 0) {
        b.rot = (b.rot + 180) % 360;
        b.pos = [p.pos[0], p.pos[1], p.pos[2] + 1];
        slope.rot = (slope.rot + 180) % 360;
      }
      // then both units (bracket + slope) turned by 180 degrees about the bracket's stud, as asked
      b.rot = (b.rot + 180) % 360;
      slope.rot = (slope.rot + 180) % 360;
      b.pos = [b.rot === 0 ? p.pos[0] : p.pos[0] - 1, p.pos[1], p.pos[2] + 1]; // rot 0: vertical part at +x of the plate, rot 180: at -x
    });
  }
  // step 64: the first combination (brick 1x3 + tile 1x3) is placed as the mirror image of the second one across the middle of the hull (x 6), as asked
  {
    const [b1, t1, b2, t2] = ['s64-01', 's64-02', 's64-03', 's64-04'].map((id) => model.find((e) => e.id === id));
    for (const [a, b] of [[b1, b2], [t1, t2]]) {
      const w = orientedPart(b.part, b.rot).w;
      a.rot = b.rot;
      a.pos = [12 - b.pos[0] - w, b.pos[1], b.pos[2]];
    }
    // then both combinations one stud further to the back (+y), as asked
    for (const e of [b1, t1, b2, t2]) e.pos[1] += 1;
    // and one stud outward each (away from the middle x 6), as asked
    for (const e of [b1, t1, b2, t2]) e.pos[0] += e.pos[0] < 6 ? -1 : 1;
  }
  // step 62: the stack (round plate, round plate, bar with clip) stands on the centre stud of the plate 1x2 with one stud of step 59 (asked);
  // that stud lies between two cells, so the parts use the half-stud variants (_h) over the 2-stud footprint of the plate
  {
    const jumper = model.find((e) => e.group === 'deck' && e.part === 'plate_1x2_jumper');
    model.filter((e) => e.group === 'deck' && e.step === 62).sort((a, b) => a.order - b.order).forEach((e, i) => {
      e.part += '_h';
      e.pos = [jumper.pos[0], jumper.pos[1], jumper.pos[2] + 1 + i];
    });
  }
  // step 58: the shields are tilted 45 degrees away from the construction (outer end up, map.mjs); their handle sits in the clips of step 55
  // (handle about 1.75 studs from the front of the cell and 4.5 plates up, clip about y 8.5 / z 5.25)
  {
    const clip = model.find((e) => e.group === 'deck' && e.part === 'tile_clip_1x1_side');
    // one cell further out, the mesh sits 0.7 back inside it (`nudge` in map.mjs): 0.3 studs further out than at the clips, asked
    for (const e of model) if (e.group === 'deck' && e.part === 'shield_2x3') e.pos = [e.pos[0], clip.pos[1] + 1, clip.pos[2] - 3];
  }
}
// Start distances checked step by step with the user (studs above / beside the final place)
const ENTRY = { 1: 4, 2: 4, 3: 4, 4: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 4, 14: 4, 15: 4, 16: 4, 17: 4 }; // fade-in over the first stud: invisible at 4 studs, fully visible at 3
for (const e of model) if (ENTRY[e.step] !== undefined && !e.assembly) e.slideDistance = ENTRY[e.step]; // parts of an intermediate step keep their 2.5
// step 17: the two side slopes are pushed from the front (-y) backwards onto the side studs of the angle brackets
for (const e of model) if (e.step === 17 && /^slope_side_/.test(e.part)) { e.from = '-y'; e.fadeStuds = 2; } // invisible at 4 studs, fully visible at 2
// height (studs) at which an intermediate step is put together above / below its place
const HOVER = { 5: 3, 9: 3, 14: 3 };
// height (studs) above its place at which a staged sub-assembly is built, before it is set down in its join step
const STAGE_LIFT = { sub: 3, beams: 6, deck: 8 }; // beams: the lowest height at which no part coming from below reaches into the hull (npm run check:paths); deck: high enough that a part coming from below starts above the top of the model (asked)
for (const e of model) if (e.stage && STAGE_LIFT[e.stage] !== undefined) e.stageLift = STAGE_LIFT[e.stage];
for (const e of model) if (HOVER[e.step] !== undefined && e.assembly) e.hoverSlide = HOVER[e.step];
// the beams (steps 18-50) follow the same 3-stud rhythm: single parts from above / below start 4 studs away (fully visible at 3),
// intermediate steps built above / below their place are put together 3 studs away (sideways ones keep their own distances)
for (const e of model) {
  if (e.stage !== 'beams' && e.stage !== 'deck') continue;
  const side = e.from === '+x' || e.from === '-x' || e.from === '+y' || e.from === '-y';
  if (!e.assembly && !side && e.slideDistance === undefined) e.slideDistance = 4;
  if (e.assembly && !e.assemblyFrom) e.hoverSlide = 3;
  // the rear deck (steps 52-64) keeps the rhythm everywhere: single parts from the side also start 4 studs away,
  // intermediate steps pushed in from the side are built 3 studs in front of their place
  if (e.stage === 'deck' && !e.assembly && side) e.slideDistance = 4;
  if (e.stage === 'deck' && e.assemblyFrom) e.hoverSlide = 3;
}
// step 30 (and its mirror, step 46): the axle with stop starts 6 studs away and is fully visible at 5
for (const e of model) if ((e.id === 's30-01' || e.id === 's46-01') && e.part === 'axle_4_stop') e.slideDistance = 6;
// steps 31 / 32 (mirrored: 47 / 48): every part pushed onto the axle starts at the same point in space, where the half bush of
// step 30 (46) starts. The more parts already sit on the axle, the shorter the way of the next one.
{
  const meshes = JSON.parse(fs.readFileSync(new URL('../../../parts/bricks/ldraw-meshes.json', import.meta.url).pathname, 'utf8'));
  const { PARTS, xform } = await import('../../../app/src/ts/parts.ts');
  const spanX = (e) => {
    const m = meshes[e.part], b = PARTS[e.part];
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < m.pos.length; i += 3) {
      const [x] = xform([m.pos[i], m.pos[i + 1]], e.rot, b.w, b.d);
      lo = Math.min(lo, e.pos[0] + x); hi = Math.max(hi, e.pos[0] + x);
    }
    return [lo, hi];
  };
  for (const [first, steps] of [['s30-02', [31, 32]], ['s46-02', [47, 48]]]) {
    const f = model.find((e) => e.id === first);
    const dist0 = f.slideDistance ?? 5;
    const plus = f.from === '+x'; // the parts come from +x (beam 34) or from -x (beam 50)
    const [flo, fhi] = spanX(f);
    const start = plus ? flo + dist0 : fhi - dist0; // where the leading face of the first part starts
    for (const e of model) {
      if (!steps.includes(e.step) || e.from !== f.from) continue;
      const [lo, hi] = spanX(e);
      e.slideDistance = Math.round((plus ? start - lo : hi - start) * 100) / 100;
    }
  }
}
// step 34 (and its mirror, step 50): the connectors (axle/bush) start 4 studs away and are fully visible at 3
for (const e of model) if ((e.step === 34 || e.step === 50) && e.part.startsWith('connector_axle_bush')) e.slideDistance = 4;
fs.writeFileSync(FILE, JSON.stringify(model, null, 1));
console.log('rotated', n, 'elements of beam34 (steps 18-30)');
