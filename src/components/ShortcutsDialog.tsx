import { useEffect, useRef, type ReactElement } from 'react';
import { SHORTCUTS } from '../lib/shortcuts';


export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="shortcuts-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <h2 id="shortcuts-title" className="mb-3 text-lg font-semibold">
        Keyboard shortcuts
      </h2>
      <p className="hint mb-3">Single-key shortcuts work when the focus is not in a text field.</p>
      <table className="w-full text-sm">
        <tbody>
          {SHORTCUTS.map(([k, d]) => (
            <tr key={k} className="border-t border-slate-200 dark:border-slate-800">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal whitespace-nowrap">
                <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:border-slate-600 dark:bg-slate-800">{k}</kbd>
              </th>
              <td className="py-1.5">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-right">
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
