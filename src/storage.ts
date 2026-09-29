const MUTED_KEY = 'ballsort.muted';

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}
function remove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}

// Ball sort keeps its original key so existing progress survives the move to a collection.
const levelKey = (game: string) => `${game}.level`;

export function loadLevel(game: string): number {
  const v = parseInt(read(levelKey(game)) ?? '', 10);
  return Number.isFinite(v) && v > 0 ? v : 1;
}
export const saveLevel = (game: string, v: number): void => write(levelKey(game), String(v));

export function loadJSON<T>(key: string): T | null {
  const raw = read(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
export const saveJSON = (key: string, value: unknown): void => write(key, JSON.stringify(value));
export const clearKey = remove;

export const loadMuted = (): boolean => read(MUTED_KEY) === '1';
export const saveMuted = (v: boolean): void => write(MUTED_KEY, v ? '1' : '0');
