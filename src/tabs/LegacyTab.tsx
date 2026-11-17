import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ExcelExport, version } from 'react-data-export';
import ReactExport from 'react-data-export/legacy';
import { CopyButton } from '../components/CodePanel';
import { onBlobCreated } from '../lib/capture';
import { compareWorkbooks, type Comparison } from '../lib/compare';
import { describe } from '../lib/errors';
import { formatBytes } from '../lib/history';
import type { ExportReport } from './DatasetTab';

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

interface Employee {
  name: string;
  amount: number;
  sex: string;
  is_married: boolean;
}

const employees: Employee[] = [
  { name: 'Johnson', amount: 30000, sex: 'M', is_married: true },
  { name: 'Monika', amount: 355000, sex: 'F', is_married: false },
  { name: 'John', amount: 250000, sex: 'M', is_married: false },
  { name: 'Josef', amount: 450500, sex: 'M', is_married: true },
];

const leaves = [
  { name: 'Johnson', total: 25, remaining: 16 },
  { name: 'Monika', total: 25, remaining: 7 },
  { name: 'John', total: 25, remaining: 25 },
];

const maritalStatus = (row: Employee) => (row.is_married ? 'Married' : 'Single');

export const LEGACY_CODE = `// 0.x code, running on 1.0 with one import change (deprecated, removed in 2.0)
import ReactExport from 'react-data-export/legacy';

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

export const Download = () => (
  <ExcelFile filename="employees-legacy" element={<button>Download (0.x API)</button>}>
    <ExcelSheet data={employees} name="Employees">
      <ExcelColumn label="Name" value="name" />
      <ExcelColumn label="Wallet Money" value="amount" />
      <ExcelColumn label="Gender" value="sex" />
      <ExcelColumn label="Marital Status" value={(col) => (col.is_married ? 'Married' : 'Single')} />
    </ExcelSheet>
    <ExcelSheet data={leaves} name="Leaves">
      <ExcelColumn label="Name" value="name" />
      <ExcelColumn label="Total Leaves" value="total" />
      <ExcelColumn label="Remaining Leaves" value="remaining" />
    </ExcelSheet>
  </ExcelFile>
);
`;

export const MODERN_CODE = `// 1.0
import { ExcelExport } from 'react-data-export';

export const Download = () => (
  <ExcelExport
    filename="employees"
    workbook={{
      sheets: [
        {
          name: 'Employees',
          columns: [
            { title: 'Name', key: 'name' },
            { title: 'Wallet Money', key: 'amount' },
            { title: 'Gender', key: 'sex' },
            { title: 'Marital Status', value: (row) => (row.is_married ? 'Married' : 'Single') },
          ],
          data: employees,
        },
        {
          name: 'Leaves',
          columns: [
            { title: 'Name', key: 'name' },
            { title: 'Total Leaves', key: 'total' },
            { title: 'Remaining Leaves', key: 'remaining' },
          ],
          data: leaves,
        },
      ],
    }}
  >
    Download (1.0 API)
  </ExcelExport>
);
`;

type Slot = 'legacy' | 'modern';
const MIGRATION_URL = 'https://github.com/securedeveloper/react-data-export/blob/main/docs/migration.md';

function Snippet({ title, code }: { title: string; code: string }): ReactElement {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <CopyButton text={code} label="Copy code" />
      </div>
      <pre className="max-h-[30rem] overflow-auto rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 dark:bg-black" tabIndex={0} aria-label={`${title} code`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function LegacyTab({ onExported }: { onExported: (r: ExportReport) => void }): ReactElement {
  /** Start time of a legacy export whose file has not been seen yet. */
  const pending = useRef<number | null>(null);
  const [busy, setBusy] = useState<Slot | null>(null);
  const [files, setFiles] = useState<Partial<Record<Slot, Blob>>>({});
  const [comparison, setComparison] = useState<{ result?: Comparison; error?: string }>({});
  const report = useRef(onExported);
  useEffect(() => {
    report.current = onExported;
  }, [onExported]);

  // The legacy component has no "return the file" option, so the tab watches the Blob
  // its download hands to URL.createObjectURL. The two buttons are disabled while either
  // export runs, so the only Blob created while the legacy one is pending is its file.
  useEffect(
    () =>
      onBlobCreated((blob) => {
        const t0 = pending.current;
        if (t0 === null) return;
        pending.current = null;
        setBusy(null);
        setFiles((f) => ({ ...f, legacy: blob }));
        report.current({
          api: '<ExcelFile> (legacy)',
          result: { blob, filename: 'employees-legacy.xlsx', format: 'xlsx', warnings: [] },
          rows: employees.length + leaves.length,
          ms: performance.now() - t0,
        });
      }),
    [],
  );

  useEffect(() => {
    const { legacy, modern } = files;
    if (!legacy || !modern) return;
    let live = true;
    void (async () => {
      try {
        const { read } = await import('javascript-excel/read');
        const [a, b] = await Promise.all([read(legacy), read(modern)]);
        if (live) setComparison({ result: compareWorkbooks(a.workbook, b.workbook) });
      } catch (e) {
        if (live) setComparison({ error: describe(e) });
      }
    })();
    return () => {
      live = false;
    };
  }, [files]);

  const armLegacy = () => {
    if (busy) return;
    pending.current = performance.now();
    setBusy('legacy');
    // Give up after a while (an error in the legacy export), so the buttons come back.
    setTimeout(() => {
      if (pending.current !== null && performance.now() - pending.current >= 10000) {
        pending.current = null;
        setBusy(null);
      }
    }, 10000);
  };
  const modernStart = useRef(0);
  const c = comparison.result;

  return (
    <div className="flex flex-col gap-4">
      <section className="card" aria-labelledby="legacy-title">
        <h2 id="legacy-title" className="card-title">
          The 0.x API on 1.0: <code className="normal-case">react-data-export/legacy</code>
        </h2>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p>
              0.x code keeps working on {version} by changing the import to <code>react-data-export/legacy</code>: <code>&lt;ExcelFile&gt;</code>, <code>&lt;ExcelSheet&gt;</code>,{' '}
              <code>&lt;ExcelColumn&gt;</code>, the <code>dataSet</code> shape and xlsx-style styles. It is <strong>deprecated</strong>: supported for all of 1.x and removed in 2.0.
            </p>
          </div>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Headers from <code>&lt;ExcelColumn&gt;</code> are plain in 0.x; the 1.0 API makes them bold.
            </li>
            <li>
              <code>fileExtension</code> becomes <code>format: &apos;xlsx&apos; | &apos;csv&apos;</code>; <code>element</code> becomes children or a render prop.
            </li>
            <li>Dates are written in local time in 1.0; 0.x (and the legacy entry) convert them as UTC.</li>
            <li>
              Styles use javascript-excel keys (<code>font.size</code>, <code>fill: &apos;FF0000&apos;</code>); <code>convertLegacyStyle</code> converts old ones.
            </li>
          </ul>
        </div>
        <p className="mt-3 text-sm">
          <a className="font-medium text-emerald-800 underline dark:text-emerald-300" href={MIGRATION_URL} target="_blank" rel="noreferrer">
            Read the migration guide
          </a>{' '}
          for every 0.x pattern next to its 1.0 code.
        </p>
      </section>

      <section className="card" aria-labelledby="compare-title">
        <h2 id="compare-title" className="card-title">
          Same data, both APIs
        </h2>
        <p className="hint mb-3">Download both files; the playground reads them back with javascript-excel and compares every cell value.</p>
        <div className="flex flex-wrap items-center gap-3">
          <div onClickCapture={armLegacy} className="contents">
            <ExcelFile filename="employees-legacy" element={
                <button type="button" className="btn" disabled={busy !== null}>
                  Download (0.x API)
                </button>
              }>
              <ExcelSheet data={employees} name="Employees">
                <ExcelColumn label="Name" value="name" />
                <ExcelColumn label="Wallet Money" value="amount" />
                <ExcelColumn label="Gender" value="sex" />
                <ExcelColumn label="Marital Status" value={maritalStatus} />
              </ExcelSheet>
              <ExcelSheet data={leaves} name="Leaves">
                <ExcelColumn label="Name" value="name" />
                <ExcelColumn label="Total Leaves" value="total" />
                <ExcelColumn label="Remaining Leaves" value="remaining" />
              </ExcelSheet>
            </ExcelFile>
          </div>
          <ExcelExport
            filename="employees"
            onError={() => setBusy(null)}
            onExported={(result) => {
              setBusy(null);
              setFiles((f) => ({ ...f, modern: result.blob }));
              onExported({ api: '<ExcelExport workbook>', result, rows: employees.length + leaves.length, ms: performance.now() - modernStart.current });
            }}
            workbook={{
              sheets: [
                {
                  name: 'Employees',
                  columns: [
                    { title: 'Name', key: 'name' },
                    { title: 'Wallet Money', key: 'amount' },
                    { title: 'Gender', key: 'sex' },
                    { title: 'Marital Status', value: maritalStatus },
                  ],
                  data: employees,
                },
                {
                  name: 'Leaves',
                  columns: [
                    { title: 'Name', key: 'name' },
                    { title: 'Total Leaves', key: 'total' },
                    { title: 'Remaining Leaves', key: 'remaining' },
                  ],
                  data: leaves,
                },
              ],
            }}
          >
            {({ run, status }) => (
              <button
                type="button"
                className="btn-primary"
                disabled={busy !== null || status === 'exporting'}
                onClick={() => {
                  modernStart.current = performance.now();
                  setBusy('modern');
                  void run();
                }}
              >
                Download (1.0 API)
              </button>
            )}
          </ExcelExport>
        </div>
        <div className="mt-3 text-sm" role="status">
          {comparison.error ? (
            <p className="text-red-700 dark:text-red-400">Could not compare: {comparison.error}</p>
          ) : c ? (
            c.differences.length === 0 && c.sheetNamesMatch ? (
              <p className="font-medium text-emerald-800 dark:text-emerald-300">
                Identical values: {c.cells} cells across {c.sheets.length} sheets ({c.sheets.join(', ')}). Sizes {formatBytes(files.legacy?.size ?? 0)} and {formatBytes(files.modern?.size ?? 0)}; the
                only difference is the bold header in 1.0.
              </p>
            ) : (
              <div>
                <p className="text-amber-800 dark:text-amber-300">{c.differences.length} differing cells.</p>
                <ul className="mt-1 list-disc pl-5">
                  {c.differences.slice(0, 10).map((d) => (
                    <li key={`${d.sheet}!${d.ref}`}>
                      {d.sheet}!{d.ref}: <code>{d.a}</code> vs <code>{d.b}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : (
            <p className="hint">
              {files.legacy ? '0.x file saved. ' : ''}
              {files.modern ? '1.0 file saved. ' : ''}
              {files.legacy && files.modern ? 'Comparing…' : 'Waiting for both files.'}
            </p>
          )}
        </div>
      </section>

      <section className="card grid gap-4 lg:grid-cols-2" aria-label="Code for both APIs">
        <Snippet title="0.x API (react-data-export/legacy)" code={LEGACY_CODE} />
        <Snippet title="1.0 API" code={MODERN_CODE} />
      </section>
    </div>
  );
}
