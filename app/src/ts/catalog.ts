// The instructions of the portal. One entry per instruction; the picker dialog in the header lists them by category.
// A new instruction = a new entry here (+ its texts `cat.<key>.*` in locales/*.ts) and its model data
// (instructions/<id>/model.json, imported here and returned by `load`).

/** Categories of the picker, in this order. Generic names on purpose (no trademarks as category names). */
export const CATEGORIES = ['bricks', 'furniture'] as const;
export type Category = (typeof CATEGORIES)[number];

/** A section of the time line: its label (locale key) and the first step it covers; the last runs to the end. */
export interface Section {
  key: string;
  from: number;
}

export interface CatalogEntry {
  /** Used in the address: ?anleitung=<id>. */
  id: string;
  category: Category;
  /** Set or article number as printed on the box / booklet. */
  code: string;
  maker: string;
  series: string;
  /** Locale prefix: `cat.<key>.title`, `cat.<key>.desc`. */
  key: string;
  /** Sections of the booklet shown on the time line (optional). */
  sections?: Section[];
  /** The model data (validated by model.ts after loading). */
  load(): Promise<unknown>;
}

export const CATALOG: CatalogEntry[] = [];

/** The instruction named in the address, or the first one; null while the portal has none. */
export function entryFromUrl(): CatalogEntry | null {
  const id = new URLSearchParams(location.search).get('anleitung');
  return CATALOG.find((e) => e.id === id) ?? CATALOG[0] ?? null;
}

/** Open another instruction (a new page load, so every module starts clean). */
export function openEntry(entry: CatalogEntry): void {
  const url = new URL(location.href);
  url.searchParams.set('anleitung', entry.id);
  location.assign(url);
}
