// Recent exports, kept in localStorage. Each entry can restore the settings it was made with.
export interface HistoryEntry {
  id: string;
  at: number;
  tab: 'dataset' | 'table' | 'legacy';
  api: string;
  filename: string;
  bytes: number;
  rows: number;
  /** Milliseconds from click to the download starting. */
  ms: number;
  /** The `?…` query string that restores the settings. */
  search: string;
}

export const HISTORY_KEY = 'rde-pg:history';
export const MAX_HISTORY = 25;

export function loadHistory(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): HistoryEntry[] {
  try {
    const raw = storage?.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed.filter((e) => e && typeof e === 'object' && typeof e.id === 'string') as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[], storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // Storage full or blocked: history is a convenience, so ignore.
  }
}

export function addEntry(entries: HistoryEntry[], entry: Omit<HistoryEntry, 'id' | 'at'>, now = Date.now()): HistoryEntry[] {
  return [{ ...entry, id: `${now}-${Math.random().toString(36).slice(2, 8)}`, at: now }, ...entries].slice(0, MAX_HISTORY);
}

export function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export const formatMs = (ms: number): string => (ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`);
