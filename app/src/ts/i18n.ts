import { de } from './locales/de.ts';
import { en } from './locales/en.ts';

export type Lang = 'en' | 'de';
export const LANGS: readonly Lang[] = ['en', 'de'];

const dicts: Record<Lang, Record<string, string>> = { en, de };
const listeners = new Set<() => void>();

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode or blocked storage
  }
}

export function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* the page works without it */
  }
}

function detect(): Lang {
  const saved = stored('lang');
  if (saved === 'en' || saved === 'de') return saved;
  return (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
}

let lang: Lang = detect();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

export const getLang = (): Lang => lang;

export function setLang(next: Lang): void {
  lang = next;
  document.documentElement.lang = next;
  store('lang', next);
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void): void {
  listeners.add(fn);
}

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const raw = dicts[lang][key] ?? dicts.en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export const partName = (id: string): string => t(`part.${id}`);
