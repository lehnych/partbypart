// Catalogue part -> LDraw part number (official library, library.ldraw.org).
// One entry per part id used by an instruction, e.g. `plate_1x2: { file: '3023b' }`.
// mirror: true/false forces the handedness (left/right pairs that share one LDraw file).
// accent: 'sideStuds' | 'studs' | 'openTopStuds' draws those studs black.
// derive: true takes the collision cells from the real mesh (written to app/src/ts/derived-parts.ts).
// Every new id also needs a name in app/src/ts/locales/en.ts and de.ts (`part.<id>`).
export const MAP = {
  plate_4x12: { file: '3029' },
  tile_2x3: { file: '26603' },
  tile_1x4: { file: '2431' },
  tile_1x2: { file: '3069b' },
  // the LDraw parts are wedge plates with studs; the model has smooth wedge tiles, so the studs are left out
  wedge_tile_2x3_left: { file: '43723a', noStuds: true },
  wedge_tile_2x3_right: { file: '43722a', noStuds: true },
  bracket_2x2: { file: '41682', derive: true },
  brick_1x2x2: { file: '3245c' },
  panel_corner_1x1x1: { file: '6231', derive: true, rot: 90 },
  brick_1x1x1: { file: '3005' },
  plate_1x10: { file: '4477' },
  plate_rim_6x12: { file: '6178' },
  plate_1x6: { file: '3666' },
  plate_1x8: { file: '3460' },
  plate_1x12: { file: '60479' },
  plate_6x12: { file: '3028' },
  plate_1x1: { file: '3024' },
  plate_2x2_2studs: { file: '33909' },
  tile_1x6: { file: '6636' },
  tile_1x3: { file: '63864' },
  plate_1x3: { file: '3623' },
  tile_1x2_grille: { file: '15561' },
  plate_1x2_jumper: { file: '3794b', accent: 'studs' },
  plate_1x2: { file: '3023b' },
  block_side_left: { file: '99206', derive: true, mirror: false, accent: 'sideStuds' },
  block_side_right: { file: '99206', derive: true, mirror: true, accent: 'sideStuds' },
  wing_plate_left: { file: '48183', derive: true, mirror: false },
  wing_plate_right: { file: '48183', derive: true, mirror: true },
  brick_2x2x1: { file: '3003' },
  tile_2x6: { file: '69729' },
  angle_bracket_left: { file: '4865a', derive: true, mirror: false },
  angle_bracket_right: { file: '4865a', derive: true, mirror: true },
  slope_side_left: { file: '60477', accent: 'sideStuds', derive: true, mirror: false, lie: true, studEnd: 'xmin' },
  slope_side_right: { file: '60477', accent: 'sideStuds', derive: true, mirror: false, lie: true, studEnd: 'xmax' },
  // ---- steps 18-50 (side beams)
  brick_1x2: { file: '3004', derive: true },
  brick_1x3: { file: '3622', derive: true },
  clip_1x1_light: { accent: 'clipSides', sparseEdges: true, grid: true, file: '4081b', derive: true },
  clip_1x1_thick: { sparseEdges: true, grid: true, file: '61252', derive: true },
  clip_1x2_side: { sparseEdges: true, grid: true, file: '11476', derive: true },
  ball_1x2_side: { accent: 'studs', sparseEdges: true, grid: true, file: '14417', derive: true },
  slope_inv_2x1: { accent: 'oppositeStud', file: '2310', derive: true },
  tech_1x1: { accent: 'studs', file: '6541', derive: true },
  tech_1x2: { accent: 'studs', file: '32000', derive: true },
  tech_1x2_hole: { file: '3700', derive: true },
  tech_1x4: { accent: 'studs', file: '3701', derive: true },
  axle_4_stop: { axle: true, file: '87083', derive: true },
  bush_half: { axle: true, edgeY: true, file: '32123b', derive: true },
  bush_flanged: { axle: true, edgeY: true, file: '3713', derive: true },
  disc_3x3: { lie: 'any', axisShift: 0.7, file: '2723', derive: true },
  round_open_stud: { lie: 'any', zShift: -0.33, axisShift: -0.2, file: '85861', derive: true },
  round_tile_pin: { lie: 'any', zShift: -0.33, axisShift: 0.4, file: '20482', derive: true },
  cone_stop: { lie: 'any', accent: 'endStud', zShift: -0.33, axisShift: -0.4, file: '59900', derive: true },
  // the first axle + joiner of step 34 sit in the hole of the Technic brick 1x2 of step 28 (hole between the two studs, half a stud off the grid)
  // the booklet's step-34 axle is 3 long (24316): the stop end is at +x like the 4-long axle
  axle_3_stop_c: { axle: true, tilt: -12, tiltAxis: 'y', tiltPivotZ: 1, file: '24316', derive: true },
  axle_3_stop_h: { axle: true, tilt: -12, tiltAxis: 'y', tiltPivotZ: 1, axleY: -0.5, file: '24316', derive: true },
  axle_3_stop_cm: { axle: true, tilt: 12, tiltAxis: 'y', tiltPivotZ: 1, file: '24316', derive: true }, // beam 50 (mirrored): stopper at +x, rot 0
  axle_3_stop_hm: { axle: true, tilt: 12, tiltAxis: 'y', tiltPivotZ: 1, axleY: -0.5, file: '24316', derive: true },
  axle_4_stop_c: { axle: true, tilt: -12, tiltAxis: 'y', tiltPivotZ: 1, file: '87083', derive: true }, // as _h, hole in the middle of a cell
  axle_4_stop_h: { axle: true, tilt: -12, tiltAxis: 'y', tiltPivotZ: 1, axleY: -0.5, file: '87083', derive: true },
  axle_joiner_h: { stand: true, tilt: 12, xShift: 0.55, axisShift: 0, zShift: -0.375, file: '45590', derive: true },
  axle_joiner_c: { stand: true, tilt: 12, xShift: 0.05, axisShift: 0, zShift: -0.375, file: '45590', derive: true }, // hole in the middle of a cell (Technic brick with 2 holes)
  axle_joiner: { stand: true, axisShift: -0.1, zShift: -0.1, file: '45590', derive: true },
  // placement variants for the step-34 connectors on the axle ends (cross hole centre at plate height 0.75; _h: hole centre on a stud line)
  connector_axle_bush_c: { stand: 'conn', tilt: 12, tiltAxis: 'y', tiltPivotZ: 3.72, axisShift: 0.05, file: '32039', derive: true },
  connector_axle_bush_h: { stand: 'conn', tilt: 12, tiltAxis: 'y', tiltPivotZ: 3.72, axisShift: 0.55, file: '32039', derive: true },
  connector_axle_bush: { file: '32039', derive: true },
  // ---- steps 52-64 (rear deck, built apart and set onto the beams in step 65)
  half_round_1x1_side: { file: '3386', derive: true }, // side stud points to +x at rot 0 (rot 270: to -y)
  brick_round_2x2: { file: '6143', derive: true },
  plate_round_2x2: { file: '4032b', derive: true },
  // bracket 1x2 - 1x2 turned on its side: the plate part stands as a wall (studs towards +y at rot 0, its back takes the side studs of 3386),
  // the former upright part lies on top as a cap with its studs up (under the plate 4x12)
  // (rot 180: wall studs towards -y, the back of the wall flush with the +y edge of the cell)
  bracket_1x2_side: { file: '99780', derive: true, lie: 'back', axisShift: 0.2 },
  // plate 1x2 standing on its edge, studs towards -y: it sits on the wall studs of the bracket (body 0.2..0.6 of its cell)
  plate_1x2_side: { file: '3023b', derive: true, lie: 'any', axisShift: 0.4 },
  // tile 1x1 with thick clip, clip towards -y: its underside sits on the studs of the standing plate, 0.2 studs into the next cell
  // spin 90: turned 90 degrees clockwise about the stud it sits on, seen from the front (asked)
  tile_clip_1x1_side: { file: '15712', derive: true, lie: 'any', axisShift: 0.5, spin: 90 },
  slope_inv_2x2_pin: { file: '3660b', derive: true, accent: 'openTopStuds' }, // its two top studs with a hole are black, the two solid ones not (asked)
  slope_inv_3x2: { file: '3747b', derive: true, accent: 'openTopStuds' }, // its four top studs with a hole are black (asked)
  // lying with the four studs facing down, tilted 45 degrees about its handle (the bar the clips hold), leaning away from the construction:
  // at rot 0 the low-y end goes up (asked)
  shield_2x3: { file: '30166', derive: true, lie: 'any', tilt: 45, tiltAxis: 'y', tiltPivotZ: 3.3, tiltRebase: true, nudge: [0, 0.7, 0] }, // nudge: 0.7 towards +y inside the 3-stud footprint; with the shield one cell further out (rotate-beam.mjs) it sits 0.3 studs further out than before, asked
  plate_1x3_offset: { file: '34103', derive: true, accent: 'studs' }, // its two top studs are black (asked)
  round_plate_1x1_open: { file: '85861', derive: true },
  bar_clip_15: { file: '48729b', derive: true, axisShift: 0.3 }, // the bar stands upright in the middle of its cell
  // step 62 stands on the single centre stud of the plate 1x2 with one stud (step 59): half a stud off the grid along x (2-stud footprint, part centred on its middle)
  round_plate_1x1_open_h: { file: '85861', derive: true, xShift: 0.5, accent: 'openTopStuds' }, // part colour, only the open stud black (asked)
  bar_clip_15_h: { file: '48729b', derive: true, axisShift: 0.3, xShift: 0.5, yaw: 90, zShift: -2 }, // turned 90 degrees clockwise seen from above; the shaft reaches 2 plates deeper, through both round plates down to the jumper (asked)
  bracket_1x1: { file: '36840', derive: true, accent: 'sideStuds' }, // face (one stud) towards +x at rot 0; the side stud is black (asked)
  slope_1x1: { file: '54200', derive: true }, // slope 1x1, upright: it sits on the stud of the bracket 1x1 (step 63)
};
