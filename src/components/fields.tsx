import { useId, type ReactElement, type ReactNode } from 'react';

const slug = (label: ReactNode): string | undefined => (typeof label === 'string' ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : undefined);

export function Check({ label, checked, onChange, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: string }): ReactElement {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <input id={id} name={slug(label)} type="checkbox" className="mt-0.5 size-4 accent-emerald-700" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id} className="text-sm">
        {label}
        {hint ? <span className="hint block">{hint}</span> : null}
      </label>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: (id: string) => ReactNode }): ReactElement {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): ReactElement {
  return <Field label={label}>{(id) => <input id={id} name={slug(label)} className="input" value={value} spellCheck={false} onChange={(e) => onChange(e.target.value)} />}</Field>;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}): ReactElement {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} name={slug(label)} className="input" value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** A small segmented control (radio group). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}): ReactElement {
  const name = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-md border px-2.5 py-1 font-mono text-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald-600 ${
            value === o.value
              ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-700'
              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <input type="radio" className="sr-only" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
