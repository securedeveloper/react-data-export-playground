import type { ReactElement } from 'react';
import { formatBytes, formatMs, type HistoryEntry } from '../lib/history';

const TAB_LABEL = { dataset: 'Dataset', table: 'Table', legacy: 'Legacy' } as const;

export function HistoryPanel({ entries, onRestore, onClear }: { entries: HistoryEntry[]; onRestore: (e: HistoryEntry) => void; onClear: () => void }): ReactElement {
  return (
    <section className="card" aria-labelledby="history-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="history-title" className="card-title mb-0">
          Recent exports
        </h2>
        {entries.length ? (
          <button type="button" className="btn px-2 py-1 text-xs" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <p className="hint">Your downloads show up here with their timings, saved in this browser only. Restore one to get its settings back.</p>
      ) : (
        <ol className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{e.filename}</div>
                <div className="hint">
                  {TAB_LABEL[e.tab]} · <code>{e.api}</code> · {e.rows.toLocaleString('en-US')} rows · {formatBytes(e.bytes)} · {formatMs(e.ms)} ·{' '}
                  <time dateTime={new Date(e.at).toISOString()}>{new Date(e.at).toLocaleTimeString()}</time>
                </div>
              </div>
              <button type="button" className="btn px-2 py-1 text-xs" onClick={() => onRestore(e)} aria-label={`Restore the settings of ${e.filename}`}>
                Restore
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
