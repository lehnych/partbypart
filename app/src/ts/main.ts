import { entryFromUrl } from './catalog.ts';
import { buildUnits, checkPlacement, ModelError, unitStarts, validateModel } from './model.ts';
import { store, t } from './i18n.ts';
import { createUi } from './ui.ts';
import type { HighlightMode, Viewer } from './viewer.ts';

/** Pixels of scrolling that one part needs. */
const SCROLL_PER_PART = 420;

function saved(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function boot(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const dev = params.has('dev');
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const spacer = document.getElementById('spacer') as HTMLElement;
  const root = document.getElementById('ui') as HTMLElement;
  const entry = entryFromUrl(); // the instruction to show (?anleitung=…)

  let viewer: Viewer | null = null;
  const noop = (): void => {};
  const failUi = createUi(
    root,
    { next: noop, prev: noop, zoom: noop, goTo: noop, setFollow: noop, setAxes: noop, setPanMode: noop, setHighlight: noop, setTouchRotate: noop, setShortcuts: noop, restart: noop },
    { entry, units: [{ index: 0, step: 1, elements: [], span: 1 }], startVisible: 1, follow: true, highlight: 'outline', axes: true, shortcuts: true },
  );

  // No instruction in the portal yet (catalog.ts): only the portal is shown, with the catalog open.
  if (!entry) {
    failUi.setNotice('catEmpty');
    failUi.openCatalog();
    return;
  }

  let units;
  try {
    // The model data of the chosen instruction (catalog.ts).
    const raw: unknown = await entry.load();
    const elements = validateModel(raw);
    units = buildUnits(elements);
    if (dev) for (const issue of checkPlacement(elements)) console.warn(`[model] ${issue.message}`);
  } catch (e) {
    failUi.showError(e instanceof ModelError ? e.message : `${t('loadFailed')} ${String(e)}`);
    return;
  }

  // The 3D view (three.js and the part shapes) is loaded after the page and its controls are there.
  let ViewerClass: typeof Viewer;
  try {
    ({ Viewer: ViewerClass } = await import('./viewer.ts'));
  } catch (e) {
    failUi.showError(`${t('loadFailed')} ${String(e)}`);
    return;
  }

  try {
    viewer = new ViewerClass(canvas);
  } catch (e) {
    // Show the real reason, so a broken browser setup can be told apart from a bug in the page.
    failUi.showError(`${t('noWebgl')}\n\n${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  const startVisible = 1; // the first part stands in its place from the start
  const follow = saved('follow') !== '0';
  const savedHl = saved('highlight');
  const highlight: HighlightMode = savedHl === 'off' || savedHl === 'glow' || savedHl === 'outline' ? savedHl : 'outline';
  const axesOn = saved('axes') !== '0';
  let shortcuts = saved('keys') !== '0'; // F, V, +, − (can be switched off in the settings)
  viewer.setAxes(axesOn);
  viewer.autoFocus = follow;
  viewer.highlightMode = highlight;
  viewer.load(units, startVisible);

  const animated = viewer.animatedCount;
  const sizeSpacer = (): void => {
    spacer.style.height = `${animated * SCROLL_PER_PART + window.innerHeight}px`;
  };
  sizeSpacer();
  window.addEventListener('resize', sizeSpacer);

  // With "reduce motion" set in the system, jumps land at once instead of gliding (checked on every jump, so a
  // change of the setting applies without reload).
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = (): ScrollBehavior => (reduceMotion.matches ? 'auto' : 'smooth');
  const scrollToPart = (value: number): void => {
    window.scrollTo({ top: Math.max(0, Math.min(animated, value)) * SCROLL_PER_PART, behavior: scrollBehavior() });
  };
  const here = (): number => window.scrollY / SCROLL_PER_PART;
  // Segments are not all one scroll unit long (their length follows the way a part travels), so the
  // buttons jump to the real end of the next / previous part, not to the next whole number.
  const starts = unitStarts(units, startVisible);
  // In an intermediate step every single part is a stop of its own (the step has one phase per part, then the move into place).
  const ends = units
    .flatMap((u, i) => {
      if (i < startVisible) return [];
      const phases = u.elements.length > 1 && !u.join ? u.elements.length + 1 : 1;
      return Array.from({ length: phases }, (_, k) => starts[i] + (u.span * (k + 1)) / phases);
    })
    .sort((a, b) => a - b);

  const ui = createUi(
    root,
    {
      next: () => scrollToPart(ends.find((b) => b > here() + 1e-3) ?? animated),
      prev: () => scrollToPart([0, ...ends].filter((b) => b < here() - 1e-3).pop() ?? 0),
      zoom: (f) => viewer!.zoomBy(f),
      goTo: scrollToPart,
      restart: () => {
        store('progress', '');
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        ui.setNotice(viewer!.mode === 'software' ? 'softMode' : null);
      },
      setFollow: (on) => (viewer!.autoFocus = on),
      setAxes: (on) => viewer!.setAxes(on),
      setPanMode: (on) => (viewer!.panMode = on),
      setHighlight: (m) => (viewer!.highlightMode = m),
      setTouchRotate: (on) => canvas.classList.toggle('touch-rotate', on),
      setShortcuts: (on) => (shortcuts = on),
    },
    { entry, units, startVisible, follow, highlight, axes: axesOn, shortcuts },
  );

  // The canvas only covers the free stage (style.scss); the time line lies over its bottom edge, so the model
  // is centred above it.
  const fit = (): void => viewer!.setInsets(0, ui.stageCover());
  ui.onStageCoverChange(fit);
  fit();

  if (viewer.mode === 'software') {
    ui.setNotice('softMode');
    ui.setSoftMode(true);
  }

  viewer.onCurrentChange = (i) => ui.setCurrent(i);
  viewer.onFrame = () => ui.setProgress(viewer!.progress);

  // Remember where the visitor is, so that a later visit can continue there.
  const POS_KEY = 'progress';
  const readPos = (): number | null => {
    try {
      const raw = saved(POS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw) as { t?: unknown; n?: unknown };
      if (typeof p.t !== 'number' || p.n !== units.length || !(p.t > 0.05)) return null; // model changed or nothing worth resuming
      return Math.min(p.t, animated);
    } catch {
      return null;
    }
  };
  const resumeAt = readPos();
  if (resumeAt !== null) window.scrollTo(0, resumeAt * SCROLL_PER_PART);

  let saveTimer = 0;
  const sync = (): void => {
    viewer!.setProgress(here());
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => store(POS_KEY, JSON.stringify({ t: +here().toFixed(3), n: units.length })), 400);
  };
  window.addEventListener('scroll', sync, { passive: true });
  sync();
  viewer.snap();
  if (resumeAt !== null) {
    ui.setNotice('resumed');
    window.setTimeout(() => ui.setNotice(viewer!.mode === 'software' ? 'softMode' : null), 5000);
  }

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    if (document.querySelector('dialog.sheet[open]')) return; // help / about are open: their keys only
    // Inside the row of tools (narrow screens) left / right move between its buttons; the side rail uses up / down.
    const toolbar = e.target instanceof Element ? e.target.closest('[role="toolbar"]') : null;
    const inRow = toolbar !== null && toolbar.getAttribute('aria-orientation') !== 'vertical';
    if (inRow && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) return;
    if (e.key === 'ArrowRight') scrollToPart(Math.floor(here() + 1e-3) + 1);
    else if (e.key === 'ArrowLeft') scrollToPart(Math.ceil(here() - 1e-3) - 1);
    else if (!shortcuts) return; // single-character keys are switched off in the settings (WCAG 2.1.4)
    else if (e.key === '+' || e.key === '=') viewer!.zoomBy(1 / 1.2);
    else if (e.key === '-') viewer!.zoomBy(1.2);
    else if (e.altKey || e.ctrlKey || e.metaKey) return;
    else if (e.key === 'f' || e.key === 'F') ui.toggleFollow();
    else if (e.key === 'v' || e.key === 'V') ui.togglePan();
  });

  viewer.start();
  store('seen', '1');
  (window as unknown as { __lego: unknown }).__lego = { viewer, units, SCROLL_PER_PART };
}

void boot();
