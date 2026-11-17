import type { ReactElement } from 'react';
import { columnName, type Preview } from '../lib/preview';

export function PreviewTable({ preview, label }: { preview: Preview; label: string }): ReactElement {
  const notes = [
    preview.frozenRows ? `${preview.frozenRows} frozen row${preview.frozenRows > 1 ? 's' : ''}` : '',
    preview.autoFilter ? `autofilter ${preview.autoFilter}` : '',
    preview.rightToLeft ? 'right-to-left' : '',
    preview.truncated ? `first ${preview.rows.length} of ${preview.totalRows.toLocaleString('en-US')} rows` : `${preview.totalRows.toLocaleString('en-US')} rows`,
  ].filter(Boolean);
  return (
    <div>
      <p className="hint mb-2">{notes.join(' · ')}. Hover a cell for its number format or formula.</p>
      <div className="max-h-[28rem] overflow-auto rounded-md border border-slate-200 dark:border-slate-800" role="region" aria-label={label} tabIndex={0}>
        <table className="sheet min-w-full border-collapse text-sm" dir={preview.rightToLeft ? 'rtl' : undefined}>
          <caption className="sr-only">{label}</caption>
          <colgroup>
            <col className="w-10" />
            {preview.widths.map((w, i) => (
              <col key={i} style={w ? { width: `${Math.round(w * 0.6)}rem` } : undefined} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <th scope="col">
                <span className="sr-only">Row</span>
              </th>
              {Array.from({ length: preview.columns }, (_, c) => (
                <th key={c} scope="col">
                  {columnName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, r) => (
              <tr key={r} className={r < preview.frozenRows ? 'border-b-2 border-b-emerald-600' : undefined}>
                <th scope="row">{r + 1}</th>
                {row.map((cell, c) =>
                  cell === null ? null : (
                    <td
                      key={c}
                      colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                      rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                      title={cell.title}
                      style={{ fontWeight: cell.bold ? 700 : undefined, background: cell.background, color: cell.color, textAlign: cell.align }}
                    >
                      {cell.text}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
