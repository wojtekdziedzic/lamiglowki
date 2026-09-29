const LEVEL_KEY = 'ballsort.level';
const MUTED_KEY = 'ballsort.muted';

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

export function loadLevel(): number {
  const v = parseInt(read(LEVEL_KEY) ?? '', 10);
  return Number.isFinite(v) && v > 0 ? v : 1;
}
export const saveLevel = (v: number): void => write(LEVEL_KEY, String(v));

export const loadMuted = (): boolean => read(MUTED_KEY) === '1';
export const saveMuted = (v: boolean): void => write(MUTED_KEY, v ? '1' : '0');
