# PartByPart – project rules

PartByPart – portal for 3D building instructions (brick models now, furniture later). The repository holds the portal
interface and the general 3D engine: a scroll-driven 3D build view in which every scroll segment adds one part, as in
the booklet. It contains no instruction yet. Vite + TypeScript + Three.js r170, real LDraw meshes, UI in English and
German.

## Commands

```
npm install
npm run dev          # http://localhost:5173  (/?dev=1 lists overlaps and floating parts in the console)
npm test             # engine tests (app/tests/engine.test.ts: validateModel, buildUnits) – must stay green
npm run ldraw        # rebuild parts/bricks/ldraw-meshes.json + app/src/ts/derived-parts.ts – run after every change in parts/bricks/map.mjs or build-parts.mjs
npm run build        # tsc + vite build -> dist/ (upload dist/ as is; ES modules in several files, needs a web server, not file://)
npm run preview      # serve dist/ locally
```

Node >= 22.18 (`--experimental-strip-types`).

## Layout

```
instructions/<id>/           one folder per instruction of the portal (catalog.ts lists them; folder empty for now)
  model.json                   all elements of the instruction (generated if the folder has build/ generators)
  build/                       optional generators that write model.json
parts/bricks/                shared by every brick model
  ldraw-base/p/                stud primitives of the engine (stud.dat, stud2.dat + 4 primitives) – fixed, not per model
  library/                     LDraw .dat files of the instructions' parts (created with the first part)
  map.mjs                      catalogue part -> LDraw file + placement options (MAP, empty for now)
  build-parts.mjs              LDraw -> meshes converter (also writes app/src/ts/derived-parts.ts)
  ldraw-meshes.json            generated meshes (npm run ldraw)
app/src/ts/
  model.ts      validation, buildUnits (scroll segments), unitSpan (segment length), checkPlacement, countPartsByStep
  viewer.ts     Three.js scene, animation (entry, fade-in, assemblies, staged sub-assemblies), camera follow
  softrender.ts CPU fallback renderer when WebGL is missing (every visual feature must work here too)
  parts.ts      catalogue (taken from derived-parts.ts; footprints for the collision grid), xform/orientedPart
  geometry.ts   meshes -> Three.js geometry; types.ts; main.ts (scroll, next/prev, keys F/V)
  ui.ts         app shell: header (PARTBYPART word mark, picker -> catalog dialog, help, settings), rail, step panel, time line, status bar
  catalog.ts    the instructions of the portal (?anleitung=<id>; CATALOG empty for now, optional time-line `sections`);
                a new instruction = a new entry + texts `cat.<key>.title/desc`; without one the app shows only the portal
  theme.ts      light / dark / system; locales/{en,de}.ts (help texts carry simple HTML)
app/src/scss/style.scss  tokens + layout (see docs/DESIGN.md); app/src/fonts/  Inter + JetBrains Mono (OFL), copied to dist/assets/fonts
docs/DESIGN.md           design system (accent red) – the reference for every visual change
app/tests/engine.test.ts     general checks of validateModel and buildUnits
tools/                       checks and helper scripts that work on the data of an instruction (Node, npm scripts,
                             never bundled into the page); empty for now, e.g. tools/check/ for a sweep check of the
                             entry ways (does a part cut through placed parts on its way in?) that takes the path of an
                             instruction's model.json as argument
```

## Where a change belongs

- **A new instruction:** folder `instructions/<id>/` with `model.json`, an entry in `CATALOG` in `app/src/ts/catalog.ts`
  (optional `sections: { key, from }[]` for the time line) and the texts `cat.<key>.title` / `cat.<key>.desc` in
  `locales/en.ts` and `de.ts`.
- **Positions of an instruction:** in `instructions/<id>/model.json`; if the folder has generators in `build/`, the file
  is their output – correct the generators and regenerate, never edit the generated file by hand.
- **New parts:** LDraw files into `parts/bricks/library/` (or another LDraw folder as argument to `npm run ldraw`), an
  entry in `MAP` in `parts/bricks/map.mjs`, `npm run ldraw`, names `part.<id>` in `locales/en.ts` and `de.ts`.
- **A check or helper script:** `tools/<area>/<name>.mjs` (e.g. `tools/check/`), run with
  `node --experimental-strip-types` through an npm script. It works for every instruction: the path of the instruction
  (or its `model.json`) is an argument, and exceptions that only one model needs belong into that instruction's data,
  not into the script. A check that must hold for every instruction is added to `npm test`.
- **Part shape/placement inside its cell:** `parts/bricks/map.mjs`, then `npm run ldraw`. Placement variants are
  separate catalogue ids with a suffix (`_h` hole on a stud line / half a stud off the grid, `_c` hole in a cell middle,
  `_m` mirrored tilt); `countPartsByStep` strips `_h/_c/_m`. Converter options for off-grid parts: `lie`
  (`true`/`'any'`/`'back'`), `spin` (about y), `tilt` (+ `tiltRebase`), `yaw` (free angle about the vertical), `nudge`,
  `xShift`/`axisShift`/`zShift`; accents `studs`, `sideStuds`, `openTopStuds` (only the open studs on top are black).
  New ids need names in `locales/en.ts` and `de.ts`.

## Coordinates

- `pos` = minimum corner after rotation; x, y in studs, z in plate heights (brick = 3). Model x -> world X, model y ->
  world -Z, z -> world Y (0.4 per plate).
- `rot` 0/90/180/270 about the vertical axis (`xform`: 90 -> x' = d - y, y' = x).
- **Direction words** used for corrections (German), seen in the default camera: "links" = +y, "rechts" = -y, "vorne" =
  -y side of the model, "von oben gesehen links" = -x.

## Element fields (beyond id/step/order/part/color/pos/rot/group)

| field | meaning |
|---|---|
| `from` | `above` (default) / `below` / `+x` / `-x` / `+y` / `-y` – side the part comes from |
| `assembly` | parts with the same value in one step are an intermediate step (built away from the place, then moved in) |
| `assemblyFrom` | `+x`/`-x`/`+y`/`-y`: the finished intermediate step is pushed in sideways instead of up/down |
| `hoverSide` | `above`/`below`: where a vertical intermediate step is built (default: below if its first part comes from below) |
| `hoverSlide` | distance (studs) at which the intermediate step is built |
| `slideDistance` | start distance (studs) of a single part, or of a part joining an intermediate step |
| `fadeStuds` | way (studs) over which the part fades in (default 1) |
| `stage` / `stageLift` | staged sub-assembly (any name) and the height (studs, default 10) it is built at; a join step is added after its last part |

## Animation rules

- Rhythm of 3 studs: single parts start **4 studs** away, invisible, and are **100 % visible at 3** (fade over the first
  stud, by distance, not time). Intermediate steps are built **3 studs** from their place; their parts join from 2.5
  studs.
- Duration follows the way (`unitSpan`: 5 studs = one segment, 0.7–1.6), motion is ease-in-out (slow start, soft
  landing).
- Exceptions (other start distances via `slideDistance` / `fadeStuds`, common start points) are set per instruction,
  only where it needs them.
- Staged heights: the lowest height at which nothing coming from below reaches into the model already built.
- The first part of step 1 is visible from the start (`startVisible = 1` in main.ts).
- "Nächstes Teil" stops at the real end of every segment and, inside an intermediate step, after each single part.

## Checks after every change

- Regenerate what the change feeds (`npm run ldraw`, an instruction's generators), then `npm test` and `npm run build`.
- Some browsers have no WebGL: anything visual must also work in `softrender.ts` (fade-in already does).
- The booklet of the instruction is the reference; positions read from pictures are marked `confidence: "estimate"`.
