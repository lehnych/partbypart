# Generates all elements of instructions/nf10330-t90a/model.json: the hull (steps 1-17) and the beams of steps 18-50 (beam 34 = steps 18-34, beam 50 = steps 35-50).
# Positions are an ESTIMATE (confidence "estimate"): sandwich of top plates (z 3), mid row of clips/ball plates (z 2) and a brick row (z 0-3).
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
P = os.path.join(ROOT, 'instructions', 'nf10330-t90a', 'model.json')
# hull (steps 1-17), built like the beams: (step, part, lx, row)  lx: position along y from the front edge (HY0), row: a line of the hull
# ROWS: row -> (x, z, rot)  x of the minimum corner (studs), z in plates, rot about the vertical axis
# start distances, stage height and the slide of the step-17 slopes are set by rotate-beam.mjs (ENTRY, HOVER, STAGE_LIFT)
HY0 = -19
ROWS = {
 'base': (0, 0, 0), 'base180': (0, 0, 180), 'rail_l': (0, 1, 90), 'x1': (1, 1, 0), 'inner_l': (1, 1, 90), 'x2': (2, 1, 0),
 'x2r90': (2, 1, 90), 'x2r270': (2, 1, 270), 'x4': (4, 1, 0), 'x4r90': (4, 1, 90), 'x5': (5, 1, 0), 'x5r90': (5, 1, 90),
 'x5r180': (5, 1, 180), 'x7': (7, 1, 0), 'x7r90': (7, 1, 90), 'x7r270': (7, 1, 270), 'x8r90': (8, 1, 90), 'x9': (9, 1, 0),
 'x9r90': (9, 1, 90), 'inner_r': (10, 1, 90), 'rail_r': (11, 1, 90), 'x1z2': (1, 2, 0), 'x3z2': (3, 2, 0), 'x5z2': (5, 2, 0),
 'x7z2': (7, 2, 0), 'x3z3': (3, 3, 0), 'x7z3': (7, 3, 0), 'x2z4': (2, 4, 0), 'x3z4': (3, 4, 0), 'x9z4r90': (9, 4, 90),
}
HULL = [
 (1, 'plate_4x12', 19, 'base'), (1, 'plate_4x12', 23, 'base'), (1, 'tile_2x3', 22, 'x2r90'), (1, 'tile_2x3', 22, 'x8r90'),
 (2, 'tile_1x4', 21, 'inner_l'), (2, 'tile_1x4', 22, 'x4'), (2, 'tile_1x4', 21, 'inner_r'),
 (3, 'wedge_tile_2x3_left', 20, 'x2'), (3, 'wedge_tile_2x3_right', 20, 'x7'), (3, 'tile_1x2', 23, 'x4r90'), (3, 'tile_1x2', 23, 'x7r90'),
 (4, 'bracket_2x2', 20, 'x5r180'), (4, 'bracket_2x2', 23, 'x5'), (4, 'brick_1x2x2', 26, 'x1'), (4, 'brick_1x2x2', 26, 'x9'),
 (5, 'brick_1x1x1', 25, 'x2'), (5, 'panel_corner_1x1x1', 25, 'x2z4'), (5, 'brick_1x1x1', 25, 'x9'), (5, 'panel_corner_1x1x1', 25, 'x9z4r90'),
 (6, 'plate_rim_6x12', 13, 'base'), (6, 'plate_1x10', 16, 'rail_l'), (6, 'plate_1x10', 16, 'rail_r'),
 (7, 'plate_rim_6x12', 7, 'base180'), (7, 'plate_1x6', 10, 'rail_l'), (7, 'plate_1x8', 8, 'rail_r'),
 (8, 'plate_6x12', 0, 'base'), (8, 'plate_1x12', 6, 'base'), (8, 'tile_2x3', 5, 'x5r90'),
 (9, 'tile_1x2', 2, 'x5'), (9, 'plate_1x1', 3, 'x4'), (9, 'plate_2x2_2studs', 3, 'x5'),
 (10, 'tile_1x6', 1, 'x7r90'), (10, 'tile_1x2', 1, 'x4r90'), (10, 'tile_1x3', 4, 'x4r90'),
 (11, 'plate_1x3', 2, 'inner_l'), (11, 'plate_2x2_2studs', 0, 'x5'), (11, 'plate_1x3', 2, 'inner_r'), (11, 'tile_1x2', 5, 'inner_l'), (11, 'tile_1x2', 5, 'inner_r'),
 (12, 'tile_1x2_grille', 1, 'x5z2'), (12, 'plate_1x10', 0, 'rail_l'), (12, 'plate_1x8', 0, 'rail_r'), (12, 'plate_1x2_jumper', 0, 'inner_l'), (12, 'plate_1x2_jumper', 0, 'inner_r'),
 (14, 'wing_plate_left', 17, 'x2r90'), (14, 'block_side_left', 18, 'x3z2'), (14, 'plate_1x2', 19, 'x3z3'), (14, 'wing_plate_right', 17, 'x7r270'), (14, 'block_side_right', 18, 'x7z2'), (14, 'plate_1x2', 19, 'x7z3'),
 (15, 'brick_2x2x1', 18, 'x5'), (15, 'tile_2x6', 18, 'x3z4'),
 (16, 'angle_bracket_left', 18, 'x2r270'), (16, 'tile_1x4', 17, 'inner_l'), (16, 'angle_bracket_right', 18, 'x9r90'), (16, 'tile_1x4', 17, 'inner_r'),
 (17, 'slope_side_left', 17, 'x1z2'), (17, 'slope_side_right', 17, 'x7z2'),
]
# intermediate steps of the hull (built away from the place, then moved in): left / right tower, wing assemblies, step-9 piece
def hull_assembly(s, part, x):
    if s == 5:
        return 'a5-left' if x < 6 else 'a5-right'
    if s == 14:
        return 'a14l' if x < 6 else 'a14r'
    if s == 9 and part != 'tile_1x2':
        return 'a9'
    return None
m = []
hull_order = {}
for (s, part, lx, row) in HULL:
    x, z, rot = ROWS[row]
    hull_order[s] = hull_order.get(s, 0) + 1
    measured = part == 'plate_4x12'
    e = {'id': f's{s:02d}-{hull_order[s]:02d}', 'step': s, 'order': hull_order[s], 'part': part,
         'color': 'jet' if part == 'tile_1x2_grille' else 'brown' if s >= 14 else 'black',  # steps 14-17 are brown, as in the booklet
         'pos': [x, HY0 + lx, z], 'rot': rot, 'group': 'main', 'confidence': 'measured' if measured else 'estimate',
         'note': 'measured' if measured else 'estimate: read from the booklet pictures, positions need checking'}
    if 8 <= s <= 12:
        e['stage'] = 'sub'  # sub-assembly built in front of the model, joined in step 13
    a = hull_assembly(s, part, x)
    if a:
        e['assembly'] = a
    m.append(e)
L = 25
W = {'plate_1x8': 8, 'plate_1x6': 6, 'plate_1x3': 3, 'plate_1x2': 2, 'plate_1x1': 1, 'brick_1x2': 2, 'brick_1x3': 3, 'slope_inv_2x1': 2,
     'tech_1x1': 1, 'tech_1x2': 2, 'tech_1x2_hole': 2, 'tech_1x4': 4, 'clip_1x1_light': 2, 'clip_1x1_thick': 2, 'clip_1x2_side': 2, 'ball_1x2_side': 2}
D = {'clip_1x2_side': 2, 'ball_1x2_side': 2}
# (step, part, lx, row)  row: top / mid / brick
BEAM_A = [
 (18, 'plate_1x3', 0, 'plate2'), (18, 'plate_1x8', 0, 'top'),
 (19, 'clip_1x1_light', 3, 'plate2'), (19, 'clip_1x2_side', 4, 'plate2'),
 (20, 'plate_1x1', 6, 'plate2'), (20, 'tech_1x1', 1, 'brick'),
 (21, 'brick_1x2', 2, 'brick'), (21, 'tech_1x2', 4, 'brick'),
 (22, 'ball_1x2_side', 7, 'plate2'), (22, 'slope_inv_2x1', -1, 'slope'),
 (23, 'slope_inv_2x1', 0, 'slope0'), (23, 'brick_1x2', 6, 'brick'),
 (24, 'tech_1x4', 8, 'brick'), (24, 'clip_1x1_thick', 9, 'plate2'),
 (25, 'plate_1x2', 10, 'plate2'), (25, 'plate_1x6', 8, 'top'),
 (26, 'clip_1x1_light', 12, 'plate2'), (26, 'clip_1x2_side', 13, 'plate2'), (26, 'tech_1x2', 12, 'brick'),
 (27, 'brick_1x3', 14, 'brick'), (27, 'plate_1x1', 15, 'plate2'),
 (28, 'ball_1x2_side', 16, 'plate2'), (28, 'clip_1x1_thick', 18, 'plate2'), (28, 'tech_1x2_hole', 17, 'brick'), (28, 'plate_1x6', 14, 'top'),
 (29, 'plate_1x2', 19, 'plate2'), (29, 'brick_1x2', 19, 'brick'),
]
# beam 50 (steps 35-45) has the same parts in the same places (the booklet repeats the build, mirrored)
STEP_B = {18: 35, 19: 36, 20: 37, 21: 38, 22: 39, 23: 40, 24: 41, 25: 42, 26: 43, 27: 43, 28: 44, 29: 45}
# the booklet's parts boxes of steps 35-45 differ a little from 18-29; list them as printed
BEAM_B = [
 (35, 'plate_1x3', 0, 'plate2'), (35, 'plate_1x8', 0, 'top'),
 (36, 'clip_1x1_light', 3, 'plate2'), (36, 'brick_1x2', 6, 'brick'),
 (37, 'plate_1x1', 6, 'plate2'), (37, 'clip_1x2_side', 4, 'plate2'),
 (38, 'tech_1x1', 1, 'brick'), (38, 'tech_1x2', 4, 'brick'),
 (39, 'ball_1x2_side', 7, 'plate2'), (39, 'slope_inv_2x1', -1, 'slope'),
 (40, 'slope_inv_2x1', 0, 'slope0'), (40, 'brick_1x2', 2, 'brick'),
 (41, 'tech_1x4', 8, 'brick'), (41, 'clip_1x1_thick', 9, 'plate2'),
 (42, 'plate_1x2', 10, 'plate2'), (42, 'plate_1x6', 8, 'top'),
 (43, 'brick_1x3', 14, 'brick'), (43, 'plate_1x1', 15, 'plate2'), (43, 'clip_1x1_light', 12, 'plate2'), (43, 'clip_1x2_side', 13, 'plate2'), (43, 'tech_1x2', 12, 'brick'),
 (44, 'ball_1x2_side', 16, 'plate2'), (44, 'clip_1x1_thick', 18, 'plate2'), (44, 'tech_1x2_hole', 17, 'brick'), (44, 'plate_1x6', 14, 'top'),
 (45, 'plate_1x2', 19, 'plate2'), (45, 'brick_1x2', 19, 'brick'),
]
# hardware: (step, part, lx (hole column), k (distance outside the beam), z, kind, color)
HW_A = [
 (30, 'axle_4_stop', 1, 3, 1, 'axle', 'black'), (30, 'bush_half', 1, -1, 1, 'lie', 'black'),
 (31, 'bush_flanged', 8, 3, 1, 'lie', 'black'), (31, 'disc_3x3', 8, 6, -2, 'lie', 'black'),
 (32, 'bush_half', 14, 3, 1, 'lie', 'black'), (32, 'disc_3x3', 14, 6, -2, 'lie', 'black'),
 (33, 'round_open_stud', 20, 3, 1, 'lie', 'gold'), (33, 'round_tile_pin', 20, 5, 1, 'lie', 'gold'), (33, 'cone_stop', 20, 7, 1, 'lie', 'gold'),
]
def pin_set(step, cols):
    out = []
    for c in cols:
        out += [(step, 'axle_4_stop', c, 3, 1, 'axle', 'black'), (step, 'axle_joiner', c, 8, 0, 'lie', 'jet'), (step, 'connector_axle_bush', c, 11, 0, 'lie', 'black')]
    return out
HW_A += pin_set(34, [4, 10, 16, 22])
HW_B = [(s + 16, p, lx, k, z, r, c) for (s, p, lx, k, z, r, c) in HW_A if s != 34]
HW_B += pin_set(50, [4, 10, 16, 22])
els = []
order = {}
def add(beam, X0, Y0, rot, s, part, pos, r, color, note, below=False):
    order[s] = order.get(s, 0) + 1
    els.append({'id': f's{s:02d}-{order[s]:02d}', 'step': s, 'order': order[s], 'part': part, 'color': color, 'pos': pos, 'rot': r,
                'group': beam, 'stage': 'beams', 'clamped': True, 'confidence': 'estimate', 'note': note, **({'from': 'below'} if below is True else {'from': below} if below else {}), **({'assembly': 'a%d' % s} if s in (19, 21, 26) or (s == 28 and part != 'plate_1x6') else {})})
for beam, X0, rot, parts, hw in (('beam34', 12, 90, BEAM_A, HW_A), ('beam50', -1, 270, BEAM_B, HW_B)):
    Y0 = -17
    out = 1 if rot == 90 else -1
    for (s, part, lx, row) in parts:
        w = W[part]
        d = D.get(part, 1)
        light = part in ('clip_1x1_light', 'clip_1x1_thick')  # its clip points across the beam, like the side clip of the 1x2 (rot 0 / 180)
        wa = 1 if light else w
        y = Y0 + lx if rot == 90 else Y0 + L - lx - wa
        r = (0 if rot == 90 else 180) if light else rot
        if row in ('brick180', 'slope', 'slope0'):
            r = (rot + 180) % 360
        if row == 'top':
            x, z = X0, 3
        elif row == 'plate2':
            x, z = X0 - (1 if (rot == 270 and d == 2) else 0), 2  # step 18/35: the 1x3 comes first, the 1x8 goes on top of it
        elif row == 'mid':
            x, z = (X0 + 1 if rot == 90 else X0 - 1 - (d - 1) + (0 if d == 2 else 0)), 2
            if rot == 270:
                x = (X0 - 1) - (1 if d == 2 else 0)
        elif row == 'slope0':
            x, z = X0, -2  # hangs directly under the first slope: its open top stud goes into the underside of slope 1
        elif row == 'slope':
            x, z = X0, 1  # its low stud plugs into the plate 1x3 above, the tall end stands free beyond the plate
        else:
            x, z = X0, -1
        if light and rot == 270:
            x -= 1
        below = (s in (19, 36, 37) and part.startswith('clip_1x')) or (s in (26, 43) and part in ('clip_1x1_light', 'clip_1x2_side')) or s == 20 or (s == 37 and part == 'plate_1x1') or (s == 38 and part in ('tech_1x1', 'tech_1x2')) or (s == 40 and part == 'brick_1x2') or part in ('tech_1x4', 'tech_1x2', 'tech_1x2_hole', 'brick_1x3') or s in (21, 22, 23, 29, 45) or (s == 36 and part == 'brick_1x2') or (s == 40 and part == 'slope_inv_2x1') or (s == 39 and part in ('ball_1x2_side', 'slope_inv_2x1'))
        add(beam, X0, Y0, rot, s, part, [x, y, z], r, 'black', 'estimate: layout read from the booklet photo, positions need checking', below)
    for (s, part, lx, k, z, kind, color) in hw:
        wy = {'disc_3x3': 3, 'axle_joiner': 2, 'connector_axle_bush': 2}.get(part, 1)
        st = lx - (1 if part == 'disc_3x3' else 0)
        y = Y0 + st if rot == 90 else Y0 + L - st - wy
        xw = {'axle_4_stop': 4}.get(part, 1)
        x = X0 + k if rot == 90 else X0 - k - (xw - 1)
        r = 0 if kind == 'axle' else rot
        note = 'estimate: hardware drawn beside the beam, not yet pushed into the holes'
        zz = z - 1
        if part == 'axle_4_stop' and s in (30, 46):
            # steps 30 / 46: the axle goes through the hole of the Technic brick 1x1 (step 20 / 38), flush with the inner side
            # the stopper sits against the outer face of the brick, the shaft is pushed through the hole and points inward
            x = X0 - 3 if rot == 90 else X0
            r = 0 if rot == 90 else 180
            zz = -1
            note = 'estimate: axle through the hole of the Technic brick 1x1'
            slide = '+x' if rot == 90 else '-x'  # pushed in along the X axis from the outer side
        elif part == 'bush_half' and s in (30, 46):
            # pushed onto the free end of the axle along the X axis, from the inner side
            zz = -1
            slide = '-x' if rot == 90 else '+x'
        else:
            slide = False
        add(beam, X0, Y0, rot, s, part, [x, y, zz], r, color, note, slide)
# beam 50 is the mirror image of beam 34: which beam-34 element each beam-50 element mirrors (used by mirror step of rotate-beam.mjs)
ids_a = [e['id'] for e in els if e['group'] == 'beam34' and e['step'] <= 29]
ids_b = [e['id'] for e in els if e['group'] == 'beam50' and e['step'] <= 45]
key_a = {(p_, lx): i for i, (s_, p_, lx, row) in zip(ids_a, BEAM_A)}
mp = {i: key_a[(p_, lx)] for i, (s_, p_, lx, row) in zip(ids_b, BEAM_B)}
for e in els:
    if e['group'] == 'beam50' and e['step'] >= 46:
        mp[e['id']] = 's%02d-%02d' % (e['step'] - 16, e['order'])
json.dump(mp, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'beam50-map.json'), 'w'), indent=1)
# Steps 52-64: the rear deck (bag 1), built apart and set onto the beams in step 65 (join step of the stage 'deck').
# End position from step 65: the plate 4x12 lies across the hull on the top plates of both beams at their back end
# (x 0..12, y 5..9, z 7: beam 50 at x 0, beam 34 at x 11, last beam stud y 8). Everything below it hangs between the beams;
# the two round-plate stacks of step 54 stand on the hull base plate (z 1) in the gap between the tall bricks of step 4.
# Rows: y 5 front (clips), y 6 brackets / stack tiles, y 7 core (plate 1x6, half-round plates), y 8 round brick overhang (back).
# (step, part, pos, rot, color, extra)
DECK = [
 (52, 'plate_1x6', [3, 7, 3], 0, 'black', {'clamped': True}),  # held by the stacks of step 54 later
 (52, 'half_round_1x1_side', [3, 6, 4], 270, 'jet', {}), (52, 'half_round_1x1_side', [4, 6, 4], 270, 'jet', {}),
 (52, 'half_round_1x1_side', [7, 6, 4], 270, 'jet', {}), (52, 'half_round_1x1_side', [8, 6, 4], 270, 'jet', {}),
 (53, 'brick_round_2x2', [5, 6, 4], 0, 'black', {}),  # one stud to the front (-y), as asked
 (53, 'plate_1x2', [3, 7, 6], 0, 'black', {}), (53, 'plate_1x2', [7, 7, 6], 0, 'black', {}),
 # two stacks (round plate, round plate, tile 1x2 on the front half), pushed up from below under the half-round plates;
 # inside the stack the round plates come from below, the tile from above (as asked): the upper round plate first,
 # the lower one clamps on underneath it
 (54, 'plate_round_2x2', [3, 6, 2], 0, 'black', {'assembly': 'a54-1', 'hoverSide': 'below', 'from': 'below', 'clamped': True}),
 (54, 'plate_round_2x2', [3, 6, 1], 0, 'black', {'assembly': 'a54-1', 'from': 'below'}),
 (54, 'tile_1x2', [3, 6, 3], 0, 'black', {'assembly': 'a54-1'}),
 (54, 'plate_round_2x2', [7, 6, 2], 0, 'black', {'assembly': 'a54-2', 'hoverSide': 'below', 'from': 'below', 'clamped': True}),
 (54, 'plate_round_2x2', [7, 6, 1], 0, 'black', {'assembly': 'a54-2', 'from': 'below'}),
 (54, 'tile_1x2', [7, 6, 3], 0, 'black', {'assembly': 'a54-2'}),
 # bracket on its side (back on the side studs of the half-round plates), light grey plate 1x2 on its wall studs, two clip tiles on that;
 # each set is put together in front of the core and pushed in from the front (-y)
 (55, 'bracket_1x2_side', [3, 6, 4], 180, 'jet', {'assembly': 'a55-1', 'assemblyFrom': '-y'}),
 (55, 'plate_1x2_side', [3, 6, 4], 0, 'light', {'assembly': 'a55-1', 'from': '-y', 'clamped': True}),
 (55, 'tile_clip_1x1_side', [3, 5, 4], 0, 'jet', {'assembly': 'a55-1', 'from': '-y', 'clamped': True}),
 (55, 'tile_clip_1x1_side', [4, 5, 4], 0, 'jet', {'assembly': 'a55-1', 'from': '-y', 'clamped': True}),
 (55, 'bracket_1x2_side', [7, 6, 4], 180, 'jet', {'assembly': 'a55-2', 'assemblyFrom': '-y'}),
 (55, 'plate_1x2_side', [7, 6, 4], 0, 'light', {'assembly': 'a55-2', 'from': '-y', 'clamped': True}),
 (55, 'tile_clip_1x1_side', [7, 5, 4], 0, 'jet', {'assembly': 'a55-2', 'from': '-y', 'clamped': True}),
 (55, 'tile_clip_1x1_side', [8, 5, 4], 0, 'jet', {'assembly': 'a55-2', 'from': '-y', 'clamped': True}),
 (56, 'plate_4x12', [0, 4, 7], 0, 'black', {}),  # one stud to the front (-y), as asked
 # inverted slopes, put together and pushed up from below at the front edge between the brackets (slopes towards the front)
 # the inverted slope 3x2 comes first, from below (asked); the inverted slope 2x2 then clamps on underneath it, also from below
 (57, 'slope_inv_3x2', [5, 4, 4], 270, 'black', {'assembly': 'a57', 'hoverSide': 'below', 'from': 'below', 'clamped': True}),
 (57, 'slope_inv_2x2_pin', [5, 4, 1], 0, 'black', {'assembly': 'a57', 'from': 'below', 'clamped': True}),  # hangs under the 3x2
 # shields lying under the front, held by the clips, pushed in from the front
 (58, 'shield_2x3', [3, 2, 2], 0, 'jet', {'from': '-y', 'clamped': True}),
 (58, 'shield_2x3', [7, 2, 2], 0, 'jet', {'from': '-y', 'clamped': True}),
 # top of the plate 4x12 (z 8)
 (59, 'plate_1x2_jumper', [5, 8, 8], 0, 'black', {}),
 (59, 'tile_1x3', [2, 6, 8], 0, 'black', {}), (59, 'tile_1x3', [7, 6, 8], 0, 'black', {}),
 (59, 'tile_2x3', [5, 5, 8], 90, 'black', {}),
 (60, 'plate_1x3_offset', [2, 5, 8], 0, 'black', {}), (60, 'plate_1x3_offset', [2, 7, 8], 0, 'black', {}),
 (60, 'plate_1x3_offset', [7, 5, 8], 0, 'black', {}), (60, 'plate_1x3_offset', [7, 7, 8], 0, 'black', {}),
 (61, 'plate_1x1', [2, 8, 8], 0, 'black', {}), (61, 'plate_1x1', [4, 8, 8], 0, 'black', {}),
 (61, 'tile_1x3', [1, 5, 8], 90, 'black', {}), (61, 'tile_1x3', [11, 5, 8], 90, 'black', {}),
 (62, 'round_plate_1x1_open', [3, 8, 8], 0, 'black', {'assembly': 'a62'}),
 (62, 'round_plate_1x1_open', [3, 8, 9], 0, 'black', {'assembly': 'a62'}),
 (62, 'bar_clip_15', [3, 8, 10], 0, 'black', {'assembly': 'a62'}),
 (63, 'bracket_1x1', [2, 7, 9], 270, 'black', {'assembly': 'a63-1'}),
 (63, 'slope_1x1', [2, 8, 10], 0, 'black', {'assembly': 'a63-1'}),  # on top of the bracket
 (63, 'bracket_1x1', [4, 7, 9], 270, 'black', {'assembly': 'a63-2'}),
 (63, 'slope_1x1', [4, 8, 10], 0, 'black', {'assembly': 'a63-2'}),  # on top of the bracket
 (64, 'brick_1x3', [0, 5, 8], 90, 'black', {'assembly': 'a64-1'}),
 (64, 'tile_1x3', [0, 5, 11], 90, 'black', {'assembly': 'a64-1'}),
 (64, 'brick_1x3', [7, 8, 8], 0, 'black', {'assembly': 'a64-2'}),
 (64, 'tile_1x3', [7, 8, 11], 0, 'black', {'assembly': 'a64-2'}),
]
deck = []
deck_order = {}
for (s, part, pos, rot, color, extra) in DECK:
    deck_order[s] = deck_order.get(s, 0) + 1
    deck.append({'id': f's{s:02d}-{deck_order[s]:02d}', 'step': s, 'order': deck_order[s], 'part': part, 'color': color, 'pos': pos, 'rot': rot,
                 'group': 'deck', 'stage': 'deck', 'confidence': 'estimate', 'note': 'estimate: end position from step 65, layout read from the booklet pictures', **extra})
json.dump(m + els + deck, open(P, 'w'), indent=1)
print(len(m), '+', len(els))
