import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import meshes from '../../../parts/bricks/ldraw-meshes.json';
import { PARTS, PLATE_H, xform } from './parts.ts';
import type { Rot } from './types.ts';

export interface PartGeometry {
  /** Body and studs merged into one geometry. */
  body: THREE.BufferGeometry;
  /** Hard edges of the body only (studs left out to keep the lines calm). */
  edges: THREE.BufferGeometry;
  /** The same edges as thick lines, used for the red outline highlight. */
  fat: LineSegmentsGeometry;
  /** Studs that the booklet shows black (jumper stud, side studs of the block), drawn in their own colour. */
  accent: THREE.BufferGeometry | null;
}

const cache = new Map<string, PartGeometry>();



interface StudTemplate {
  pos: number[];
  idx: number[];
}
interface MeshData {
  file: string;
  accent: 'studs' | 'sideStuds' | 'clipSides' | 'oppositeStud' | 'endStud' | 'openTopStuds' | null;
  pos: number[];
  idx: number[];
  /** Triangles drawn in the accent colour (the clip of clip plates). */
  accentIdx?: number[];
  /** Edge lines (LDraw type 2): pairs of points, x y z x y z. */
  lines: number[];
  studs: { p: [number, number, number]; up: [number, number, number]; hollow: boolean }[];
}
const ALL = meshes as unknown as Record<string, MeshData> & { _studs: Record<'solid' | 'hollow', StudTemplate> };
const TEMPLATES = ALL._studs;

/** One stud of the LDraw library (stud.dat / stud2.dat), as geometry with +y up. */
function studGeometry(kind: 'solid' | 'hollow'): THREE.BufferGeometry {
  const t = TEMPLATES[kind];
  const pos = new Float32Array(t.idx.length * 3);
  t.idx.forEach((vi, i) => pos.set([t.pos[vi * 3], t.pos[vi * 3 + 1], t.pos[vi * 3 + 2]], i * 3));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return toCreasedNormals(g, (35 * Math.PI) / 180);
}

/**
 * The parts come from the LDraw library (parts/bricks/build-parts.mjs converts them to parts/bricks/ldraw-meshes.json, already in the
 * catalogue frame). Coordinates: model x -> world X, model z (plate heights) -> world Y,
 * model y -> world -Z. That keeps the coordinate system right-handed, so the model is not mirrored.
 */
export function partGeometry(partId: string, rot: Rot): PartGeometry {
  const key = `${partId}|${rot}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const mesh = ALL[partId] as MeshData | undefined;
  const base = PARTS[partId];
  if (!mesh || !base) throw new Error(`Unknown part "${partId}"`);
  const turn = (x: number, y: number): [number, number] => xform([x, y], rot, base.w, base.d);

  // Body: the LDraw triangles (studs are separate), rotated about the vertical axis. Mapping (x, y, z) -> (x, z * PLATE_H, -y).
  const pos = new Float32Array(mesh.idx.length * 3);
  mesh.idx.forEach((vi, i) => {
    const [x, y] = turn(mesh.pos[vi * 3], mesh.pos[vi * 3 + 1]);
    pos.set([x, mesh.pos[vi * 3 + 2] * PLATE_H, -y], i * 3);
  });
  const raw = new THREE.BufferGeometry();
  raw.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const shell = toCreasedNormals(raw, (35 * Math.PI) / 180);

  // Accent triangles (the black clip ring), same frame as the body.
  let clipShell: THREE.BufferGeometry | null = null;
  if (mesh.accentIdx?.length) {
    const ap = new Float32Array(mesh.accentIdx.length * 3);
    mesh.accentIdx.forEach((vi, i) => {
      const [x, y] = turn(mesh.pos[vi * 3], mesh.pos[vi * 3 + 1]);
      ap.set([x, mesh.pos[vi * 3 + 2] * PLATE_H, -y], i * 3);
    });
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    clipShell = toCreasedNormals(ag, (35 * Math.PI) / 180);
  }

  // Edge lines of the part (LDraw line type 2).
  const lp = new Float32Array(mesh.lines.length);
  for (let i = 0; i < mesh.lines.length; i += 3) {
    const [x, y] = turn(mesh.lines[i], mesh.lines[i + 1]);
    lp.set([x, mesh.lines[i + 2] * PLATE_H, -y], i);
  }
  const edges = new THREE.BufferGeometry();
  edges.setAttribute('position', new THREE.BufferAttribute(lp, 3));

  const accentList: THREE.BufferGeometry[] = clipShell ? [clipShell] : [];
  const studList: THREE.BufferGeometry[] = [];
  for (const st of mesh.studs) {
    const [x, y] = turn(st.p[0], st.p[1]);
    const z = st.p[2];
    const vertical = st.up[2] !== 0;
    const [dx, dy] = vertical ? [0, 0] : (() => { const [ax, ay] = turn(st.p[0] + st.up[0], st.p[1] + st.up[1]); return [Math.round(ax - x), Math.round(ay - y)]; })();
    const black = mesh.accent === 'studs' || (mesh.accent === 'sideStuds' && !vertical);
    const g = studGeometry(st.hollow ? 'hollow' : 'solid');
    if (vertical) {
      g.translate(x, z * PLATE_H, -y);
    } else {
      // The stud axis is Y; turn it to the horizontal direction (dx, dy) -> world (dx, 0, -dy).
      if (dx) g.rotateZ(-dx * (Math.PI / 2));
      if (dy) g.rotateX(-dy * (Math.PI / 2));
      g.translate(x, z * PLATE_H, -y);
    }
    (black ? accentList : studList).push(g);
  }

  const merge = (list: THREE.BufferGeometry[]): THREE.BufferGeometry => {
    for (const l of list) l.deleteAttribute('uv');
    const g = mergeGeometries(list, false);
    if (!g) throw new Error(`Could not build geometry for ${partId}`);
    return g;
  };

  const result: PartGeometry = {
    body: merge([shell, ...studList.map((g) => g.clone())]),
    edges,
    fat: new LineSegmentsGeometry().setPositions(lp),
    accent: accentList.length ? merge(accentList.map((g) => g.clone())) : null,
  };
  cache.set(key, result);
  return result;
}
