// Compares two xlsx files cell by cell (values), after reading them back with javascript-excel.
import type { Cell, Workbook } from 'javascript-excel';

export interface Difference {
  sheet: string;
  ref: string;
  a: string;
  b: string;
}

export interface Comparison {
  sheets: string[];
  cells: number;
  differences: Difference[];
  sheetNamesMatch: boolean;
}

function text(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && 'richText' in (v as object)) return ((v as { richText: Array<{ text: string }> }).richText ?? []).map((r) => r.text).join('');
  return String(v);
}

function colName(c: number): string {
  let s = '';
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export function compareWorkbooks(a: Workbook<Cell>, b: Workbook<Cell>): Comparison {
  const differences: Difference[] = [];
  let cells = 0;
  const names = a.sheets.map((s) => s.name);
  const sheetNamesMatch = names.join('\u0000') === b.sheets.map((s) => s.name).join('\u0000');
  a.sheets.forEach((sa, i) => {
    const sb = b.sheets[i];
    const rows = Math.max(sa.rows.length, sb?.rows.length ?? 0);
    for (let r = 0; r < rows; r++) {
      const ra = sa.rows[r] ?? [];
      const rb = sb?.rows[r] ?? [];
      for (let c = 0; c < Math.max(ra.length, rb.length); c++) {
        const va = text(ra[c]?.value);
        const vb = text(rb[c]?.value);
        if (va === '' && vb === '') continue;
        cells++;
        if (va !== vb) differences.push({ sheet: sa.name, ref: `${colName(c)}${r + 1}`, a: va, b: vb });
      }
    }
  });
  return { sheets: names, cells, differences, sheetNamesMatch };
}
