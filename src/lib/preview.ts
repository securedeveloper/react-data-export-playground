// A generated sheet -> a grid for the HTML preview, with merges as row/col spans
// and values rendered with their number formats (javascript-excel/format).
import { decodeRange, type Cell, type CellInput, type Sheet, type Style } from 'javascript-excel';
import { formatCell } from 'javascript-excel/format';

export interface PreviewCell {
  text: string;
  colSpan: number;
  rowSpan: number;
  bold: boolean;
  /** CSS colour of a solid fill, e.g. "#DDEBF7". */
  background: string | undefined;
  color: string | undefined;
  align: 'left' | 'right' | 'center';
  /** Number format or formula, for the tooltip. */
  title: string | undefined;
}

export interface Preview {
  columns: number;
  rows: Array<Array<PreviewCell | null>>; // null: covered by a merge
  frozenRows: number;
  autoFilter: string | undefined;
  rightToLeft: boolean;
  /** Column widths in characters, when set. */
  widths: Array<number | undefined>;
  totalRows: number;
  truncated: boolean;
}

const isCell = (c: CellInput | undefined): c is Cell =>
  typeof c === 'object' && c !== null && !(c instanceof Date) && !('error' in c) && !('richText' in c);

function hex(color: unknown): string | undefined {
  if (typeof color === 'string') return `#${color.replace(/^#/, '').slice(-6)}`;
  if (color && typeof color === 'object' && 'rgb' in color && typeof color.rgb === 'string') return `#${color.rgb.slice(-6)}`;
  return undefined;
}

function fillColor(style: Style | undefined): string | undefined {
  const fill = style?.fill;
  if (typeof fill === 'string') return hex(fill);
  if (fill && 'pattern' in fill && fill.pattern === 'solid') return hex(fill.fgColor);
  return undefined;
}

/** Relative luminance check: dark fills get light text unless the cell sets its own colour. */
function isDark(css: string): boolean {
  const n = parseInt(css.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

function widthOf(w: unknown): number | undefined {
  if (typeof w === 'number') return w;
  if (w && typeof w === 'object') {
    if ('wch' in w && typeof w.wch === 'number') return w.wch;
    if ('wpx' in w && typeof w.wpx === 'number') return w.wpx / 7;
  }
  return undefined;
}

export function previewOf(sheet: Sheet, maxRows = 200): Preview {
  const rows = sheet.rows.slice(0, maxRows);
  const columns = Math.max(0, ...rows.map((r) => r?.length ?? 0));
  const out: Array<Array<PreviewCell | null>> = rows.map((row) =>
    Array.from({ length: columns }, (_, c): PreviewCell => {
      const input = row?.[c];
      const cell = isCell(input) ? input : undefined;
      const value = cell ? cell.value : input;
      const empty = value === undefined || value === null;
      const style = cell?.style;
      // A date cell without a number format would render as its serial number; preview it as yyyy-mm-dd.
      const dated = value instanceof Date && style?.numFmt === undefined ? { ...cell, value, style: { ...style, numFmt: 'yyyy-mm-dd' } } : input;
      const formatted = empty && !cell?.formula ? undefined : formatCell(dated as CellInput);
      const background = fillColor(style);
      const own = hex(style?.font?.color) ?? (formatted?.color ? hex(formatted.color) : undefined);
      const h = style?.alignment?.horizontal;
      return {
        text: formatted?.text ?? '',
        colSpan: 1,
        rowSpan: 1,
        bold: style?.font?.bold === true,
        background,
        color: own ?? (background ? (isDark(background) ? '#ffffff' : '#1a1a1a') : undefined),
        align: h === 'left' || h === 'right' || h === 'center' ? h : (formatted?.align ?? 'left'),
        title: cell?.formula ? `=${cell.formula}` : style?.numFmt !== undefined ? `Number format: ${String(style.numFmt)}` : undefined,
      };
    }),
  );
  for (const ref of sheet.merges ?? []) {
    const { start, end } = decodeRange(ref);
    const anchor = out[start.row]?.[start.col];
    if (!anchor) continue;
    anchor.rowSpan = Math.min(end.row, out.length - 1) - start.row + 1;
    anchor.colSpan = end.col - start.col + 1;
    for (let r = start.row; r <= end.row && r < out.length; r++) {
      for (let c = start.col; c <= end.col; c++) if (r !== start.row || c !== start.col) out[r]![c] = null;
    }
  }
  const cols = sheet.colProps ?? [];
  return {
    columns,
    rows: out,
    frozenRows: sheet.view?.freeze?.rows ?? 0,
    autoFilter: sheet.autoFilter,
    rightToLeft: sheet.view?.rightToLeft === true,
    widths: Array.from({ length: columns }, (_, c) => widthOf(cols[c]?.width)),
    totalRows: sheet.rows.length,
    truncated: sheet.rows.length > maxRows,
  };
}

/** 0 -> "A", 25 -> "Z", 26 -> "AA". */
export function columnName(c: number): string {
  let s = '';
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
