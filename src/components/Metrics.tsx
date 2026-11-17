import type { ReactElement } from 'react';
import { formatBytes, formatMs } from '../lib/history';

export interface LastRun {
  filename: string;
  bytes: number;
  ms: number;
}

export function Metrics({
  rows,
  columns,
  buildMs,
  last,
  label = 'Build (fromDataset)',
}: {
  rows: number;
  columns: number;
  buildMs: number | undefined;
  last: LastRun | undefined;
  label?: string;
}): ReactElement {
  const items: Array<[string, string]> = [
    ['Rows', rows.toLocaleString('en-US')],
    ['Columns', String(columns)],
    [label, buildMs === undefined ? '–' : formatMs(buildMs)],
    ['Last export', last ? formatMs(last.ms) : '–'],
    ['File size', last ? formatBytes(last.bytes) : '–'],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Performance">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-md bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
          <dt className="hint">{k}</dt>
          <dd className="font-mono text-sm font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
