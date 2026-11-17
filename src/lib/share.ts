// Shareable state: base64url-encoded JSON in the query string (?tab=…&s=…).
export type TabId = 'dataset' | 'table' | 'legacy';
export const TAB_IDS: TabId[] = ['dataset', 'table', 'legacy'];

/** Links longer than this leave the dataset out and keep only the options. */
export const MAX_SHARE_CHARS = 6000;

export function encodeState(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeState(encoded: string): unknown {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return undefined;
  }
}

export interface UrlState {
  tab: TabId;
  state: unknown;
}

export function readUrl(search: string): UrlState {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const s = params.get('s');
  return { tab: TAB_IDS.includes(tab as TabId) ? (tab as TabId) : 'dataset', state: s ? decodeState(s) : undefined };
}

export function buildSearch(tab: TabId, state: unknown): string {
  const params = new URLSearchParams();
  if (tab !== 'dataset') params.set('tab', tab);
  if (state !== undefined) params.set('s', encodeState(state));
  const q = params.toString();
  return q ? `?${q}` : '';
}
