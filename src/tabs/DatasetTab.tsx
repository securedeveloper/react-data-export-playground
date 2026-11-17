import { fromDataset, type Sheet } from 'javascript-excel';
import { useDeferredValue, useId, useMemo, useState, type ReactElement, type RefObject } from 'react';
import { ExcelExport, exportDataset, useExcelExport, version, type ExcelWarning, type ExportResult } from 'react-data-export';
import { CodePanel } from '../components/CodePanel';
import { DropZone } from '../components/DropZone';
import { Check, Field, SelectField, TextField } from '../components/fields';
import { Metrics, type LastRun } from '../components/Metrics';
import { PreviewTable } from '../components/PreviewTable';
import { generateDatasetCode, MAX_INLINE_ROWS } from '../lib/codegen';
import { fileToDataset, leafColumns, NUMBER_FORMATS, parseDataset, updateLeafColumn } from '../lib/dataset';
import { describe, isAbort } from '../lib/errors';
import { formatBytes, formatMs } from '../lib/history';
import { exportSpec, HEADER_COLORS, HEADER_FILLS, outputName, sheetOptions, type CsvDelimiter, type DatasetEditorOptions } from '../lib/options';
import { previewOf } from '../lib/preview';
import { EXAMPLES, exampleOptions, SAMPLES, sampleText, type JsonDataset } from '../lib/samples';

export interface DatasetState {
  text: string;
  options: DatasetEditorOptions;
  /** Which sample the text came from, or '' after an upload or an edit. */
  sample: string;
}

export interface ExportReport {
  api: string;
  result: ExportResult;
  rows: number;
  ms: number;
}

const DELIMITERS: ReadonlyArray<{ value: CsvDelimiter; label: string }> = [
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe (|)' },
];


const API_NAME = { component: '<ExcelExport>', hook: 'useExcelExport', function: 'exportDataset' } as const;

export function DatasetTab({
  state,
  onChange,
  onExported,
  uploadRef,
  downloadRef,
}: {
  state: DatasetState;
  onChange: (next: DatasetState) => void;
  onExported: (r: ExportReport) => void;
  uploadRef: RefObject<HTMLInputElement | null>;
  downloadRef: RefObject<HTMLButtonElement | null>;
}): ReactElement {
  const { text, options: o } = state;
  const set = <K extends keyof DatasetEditorOptions>(k: K) => (v: DatasetEditorOptions[K]) => onChange({ ...state, options: { ...o, [k]: v } });
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'done' | 'error'; message: string }>({ kind: 'idle', message: '' });
  const [last, setLast] = useState<LastRun>();
  const [uploadError, setUploadError] = useState('');
  const hook = useExcelExport();
  const ids = { text: useId(), help: useId() };

  const deferredText = useDeferredValue(text);
  const parsed = useMemo(() => parseDataset(deferredText), [deferredText]);
  const leaves = useMemo(() => (parsed.ok ? leafColumns(parsed.dataset) : []), [parsed]);

  // The preview runs the same fromDataset call the export makes, with the same options.
  const built = useMemo((): { sheet?: Sheet; warnings: ExcelWarning[]; error?: string; ms?: number } => {
    if (!parsed.ok) return { warnings: [], error: parsed.message };
    const warnings: ExcelWarning[] = [];
    try {
      const t0 = performance.now();
      const sheet = fromDataset(parsed.dataset, { ...sheetOptions(o), onWarning: (w) => warnings.push(w) });
      return { sheet, warnings, ms: performance.now() - t0 };
    } catch (e) {
      return { warnings, error: describe(e) };
    }
  }, [parsed, o]);
  const preview = useMemo(() => (built.sheet ? previewOf(built.sheet) : undefined), [built.sheet]);

  const generated = useMemo(() => (parsed.ok ? generateDatasetCode(parsed.dataset as JsonDataset, o, version) : undefined), [parsed, o]);
  const rows = parsed.ok ? parsed.dataset.data.length : 0;
  const ready = parsed.ok && !built.error;
  const dataset = parsed.ok ? { ...parsed.dataset, ...sheetOptions(o) } : undefined;
  const exp = exportSpec(o);
  const file = outputName(o);

  const report = (api: string, result: ExportResult, ms: number) => {
    setLast({ filename: result.filename, bytes: result.blob.size, ms });
    setStatus({ kind: 'done', message: `Saved ${result.filename} (${formatBytes(result.blob.size)}) in ${formatMs(ms)} with ${api}.` });
    onExported({ api, result, rows, ms });
  };
  const fail = (e: unknown) => setStatus(isAbort(e) ? { kind: 'idle', message: 'Cancelled.' } : { kind: 'error', message: `Export failed: ${describe(e)}` });

  const runTimed = async (api: string, start: () => Promise<ExportResult | undefined>) => {
    setStatus({ kind: 'busy', message: 'Exporting…' });
    const t0 = performance.now();
    try {
      const result = await start();
      if (result) report(api, result, performance.now() - t0);
    } catch (e) {
      fail(e);
    }
  };

  const buttonLabel = `Download ${file}`;
  const button = (onClick: () => void, busy: boolean) => (
    <button ref={downloadRef} type="button" className="btn-primary" disabled={!ready || busy} onClick={onClick}>
      {busy ? 'Exporting…' : buttonLabel}
    </button>
  );

  const onFile = (name: string, content: string) => {
    setUploadError('');
    try {
      const ds = fileToDataset(name, content);
      const base = name.replace(/\.[^.]+$/, '') || 'export';
      onChange({ text: JSON.stringify(ds, null, 2), sample: '', options: { ...o, filename: base, sheetName: base.slice(0, 31).replace(/[\\/?*[\]:]/g, ' ').trim() || 'Sheet1' } });
    } catch (e) {
      setUploadError(`${name}: ${describe(e)}`);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="card" aria-labelledby="examples-title">
          <h2 id="examples-title" className="card-title">
            Examples
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {EXAMPLES.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="h-full w-full rounded-lg border border-slate-200 p-2.5 text-left hover:border-emerald-600 hover:bg-emerald-50 dark:border-slate-800 dark:hover:bg-emerald-950"
                  onClick={() => onChange({ text: sampleText(e.sample), sample: e.sample, options: { ...exampleOptions(e), api: o.api } })}
                >
                  <span className="block text-sm font-semibold">{e.title}</span>
                  <span className="hint block">{e.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card flex flex-col gap-3" aria-labelledby="data-title">
          <h2 id="data-title" className="card-title mb-0">
            Data
          </h2>
          <Field label="Sample dataset">
            {(id) => (
              <select id={id} name="sample" className="input" value={state.sample} onChange={(e) => onChange({ ...state, text: sampleText(e.target.value), sample: e.target.value })}>
                {state.sample === '' ? <option value="">Your data</option> : null}
                {SAMPLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <DropZone onFile={onFile} inputRef={uploadRef} />
          {uploadError ? (
            <p className="text-sm text-red-700 dark:text-red-400" role="alert">
              {uploadError}
            </p>
          ) : null}
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.text} className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Dataset (JSON)
            </label>
            <textarea
              id={ids.text}
              name="dataset"
              aria-describedby={ids.help}
              rows={16}
              spellCheck={false}
              className="input font-mono text-xs leading-relaxed"
              value={text}
              onChange={(e) => onChange({ ...state, text: e.target.value, sample: '' })}
            />
            <p id={ids.help} className="hint">
              <code>{'{ columns, data }'}</code>. Columns take <code>key</code>, <code>path</code>, <code>index</code>, <code>title</code>, <code>type</code>, <code>numFmt</code>, <code>width</code>,{' '}
              <code>total</code> and <code>children</code> (grouped headers).
            </p>
          </div>
        </section>

        {leaves.length ? (
          <section className="card" aria-labelledby="columns-title">
            <h2 id="columns-title" className="card-title">
              Columns
            </h2>
            <p className="hint mb-2">Width in characters (or auto) and number format per column. Edits update the JSON.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-600 dark:text-slate-400">
                    <th scope="col" className="py-1 pr-2 font-medium">
                      Column
                    </th>
                    <th scope="col" className="py-1 pr-2 font-medium">
                      Width
                    </th>
                    <th scope="col" className="py-1 font-medium">
                      Number format
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((c) => (
                    <tr key={c.index} className="border-t border-slate-200 dark:border-slate-800">
                      <th scope="row" className="max-w-32 truncate py-1.5 pr-2 text-left font-normal">
                        {c.title}
                      </th>
                      <td className="py-1.5 pr-2">
                        <input
                          className="input w-20"
                          aria-label={`Width of ${c.title}`}
                          name={`width-${c.index}`}
                          placeholder="none"
                          list="width-options"
                          defaultValue={c.width}
                          key={`w-${c.index}-${c.width}`}
                          onBlur={(e) => e.target.value !== c.width && onChange({ ...state, sample: '', text: updateLeafColumn(text, c.index, { width: e.target.value.trim() }) })}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      </td>
                      <td className="py-1.5">
                        <select
                          className="input"
                          aria-label={`Number format of ${c.title}`}
                          name={`numfmt-${c.index}`}
                          value={c.numFmt}
                          onChange={(e) => onChange({ ...state, sample: '', text: updateLeafColumn(text, c.index, { numFmt: e.target.value }) })}
                        >
                          {[...NUMBER_FORMATS, ...(NUMBER_FORMATS.some((f) => f.value === c.numFmt) ? [] : [{ value: c.numFmt, label: c.numFmt }])].map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="width-options">
                <option value="auto" />
                <option value="10" />
                <option value="16" />
                <option value="24" />
              </datalist>
            </div>
          </section>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <section className="card" aria-labelledby="options-title">
          <h2 id="options-title" className="card-title">
            Export options
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Sheet name" value={o.sheetName} onChange={set('sheetName')} />
            <TextField label="File name" value={o.filename} onChange={set('filename')} />
            <SelectField
              label="Format"
              value={o.format}
              onChange={set('format')}
              options={[
                { value: 'xlsx', label: '.xlsx' },
                { value: 'csv', label: '.csv' },
              ]}
            />
            <SelectField label="Header fill" value={o.headerFill} onChange={set('headerFill')} options={HEADER_FILLS} />
            <SelectField label="Header text colour" value={o.headerColor} onChange={set('headerColor')} options={HEADER_COLORS} />
            {o.format === 'csv' ? <SelectField label="CSV delimiter" value={o.csvDelimiter} onChange={set('csvDelimiter')} options={DELIMITERS} /> : null}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Check label="Bold header" checked={o.headerBold} onChange={set('headerBold')} />
            <Check label="Freeze header rows" checked={o.freezeHeader} onChange={set('freezeHeader')} />
            <Check label="Autofilter" checked={o.autoFilter} onChange={set('autoFilter')} />
            <Check label="Auto column width" checked={o.autoWidth} onChange={set('autoWidth')} />
            <Check label="Totals row" checked={o.totals} onChange={set('totals')} />
            <Check label="Banded rows" checked={o.bandedRows} onChange={set('bandedRows')} />
            <Check label="Right-to-left" checked={o.rightToLeft} onChange={set('rightToLeft')} />
            {o.format === 'csv' ? <Check label="UTF-8 BOM" checked={o.csvBom} onChange={set('csvBom')} /> : null}
          </div>
          {o.format === 'csv' ? <p className="hint mt-2">CSV keeps the values only: styles, widths, freeze panes and the autofilter apply to .xlsx.</p> : null}
        </section>

        <section className="card flex flex-col gap-3" aria-labelledby="export-title">
          <h2 id="export-title" className="card-title mb-0">
            Export
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {o.api === 'component' ? (
              <ExcelExport dataset={dataset} {...exp} onError={fail}>
                {({ run, status: s }) => button(() => void runTimed(API_NAME.component, run), s === 'exporting')}
              </ExcelExport>
            ) : o.api === 'hook' ? (
              <>
                {button(() => void runTimed(API_NAME.hook, () => hook.exportDataset(parsed.ok ? parsed.dataset : { columns: [], data: [] }, { ...sheetOptions(o), ...exp })), hook.status === 'exporting')}
                {hook.status === 'exporting' ? (
                  <button type="button" className="btn" onClick={() => hook.abort()}>
                    Cancel
                  </button>
                ) : null}
              </>
            ) : (
              button(() => void runTimed(API_NAME.function, () => exportDataset(parsed.ok ? parsed.dataset : { columns: [], data: [] }, { ...sheetOptions(o), ...exp })), status.kind === 'busy')
            )}
            <span className="hint">
              via <code>{API_NAME[o.api]}</code>
            </span>
          </div>
          <p className={`text-sm ${status.kind === 'error' ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`} role="status">
            {hook.status === 'exporting' && o.api === 'hook' ? `Exporting… ${Math.round((hook.progress?.ratio ?? 0) * 100)}%` : status.message}
          </p>
          <Metrics rows={rows} columns={leaves.length} buildMs={built.ms} last={last} />
        </section>

        <section className="card" aria-labelledby="preview-title">
          <h2 id="preview-title" className="card-title">
            Preview
          </h2>
          {built.error ? (
            <p className="text-sm text-red-700 dark:text-red-400" role="alert">
              {built.error}
            </p>
          ) : preview ? (
            <PreviewTable preview={preview} label="Preview of the generated sheet" />
          ) : null}
          {built.warnings.length ? (
            <div className="mt-3">
              <h3 className="text-sm font-semibold">Warnings</h3>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {built.warnings.slice(0, 20).map((w, i) => (
                  <li key={i}>
                    <code>{w.code}</code> {w.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {generated ? (
          <CodePanel
            kind="dataset"
            generated={generated}
            api={o.api}
            onApi={set('api')}
            note={rows > MAX_INLINE_ROWS ? `The data is shortened to its first rows in the code; pass your full array as data.` : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}
