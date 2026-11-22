import { getLang, LANGS, onLangChange, partName, setLang, store, t } from './i18n.ts';
import { getScheme, onSchemeChange, setScheme, systemIsDark, type SchemeChoice } from './theme.ts';
import type { HighlightMode } from './viewer.ts';
import { animatedLength, unitStarts } from './model.ts';
import type { Unit } from './types.ts';
import { CATALOG, CATEGORIES, openEntry, type Category, type CatalogEntry } from './catalog.ts';

export interface UiApi {
  next(): void;
  prev(): void;
  zoom(factor: number): void;
  restart(): void;
  goTo(t: number): void;
  setFollow(on: boolean): void;
  setAxes(on: boolean): void;
  setPanMode(on: boolean): void;
  setHighlight(mode: HighlightMode): void;
  setTouchRotate(on: boolean): void;
  /** Single-character keys (F, V, +, −) on or off (settings; WCAG 2.1.4). */
  setShortcuts(on: boolean): void;
}

export interface UiOptions {
  /** The instruction shown (catalog.ts); null while the portal has none (only header, catalog, help, settings). */
  entry: CatalogEntry | null;
  units: Unit[];
  startVisible: number;
  follow: boolean;
  highlight: HighlightMode;
  axes: boolean;
  shortcuts: boolean;
}

/** Narrow screens: tool row and step block at the bottom instead of rail and side panel (style.scss, same width). */
const NARROW = window.matchMedia('(max-width: 40em)'); // 640px at the default font size

const svg = (body: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const ICON = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>'),
  redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>'),
  focus: svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'),
  restart: svg('<path d="M4.5 12a7.5 7.5 0 107.5-7.5H8M8 1.5l-3 3 3 3"/>'),
  move: svg('<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>'),
  hand: svg(
    '<path d="M8 12V6.5a1.5 1.5 0 013 0V11m0-1V5a1.5 1.5 0 013 0v6m0-3.5a1.5 1.5 0 013 0V14c0 4-2.4 6-5.5 6S7 18 6 15.5L4.6 12a1.4 1.4 0 012.4-1.4L8 12"/>',
  ),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 015 .6c0 1.8-2.5 2.2-2.5 4"/><path d="M12 17.2h.01"/>'),
  gear: svg(
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 010-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 014 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z"/>',
  ),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  chevron: svg('<path d="M7 10l5 5 5-5"/>'),
  furniture: svg('<path d="M4 4h4v16H4zM8 15h12v5H8z"/><circle cx="14" cy="9" r="2"/><path d="M14 11v3"/>'),
  scroll: svg('<rect x="7" y="3" width="10" height="16" rx="5"/><path d="M12 7v3M9 22l3-2 3 2"/>'),
  // Logo: a 2×2 brick seen from above, outline only.
  // Filled studs that grow stronger clockwise: bottom right 40 %, bottom left 60 %, top left 80 %, top right 100 %.
  // Class `stud`: style.scss fills them in the line colour of the place (accent in the header, muted in the catalog).
  brick: svg(
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle class="stud" cx="15.5" cy="15.5" r="2.6" fill-opacity=".4"/><circle class="stud" cx="8.5" cy="15.5" r="2.6" fill-opacity=".6"/><circle class="stud" cx="8.5" cy="8.5" r="2.6" fill-opacity=".8"/><circle class="stud" cx="15.5" cy="8.5" r="2.6"/>',
  ),
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html) node.innerHTML = html;
  return node;
}

function button(cls: string, html = ''): HTMLButtonElement {
  const b = el('button', cls, html);
  b.type = 'button';
  return b;
}

function unitName(u: Unit): string {
  return u.join ? t('join') : [...new Set(u.elements.map((e) => partName(e.part)))].join(' + ');
}

/** A row of buttons of which exactly one is chosen (colour scheme, highlight). */
function segmented<V extends string>(values: readonly V[], onPick: (v: V) => void) {
  const wrap = el('div', 'seg');
  wrap.setAttribute('role', 'group');
  const items = values.map((v) => {
    const b = button('');
    b.dataset.value = v;
    b.addEventListener('click', () => onPick(v));
    wrap.append(b);
    return b;
  });
  return {
    wrap,
    items,
    set(v: V): void {
      for (const b of items) b.setAttribute('aria-pressed', String(b.dataset.value === v));
    },
  };
}

/** A modal sheet centred over the page (help, catalog): native <dialog>, so focus, Esc and the backdrop come for free. */
function sheet(id: string) {
  const dialog = el('dialog', 'sheet');
  dialog.id = id;
  dialog.setAttribute('closedby', 'any'); // Esc and a click on the backdrop close it
  const head = el('div', 'sheet-head');
  const title = el('h2');
  title.id = `${id}-title`;
  dialog.setAttribute('aria-labelledby', title.id);
  const close = button('ibtn', ICON.close);
  close.addEventListener('click', () => dialog.close());
  head.append(title, close);
  const body = el('div', 'sheet-body');
  dialog.append(head, body);
  // Browsers without closedby: close when the press and the release are both outside the box. The position counts,
  // not the clicked element: the dialog is also the target of clicks on its own empty space.
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e: PointerEvent): boolean => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => (pressedOutside = outside(e)));
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && outside(e)) dialog.close();
    });
  }
  return { dialog, title, close, body };
}

function section(titleKey: string, ...bodyKeys: string[]): HTMLElement {
  const s = el('section');
  const h = el('h3', 'cap', t(titleKey));
  s.append(h);
  for (const k of bodyKeys) {
    const d = el('div', 'rich');
    d.innerHTML = t(k); // our own texts from locales/*.ts, with simple markup
    s.append(d);
  }
  return s;
}

export function createUi(root: HTMLElement, api: UiApi, opts: UiOptions) {
  const { units, startVisible } = opts;
  const animated = animatedLength(units, startVisible);
  // Sections of the booklet shown on the time line (catalog.ts; first step of each, the last runs to the end).
  const SECTIONS = opts.entry?.sections ?? [];
  const starts = unitStarts(units, startVisible);
  const steps = [...new Set(units.map((u) => u.step))];
  const totalSteps = Math.max(...steps);
  // Parts in place at the end of each unit, for "n parts built" in the status bar.
  const unitEnds = units.map((u, i) => (i < startVisible ? 0 : (starts[i] ?? 0) + u.span));
  // A join step moves an already built sub-assembly; its parts were counted in their own steps.
  const unitParts = units.map((u) => (u.join ? 0 : u.elements.length));

  let current = 0;
  let follow = opts.follow;
  let axes = opts.axes;
  let panMode = false;
  let highlight = opts.highlight;
  let touchRotate = false;
  let progress = 0;
  let hintClosed = false;
  let shortcuts = opts.shortcuts;

  // ------------------------------------------------------------- header
  const top = el('header', 'top');
  // Logo cell + word mark (the portal), then the picker with the instruction shown; help and settings on the right.
  const brand = el('div', 'brand');
  const brandIcon = el('span', 'brand-icon', ICON.brick);
  const wordmark = el('span', 'wordmark', 'PARTBYPART<i class="cursor" aria-hidden="true"></i>');
  wordmark.ariaLabel = 'PartByPart';
  brand.append(brandIcon, wordmark);
  const divider = el('span', 'divider');
  const bPicker = button('picker');
  bPicker.setAttribute('aria-haspopup', 'dialog');
  const pickerTitle = el('span', 'picker-title');
  // The set number only when an instruction is shown (an empty tag would still draw its frame).
  if (opts.entry) bPicker.append(el('span', 'tag', opts.entry.code));
  bPicker.append(pickerTitle, el('span', 'picker-chevron', ICON.chevron));
  const spacer = el('span', 'grow');
  const bHelp = button('ibtn', ICON.help);
  bHelp.setAttribute('aria-haspopup', 'dialog');
  const bSettings = button('ibtn', ICON.gear);
  const pageHeading = el('h1', 'sr-only'); // the page's main heading (the word mark is a button)
  top.append(pageHeading, brand, divider, bPicker, spacer, bHelp, bSettings);

  // ------------------------------------------------------------ settings
  // A non-modal <dialog popover>: the page stays usable, Esc and a click outside close it (browser). Browsers
  // without popover get the same panel as a plain non-modal dialog, opened and closed by script.
  const settings = el('dialog', 'settings');
  settings.id = 'settings';
  const hasPopover = Object.hasOwn(HTMLElement.prototype, 'popover');
  bSettings.setAttribute('aria-haspopup', 'dialog');
  const settingsHead = el('div', 'settings-head');
  const settingsTitle = el('h2', 'cap');
  settingsTitle.id = 'settings-title';
  settings.setAttribute('aria-labelledby', settingsTitle.id);
  const settingsClose = button('ibtn small', ICON.close);
  settingsHead.append(settingsTitle, settingsClose);
  const settingsOpen = (): boolean => (hasPopover ? settings.matches(':popover-open') : settings.open);
  const closeSettings = (refocus: boolean): void => {
    if (!settingsOpen()) return;
    if (hasPopover) settings.hidePopover();
    else {
      settings.close();
      bSettings.setAttribute('aria-expanded', 'false');
    }
    if (refocus) bSettings.focus(); // the close button vanishes with the panel: focus goes back to the gear
  };
  settingsClose.addEventListener('click', () => closeSettings(true));
  if (hasPopover) {
    settings.setAttribute('popover', '');
    bSettings.setAttribute('popovertarget', 'settings');
  } else {
    bSettings.setAttribute('aria-expanded', 'false');
    bSettings.addEventListener('click', () => {
      if (settings.open) closeSettings(false);
      else {
        settings.show();
        bSettings.setAttribute('aria-expanded', 'true');
      }
    });
    settings.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSettings(true);
    });
    document.addEventListener('pointerdown', (e) => {
      const target = e.target as Node;
      if (settings.open && !settings.contains(target) && !bSettings.contains(target)) closeSettings(false);
    });
  }
  const schemeSeg = segmented(['light', 'dark', 'system'] as const, (v: SchemeChoice) => setScheme(v));
  const langSelect = el('select');
  for (const l of LANGS) {
    const o = el('option');
    o.value = l;
    o.textContent = l === 'de' ? 'Deutsch' : 'English';
    langSelect.append(o);
  }
  langSelect.addEventListener('change', () => setLang(langSelect.value as (typeof LANGS)[number]));
  const axesSwitch = button('switch', '<span class="knob" aria-hidden="true"></span><span class="switch-text"></span>');
  axesSwitch.setAttribute('role', 'switch');
  axesSwitch.addEventListener('click', () => {
    axes = !axes;
    store('axes', axes ? '1' : '0');
    api.setAxes(axes);
    paint();
  });
  const keysSwitch = button('switch', '<span class="knob" aria-hidden="true"></span><span class="switch-text"></span>');
  keysSwitch.setAttribute('role', 'switch');
  keysSwitch.addEventListener('click', () => {
    shortcuts = !shortcuts;
    store('keys', shortcuts ? '1' : '0');
    api.setShortcuts(shortcuts);
    paint();
  });
  const hlSeg = segmented(['off', 'outline', 'glow'] as const, (v: HighlightMode) => {
    highlight = v;
    store('highlight', v);
    api.setHighlight(v);
    paint();
  });
  const settingRow = (label: HTMLElement, control: HTMLElement): HTMLElement => {
    const row = el('div', 'setting');
    row.append(label, control);
    return row;
  };
  const lScheme = el('span');
  const lLang = el('label');
  langSelect.id = 'lang-select';
  lLang.htmlFor = 'lang-select';
  const lAxes = el('span');
  const lHl = el('span');
  const lKeys = el('span');
  settings.append(
    settingsHead,
    settingRow(lScheme, schemeSeg.wrap),
    settingRow(lLang, langSelect),
    // Axes, highlight and shortcuts act on the 3D view only, so they are left out while the portal shows no instruction.
    ...(opts.entry ? [settingRow(lAxes, axesSwitch), settingRow(lHl, hlSeg.wrap), settingRow(lKeys, keysSwitch)] : []),
  );
  settings.addEventListener('toggle', (e) => {
    bSettings.setAttribute('aria-expanded', String((e as ToggleEvent).newState === 'open'));
  });

  // ------------------------------------------------------------- dialogs
  const help = sheet('help');
  const catalog = sheet('catalog');
  catalog.dialog.classList.add('catalog');
  const fillHelp = (): void => {
    help.body.replaceChildren(
      section('helpOverviewTitle', 'helpOverview'),
      section('helpBuildTitle', 'helpBuild'),
      section('helpViewTitle', 'helpView'),
      section('helpPhoneTitle', 'helpPhone'),
      section('helpSettingsTitle', 'helpSettings'),
      section('helpSoftTitle', 'helpSoft'),
    );
  };
  const openSheet = (s: ReturnType<typeof sheet>, opener: HTMLButtonElement): void => {
    closeSettings(false);
    s.dialog.showModal();
    opener.classList.add('open');
    s.dialog.addEventListener('close', () => opener.classList.remove('open'), { once: true });
  };
  bHelp.addEventListener('click', () => openSheet(help, bHelp));

  // ------------------------------------------------------------- catalog
  // The picker dialog: tabs per category, a filter, and one card per instruction (catalog.ts).
  const catCount = el('span', 'tag');
  catalog.title.after(catCount);
  const catTools = el('div', 'catalog-tools');
  let catTab: 'all' | Category = 'all';
  const catTabs = segmented(['all', ...CATEGORIES] as const, (v) => {
    catTab = v;
    fillCatalog();
  });
  const catFilter = el('input', 'filter');
  catFilter.type = 'search';
  catFilter.addEventListener('input', () => fillCatalog());
  catFilter.addEventListener('keydown', (e) => e.stopPropagation()); // typing is not stepping
  catTools.append(catTabs.wrap, catFilter);
  catalog.body.before(catTools);
  const entryTitle = (e: CatalogEntry): string => t(`cat.${e.key}.title`);
  const matches = (e: CatalogEntry, q: string): boolean =>
    !q || [entryTitle(e), e.code, e.maker, e.series, t(`cat.${e.key}.desc`)].some((v) => v.toLowerCase().includes(q));
  const countText = (n: number): string => (n === 1 ? t('catCountOne') : t('catCountMany', { n }));
  const card = (e: CatalogEntry): HTMLElement => {
    const isOpen = e.id === opts.entry?.id;
    const c = button(isOpen ? 'cat-card open' : 'cat-card');
    if (isOpen) c.setAttribute('aria-current', 'page');
    const head = el('span', 'cat-card-head');
    head.append(el('span', 'tag', e.code));
    if (isOpen) head.append(el('span', 'state', t('catOpened')));
    const title = el('span', 'cat-card-title', entryTitle(e));
    const desc = el('span', 'cat-card-desc', t(`cat.${e.key}.desc`));
    const chips = el('span', 'chips');
    const chipTexts = [e.maker, e.series];
    if (isOpen) chipTexts.push(t('catSteps', { n: totalSteps }), t('catParts', { n: unitParts.reduce((a, b) => a + b, 0) }));
    for (const x of chipTexts) chips.append(el('span', 'tag', x));
    c.append(head, title, desc, chips);
    if (isOpen) {
      const step = units[current]?.step ?? 1;
      const prog = el('span', 'cat-progress');
      const pb = el('span', 'pb');
      const pf = el('i');
      pf.style.width = `${animated ? (progress / animated) * 100 : 0}%`;
      pb.append(pf);
      prog.append(el('span', '', t('catProgress')), pb, el('span', 'mono', `${progress > 0.001 ? step : 0} / ${totalSteps}`));
      c.append(prog);
    }
    c.addEventListener('click', () => (isOpen ? catalog.dialog.close() : openEntry(e)));
    return c;
  };
  function fillCatalog(): void {
    const q = catFilter.value.trim().toLowerCase();
    catTabs.set(catTab);
    const total: Record<string, number> = { all: CATALOG.length };
    for (const c of CATEGORIES) total[c] = CATALOG.filter((e) => e.category === c).length;
    const tabNames: Record<string, string> = { all: t('catAll'), bricks: t('catBricks'), furniture: t('catFurniture') };
    catTabs.items.forEach((b) => (b.textContent = `${tabNames[b.dataset.value ?? '']} (${total[b.dataset.value ?? ''] ?? 0})`));
    catCount.textContent = t('catAvailable', { n: CATALOG.length });
    const parts: HTMLElement[] = [];
    let shown = 0;
    for (const c of CATEGORIES) {
      if (catTab !== 'all' && catTab !== c) continue;
      const inCat = CATALOG.filter((e) => e.category === c);
      const list = inCat.filter((e) => matches(e, q));
      if (q && !list.length) continue; // while filtering, only categories with a hit
      shown += list.length;
      const sec = el('section', 'cat-section');
      const sh = el('div', 'cat-section-head');
      const st = el('div');
      st.append(el('h3', '', tabNames[c]), el('p', '', t(`cat${c === 'bricks' ? 'Bricks' : 'Furniture'}Sub`)));
      sh.append(st, el('span', 'tag', countText(inCat.length)));
      sec.append(sh);
      if (list.length) {
        const grid = el('div', 'cat-grid');
        grid.append(...list.map(card));
        sec.append(grid);
      } else {
        const empty = el('div', 'cat-empty', c === 'bricks' ? ICON.brick : ICON.furniture);
        const txt = el('div');
        txt.append(el('strong', '', t('catSoon')), el('span', '', t('catSoonText')));
        empty.append(txt);
        sec.append(empty);
      }
      parts.push(sec);
    }
    if (q && !shown) parts.push(el('p', 'cat-none', t('catNoMatch', { q: catFilter.value.trim() })));
    catalog.body.replaceChildren(...parts);
  }
  const openCatalog = (): void => {
    fillCatalog();
    openSheet(catalog, bPicker);
  };
  bPicker.addEventListener('click', openCatalog);

  // ---------------------------------------------------------------- rail
  // One toolbar: on wide screens the view tools on the left, on narrow screens one row with the stepping too.
  const rail = el('nav', 'rail');
  rail.setAttribute('role', 'toolbar');
  rail.setAttribute('focusgroup', 'toolbar wrap'); // browsers that know it do the arrow keys themselves
  const tool = (icon: string, cls = ''): HTMLButtonElement => button(`ibtn ${cls}`.trim(), icon);
  const bPrevR = tool(ICON.undo);
  const bNextR = tool(ICON.redo);
  const bIn = tool(ICON.plus);
  const bOut = tool(ICON.minus);
  const bFollow = tool(ICON.focus);
  const bTouch = tool(ICON.hand, 'touch-only');
  const bPan = tool(ICON.move, 'wide-only');
  const bRestartR = tool(ICON.restart);
  const group = (cls: string, ...nodes: HTMLElement[]): HTMLElement => {
    const g = el('div', `grp ${cls}`.trim());
    g.setAttribute('role', 'group');
    g.append(...nodes);
    return g;
  };
  const gNav = group('narrow-only', bPrevR, bNextR);
  const gZoom = group('', bIn, bOut);
  const gView = group('', bFollow, bTouch, bPan);
  const gReset = group('narrow-only', bRestartR);
  rail.append(gNav, gZoom, gView, gReset);

  // aria-disabled instead of disabled: the button keeps the keyboard focus at the first / last part; clicks are ignored.
  const off = (b: HTMLButtonElement): boolean => b.getAttribute('aria-disabled') === 'true';
  const onPrev = (b: HTMLButtonElement) => () => off(b) || api.prev();
  const onNext = (b: HTMLButtonElement) => () => off(b) || api.next();
  bPrevR.addEventListener('click', onPrev(bPrevR));
  bNextR.addEventListener('click', onNext(bNextR));
  bIn.addEventListener('click', () => api.zoom(1 / 1.25));
  bOut.addEventListener('click', () => api.zoom(1.25));
  const toggleFollow = (): void => {
    follow = !follow;
    store('follow', follow ? '1' : '0');
    api.setFollow(follow);
    paint();
  };
  const togglePan = (): void => {
    panMode = !panMode;
    api.setPanMode(panMode);
    paint();
  };
  bFollow.addEventListener('click', toggleFollow);
  bPan.addEventListener('click', togglePan);
  bTouch.addEventListener('click', () => {
    touchRotate = !touchRotate;
    api.setTouchRotate(touchRotate);
    paint();
  });
  bRestartR.addEventListener('click', () => api.restart());

  if (!('focusGroup' in HTMLElement.prototype)) {
    const all = [...rail.querySelectorAll('button')];
    const shown = (): HTMLButtonElement[] => all.filter((b) => b.offsetParent !== null); // some buttons only show on one screen size
    const firstShown = (): void => {
      const s = shown();
      all.forEach((b) => (b.tabIndex = b === s[0] ? 0 : -1));
    };
    firstShown();
    NARROW.addEventListener('change', firstShown);
    rail.addEventListener('focusin', ({ target }) => {
      if (all.includes(target as HTMLButtonElement)) all.forEach((b) => (b.tabIndex = b === target ? 0 : -1));
    });
    rail.addEventListener('keydown', (e) => {
      const items = shown();
      const at = items.indexOf(document.activeElement as HTMLButtonElement);
      if (at < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
      const rtl = getComputedStyle(rail).direction === 'rtl';
      const vertical = rail.getAttribute('aria-orientation') === 'vertical'; // up/down in the side rail, left/right in the row
      const fwd = vertical ? e.key === 'ArrowDown' : e.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
      const back = vertical ? e.key === 'ArrowUp' : e.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
      const to = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : fwd ? (at + 1) % items.length : back ? (at - 1 + items.length) % items.length : -1;
      if (to < 0) return;
      e.preventDefault(); // only for the keys handled here, so Tab keeps working
      items[to].focus();
    });
  }

  // --------------------------------------------------------------- panel
  const panel = el('aside', 'panel');
  const status = el('p', 'sr-only');
  status.setAttribute('role', 'status'); // screen readers hear the part the visitor stops on, nothing more
  let statusTimer = 0;
  let announced = false;
  const panelCap = el('h2', 'cap');
  const stepRow = el('div', 'steprow');
  const stepLabel = el('label', 'step-label');
  const jumpInput = el('input', 'step-field');
  jumpInput.type = 'number';
  jumpInput.min = '1';
  jumpInput.max = String(totalSteps);
  jumpInput.step = '1';
  jumpInput.inputMode = 'numeric';
  jumpInput.id = 'step-field';
  stepLabel.htmlFor = 'step-field';
  const stepOf = el('span', 'step-of');
  const counterInline = el('span', 'counter narrow-only');
  stepRow.append(stepLabel, jumpInput, stepOf, counterInline);
  const goToStep = (): void => {
    const n = Math.round(Number(jumpInput.value));
    if (!Number.isFinite(n)) return;
    const s = Math.min(Math.max(n, 1), totalSteps);
    const first = units.findIndex((u) => u.step >= s);
    if (first < 0) return;
    jumpInput.value = String(s);
    api.goTo(first < startVisible ? 0 : (starts[first] ?? 0) + units[first].span); // land with that step's first part in place
    jumpInput.blur();
  };
  jumpInput.addEventListener('keydown', (e) => {
    e.stopPropagation(); // the arrow keys belong to the field, not to the stepping
    if (e.key === 'Enter') goToStep();
  });
  jumpInput.addEventListener('change', goToStep);
  const segs = el('div', 'segments wide-only');
  segs.setAttribute('aria-hidden', 'true');
  const counter = el('div', 'counter wide-only');
  const name = el('div', 'partname');

  const nav = el('div', 'panel-nav');
  const bNext = button('btn primary', '');
  const bPrev = button('btn link', '');
  const bRestart = button('btn link', '');
  bNext.addEventListener('click', onNext(bNext));
  bPrev.addEventListener('click', onPrev(bPrev));
  bRestart.addEventListener('click', () => api.restart());
  const navRow = el('div', 'nav-row');
  navRow.append(bPrev, el('span', 'vdivider'), bRestart);
  nav.append(bNext, navRow);
  const panelBody = el('div', 'panel-body');
  panelBody.append(panelCap, stepRow, segs, counter, name);
  panel.append(panelBody, nav);

  // ------------------------------------------------------------ timeline
  const timeline = el('div', 'timeline');
  const track = el('div', 'track');
  const fill = el('div', 'fill');
  const thumb = el('div', 'thumb');
  track.append(fill);
  const sectionStarts = new Set(SECTIONS.slice(1).map((s) => s.from));
  for (const s of steps) {
    const first = units.findIndex((u) => u.step === s);
    if (first <= startVisible - 1) continue;
    const tick = el('i', sectionStarts.has(s) ? 'tick major' : 'tick');
    tick.style.left = `${((starts[first] ?? 0) / Math.max(animated, 1)) * 100}%`;
    track.append(tick);
  }
  // A native slider over the bar: click, drag, arrow keys, Home/End and screen readers work without own code.
  const range = el('input');
  range.type = 'range';
  range.min = '0';
  range.max = String(Math.ceil(animated));
  range.step = '1';
  range.value = '0';
  let dragging = false;
  let lastInput = -Infinity;
  range.addEventListener('pointerdown', () => (dragging = true));
  window.addEventListener('pointerup', () => (dragging = false));
  window.addEventListener('pointercancel', () => (dragging = false));
  range.addEventListener('input', () => {
    lastInput = performance.now();
    api.goTo(Number(range.value));
  });
  track.append(thumb, range);
  const labels = el('div', 'sections');
  const sectionLabels = SECTIONS.map((sec, i) => {
    const toStep = (SECTIONS[i + 1]?.from ?? totalSteps + 1) - 1;
    const first = units.findIndex((u) => u.step >= sec.from);
    const at = first <= startVisible - 1 ? 0 : (starts[first] ?? 0) / Math.max(animated, 1);
    const lab = el('span');
    lab.style.left = `${at * 100}%`;
    labels.append(lab);
    return { lab, sec, toStep, first };
  });
  timeline.append(track, labels);

  // ------------------------------------------------------ stage overlay
  const overlay = el('main', 'stage-overlay'); // the stage is the page's main content
  const cards = el('div', 'cards');
  const firstCard = el('div', 'card first-visit');
  const fcIcon = el('span', 'card-icon', ICON.scroll);
  const fcText = el('div');
  const fcTitle = el('strong');
  const fcSub = el('span', 'card-sub');
  fcText.append(fcTitle, fcSub);
  const fcClose = button('ibtn small', ICON.close);
  fcClose.addEventListener('click', () => {
    hintClosed = true;
    paintCards();
  });
  firstCard.append(fcIcon, fcText, fcClose);
  const notice = el('div', 'card notice');
  notice.setAttribute('role', 'status'); // announced by screen readers, without interrupting
  let noticeKey: string | null = null;
  const err = el('div', 'card error');
  err.hidden = true;
  err.setAttribute('role', 'alert'); // an error is announced at once
  cards.append(firstCard, notice, err);
  overlay.append(cards, timeline);

  // --------------------------------------------------------- status bar
  const bar = el('footer', 'statusbar');
  const sRenderer = el('span', 'renderer');
  const sParts = el('span', 'mono');
  const sScroll = el('span');
  const sGrow = el('span', 'grow');
  const sHints = el('span', 'hints');
  // Portal without an instruction: the bar names the catalog instead of the build state (style.scss, .portal-only).
  const sPortal = el('span', 'portal-status');
  bar.append(sPortal, sRenderer, sParts, sScroll, sGrow, sHints);
  let softMode = false;

  root.replaceChildren(top, settings, rail, overlay, panel, bar, help.dialog, catalog.dialog, status);
  // Without an instruction only the portal is shown: header, catalog, help and settings (style.scss hides the build tools).
  root.classList.toggle('portal-only', !opts.entry);
  document.body.classList.toggle('portal-only', !opts.entry);

  // On narrow screens the time line lives in the step block (as in the design), on wide screens on the stage.
  const placeTimeline = (): void => {
    if (NARROW.matches) panelBody.append(timeline);
    else overlay.append(timeline);
    rail.setAttribute('aria-orientation', NARROW.matches ? 'horizontal' : 'vertical');
    rail.setAttribute('focusgroup', NARROW.matches ? 'toolbar wrap' : 'toolbar wrap block'); // block: up/down in the side rail
  };
  NARROW.addEventListener('change', placeTimeline);
  placeTimeline();

  // The stage canvas fills exactly the area the bars leave free; the bars report their size here.
  const fitStage = (): void => {
    if (!top.isConnected) return; // an earlier (error) UI that was replaced
    const css = document.documentElement.style;
    const h = (n: Element): number => Math.round(n.getBoundingClientRect().height);
    const w = (n: Element): number => Math.round(n.getBoundingClientRect().width);
    css.setProperty('--panel-h', `${h(panel)}px`); // the tool row sits on top of the step block
    if (NARROW.matches) {
      css.setProperty('--stage-top', `${h(top)}px`);
      css.setProperty('--stage-left', '0px');
      css.setProperty('--stage-right', '0px');
      css.setProperty('--stage-bottom', `${h(rail) + h(panel)}px`);
    } else {
      css.setProperty('--stage-top', `${h(top)}px`);
      css.setProperty('--stage-left', `${w(rail)}px`);
      css.setProperty('--stage-right', `${w(panel)}px`);
      css.setProperty('--stage-bottom', `${h(bar)}px`);
    }
  };
  const ro = new ResizeObserver(fitStage);
  for (const n of [top, rail, panel, bar]) ro.observe(n, { box: 'border-box' }); // padding counts too
  NARROW.addEventListener('change', fitStage);
  void document.fonts?.ready.then(fitStage); // the bundled fonts change the text height once loaded
  fitStage();

  // --------------------------------------------------------------- paint
  function paintCards(): void {
    firstCard.hidden = hintClosed || progress > 0.05;
    notice.hidden = !noticeKey;
    notice.textContent = noticeKey ? t(noticeKey) : '';
  }

  function paintText(): void {
    document.title = t('pageTitle');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('pageDescription'));
    document.getElementById('stage')?.setAttribute('aria-label', t('canvasLabel'));
    pickerTitle.textContent = opts.entry ? entryTitle(opts.entry) : t('catChoose');
    bPicker.title = bPicker.ariaLabel = opts.entry ? `${t('catChoose')}: ${opts.entry.code} ${entryTitle(opts.entry)}` : t('catChoose');
    bHelp.title = bHelp.ariaLabel = t('help');
    pageHeading.textContent = t('pageTitle');
    catalog.title.textContent = t('catTitle');
    catalog.close.title = catalog.close.ariaLabel = t('close');
    catFilter.placeholder = t('catFilter');
    catFilter.ariaLabel = t('catFilter');
    catTabs.wrap.ariaLabel = t('catTitle');
    if (catalog.dialog.open) fillCatalog();
    bSettings.title = bSettings.ariaLabel = t('settings');
    settingsTitle.textContent = t('settings');
    settingsClose.title = settingsClose.ariaLabel = t('close');
    help.title.textContent = t('help');
    help.close.title = help.close.ariaLabel = t('close');
    fillHelp();

    lScheme.textContent = t('colorScheme');
    schemeSeg.wrap.ariaLabel = t('colorScheme');
    // "System" also says what the system shows right now.
    const sysNow = t(systemIsDark() ? 'schemeNowDark' : 'schemeNowLight');
    const schemeNames: Record<string, string> = { light: t('schemeLight'), dark: t('schemeDark'), system: `${t('schemeSystem')} (${sysNow})` };
    schemeSeg.items.forEach((b) => (b.textContent = schemeNames[b.dataset.value ?? '']));
    schemeSeg.set(getScheme());
    lLang.textContent = t('language');
    langSelect.value = getLang();
    lAxes.textContent = t('axesLabel');
    axesSwitch.ariaLabel = t('axes');
    (axesSwitch.querySelector('.switch-text') as HTMLElement).textContent = axes ? t('on') : t('off');
    lHl.textContent = t('highlight');
    lKeys.textContent = t('keysLabel');
    keysSwitch.ariaLabel = t('keysSwitch');
    (keysSwitch.querySelector('.switch-text') as HTMLElement).textContent = shortcuts ? t('on') : t('off');
    hlSeg.wrap.ariaLabel = t('highlight');
    const hlNames: Record<string, string> = { off: t('highlightOff'), outline: t('highlightOutline'), glow: t('highlightGlow') };
    hlSeg.items.forEach((b) => (b.textContent = hlNames[b.dataset.value ?? '']));

    rail.ariaLabel = t('toolbar');
    gNav.ariaLabel = t('groupNav');
    gZoom.ariaLabel = t('groupZoom');
    gView.ariaLabel = t('groupView');
    gReset.ariaLabel = t('groupReset');
    bPrevR.title = bPrevR.ariaLabel = `${t('prev')} · ←`;
    bNextR.title = bNextR.ariaLabel = `${t('next')} · →`;
    bIn.title = bIn.ariaLabel = `${t('zoomIn')} · +`;
    bOut.title = bOut.ariaLabel = `${t('zoomOut')} · −`;
    bFollow.title = bFollow.ariaLabel = `${t('follow')} · F`;
    bPan.title = bPan.ariaLabel = `${t('panMode')} · V`;
    bTouch.title = bTouch.ariaLabel = t('touchRotate');
    bRestartR.title = bRestartR.ariaLabel = t('restart');

    panelCap.textContent = t('currentStep');
    stepLabel.textContent = t('stepLabel');
    stepOf.textContent = t('stepOf', { total: totalSteps });
    jumpInput.title = t('stepFieldHint');
    jumpInput.ariaLabel = t('jumpTo');
    bNext.innerHTML = `<span>${t('next')}</span>${ICON.redo}`;
    bPrev.innerHTML = `${ICON.undo}<span>${t('prev')}</span>`;
    bRestart.innerHTML = `${ICON.restart}<span>${t('restart')}</span>`;
    range.ariaLabel = t('progress');
    for (const { lab, sec, toStep } of sectionLabels) lab.textContent = `${t(sec.key)} ${sec.from}–${toStep}`;

    fcTitle.textContent = t('firstVisit');
    fcSub.innerHTML = `${t('firstVisitOr')} <kbd>←</kbd> <kbd>→</kbd> · ${t('firstVisitDrag')}`;
    fcClose.title = fcClose.ariaLabel = t('dismiss');

    sRenderer.innerHTML = `<i class="dot" aria-hidden="true"></i>${softMode ? t('rendererSoft') : t('rendererWebgl')}`;
    sScroll.textContent = t('scrollBuilds');
    sPortal.textContent = `${t('catTitle')}: ${t('catAvailable', { n: CATALOG.length })}`;
    sHints.innerHTML =
      `<span><kbd>${t('kbdDrag')}</kbd> ${t('hintRotate')}</span><span><kbd>Alt</kbd> ${t('hintPan')}</span>` +
      `<span><kbd>${t('kbdCtrl')}</kbd> ${t('hintZoom')}</span><span><kbd>← →</kbd> ${t('hintPart')}</span>`;
    paintCards();
  }

  function paintStep(): void {
    const u = units[current];
    if (!u) return;
    const sameStep = units.filter((x) => x.step === u.step);
    const n = sameStep.indexOf(u) + 1;
    if (document.activeElement !== jumpInput) jumpInput.value = String(u.step);
    const count = t('partCounter', { n, count: sameStep.length });
    counter.textContent = count;
    counterInline.textContent = count;
    name.textContent = unitName(u);
    segs.replaceChildren(...sameStep.map((_, i) => el('i', i < n ? 'done' : '')));
    range.setAttribute('aria-valuetext', `${t('step', { step: u.step, total: totalSteps })}, ${count}: ${name.textContent}`);
  }

  function paintParts(): void {
    let built = 0;
    for (let i = 0; i < units.length; i++) if (unitEnds[i] <= progress + 1e-3) built += unitParts[i];
    sParts.textContent = t('partsBuilt', { n: built });
  }

  function paint(): void {
    paintText();
    paintStep();
    paintParts();
    bFollow.setAttribute('aria-pressed', String(follow));
    bPan.setAttribute('aria-pressed', String(panMode));
    bTouch.setAttribute('aria-pressed', String(touchRotate));
    axesSwitch.setAttribute('aria-checked', String(axes));
    keysSwitch.setAttribute('aria-checked', String(shortcuts));
    hlSeg.set(highlight);
  }

  onLangChange(paint);
  onSchemeChange(paintText);
  paint();

  return {
    setCurrent(index: number): void {
      current = index;
      paintStep();
      // The first call is the start position; after that announce the part the visitor stops on.
      if (!announced) {
        announced = true;
        return;
      }
      window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(() => (status.textContent = range.getAttribute('aria-valuetext') ?? ''), 500);
    },
    setProgress(value: number): void {
      progress = value;
      const pct = `${animated ? (value / animated) * 100 : 0}%`;
      fill.style.width = pct;
      thumb.style.left = pct;
      // Follow the scroll position, but not while the visitor drags or has just stepped with the keys.
      if (!dragging && performance.now() - lastInput > 800) range.value = String(Math.round(value));
      const atStart = String(value <= 0.001);
      const atEnd = String(value >= animated - 0.001);
      for (const b of [bPrev, bPrevR]) b.setAttribute('aria-disabled', atStart);
      for (const b of [bNext, bNextR]) b.setAttribute('aria-disabled', atEnd);
      paintParts();
      paintCards();
    },
    setNotice(key: string | null): void {
      noticeKey = key;
      paintCards();
    },
    setSoftMode(on: boolean): void {
      softMode = on;
      paintText();
    },
    /** Height of what covers the bottom of the stage (the time line), so the model stays clear of it. */
    stageCover(): number {
      return NARROW.matches ? 0 : Math.round(timeline.getBoundingClientRect().height) + 16;
    },
    onStageCoverChange(fn: () => void): void {
      new ResizeObserver(fn).observe(timeline);
      NARROW.addEventListener('change', fn);
    },
    toggleFollow,
    togglePan,
    /** Open the dialog "Instructions" (used at start while no instruction is chosen). */
    openCatalog,
    showError(message: string): void {
      err.hidden = false;
      err.textContent = message;
    },
  };
}
