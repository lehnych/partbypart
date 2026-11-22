// Catalogue part -> LDraw part number (official library, library.ldraw.org).
// One entry per part id used by an instruction, e.g. `plate_1x2: { file: '3023b' }`.
// mirror: true/false forces the handedness (left/right pairs that share one LDraw file).
// accent: 'sideStuds' | 'studs' | 'openTopStuds' draws those studs black.
// derive: true takes the collision cells from the real mesh (written to app/src/ts/derived-parts.ts).
// Every new id also needs a name in app/src/ts/locales/en.ts and de.ts (`part.<id>`).
export const MAP = {};
