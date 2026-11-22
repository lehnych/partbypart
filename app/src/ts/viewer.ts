import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { animatedLength, elementBounds, unitStarts, mergeBounds } from './model.ts';
import { partGeometry } from './geometry.ts';
import { setSoftBackground, SoftRenderer } from './softrender.ts';
import { AxesOverlay } from './axes.ts';
import { isDark, onSchemeChange } from './theme.ts';
import type { SoftMesh } from './softrender.ts';
import { PLATE_H } from './parts.ts';
import type { Bounds } from './model.ts';
import type { Unit, Vec3 } from './types.ts';

export type HighlightMode = 'off' | 'outline' | 'glow';

const COLORS: Record<string, number> = {
  black: 0x444e46, // the dark green-grey of the real bricks (#444e46)
  jet: 0x15171a, // real black parts: grille tile, hollow studs, side studs
  gold: 0xc8a032,
  brown: 0x6c3d30,
  light: 0xa3a8ab, // light grey
};

/** Share of a segment used for the fall; the rest is the settle at the end. */
const FALL_SHARE = 0.72;
// Start distances follow one pattern (studs): 10 for a whole staged sub-assembly, 5 for a single part or a finished
// intermediate step, 2.5 for a part that joins an intermediate step.
const FALL_HEIGHT = 5; // a single part comes down from above (or up from below)
const ASSEMBLY_SLIDE = 2.5; // each part of an intermediate step starts this far away from its place in it
const SLIDE_DISTANCE = 5; // a single part pushed in sideways
/** How far above its final place an assembly is put together. */
const HOVER_HEIGHT = 5;
const HOVER_SLIDE = 5; // studs an assembly waits beside its place before it is pushed in along x
/** Height at which a staged sub-assembly is put together before it is joined to the model. */
const STAGE_HEIGHT = 10;
const HIGHLIGHT_SECONDS = 1.0;
const RED = new THREE.Color(0xe5202b);
const EDGE = new THREE.Color(0x7d808c);

interface MeshView {
  mesh: THREE.Mesh;
  baseY: number;
  baseX: number;
  baseZ: number;
  mat: THREE.MeshStandardMaterial;
  fat: LineSegments2;
  fatMat: LineMaterial;
  /** Materials that fade in with the part (body, grey edges, black accent). */
  fadeMats: { mat: THREE.Material; full: number }[];
  /** Current fade-in value 0..1. */
  fade: number;
  /** Data for the CPU renderer, updated in place every frame. */
  soft: SoftMesh;
  /** Hollow studs in black (CPU renderer data); the WebGL one is a child of `mesh`. */
  softAccent?: SoftMesh;
}

export type RenderMode = 'webgl' | 'software';

const FADE_STUDS = 1;
/** Fade-in by the way already travelled: invisible at the start, fully visible after the first stud of the way
 *  (a part that starts 4 studs away is fully there at 3 studs). */
const fadeByWay = (travelled: number, studs = FADE_STUDS): number => clamp(travelled / studs, 0, 1);

/** Fades a part in: transparent only while it is not fully visible, so finished parts never have sorting problems. */
function setFade(m: MeshView, f: number): void {
  if (Math.abs(f - m.fade) < 1e-4) return;
  const was = m.fade < 1;
  const now = f < 1;
  m.fade = f;
  for (const { mat, full } of m.fadeMats) {
    mat.opacity = full * f;
    if (was !== now && mat !== m.fadeMats[1]?.mat) {
      mat.transparent = now;
      mat.needsUpdate = true;
    }
  }
  m.mesh.castShadow = f > 0.6; // a half-visible part throws no full shadow yet
}

interface UnitView {
  unit: Unit;
  group: THREE.Group;
  meshes: MeshView[];
  center: THREE.Vector3;
  radius: number;
  bounds: Bounds;
  landedAt: number | null;
  highlight: number;
  /** Current height of the assembly above its final place, for the camera. */
  hover: number;
}

/** Try the nicest settings first and fall back, because some embedded browsers refuse some options. */
function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer | null {
  const attempts: THREE.WebGLRendererParameters[] = [
    { antialias: true, powerPreference: 'high-performance' },
    { antialias: true },
    { antialias: false },
  ];
  for (const options of attempts) {
    try {
      return new THREE.WebGLRenderer({ canvas, ...options });
    } catch (e) {
      console.warn('WebGL attempt failed', e);
    }
  }
  return null;
}

const hexToRgb = (hex: number): [number, number, number] => [
  ((hex >> 16) & 255) / 255,
  ((hex >> 8) & 255) / 255,
  (hex & 255) / 255,
];

const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);
/** A part starts slowly (so its fade-in can be seen, like the fade-out when going back) and lands softly. */
const easeInOutCubic = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp = (x: number, a: number, b: number): number => Math.min(Math.max(x, a), b);

/** Model coordinates (studs, studs, plate heights) to world coordinates. */
const toWorld = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, z * PLATE_H, -y);

export class Viewer {
  /** `webgl` normally; `software` when the browser has no WebGL and the CPU renderer draws instead. */
  readonly mode: RenderMode;
  readonly renderer: THREE.WebGLRenderer | null;
  private readonly soft: SoftRenderer | null;
  private softSignature: number[] = [];
  private softList: SoftMesh[] = [];
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 600);
  readonly controls: OrbitControls;

  /** Called when the segment under the camera changes. */
  onCurrentChange: (index: number) => void = () => {};
  /** Called after every rendered frame. */
  onFrame: () => void = () => {};

  private _autoFocus = true;
  get autoFocus(): boolean {
    return this._autoFocus;
  }
  set autoFocus(on: boolean) {
    this._autoFocus = on;
    this.wake();
  }
  /** When on, a plain drag moves the stage instead of turning the model. */
  panMode = false;
  private readonly axes = new AxesOverlay();
  private _highlightMode: HighlightMode = 'outline';
  get highlightMode(): HighlightMode {
    return this._highlightMode;
  }
  set highlightMode(m: HighlightMode) {
    this._highlightMode = m;
    this.wake();
  }

  private views: UnitView[] = [];
  private fatMats: LineMaterial[] = [];
  private readonly canvas: HTMLCanvasElement;
  private insetBottom = 0;
  private insetTop = 0;
  private lastW = 0;
  private lastH = 0;
  private lastDpr = 0;
  private startVisible = 1;
  private starts: number[] = [];
  private total = 0;
  private t = 0;
  private tTarget = 0;
  private current = -1;
  private focusUntil = 0;
  private modelCenter = new THREE.Vector3();
  /** Crossing point of the axes (x, z) and the shift that puts the model as built so far onto it. */
  private axisCenter = new THREE.Vector3();
  private offset = new THREE.Vector3();
  private ground: THREE.Mesh | null = null;
  private offsetTarget = new THREE.Vector3();
  private modelRadius = 10;
  private light = new THREE.DirectionalLight(0xffffff, 2.4);
  private lastNow = 0;
  /** Camera target without the visitor's panning, and the panning itself. */
  private smoothBase: THREE.Vector3 | null = null;
  private panOffset = new THREE.Vector3();
  private running = false;
  /** Pending animation frame (0 = the loop sleeps because nothing on screen changes). */
  private rafId = 0;
  private lastSig: number[] = [];
  private stillFrames = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = createRenderer(canvas);
    this.mode = this.renderer ? 'webgl' : 'software';
    this.soft = this.renderer ? null : new SoftRenderer(canvas);
    // The background follows the light / dark design (system setting or the switch in the header; the same
    // values as --bg in style.scss).
    const applyTheme = (): void => {
      const dark = isDark();
      const bg = dark ? 0x090c0a : 0xf9fefa;
      this.scene.background = new THREE.Color(bg);
      setSoftBackground(bg);
      this.axes.dark = dark;
      this.softSignature = []; // the CPU renderer draws again
      this.wake();
    };
    applyTheme();
    onSchemeChange(applyTheme);

    if (this.renderer) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      try {
        // Soft reflections on the plastic. Without them the scene is still lit by the lights below.
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.7;
        pmrem.dispose();
      } catch (e) {
        console.warn('Environment lighting unavailable', e);
        this.light.intensity = 3;
      }
    }

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb9bdc9, 0.5));
    this.light.castShadow = this.mode === 'webgl';
    this.light.shadow.mapSize.set(2048, 2048);
    this.light.shadow.bias = -0.0004;
    this.light.shadow.normalBias = 0.03;
    this.scene.add(this.light, this.light.target);

    const ground = (this.ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.2 })));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.002;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.enableZoom = false; // zoom is handled below so the page can still scroll
    this.controls.enablePan = true; // right mouse button, shift + drag, or two fingers
    this.controls.screenSpacePanning = true; // the stage moves in every direction of the screen
    this.controls.minPolarAngle = 0; // free rotation, also from below and over the top
    this.controls.maxPolarAngle = Math.PI;
    this.controls.rotateSpeed = 0.8;
    this.controls.addEventListener('start', () => {
      this.focusUntil = 0; // the visitor takes over the distance until the next part
      this.wake();
    });
    this.controls.addEventListener('change', () => this.wake());

    // Moving the stage without a right mouse button: Option/Alt or Space + drag, or the move button.
    let spaceDown = false;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) spaceDown = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') spaceDown = false;
    });
    window.addEventListener('blur', () => (spaceDown = false));
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        const pan = this.panMode || e.altKey || spaceDown;
        this.controls.mouseButtons.LEFT = pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
        this.controls.touches.ONE = pan ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
        this.wake();
      },
      { capture: true },
    );

    canvas.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.zoomBy(Math.exp(e.deltaY * 0.0022));
        }
      },
      { passive: false },
    );

    // The canvas fills the free area between the bars (style.scss); it follows their size, not the window.
    window.addEventListener('resize', () => this.resize());
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  // -------------------------------------------------------------- loading

  load(units: Unit[], startVisible = 1): void {
    this.startVisible = Math.min(startVisible, units.length);
    for (const v of this.views) {
      this.scene.remove(v.group);
    }
    this.views = [];
    this.fatMats = [];
    this.starts = unitStarts(units, this.startVisible);
    this.total = animatedLength(units, this.startVisible);

    const all: Bounds[] = [];
    for (const unit of units) {
      const group = new THREE.Group();
      const meshes: MeshView[] = [];
      const ub: Bounds[] = [];
      for (const el of unit.elements) {
        if (unit.join) {
          ub.push(elementBounds(el));
          continue;
        }
        const geo = partGeometry(el.part, el.rot);
        const hex = COLORS[el.color] ?? COLORS.black;
        const mat = new THREE.MeshStandardMaterial({
          color: hex,
          roughness: 0.38,
          metalness: 0.0,
          emissive: RED,
          emissiveIntensity: 0,
        });
        const bodyGeo = geo.body;
        const accentGeo = geo.accent;
        const mesh = new THREE.Mesh(bodyGeo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.copy(toWorld(el.pos[0], el.pos[1], el.pos[2]));
        const edgeMat = new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.55 });
        mesh.add(new THREE.LineSegments(geo.edges, edgeMat));
        // Thick red outline, only visible while the part is highlighted.
        const fatMat = new LineMaterial({ color: RED, linewidth: 3.2, transparent: true, opacity: 0, depthWrite: false });
        fatMat.resolution.set(...this.size());
        const fat = new LineSegments2(geo.fat, fatMat);
        fat.visible = false;
        mesh.add(fat);
        this.fatMats.push(fatMat);
        group.add(mesh);
        const soft: SoftMesh = {
          pos: bodyGeo.attributes.position.array as Float32Array,
          nor: bodyGeo.attributes.normal.array as Float32Array,
          edges: geo.edges.attributes.position.array as Float32Array,
          ox: 0,
          oy: 0,
          oz: 0,
          color: hexToRgb(hex),
          glow: 0,
          outline: 0,
        };
        let softAccent: SoftMesh | undefined;
        const fadeMats: { mat: THREE.Material; full: number }[] = [
          { mat, full: 1 },
          { mat: edgeMat, full: 0.55 },
        ];
        if (accentGeo) {
          const accentMat = new THREE.MeshStandardMaterial({ color: COLORS.jet, roughness: 0.38, metalness: 0 });
          fadeMats.push({ mat: accentMat, full: 1 });
          const am = new THREE.Mesh(accentGeo, accentMat);
          am.castShadow = true;
          am.receiveShadow = true;
          mesh.add(am);
          softAccent = {
            pos: accentGeo.attributes.position.array as Float32Array,
            nor: accentGeo.attributes.normal.array as Float32Array,
            edges: new Float32Array(0),
            ox: 0,
            oy: 0,
            oz: 0,
            color: hexToRgb(COLORS.jet),
            glow: 0,
            outline: 0,
          };
        }
        meshes.push({ mesh, baseY: mesh.position.y, baseX: mesh.position.x, baseZ: mesh.position.z, mat, fat, fatMat, fadeMats, fade: 1, soft, ...(softAccent ? { softAccent } : {}) });
        ub.push(elementBounds(el));
      }
      group.visible = false;
      this.scene.add(group);
      const b = mergeBounds(ub);
      all.push(b);
      const center = toWorld((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
      const radius = 0.5 * Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], (b.max[2] - b.min[2]) * PLATE_H);
      this.views.push({ unit, group, meshes, center, radius, bounds: b, landedAt: null, highlight: 0, hover: 0 });
    }

    const mb = mergeBounds(all);
    this.modelCenter = toWorld((mb.min[0] + mb.max[0]) / 2, (mb.min[1] + mb.max[1]) / 2, 0);
    this.modelRadius = 0.5 * Math.hypot(mb.max[0] - mb.min[0], mb.max[1] - mb.min[1]) + 2;
    // The axes stay where they are: they cross at the middle of the finished model, at its underside (Z = 0).
    const mid = toWorld((mb.min[0] + mb.max[0]) / 2, (mb.min[1] + mb.max[1]) / 2, 0);
    this.axes.setFrame(mid, [
      (mb.max[0] - mb.min[0]) / 2 + 3,
      (mb.max[2] * PLATE_H) + 3,
      (mb.max[1] - mb.min[1]) / 2 + 3,
    ]);
    this.axisCenter = mid;
    this.fitShadow();
    this.controls.maxDistance = this.modelRadius * 5 + 20;
    this.controls.minDistance = 4;
    this.t = this.tTarget = 0;
    this.current = -1;
    this.applyProgress(0, 0);
    this.photoView(true);
    this.wake();
  }

  private fitShadow(): void {
    const r = this.modelRadius + 8;
    const c = this.modelCenter;
    this.light.position.set(c.x + 16, 30, c.z + 20);
    this.light.target.position.copy(c);
    const cam = this.light.shadow.camera;
    cam.left = -r;
    cam.right = r;
    cam.top = r;
    cam.bottom = -r;
    cam.near = 1;
    cam.far = 90;
    cam.updateProjectionMatrix();
  }

  // ------------------------------------------------------------- progress

  /** Number of scroll segments that animate (the first part is visible from the start). */
  get animatedCount(): number {
    return this.total;
  }

  get unitCount(): number {
    return this.views.length;
  }

  setProgress(t: number): void {
    this.tTarget = clamp(t, 0, this.animatedCount);
    this.wake();
  }

  /** Skip the smoothing, e.g. after a jump or at start. */
  snap(): void {
    this.t = this.tTarget;
    this.wake();
  }

  get progress(): number {
    return this.t;
  }

  private currentIndex(t: number): number {
    if (t <= 1e-6) return clamp(this.startVisible - 1, 0, this.views.length - 1);
    for (let i = this.startVisible; i < this.views.length; i++) {
      if (t <= this.starts[i] + this.views[i].unit.span + 1e-6) return i;
    }
    return this.views.length - 1;
  }

  private applyProgress(now: number, dt: number): void {
    const cur = this.currentIndex(this.t);
    if (cur !== this.current) {
      this.current = cur;
      this.focusUntil = now + 1.6;
      this.onCurrentChange(cur);
    }

    // Height of every staged sub-assembly above its final place: it comes down in its join step.
    const lifts = new Map<string, number>();
    for (const uv of this.views) {
      const stage = uv.unit.join;
      if (!stage) continue;
      const k = clamp((this.t - this.starts[uv.unit.index]) / uv.unit.span, 0, 1);
      const eased = k < 0.001 ? 0 : easeOutCubic(clamp(k / FALL_SHARE, 0, 1));
      let dip = 0;
      if (k > FALL_SHARE) dip = -0.05 * Math.sin(Math.PI * ((k - FALL_SHARE) / (1 - FALL_SHARE)));
      lifts.set(stage, (uv.unit.elements[0]?.stageLift ?? STAGE_HEIGHT) * (1 - eased) + dip);
    }

    for (const uv of this.views) {
      const i = uv.unit.index;
      const span = uv.unit.span;
      if (uv.unit.join) {
        const k = i < this.startVisible ? 1 : (this.t - this.starts[i]) / span;
        uv.group.visible = false;
        uv.hover = k <= 0 ? 0 : (lifts.get(uv.unit.join) ?? 0);
        uv.highlight = 0;
        continue;
      }
      const lift = uv.unit.elements[0]?.stage ? (lifts.get(uv.unit.elements[0].stage) ?? uv.unit.elements[0].stageLift ?? STAGE_HEIGHT) : 0;
      const u = i < this.startVisible ? 1 : (this.t - this.starts[i]) / span;
      if (u <= 0.002 / span) {
        uv.group.visible = false;
        uv.landedAt = null;
        uv.highlight = 0;
        continue;
      }
      uv.group.visible = true;

      let y = 0;
      let slide = 0;
      let slideZ = 0;
      const n = uv.unit.elements.length;
      if (n > 1) {
        const base = n + 1; // phases of an assembly (the timeline segment may be stretched for long ways)
        // Assembly: the parts arrive one after the other and join in mid-air, then the whole thing sinks into place.
        const s = clamp(u, 0, 1) * base;
        const p = clamp(s - n, 0, 1);
        let dip = 0;
        if (p > FALL_SHARE) dip = -0.05 * Math.sin(Math.PI * ((p - FALL_SHARE) / (1 - FALL_SHARE)));
        const first = uv.unit.elements[0];
        const side = first?.assemblyFrom; // the finished assembly is pushed in along x or y instead of sinking from above
        const hdir = (first?.hoverSide ?? (first?.from === 'below' ? 'below' : 'above')) === 'below' ? -1 : 1; // an assembly that is pushed on from underneath waits below its place
        const ease = 1 - easeOutCubic(clamp(p / FALL_SHARE, 0, 1));
        const hover = side ? 0 : hdir * (first?.hoverSlide ?? HOVER_HEIGHT) * ease + dip; // hoverSlide: how far above (below) it is put together
        const hx = side === '+x' || side === '-x' ? (side === '+x' ? 1 : -1) * (first?.hoverSlide ?? HOVER_SLIDE) * ease : 0;
        const hz = side === '+y' || side === '-y' ? (side === '+y' ? -1 : 1) * (first?.hoverSlide ?? HOVER_SLIDE) * ease : 0; // model y is world -Z
        uv.hover = hover + lift;
        uv.meshes.forEach((m, k) => {
          const e = clamp(s - k, 0, 1);
          m.mesh.visible = e > 0.002;
          const from = uv.unit.elements[k]?.from;
          const dist = uv.unit.elements[k]?.slideDistance ?? ASSEMBLY_SLIDE;
          const away = dist * (1 - easeInOutCubic(clamp(e / FALL_SHARE, 0, 1)));
          setFade(m, fadeByWay(dist - away, uv.unit.elements[k]?.fadeStuds));
          let dx = 0;
          let dz = 0;
          let fall = 0;
          if (from === '+x' || from === '-x') dx = (from === '+x' ? 1 : -1) * away;
          else if (from === '+y' || from === '-y') dz = (from === '+y' ? -1 : 1) * away; // model y is world -Z
          else fall = (from === 'below' ? -1 : 1) * ASSEMBLY_SLIDE * (1 - easeInOutCubic(clamp(e / FALL_SHARE, 0, 1)));
          m.mesh.position.set(m.baseX + hx + dx, m.baseY + hover + fall, m.baseZ + hz + dz);
        });
      } else {
        uv.hover = lift;
        if (u < 1) {
          const fall = clamp(u / FALL_SHARE, 0, 1);
          const from = uv.unit.elements[0]?.from;
          const ease = 1 - easeInOutCubic(fall);
          if (from === '+x' || from === '-x') {
            slide = (from === '+x' ? 1 : -1) * (uv.unit.elements[0]?.slideDistance ?? SLIDE_DISTANCE) * ease; // pushed in horizontally along the X axis
          } else if (from === '+y' || from === '-y') {
            slideZ = (from === '+y' ? -1 : 1) * (uv.unit.elements[0]?.slideDistance ?? SLIDE_DISTANCE) * ease; // model y is world -Z
          } else {
            y = (from === 'below' ? -1 : 1) * (uv.unit.elements[0]?.slideDistance ?? FALL_HEIGHT) * ease;
            if (u > FALL_SHARE) y = -0.05 * Math.sin(Math.PI * ((u - FALL_SHARE) / (1 - FALL_SHARE))); // small snap
          }
        }
        const e0 = uv.unit.elements[0];
        const side0 = e0?.from === '+x' || e0?.from === '-x' || e0?.from === '+y' || e0?.from === '-y';
        const dist0 = e0?.slideDistance ?? (side0 ? SLIDE_DISTANCE : FALL_HEIGHT);
        const travelled = u >= 1 ? dist0 : dist0 * easeInOutCubic(clamp(u / FALL_SHARE, 0, 1));
        uv.meshes.forEach((m) => {
          m.mesh.visible = true;
          setFade(m, fadeByWay(travelled, e0?.fadeStuds));
        });
      }
      uv.group.position.set(this.offset.x + slide, y + lift + this.offset.y, this.offset.z + slideZ);

      if (i < this.startVisible) {
        uv.landedAt = -1e9;
      } else if (n > 1 ? u * (n + 1) >= n + FALL_SHARE : u >= FALL_SHARE) {
        if (uv.landedAt === null) uv.landedAt = now;
      } else {
        uv.landedAt = null;
      }

      const active = i === this.current && (uv.landedAt === null || now - uv.landedAt < HIGHLIGHT_SECONDS);
      const goal = active && this.highlightMode !== 'off' ? 1 : 0;
      uv.highlight += (goal - uv.highlight) * (1 - Math.exp(-dt * (goal ? 10 : 3.2)));
      this.paintHighlight(uv);
    }
  }

  private paintHighlight(uv: UnitView): void {
    const h = uv.highlight < 0.004 ? 0 : uv.highlight;
    const outline = this.highlightMode === 'outline';
    for (const m of uv.meshes) {
      m.fat.visible = outline && h > 0.01;
      m.fatMat.opacity = outline ? h * m.fade : 0; // the red outline fades in with the part
      m.mat.emissiveIntensity = this.highlightMode === 'glow' ? 0.65 * h : outline ? 0.05 * h : 0;
    }
  }

  // --------------------------------------------------------------- camera

  private desired(): { target: THREE.Vector3; dist: number } {
    const uv = this.views[this.current];
    if (!uv) return { target: this.modelCenter.clone(), dist: 30 };
    const maxDist = this.modelRadius * 3 + 10;
    const target = uv.center.clone();
    target.x += this.offset.x;
    target.y += this.offset.y;
    target.z += this.offset.z;
    target.y += uv.hover * 0.8; // follow the assembly while it is put together above its place
    return { target, dist: clamp(uv.radius * 3.4 + 8 + uv.hover * 0.6, 13, maxDist) };
  }

  private updateCamera(now: number, dt: number): void {
    if (this.autoFocus) {
      const { target, dist } = this.desired();
      const k = 1 - Math.exp(-dt * 3.2);
      const before = this.controls.target.clone();
      const base = (this.smoothBase ??= before.clone().sub(this.panOffset));
      // What the visitor moved since the last frame becomes part of the pan offset.
      this.panOffset.copy(before).sub(base);
      if (now < this.focusUntil) this.panOffset.multiplyScalar(1 - k); // a new part brings the view back to the centre
      base.lerp(target, k);
      this.controls.target.copy(base).add(this.panOffset);
      this.camera.position.add(this.controls.target.clone().sub(before)); // keep the viewing angle

      if (now < this.focusUntil) {
        const offset = this.camera.position.clone().sub(this.controls.target);
        offset.setLength(offset.length() + (dist - offset.length()) * k);
        this.camera.position.copy(this.controls.target).add(offset);
      }
    }
    this.controls.update();
  }

  zoomBy(factor: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const len = clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset.setLength(len));
    this.focusUntil = 0;
    this.wake();
  }

  /** The isometric angle of the booklet, looking at the current part (or the whole model). */
  photoView(whole = false): void {
    const { target, dist } = whole ? { target: this.modelCenter, dist: this.modelRadius * 3.3 } : this.desired();
    this.controls.target.copy(target);
    this.smoothBase = target.clone();
    this.panOffset.set(0, 0, 0);
    const dir = new THREE.Vector3(1, 0.82, 1).normalize();
    this.camera.position.copy(target).add(dir.multiplyScalar(dist));
    this.controls.update();
  }

  // ----------------------------------------------------------------- loop

  /** CSS size of the canvas (the free area of the stage). */
  private size(): [number, number] {
    return [this.canvas.clientWidth || window.innerWidth, this.canvas.clientHeight || window.innerHeight];
  }

  resize(): void {
    const [w, h] = this.size();
    if (w === this.lastW && h === this.lastH && this.lastDpr === window.devicePixelRatio) return;
    this.lastW = w;
    this.lastH = h;
    this.lastDpr = window.devicePixelRatio;
    if (this.renderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(w, h, false);
    } else {
      this.soft?.resize(w, h);
      this.softSignature = [];
    }
    this.camera.aspect = w / h;
    // Portrait screens: widen the field of view so the model still fits.
    this.camera.fov = w / h < 0.8 ? 46 : 32;
    this.applyInsets(w, h);
    for (const m of this.fatMats) m.resolution.set(w, h);
    this.wake();
  }

  /** Keep the model centred in the part of the stage that no overlay (time line) covers. */
  setInsets(top: number, bottom: number): void {
    this.insetTop = top;
    this.insetBottom = bottom;
    this.applyInsets(...this.size());
    this.wake();
  }

  private applyInsets(w: number, h: number): void {
    const shift = (this.insetBottom - this.insetTop) / 2;
    if (Math.abs(shift) < 1) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, 0, shift, w, h);
    this.camera.updateProjectionMatrix();
  }

  /**
   * The axes never move. After every completed step the model as built so far slides to the
   * middle of the axes instead (all parts of the step must have landed before it moves).
   */
  private updateOffset(dt: number): void {
    const eps = 0.02;
    let done = 0;
    const steps = [...new Set(this.views.map((v) => v.unit.step))].sort((p, q) => p - q);
    for (const st of steps) {
      const ok = this.views.every((v, i) => v.unit.step !== st || this.t >= this.starts[i] + v.unit.span - eps);
      if (!ok) break;
      done = st;
    }
    const list: Bounds[] = [];
    for (const uv of this.views) {
      if (uv.unit.join) continue;
      if (uv.unit.step <= done || (done === 0 && uv.unit.step === steps[0])) list.push(uv.bounds);
    }
    if (list.length) {
      const b = mergeBounds(list);
      const c = toWorld((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
      this.offsetTarget.set(this.axisCenter.x - c.x, 0, this.axisCenter.z - c.z); // the model stands on Z = 0
    }
    if (this.ground) this.ground.position.y = this.offset.y - 0.002;
    this.offset.lerp(this.offsetTarget, 1 - Math.exp(-dt * 3));
    if (this.offset.distanceToSquared(this.offsetTarget) < 1e-6) this.offset.copy(this.offsetTarget);
  }

  setAxes(on: boolean): void {
    this.axes.setVisible(on);
    this.wake();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.wake();
  }

  /** Restart the frame loop after it went to sleep (scrolling, dragging, zoom, resize, settings). */
  private wake(): void {
    this.stillFrames = 0;
    if (!this.running || this.rafId) return;
    this.rafId = requestAnimationFrame(this.loop);
  }

  private readonly loop = (ms: number): void => {
    this.rafId = -1; // inside a frame: wake() (e.g. from the controls' change event) must not queue a second loop
    const now = ms / 1000;
    // After a sleep the first step is one normal frame, so the scroll smoothing does not jump.
    const dt = this.lastNow ? Math.min(now - this.lastNow || 0.016, 0.35) : 0.016;
    this.lastNow = now;
    this.frame(now, dt);
    if (this.settled(now)) {
      this.rafId = 0;
      this.lastNow = 0; // nothing moves any more: stop until wake() is called
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * True when nothing on screen has changed for a few frames: scroll smoothing done, model offset in place,
   * camera (follow, damping) at rest, no highlight still running on its timer.
   */
  private settled(now: number): boolean {
    if (this.t !== this.tTarget) return this.still(false);
    if (this.views.some((uv) => uv.landedAt !== null && uv.landedAt > 0 && now - uv.landedAt < HIGHLIGHT_SECONDS + 0.1)) return this.still(false);
    const sig: number[] = [...this.camera.matrixWorld.elements, this.offset.x, this.offset.y, this.offset.z];
    for (const uv of this.views) {
      sig.push(uv.highlight, uv.group.position.y);
      for (const m of uv.meshes) sig.push(m.fade, m.mesh.position.x, m.mesh.position.y, m.mesh.position.z);
    }
    const same = sig.length === this.lastSig.length && sig.every((v, i) => Math.abs(v - this.lastSig[i]) < 1e-4);
    this.lastSig = sig;
    return this.still(same);
  }

  private still(same: boolean): boolean {
    this.stillFrames = same ? this.stillFrames + 1 : 0;
    return this.stillFrames >= 3;
  }

  frame(now: number, dt: number): void {
    const diff = this.tTarget - this.t;
    this.t = Math.abs(diff) < 0.0005 ? this.tTarget : this.t + diff * (1 - Math.exp(-dt * 9));
    this.updateOffset(dt);
    this.applyProgress(now, dt);
    this.updateCamera(now, dt);
    if (this.renderer) this.renderer.render(this.scene, this.camera);
    else this.renderSoft();
    this.axes.draw(this.camera);
    this.onFrame();
  }

  /** CPU rendering. Skipped while nothing on screen has changed. */
  private renderSoft(): void {
    const soft = this.soft;
    if (!soft) return;
    this.camera.updateMatrixWorld();
    const vp = this.camera.projectionMatrix.clone().multiply(this.camera.matrixWorldInverse);

    const list = this.softList;
    list.length = 0;
    let checksum = 0;
    for (const uv of this.views) {
      if (!uv.group.visible) continue;
      const gy = uv.group.position.y;
      const gx = uv.group.position.x;
      const gz = uv.group.position.z;
      for (const mv of uv.meshes) {
        if (!mv.mesh.visible) continue;
        const sm = mv.soft;
        sm.ox = mv.mesh.position.x + gx;
        sm.oy = mv.mesh.position.y + gy;
        sm.oz = mv.mesh.position.z + gz;
        sm.glow = this.highlightMode === 'glow' ? mv.mat.emissiveIntensity / 0.65 : 0;
        sm.outline = mv.fat.visible ? mv.fatMat.opacity : 0;
        sm.alpha = mv.fade; // fade-in
        checksum = (checksum * 31 + sm.oy * 7.1 + sm.ox * 3.7 + sm.oz * 5.3 + sm.glow * 13.3 + sm.outline * 17.7 + sm.alpha * 19.1 + 1) % 1e9;
        list.push(sm);
        const sa = mv.softAccent;
        if (sa) {
          sa.ox = sm.ox;
          sa.oy = sm.oy;
          sa.oz = sm.oz;
          sa.alpha = mv.fade;
          list.push(sa);
        }
      }
    }
    const signature = [...vp.elements, checksum, list.length];
    const same = signature.length === this.softSignature.length && signature.every((v, i) => v === this.softSignature[i]);
    if (same) return;
    this.softSignature = signature;

    const eye = this.camera.position.clone().sub(this.controls.target).normalize();
    soft.render(list, vp.elements, [eye.x, eye.y, eye.z]);
  }

  /** Part info for the interface. */
  unitAt(index: number): Unit | undefined {
    return this.views[index]?.unit;
  }

  /** Where the part lands, for tests and for the compare view. */
  focusPoint(index: number): Vec3 | null {
    const uv = this.views[index];
    return uv ? [uv.center.x, uv.center.y, uv.center.z] : null;
  }
}
