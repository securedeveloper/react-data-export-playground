// Parsing the editor's JSON, turning uploaded .csv / .json files into a dataset,
// and editing leaf-column options (width, number format) in place.
import { parseCsv } from 'javascript-excel/csv';
import type { Dataset } from 'react-data-export';
import type { JsonDataset } from './samples';

export type ParseResult = { ok: true; dataset: Dataset<unknown> } | { ok: false; message: string };

/** Parses the editor's JSON. The column shape itself is checked by fromDataset. */
export function parseDataset(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    return { ok: false, message: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (typeof value !== 'object' || value === null || !Array.isArray((value as { columns?: unknown }).columns) || !Array.isArray((value as { data?: unknown }).data)) {
    return { ok: false, message: 'Expected an object with a columns array and a data array: { columns, data }.' };
  }
  return { ok: true, dataset: value as Dataset<unknown> };
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_INFER_ROWS = 100;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Column definitions for an array of objects: every key seen in the first rows, in order. */
function columnsFromObjects(rows: unknown[]): JsonDataset['columns'] {
  const keys: string[] = [];
  for (const row of rows.slice(0, MAX_INFER_ROWS)) {
    if (!isRecord(row)) continue;
    for (const k of Object.keys(row)) if (!keys.includes(k)) keys.push(k);
  }
  return keys.map((k) => ({ title: k, key: k }));
}

/**
 * Turns an uploaded file into a dataset.
 * - .json: `{ columns, data }` as is, an array of objects (columns from the keys) or an array of arrays (first row = titles).
 * - .csv: the first row gives the titles; numbers, booleans and ISO dates are inferred.
 */
export function fileToDataset(name: string, text: string): JsonDataset {
  const lower = name.toLowerCase();
  if (lower.endsWith('.json')) {
    const value: unknown = JSON.parse(text);
    if (isRecord(value) && Array.isArray(value.columns) && Array.isArray(value.data)) return { columns: value.columns, data: value.data };
    if (Array.isArray(value) && value.every(isRecord)) return { columns: columnsFromObjects(value), data: value };
    if (Array.isArray(value) && value.every(Array.isArray)) {
      const [head = [], ...rows] = value as unknown[][];
      return { columns: head.map((t, index) => ({ title: String(t ?? ''), index })), data: rows };
    }
    throw new Error('The JSON file must hold { columns, data }, an array of objects or an array of arrays.');
  }
  if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
    const { rows } = parseCsv(text, { inferTypes: true, skipEmptyLines: true });
    const [head = [], ...body] = rows;
    const titles = head.map((t, i) => (t === null || t === undefined || String(t).trim() === '' ? `Column ${i + 1}` : String(t)));
    const unique = titles.map((t, i) => (titles.indexOf(t) === i ? t : `${t} (${i + 1})`));
    const data = body.map((r) => Object.fromEntries(unique.map((k, i) => [k, toJsonValue(r[i])])));
    const columns = unique.map((k, i) => {
      const dated = body.slice(0, MAX_INFER_ROWS).some((r) => r[i] instanceof Date);
      return dated ? { title: k, key: k, type: 'date', numFmt: 'yyyy-mm-dd' } : { title: k, key: k };
    });
    return { columns, data };
  }
  throw new Error('Upload a .csv or .json file.');
}

/** CSV cells as JSON values: inferred dates become local yyyy-mm-dd (with time when it has one). */
function toJsonValue(v: unknown): unknown {
  if (!(v instanceof Date)) return v ?? null;
  const p = (n: number) => String(n).padStart(2, '0');
  const day = `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  const time = v.getHours() || v.getMinutes() || v.getSeconds() ? `T${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}` : '';
  return day + time;
}

export interface LeafInfo {
  /** Position among leaf columns, depth first. */
  index: number;
  title: string;
  width: string;
  numFmt: string;
}

const isGroup = (c: unknown): c is { children: unknown[] } => isRecord(c) && Array.isArray(c.children);

function walkLeaves(columns: unknown[], visit: (col: Record<string, unknown>) => void): void {
  for (const c of columns) {
    if (isGroup(c)) walkLeaves(c.children, visit);
    else if (isRecord(c)) visit(c);
  }
}

/** Width as the editor shows it: '' (none), 'auto' or a number of characters. */
function widthText(w: unknown): string {
  if (w === 'auto') return 'auto';
  if (typeof w === 'number') return String(w);
  if (isRecord(w) && typeof w.wch === 'number') return String(w.wch);
  return '';
}

export function leafColumns(dataset: Dataset<unknown>): LeafInfo[] {
  const out: LeafInfo[] = [];
  walkLeaves(dataset.columns as unknown[], (c) => {
    const title = typeof c.title === 'string' ? c.title : String(c.key ?? c.path ?? `#${out.length + 1}`);
    out.push({ index: out.length, title, width: widthText(c.width), numFmt: typeof c.numFmt === 'string' ? c.numFmt : '' });
  });
  return out;
}

/** Returns the editor text with one leaf column's width or number format changed ('' removes it). */
export function updateLeafColumn(text: string, index: number, patch: { width?: string; numFmt?: string }): string {
  const value = JSON.parse(text) as { columns: unknown[] };
  let i = 0;
  walkLeaves(value.columns, (c) => {
    if (i++ !== index) return;
    if (patch.width !== undefined) {
      const n = Number(patch.width);
      if (patch.width === '') delete c.width;
      else if (patch.width === 'auto') c.width = 'auto';
      else if (Number.isFinite(n) && n > 0) c.width = { wch: n };
    }
    if (patch.numFmt !== undefined) {
      if (patch.numFmt === '') delete c.numFmt;
      else c.numFmt = patch.numFmt;
    }
  });
  return JSON.stringify(value, null, 2);
}

export const NUMBER_FORMATS: Array<{ value: string; label: string }> = [
  { value: '', label: 'General' },
  { value: '0', label: '0' },
  { value: '#,##0', label: '#,##0' },
  { value: '#,##0.00', label: '#,##0.00' },
  { value: '0.0%', label: '0.0%' },
  { value: '"$"#,##0', label: '"$"#,##0' },
  { value: '"€"#,##0.00', label: '"€"#,##0.00' },
  { value: 'yyyy-mm-dd', label: 'yyyy-mm-dd' },
  { value: 'd mmm yyyy', label: 'd mmm yyyy' },
  { value: '@', label: 'Text (@)' },
];
