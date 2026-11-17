import { describe, expect, it } from 'vitest';
import { DEFAULT_TABLE_OPTIONS, generateDatasetCode, generateTableCode, MAX_INLINE_ROWS, tableSpec, toJs } from '../src/lib/codegen';
import { DEFAULT_OPTIONS, exportSpec, sheetOptions, type DatasetEditorOptions } from '../src/lib/options';
import { ordersDataset, SAMPLES } from '../src/lib/samples';

const sales = SAMPLES[0]!.dataset;
const V = '1.0.0-alpha.2';

/** Evaluates the options object literal the `exportDataset` snippet passes. */
function optionsOf(code: string): Record<string, unknown> {
  const start = code.indexOf('exportDataset(dataset, ') + 'exportDataset(dataset, '.length;
  const end = code.indexOf(');\n', start);
  return new Function(`return (${code.slice(start, end)});`)() as Record<string, unknown>;
}

describe('toJs', () => {
  it('prints readable literals: bare keys, single quotes, spreads, short objects inline', () => {
    expect(toJs({ title: 'Name', key: 'name', 'a-b': "it's" })).toBe("{ title: 'Name', key: 'name', 'a-b': 'it\\'s' }");
    expect(toJs({ '...dataset': true, name: 'Sales' })).toBe("{ ...dataset, name: 'Sales' }");
    const long = toJs({ columns: [{ title: 'A really long column title', key: 'a' }, { title: 'Another long column title', key: 'b' }] });
    expect(long.split('\n')).toHaveLength(6);
  });
});

describe('generateDatasetCode', () => {
  it('passes exactly the options the playground exports with', () => {
    const variants: DatasetEditorOptions[] = [
      DEFAULT_OPTIONS,
      { ...DEFAULT_OPTIONS, format: 'csv', csvDelimiter: ';', csvBom: false, totals: false, headerFill: '', headerColor: 'FFFFFF' },
      { ...DEFAULT_OPTIONS, freezeHeader: false, autoFilter: false, autoWidth: false, rightToLeft: true, headerBold: false, filename: '  ' },
    ];
    for (const o of variants) {
      const printed = optionsOf(generateDatasetCode(sales, o, V, 'function').code);
      expect(printed).toEqual({ ...sheetOptions(o), ...exportSpec(o) });
    }
  });

  it('prints banded rows as a rowStyle function that behaves like the real one', () => {
    const o = { ...DEFAULT_OPTIONS, bandedRows: true };
    const printed = optionsOf(generateDatasetCode(sales, o, V, 'function').code);
    const real = sheetOptions(o).rowStyle!;
    const fn = printed.rowStyle as typeof real;
    expect([0, 1, 2, 3].map((i) => fn({}, i))).toEqual([0, 1, 2, 3].map((i) => real({}, i)));
  });

  it('emits a component, a hook and a function variant with install instructions', () => {
    const c = generateDatasetCode(sales, { ...DEFAULT_OPTIONS, format: 'csv', csvDelimiter: ';' }, V, 'component');
    expect(c.install).toBe('npm install react-data-export@1.0.0-alpha.2');
    expect(c.code).toContain("import { ExcelExport, type Dataset } from 'react-data-export';");
    expect(c.code).toContain('satisfies Dataset<Record<string, unknown>>;');
    expect(c.code).toMatch(/dataset=\{\{\n\s+\.\.\.dataset,\n\s+name: 'Sales',/);
    expect(c.code).toContain('filename="sales"');
    expect(c.code).toContain('format="csv"');
    expect(c.code).toContain("csv={{ delimiter: ';' }}");
    expect(c.code).toContain('Download sales.csv');

    const h = generateDatasetCode(sales, DEFAULT_OPTIONS, V, 'hook').code;
    expect(h).toContain('const { exportDataset, status, progress } = useExcelExport();');
    expect(h).toContain("'Download sales.xlsx'");
    expect(h).not.toContain('format');
  });

  it('shortens long data in the snippet and keeps it valid', () => {
    const big = ordersDataset(MAX_INLINE_ROWS + 30);
    const code = generateDatasetCode(big, DEFAULT_OPTIONS, V, 'function').code;
    expect(code).toContain('// …and 47 more rows');
    const literal = code.slice(code.indexOf('const dataset = ') + 16, code.indexOf(' satisfies'));
    const ds = new Function(`return (${literal});`)() as { data: unknown[] };
    expect(ds.data).toHaveLength(3);
  });
});

describe('generateTableCode', () => {
  it('prints the table options as JSX props and as a hook argument', () => {
    const c = generateTableCode(DEFAULT_TABLE_OPTIONS, V, 'component').code;
    expect(c).toContain(['<ExportTableButton', 'tableRef={ref}', 'name="Orders"', 'filename="orders"', 'styles="computed"', 'freezeHeader', 'autoWidth', '>'].join('\n        ').replace('\n        >', '\n      >'));
    const short = generateTableCode({ ...DEFAULT_TABLE_OPTIONS, styles: false, autoWidth: false, freezeHeader: false }, V, 'component').code;
    expect(short).toContain('<ExportTableButton tableRef={ref} name="Orders" filename="orders">');
    const h = generateTableCode({ ...DEFAULT_TABLE_OPTIONS, format: 'csv', includeFooter: false }, V, 'hook').code;
    expect(h).toContain(`useTableExport(ref, ${toJs(tableSpec({ ...DEFAULT_TABLE_OPTIONS, format: 'csv', includeFooter: false }), 1)})`);
    expect(h).toContain("format: 'csv'");
    expect(h).toContain('includeFooter: false');
  });
});
