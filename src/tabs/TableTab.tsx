import { fromTable } from 'javascript-excel/dom';
import { useEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from 'react';
import { exportTable, ExportTableButton, useTableExport, version, type ExportResult } from 'react-data-export';
import { CodePanel } from '../components/CodePanel';
import { Check, SelectField, TextField } from '../components/fields';
import { Metrics, type LastRun } from '../components/Metrics';
import { PreviewTable } from '../components/PreviewTable';
import { generateTableCode, tableSpec, type TableEditorOptions } from '../lib/codegen';
import { describe } from '../lib/errors';
import { formatBytes, formatMs } from '../lib/history';
import { outputName } from '../lib/options';
import { previewOf, type Preview } from '../lib/preview';
import { DemoTable } from './DemoTable';
import type { ExportReport } from './DatasetTab';

const API_NAME = { component: '<ExportTableButton>', hook: 'useTableExport', function: 'exportTable' } as const;

export function TableTab({
  options: t,
  onChange,
  onExported,
  downloadRef,
  theme,
}: {
  options: TableEditorOptions;
  onChange: (next: TableEditorOptions) => void;
  onExported: (r: ExportReport) => void;
  downloadRef: RefObject<HTMLButtonElement | null>;
  theme: string;
}): ReactElement {
  const ref = useRef<HTMLTableElement>(null);
  const set = <K extends keyof TableEditorOptions>(k: K) => (v: TableEditorOptions[K]) => onChange({ ...t, [k]: v });
  const spec = useMemo(() => tableSpec(t), [t]);
  const hook = useTableExport(ref);
  const [built, setBuilt] = useState<{ grid?: Preview; error?: string; ms?: number }>({});
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'done' | 'error'; message: string }>({ kind: 'idle', message: '' });
  const [last, setLast] = useState<LastRun>();
  const file = outputName(t);

  // Preview the sheet fromTable builds from the rendered <table>: the same call the export makes.
  // With computed styles the colours depend on the theme, so it re-runs when the theme changes.
  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    const id = requestAnimationFrame(() => {
      try {
        const t0 = performance.now();
        const { name: _name, filename: _f, format: _fmt, ...read } = spec;
        const sheet = fromTable(table, read);
        setBuilt({ grid: previewOf(sheet), ms: performance.now() - t0 });
      } catch (e) {
        setBuilt({ error: describe(e) });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [spec, theme]);

  const runTimed = async (api: string, start: () => Promise<ExportResult | undefined>) => {
    setStatus({ kind: 'busy', message: 'Exporting…' });
    const t0 = performance.now();
    try {
      const result = await start();
      if (!result) return;
      const ms = performance.now() - t0;
      setLast({ filename: result.filename, bytes: result.blob.size, ms });
      setStatus({ kind: 'done', message: `Saved ${result.filename} (${formatBytes(result.blob.size)}) in ${formatMs(ms)} with ${api}.` });
      onExported({ api, result, rows: built.grid?.totalRows ?? 0, ms });
    } catch (e) {
      setStatus({ kind: 'error', message: `Export failed: ${describe(e)}` });
    }
  };
  const fail = (e: unknown) => setStatus({ kind: 'error', message: `Export failed: ${describe(e)}` });

  const button = (onClick: () => void, busy: boolean) => (
    <button ref={downloadRef} type="button" className="btn-primary" disabled={busy} onClick={onClick}>
      {busy ? 'Exporting…' : `Export ${file}`}
    </button>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="card" aria-labelledby="table-source-title">
          <h2 id="table-source-title" className="card-title">
            The table on the page
          </h2>
          <p className="hint mb-3">
            An ordinary HTML table, exported as rendered: <code>colspan</code>/<code>rowspan</code> become merges, <code>data-type</code>, <code>data-value</code> and{' '}
            <code>data-numfmt</code> give types and formats, rows with <code>data-export-ignore</code> or <code>hidden</code> are skipped, and links are kept.
          </p>
          <div className="overflow-x-auto" role="region" aria-label="The HTML table to export" tabIndex={0}>
            <DemoTable tableRef={ref} />
          </div>
        </section>
        <section className="card" aria-labelledby="table-options-title">
          <h2 id="table-options-title" className="card-title">
            Export options
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Sheet name" value={t.sheetName} onChange={set('sheetName')} />
            <TextField label="File name" value={t.filename} onChange={set('filename')} />
            <SelectField
              label="Format"
              value={t.format}
              onChange={set('format')}
              options={[
                { value: 'xlsx', label: '.xlsx' },
                { value: 'csv', label: '.csv' },
              ]}
            />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Check label="Computed styles" hint="Bold, colours and alignment from the page (they follow the theme)." checked={t.styles} onChange={set('styles')} />
            <Check label="Freeze header rows" checked={t.freezeHeader} onChange={set('freezeHeader')} />
            <Check label="Autofilter" checked={t.autoFilter} onChange={set('autoFilter')} />
            <Check label="Auto column width" checked={t.autoWidth} onChange={set('autoWidth')} />
            <Check label="Include the footer" checked={t.includeFooter} onChange={set('includeFooter')} />
          </div>
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <section className="card flex flex-col gap-3" aria-labelledby="table-export-title">
          <h2 id="table-export-title" className="card-title mb-0">
            Export
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {t.api === 'component' ? (
              <ExportTableButton tableRef={ref} {...spec} onError={fail}>
                {({ run, status: s }) => button(() => void runTimed(API_NAME.component, run), s === 'exporting')}
              </ExportTableButton>
            ) : t.api === 'hook' ? (
              button(() => void runTimed(API_NAME.hook, () => hook.exportTable(spec)), hook.status === 'exporting')
            ) : (
              button(() => void runTimed(API_NAME.function, () => exportTable(ref, spec)), status.kind === 'busy')
            )}
            <span className="hint">
              via <code>{API_NAME[t.api]}</code>
            </span>
          </div>
          <p className={`text-sm ${status.kind === 'error' ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`} role="status">
            {status.message}
          </p>
          <Metrics rows={built.grid?.totalRows ?? 0} columns={built.grid?.columns ?? 0} buildMs={built.ms} last={last} label="Build (fromTable)" />
        </section>
        <section className="card" aria-labelledby="table-preview-title">
          <h2 id="table-preview-title" className="card-title">
            Preview
          </h2>
          {built.error ? (
            <p className="text-sm text-red-700 dark:text-red-400" role="alert">
              {built.error}
            </p>
          ) : built.grid ? (
            <PreviewTable preview={built.grid} label="Preview of the sheet built from the table" />
          ) : null}
        </section>
        <CodePanel kind="table" generated={generateTableCode(t, version)} api={t.api} onApi={set('api')} />
      </div>
    </div>
  );
}
