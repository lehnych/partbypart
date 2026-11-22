# PartByPart

Portal for 3D building instructions, part by part as in the booklet: brick models now, furniture later. This repository
holds the portal interface, the general 3D engine and the instructions; each instruction documents itself in
`instructions/<id>/README.md`.

```
instructions/<id>/  one folder per instruction (model.json, README.md, optional build/ generators, model.test.ts)
parts/bricks/       converter + the LDraw .dat files -> parts/bricks/ldraw-meshes.json (shared by every brick model)
tools/              checks and helper scripts for the instructions (Node, not part of the page)
app/       development: src/ts (TypeScript), src/scss (SCSS), src/fonts, tests/
dist/      deployment: upload this folder to the web server
_vite/     vite.config.ts (dev server and build)
package.json, tsconfig.json
```

```
npm install
npm run dev     # develop at http://localhost:5173
npm test        # engine tests + the tests of every instruction
npm run ldraw   # only when parts change (studs from parts/bricks/ldraw-base, parts from parts/bricks/library)
npm run build   # tsc + vite build -> dist/
npm run preview # serve dist/ locally
```

`dist/` contains `index.html` and `assets/`: `assets/js/` with `app.js` (page, controls and model data), `viewer.js` (3D
view), `three.js` (the library), `meshes.js` (part shapes), all minified; `assets/css/style.css` (compiled from
`app/src/scss/style.scss`, minified); `assets/fonts/` (Inter and JetBrains Mono, woff2, with their licence files); and a
`.map` file for each script and the stylesheet. Upload the whole folder to a web server; it works from any sub-folder.
The scripts are ES modules, so the page needs a web server: opening `dist/index.html` from disk (`file://`) does not
work. For a local look at the build use `npm run preview`.

---

Scroll to build the chosen model part by part in 3D. While the portal has no instruction, the page shows only the portal
interface (header, the dialog "Instructions" with an empty state, help, settings) and opens the catalogue.

Needs Node 22.18 or newer. With `/?dev=1` the console lists overlaps and floating parts.

## How it works

- The page is one long scroll track. A fixed 3D stage shows the model.
- Each part gets 420 px of scrolling (`SCROLL_PER_PART` in `app/src/ts/main.ts`). It arrives, snaps in, and is
  highlighted for about a second.
- The first part is visible from the start. Scrolling back removes parts again.
- Parts of one `assembly` fly in together (booklet sub-assemblies).
- The camera follows the new part (switch in the left rail, key `F`). Turning or zooming by hand keeps your distance
  until the next part arrives.

### Screen

- **Header:** logo and word mark PARTBYPART; the picker (set number + title ▾) opens the dialog "Instructions" (tabs All
  / Brick models / Furniture, a filter by name, set number or maker; an empty category shows "Coming soon"); help (?)
  and settings (gear: colour scheme light / dark / system, language, axes, highlight off / outline / glow, keyboard
  shortcuts). The chosen instruction is in the URL (`?anleitung=<id>`).
- **Left rail:** zoom in / out, camera follow (`F`), pan (`V`, wide screens), touch turning (touch screens).
- **Right panel "Current step":** step field (type a number, `Enter`), part counter and name, next part, previous part,
  start over.
- **Time line** at the bottom of the stage (click or drag to jump; optional sections from the catalogue entry), below it
  the status bar (renderer WebGL or compatibility mode, parts built, hints).
- **Phone (narrow screens):** one row of buttons (previous / next part, zoom, follow, touch, start over) above a fixed
  step block that also holds the time line.

### Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Build forward / back | scroll, `→` / `←`, next / previous part | swipe, next / previous part |
| Turn the model | drag | touch button on, then drag |
| Zoom | `Ctrl` / `⌘` + scroll, `+` / `-`, buttons | touch button on, then pinch |
| Jump | step field, click the time line | step field, tap the time line |

Plain scrolling never zooms, so the page stays scrollable. Highlight, axes, shortcuts, camera follow, language, colour
scheme and the build progress are saved in the browser.

## Data: `instructions/<id>/model.json`

One flat list of elements. The step is a property of the element.

```json
{
  "id": "s01-01", "step": 1, "order": 1,
  "part": "plate_2x4", "color": "black",
  "pos": [0, 0, 0], "rot": 0, "group": "main",
  "confidence": "estimate", "note": "reading aid"
}
```

- `pos` is `[x, y, z]` of the minimum corner after rotation. x and y are studs, z is plate heights (a brick is 3).
- `rot` is 0, 90, 180 or 270 degrees around the vertical axis.
- `order` is the build order inside the step.
- `assembly` (optional) groups parts that fly in as one.
- `confidence` is `measured` or `estimate`. `note` is a reading aid and is never shown.
- Part names: `plate_AxB` is A studs deep (y) by B studs long (x) at rotation 0.

Further optional fields (`from`, `assemblyFrom`, `hoverSide`, `hoverSlide`, `slideDistance`, `fadeStuds`, `stage`,
`stageLift`) are listed in docs/PROJECT-RULES.md ("Element fields"). If an instruction has generator scripts in
`instructions/<id>/build/`, `model.json` is their output – then correct the generators, not the file. In dev mode
(`?dev=1`) the console lists overlaps and floating parts.

### Adding an instruction

1. Create `instructions/<id>/model.json`.
2. Add an entry to `CATALOG` in `app/src/ts/catalog.ts` (id, category `bricks` or `furniture`, set number, maker,
   series, locale key, `load()` that imports the model; optional `sections` – `{ key, from }` – for the time line).
3. Add the texts `cat.<key>.title` and `cat.<key>.desc` (and the section labels) to `app/src/ts/locales/en.ts` and
   `de.ts`.
4. Run `npm test` and `npm run build`, then check the instruction with `/?anleitung=<id>&dev=1`.

### Parts come from LDraw

Every part is drawn from the official LDraw library (https://library.ldraw.org, licence CC BY 4.0 for newer files such
as the stud primitives in `parts/bricks/ldraw-base`, older parts CC BY 2.0 / CCAL 2.0; the licence is in the header of
each .dat file, see https://www.ldraw.org/legal/). `parts/bricks/map.mjs` lists the LDraw file of each catalogue part
(the list is empty until the first instruction needs parts). `npm run ldraw` flattens the .dat files (all sub-parts and
primitives, including the underside tubes) into `parts/bricks/ldraw-meshes.json` (every triangle, the edge lines of
LDraw type 2, and the stud positions) and writes `app/src/ts/derived-parts.ts` (collision cells of the parts). The
result is committed, so the library is only needed when a part changes.

Two sources: `parts/bricks/ldraw-base/p/` belongs to the engine and always holds the stud primitives (stud.dat,
stud2.dat and the four primitives they use); every stud of every part is drawn from them. The parts of the instructions
come from `parts/bricks/library/` (LDraw layout `parts/`, `parts/s/`, `p/`, `p/48/`, `p/8/`; it does not exist until the
first instruction needs parts) or from another LDraw folder passed as argument. Without parts in `MAP` no library is
needed.

### Adding parts

1. Put the LDraw .dat file and its sub-files into `parts/bricks/library/` in the LDraw layout (`parts/`, `parts/s/`,
   `p/`, …; create the folder with the first part) or pass another LDraw folder to `npm run ldraw`.
2. Add the part to `MAP` in `parts/bricks/map.mjs` and run `npm run ldraw`. The catalogue in `app/src/ts/parts.ts` takes
   the parts from the generated `derived-parts.ts`.
3. Add the names `part.<id>` in `app/src/ts/locales/en.ts` and `de.ts`.

Parts that do not sit on the stud grid use extra options in `map.mjs` (converter `build-parts.mjs`), see "Where a change
belongs" in docs/PROJECT-RULES.md.

## Languages

English and German, chosen from the browser language and switchable in the settings (gear). A new language is one new
file in `app/src/ts/locales/` plus an entry in `app/src/ts/i18n.ts`.

## Known gaps

- Touch control is built but has not been tried on a real phone.
- There is no parts set and no tooling for furniture yet; only `parts/bricks/` exists.

## Without WebGL

If the browser cannot create a WebGL context (for example Macs patched with OpenCore Legacy Patcher with graphics
acceleration disabled), the page automatically switches to a built-in CPU renderer (`app/src/ts/softrender.ts`). It
shows a notice, has no shadows or anti-aliasing and uses simpler studs, but all features work.

## Naming

"Plate" (DE: Platte) = part with studs on top. "Tile" (DE: Fliese) = smooth top, no studs. Part ids follow this
(`plate_*`, `tile_*`).

## Assemblies

Elements with the same `assembly` value in one step form a sub-assembly. It takes `n + 1` scroll segments: the parts
arrive one after the other and join in mid-air (3 studs from their place, each part from 2.5 studs), then the whole
assembly moves into position: down from above, up from below (`hoverSide`) or sideways (`assemblyFrom` ±x / ±y). Order
inside the assembly follows `order`: the part that the others hold on to comes first (for parts arriving from below that
is the upper one). Single parts start 4 studs away and are fully visible at 3 (see docs/PROJECT-RULES.md for the
animation rules).

## Staged sub-assemblies

Elements with a `stage` (any name) are built apart, hovering `stageLift` studs above their final place (default 10,
`STAGE_HEIGHT` in `app/src/ts/viewer.ts`). They keep their final coordinates in `model.json`. After the last element of
a stage the viewer adds one join step (step = last step + 1) in which the whole sub-assembly moves into place. Choose
the height so that nothing arriving from below reaches into the model already built.
