// Light / dark design. Without a choice of the visitor the page follows the system; the settings menu stores
// `light` or `dark`, or removes the choice again with "System".
// The choice lives in <meta name="color-scheme"> (index.html sets it before the first paint); style.scss and
// the 3D scene read it from there.

type Scheme = 'light' | 'dark';

const KEY = 'color-scheme';
const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
const system = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

function read(): Scheme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null; // blocked storage: the choice then holds for this visit only
  }
}

/** The visitor's choice, or null while the page follows the system. */
let override: Scheme | null = read();

function apply(): void {
  if (meta) meta.content = override ?? 'light dark';
  listeners.forEach((fn) => fn());
}

/** True when the page is shown dark right now (own choice first, else the system setting). */
export const isDark = (): boolean => (override ? override === 'dark' : system.matches);

/** What the visitor picked in the settings: a fixed design, or follow the system. */
export type SchemeChoice = Scheme | 'system';

/** True when the system setting is dark (shown next to "System" in the settings). */
export const systemIsDark = (): boolean => system.matches;

export const getScheme = (): SchemeChoice => override ?? 'system';

/** Set the design from the settings menu. `system` removes the stored choice. */
export function setScheme(choice: SchemeChoice): void {
  override = choice === 'system' ? null : choice;
  try {
    if (override) localStorage.setItem(KEY, override);
    else localStorage.removeItem(KEY);
  } catch {
    /* the design still changes, it is just not remembered */
  }
  apply();
}

/** Called when the shown design may have changed: own switch, system setting, or a switch in another tab. */
export function onSchemeChange(fn: () => void): void {
  listeners.add(fn);
}

system.addEventListener('change', () => listeners.forEach((fn) => fn()));
window.addEventListener('storage', (e) => {
  if (e.key !== KEY && e.key !== null) return;
  override = read();
  apply();
});
