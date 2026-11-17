import { useRef, useState, type ReactElement, type RefObject } from 'react';
import { MAX_UPLOAD_BYTES } from '../lib/dataset';
import { formatBytes } from '../lib/history';

/** Drag & drop or pick a .csv / .json file. The file is read in the browser; nothing is uploaded. */
export function DropZone({ onFile, inputRef }: { onFile: (name: string, text: string) => void; inputRef?: RefObject<HTMLInputElement | null> }): ReactElement {
  const own = useRef<HTMLInputElement>(null);
  const input = inputRef ?? own;
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');

  const take = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`${file.name} is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`);
      return;
    }
    try {
      onFile(file.name, await file.text());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <div
        className={`flex flex-col items-center gap-1 rounded-lg border-2 border-dashed px-3 py-4 text-center text-sm transition-colors ${
          over ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950' : 'border-slate-300 dark:border-slate-700'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files[0]);
        }}
      >
        <span>Drop a .csv or .json file here</span>
        <button type="button" className="btn mt-1" onClick={() => input.current?.click()}>
          Choose a file
        </button>
        <span className="hint">It stays in your browser. Up to {formatBytes(MAX_UPLOAD_BYTES)}.</span>
        <input
          ref={input}
          type="file"
          name="upload"
          accept=".csv,.tsv,.txt,.json,text/csv,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Upload a .csv or .json dataset"
          onChange={(e) => {
            void take(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
