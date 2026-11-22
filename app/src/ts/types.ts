export type Rot = 0 | 90 | 180 | 270;
export type Confidence = 'measured' | 'estimate';
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

/** One physical brick. `model.json` is a flat array of these. */
export interface ModelElement {
  id: string;
  /** Step number as printed in the instruction booklet. */
  step: number;
  /** Build order inside the step (1, 2, 3 ...). */
  order: number;
  /** Key into the part catalogue (src/ts/parts.ts). */
  part: string;
  color: string;
  /** Minimum corner of the rotated part: x, y in studs, z in plate heights. */
  pos: Vec3;
  rot: Rot;
  /** `main` or a module name. Reserved for module positioning later. */
  group: string;
  /** Elements of one assembly fly in together (sub-assemblies from the booklet). */
  assembly?: string;
  /** An assembly whose finished group is pushed in horizontally along the X or Y axis from this side (instead of sinking from above). */
  assemblyFrom?: '+x' | '-x' | '+y' | '-y';
  slideDistance?: number; // studs this part starts away from its place when it flies into an assembly (default 2.5)
  fadeStuds?: number; // studs of its way over which the part fades in (default 1)
  stageLift?: number; // studs above its place at which a staged sub-assembly is built before its join step (default 10)
  hoverSide?: 'above' | 'below'; // where a finished vertical assembly waits before it moves into place (default: below if its first part arrives from below)
  hoverSlide?: number; // studs the finished assembly waits away from its place (beside it along x, or above / below it) before it moves in (default 5)
  /** Built apart from the model (above its final place) until the following join step, e.g. a sub-assembly of several steps. */
  stage?: string;
  /** Direction the part flies in from. Default `above`; parts that are pushed on from underneath use `below`; `+x` / `-x` / `+y` / `-y` slide in horizontally along the X or Y axis from that side (single parts only). */
  from?: 'above' | 'below' | '+x' | '-x' | '+y' | '-y';
  /** Held sideways between neighbours (not resting on anything below), so the floating check skips it. */
  clamped?: boolean;
  /** Whether the position was read precisely or only estimated from the photo. */
  confidence?: Confidence;
  /** Reading aid for data entry, never shown to the visitor. */
  note?: string;
}

/** Extruded polygon: footprint in studs, height from z0 to z1 in plate heights. */
export interface Solid {
  /** Count every grid cell of the bounding box as occupied, even if the shape is too thin to cover a cell centre (panels). */
  fill?: boolean;
  poly: Vec2[];
  z0: number;
  z1: number;
}

export interface PartDef {
  id: string;
  solids: Solid[];
  /** Footprint size in studs (bounding box). */
  w: number;
  d: number;
}

/** What flies in as one scroll segment: a single element or a whole assembly. */
export interface Unit {
  index: number;
  step: number;
  elements: ModelElement[];
  assembly?: string;
  /** Join step: the staged sub-assembly with this id moves into its final place. `elements` lists its parts (they are drawn by their own units). */
  join?: string;
  /** Scroll length in segments: 1 for a single part, elements + 1 for an assembly (parts join in mid-air, then move into place). */
  span: number;
}

export interface Issue {
  kind: 'collision' | 'floating';
  ids: string[];
  message: string;
}
