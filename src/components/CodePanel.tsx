import { useState, type ReactElement } from 'react';
import { API_LABELS, copyText } from '../lib/clipboard';
import type { GeneratedCode } from '../lib/codegen';
import type { ApiStyle } from '../lib/options';
import { Segmented } from './fields';


export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }): ReactElement {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <button
      type="button"
      className="btn px-2 py-1 text-xs"
      onClick={async () => {
        setState((await copyText(text)) ? 'copied' : 'failed');
        setTimeout(() => setState('idle'), 1500);
      }}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Copied to the clipboard' : ''}
      </span>
    </button>
  );
}


export function CodePanel({
  generated,
  api,
  onApi,
  kind,
  note,
}: {
  generated: GeneratedCode;
  api: ApiStyle;
  onApi: (api: ApiStyle) => void;
  kind: 'dataset' | 'table';
  note?: string | undefined;
}): ReactElement {
  return (
    <section className="card" aria-labelledby={`code-${kind}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`code-${kind}`} className="card-title mb-0">
          Code
        </h2>
        <Segmented label="API" value={api} options={API_LABELS[kind]} onChange={onApi} />
      </div>
      <p className="hint mb-2">The exact code for the current settings. The Download button above runs the same API.</p>
      <div className="mb-3 flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-800">
        <code className="flex-1 overflow-x-auto text-xs whitespace-nowrap">{generated.install}</code>
        <CopyButton text={generated.install} />
      </div>
      <div className="relative">
        <div className="absolute top-2 right-2">
          <CopyButton text={generated.code} label="Copy code" />
        </div>
        <pre className="max-h-[32rem] overflow-auto rounded-md bg-slate-900 p-3 pr-24 text-xs leading-relaxed text-slate-100 dark:bg-black" tabIndex={0} aria-label="Generated code">
          <code>{generated.code}</code>
        </pre>
      </div>
      {note ? <p className="hint mt-2">{note}</p> : null}
    </section>
  );
}
