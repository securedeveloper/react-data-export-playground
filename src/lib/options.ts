// Editor state -> what react-data-export receives. The same plain descriptors feed
// the real export and the code generator, so the generated code matches the file.
import type { CsvWriteOptions, DatasetOptions, ExportFormat, ExportOptions, Style } from 'react-data-export';

export type ApiStyle = 'component' | 'hook' | 'function';
export type CsvDelimiter = ',' | ';' | '\t' | '|';

export interface DatasetEditorOptions {
  sheetName: string;
  filename: string;
  format: ExportFormat;
  freezeHeader: boolean;
  autoFilter: boolean;
  autoWidth: boolean;
  rightToLeft: boolean;
  totals: boolean;
  bandedRows: boolean;
  headerBold: boolean;
  /** RRGGBB, or '' for no fill. */
  headerFill: string;
  /** RRGGBB, or '' for the default font colour. */
  headerColor: string;
  csvDelimiter: CsvDelimiter;
  csvBom: boolean;
  api: ApiStyle;
}

export const DEFAULT_OPTIONS: DatasetEditorOptions = {
  sheetName: 'Sales',
  filename: 'sales',
  format: 'xlsx',
  freezeHeader: true,
  autoFilter: true,
  autoWidth: true,
  rightToLeft: false,
  totals: true,
  bandedRows: false,
  headerBold: true,
  headerFill: 'DDEBF7',
  headerColor: '',
  csvDelimiter: ',',
  csvBom: true,
  api: 'component',
};

export const HEADER_FILLS: Array<{ value: string; label: string }> = [
  { value: '', label: 'None' },
  { value: 'DDEBF7', label: 'Light blue' },
  { value: 'E2EFDA', label: 'Light green' },
  { value: 'FCE4D6', label: 'Light orange' },
  { value: '1F4E79', label: 'Dark blue' },
  { value: '047857', label: 'Emerald' },
];

export const HEADER_COLORS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Default' },
  { value: 'FFFFFF', label: 'White' },
  { value: '1F4E79', label: 'Dark blue' },
  { value: 'C00000', label: 'Dark red' },
];

export const BAND_STYLE: Style = { fill: 'F2F2F2' };
export const TOTALS = { label: 'Total', style: { font: { bold: true } } } as const;

/** Sheet options as plain data. `bandedRows` stands for the rowStyle function. */
export interface SheetSpec {
  name: string;
  freezeHeader?: true;
  autoFilter?: true;
  autoWidth?: true;
  rightToLeft?: true;
  headerStyle?: Style;
  totals?: typeof TOTALS;
  bandedRows: boolean;
}

/** The header style, or undefined when it equals javascript-excel's default ({ font: { bold: true } }). */
export function headerStyleOf(o: Pick<DatasetEditorOptions, 'headerBold' | 'headerFill' | 'headerColor'>): Style | undefined {
  if (o.headerBold && !o.headerFill && !o.headerColor) return undefined;
  const font: NonNullable<Style['font']> = { bold: o.headerBold };
  if (o.headerColor) font.color = o.headerColor;
  return { font, ...(o.headerFill ? { fill: o.headerFill } : {}) };
}

export function sheetSpec(o: DatasetEditorOptions): SheetSpec {
  const spec: SheetSpec = { name: o.sheetName, bandedRows: o.bandedRows };
  if (o.freezeHeader) spec.freezeHeader = true;
  if (o.autoFilter) spec.autoFilter = true;
  if (o.autoWidth) spec.autoWidth = true;
  if (o.rightToLeft) spec.rightToLeft = true;
  const headerStyle = headerStyleOf(o);
  if (headerStyle) spec.headerStyle = headerStyle;
  if (o.totals) spec.totals = TOTALS;
  return spec;
}

export const bandedRowStyle = (_row: unknown, i: number): Style | undefined => (i % 2 === 1 ? BAND_STYLE : undefined);

/** The DatasetOptions fromDataset / exportDataset receive. */
export function sheetOptions(o: DatasetEditorOptions): DatasetOptions<unknown> {
  const { bandedRows, ...rest } = sheetSpec(o);
  const options: DatasetOptions<unknown> = { ...rest };
  if (bandedRows) options.rowStyle = bandedRowStyle;
  return options;
}

export const filenameOf = (name: string): string => name.trim() || 'export';

/** Export options with only the keys that differ from react-data-export's defaults. */
export function exportSpec(o: Pick<DatasetEditorOptions, 'filename' | 'format' | 'csvDelimiter' | 'csvBom'>): ExportOptions {
  const spec: ExportOptions = {};
  const filename = filenameOf(o.filename);
  if (filename !== 'export') spec.filename = filename;
  if (o.format === 'csv') {
    spec.format = 'csv';
    const csv: CsvWriteOptions = {};
    if (o.csvDelimiter !== ',') csv.delimiter = o.csvDelimiter;
    if (!o.csvBom) csv.bom = false;
    if (Object.keys(csv).length) spec.csv = csv;
  }
  return spec;
}

/** The file name the export will produce (react-data-export appends the extension unless present). */
export function outputName(o: Pick<DatasetEditorOptions, 'filename' | 'format'>): string {
  const name = filenameOf(o.filename);
  const ext = `.${o.format}`;
  return name.toLowerCase().endsWith(ext) ? name : name + ext;
}

/** Fills in unknown or missing keys from defaults (used for URL and history state). */
export function normalizeOptions(input: unknown): DatasetEditorOptions {
  const out: DatasetEditorOptions = { ...DEFAULT_OPTIONS };
  if (typeof input !== 'object' || input === null) return out;
  const src = input as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_OPTIONS) as Array<keyof DatasetEditorOptions>) {
    const v = src[key];
    if (typeof v === typeof DEFAULT_OPTIONS[key]) (out as unknown as Record<string, unknown>)[key] = v;
  }
  if (out.format !== 'xlsx' && out.format !== 'csv') out.format = 'xlsx';
  if (![',', ';', '\t', '|'].includes(out.csvDelimiter)) out.csvDelimiter = ',';
  if (!['component', 'hook', 'function'].includes(out.api)) out.api = 'component';
  if (!/^([0-9A-Fa-f]{6})?$/.test(out.headerFill)) out.headerFill = '';
  if (!/^([0-9A-Fa-f]{6})?$/.test(out.headerColor)) out.headerColor = '';
  return out;
}
