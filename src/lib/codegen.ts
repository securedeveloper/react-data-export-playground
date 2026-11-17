// Generates the exact react-data-export code for the current settings. It prints
// the same descriptors (sheetSpec, exportSpec, tableSpec) the playground exports with.
import { exportSpec, outputName, sheetSpec, type ApiStyle, type DatasetEditorOptions } from './options';
import type { JsonDataset } from './samples';

/** Code printed verbatim inside a literal (e.g. a function). */
export class Raw {
  constructor(readonly code: string) {}
}

const IDENT = /^[A-Za-z_$][\w$]*$/;
const MAX_INLINE = 88;

export function quote(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}'`;
}

const key = (k: string): string => (IDENT.test(k) ? k : quote(k));

/** Prints a value as a JavaScript literal, inline when short, otherwise one entry per line. */
export function toJs(value: unknown, indent = 0): string {
  if (value instanceof Raw) return value.code;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const pad = '  '.repeat(indent + 1);
  const end = '  '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => toJs(v, indent + 1));
    const inline = `[${items.join(', ')}]`;
    if (!inline.includes('\n') && inline.length + indent * 2 <= MAX_INLINE) return inline;
    return `[\n${items.map((i) => (i.startsWith('//') ? pad + i : `${pad}${i},`)).join('\n')}\n${end}]`;
  }
  if (typeof value === 'object') {
    // A key starting with '...' is printed as a spread (`...dataset`).
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '{}';
    const items = entries.map(([k, v]) => (k.startsWith('...') ? k : `${key(k)}: ${toJs(v, indent + 1)}`));
    const inline = `{ ${items.join(', ')} }`;
    if (!inline.includes('\n') && inline.length + indent * 2 <= MAX_INLINE) return inline;
    return `{\n${items.map((i) => `${pad}${i},`).join('\n')}\n${end}}`;
  }
  return String(value);
}

/** Inline data up to this many rows; longer data shows the first rows and a comment. */
export const MAX_INLINE_ROWS = 20;
const SHOWN_ROWS = 3;

const comment = (text: string) => new Raw(`// ${text}`);

export const BANDED_ROWS_CODE = "(_row, i) => (i % 2 === 1 ? { fill: 'F2F2F2' } : undefined)";

/** The sheet options of the dataset tab, as printable entries. */
function sheetEntries(o: DatasetEditorOptions): Record<string, unknown> {
  const { bandedRows, ...rest } = sheetSpec(o);
  return bandedRows ? { ...rest, rowStyle: new Raw(BANDED_ROWS_CODE) } : rest;
}

function datasetLiteral(dataset: JsonDataset): string {
  const rows = dataset.data;
  const data =
    rows.length > MAX_INLINE_ROWS ? [...rows.slice(0, SHOWN_ROWS), comment(`…and ${(rows.length - SHOWN_ROWS).toLocaleString('en-US')} more rows`)] : rows;
  return toJs({ columns: dataset.columns, data });
}

function rowType(dataset: JsonDataset): string {
  return Array.isArray(dataset.data[0]) ? 'unknown[]' : 'Record<string, unknown>';
}

/** One JSX attribute: `flag`, `name="text"` or `name={expr}`. */
function attr(name: string, value: unknown, indent: number): string {
  if (value === true) return name;
  if (typeof value === 'string' && !/["{}<>\\\n]/.test(value)) return `${name}="${value}"`;
  return `${name}={${toJs(value, indent)}}`;
}

function jsxAttrs(props: Record<string, unknown>, indent: number): string[] {
  return Object.entries(props)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => attr(k, v, indent));
}

export interface GeneratedCode {
  install: string;
  code: string;
  language: 'tsx' | 'ts';
}

export function installCommand(version: string): string {
  return `npm install react-data-export@${version}`;
}

export function generateDatasetCode(dataset: JsonDataset, o: DatasetEditorOptions, version: string, api: ApiStyle = o.api): GeneratedCode {
  const sheet = sheetEntries(o);
  const exp = exportSpec(o) as Record<string, unknown>;
  const file = outputName(o);
  const decl = `const dataset = ${datasetLiteral(dataset)} satisfies Dataset<${rowType(dataset)}>;`;
  const install = installCommand(version);

  if (api === 'component') {
    // `{ ...dataset, name, ... }`: a key starting with '...' is printed as a spread.
    const props = jsxAttrs({ dataset: { '...dataset': true, ...sheet }, ...exp }, 3);
    const code = [
      "import { ExcelExport, type Dataset } from 'react-data-export';",
      '',
      decl,
      '',
      'export function Download() {',
      '  return (',
      '    <ExcelExport',
      ...props.map((p) => `      ${p}`),
      '    >',
      `      Download ${file}`,
      '    </ExcelExport>',
      '  );',
      '}',
      '',
    ].join('\n');
    return { install, code, language: 'tsx' };
  }

  const options = toJs({ ...sheet, ...exp }, 2);
  if (api === 'hook') {
    const code = [
      "import { useExcelExport, type Dataset } from 'react-data-export';",
      '',
      decl,
      '',
      'export function Download() {',
      '  const { exportDataset, status, progress } = useExcelExport();',
      '  const onClick = () => {',
      `    exportDataset(dataset, ${options}).catch((error) => console.error(error));`,
      '  };',
      '  return (',
      "    <button type=\"button\" onClick={onClick} disabled={status === 'exporting'}>",
      `      {status === 'exporting' ? \`Exporting… \${Math.round((progress?.ratio ?? 0) * 100)}%\` : ${quote(`Download ${file}`)}}`,
      '    </button>',
      '  );',
      '}',
      '',
    ].join('\n');
    return { install, code, language: 'tsx' };
  }

  const code = [
    "import { exportDataset, type Dataset } from 'react-data-export';",
    '',
    decl,
    '',
    '// From any event handler: builds the file and starts the download.',
    `const result = await exportDataset(dataset, ${toJs({ ...sheet, ...exp }, 0)});`,
    'console.log(`Saved ${result.filename} (${result.blob.size} bytes)`);',
    '',
  ].join('\n');
  return { install, code, language: 'ts' };
}

export interface TableEditorOptions {
  sheetName: string;
  filename: string;
  format: 'xlsx' | 'csv';
  styles: boolean;
  freezeHeader: boolean;
  autoFilter: boolean;
  autoWidth: boolean;
  includeFooter: boolean;
  api: ApiStyle;
}

export const DEFAULT_TABLE_OPTIONS: TableEditorOptions = {
  sheetName: 'Orders',
  filename: 'orders',
  format: 'xlsx',
  styles: true,
  freezeHeader: true,
  autoFilter: false,
  autoWidth: true,
  includeFooter: true,
  api: 'component',
};

/** Table export options with only the non-default keys (the same object the export receives). */
export function tableSpec(t: TableEditorOptions): Record<string, unknown> {
  const spec: Record<string, unknown> = {};
  if (t.sheetName !== 'Sheet1') spec.name = t.sheetName;
  Object.assign(spec, exportSpec({ filename: t.filename, format: t.format, csvDelimiter: ',', csvBom: true }));
  if (t.styles) spec.styles = 'computed';
  if (t.freezeHeader) spec.freezeHeader = true;
  if (t.autoFilter) spec.autoFilter = true;
  if (t.autoWidth) spec.autoWidth = true;
  if (!t.includeFooter) spec.includeFooter = false;
  return spec;
}

export function generateTableCode(t: TableEditorOptions, version: string, api: ApiStyle = t.api): GeneratedCode {
  const spec = tableSpec(t);
  const file = outputName({ filename: t.filename, format: t.format });
  const install = installCommand(version);
  const table = ['      <table ref={ref}>', '        {/* <thead>, <tbody>, <tfoot> as you render them */}', '      </table>'];

  if (api === 'component') {
    const props = jsxAttrs({ tableRef: new Raw('ref'), ...spec }, 3);
    const code = [
      "import { useRef } from 'react';",
      "import { ExportTableButton } from 'react-data-export';",
      '',
      'export function Orders() {',
      '  const ref = useRef<HTMLTableElement>(null);',
      '  return (',
      '    <>',
      ...table,
      ...(`      <ExportTableButton ${props.join(' ')}>`.length <= 100 ? [`      <ExportTableButton ${props.join(' ')}>`] : ['      <ExportTableButton', ...props.map((p) => `        ${p}`), '      >']),
      `        Export ${file}`,
      '      </ExportTableButton>',
      '    </>',
      '  );',
      '}',
      '',
    ].join('\n');
    return { install, code, language: 'tsx' };
  }
  if (api === 'hook') {
    const code = [
      "import { useRef } from 'react';",
      "import { useTableExport } from 'react-data-export';",
      '',
      'export function Orders() {',
      '  const ref = useRef<HTMLTableElement>(null);',
      `  const { exportTable, status } = useTableExport(ref, ${toJs(spec, 1)});`,
      '  return (',
      '    <>',
      ...table,
      "      <button type=\"button\" disabled={status === 'exporting'} onClick={() => exportTable().catch(console.error)}>",
      `        Export ${file}`,
      '      </button>',
      '    </>',
      '  );',
      '}',
      '',
    ].join('\n');
    return { install, code, language: 'tsx' };
  }
  const code = [
    "import { exportTable } from 'react-data-export';",
    '',
    "const table = document.querySelector('table')!;",
    `const result = await exportTable(table, ${toJs(spec, 0)});`,
    'console.log(`Saved ${result.filename}`);',
    '',
  ].join('\n');
  return { install, code, language: 'ts' };
}
