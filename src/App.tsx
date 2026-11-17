import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { version } from 'react-data-export';
import { copyText } from './lib/clipboard';
import { HistoryPanel } from './components/HistoryPanel';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { DEFAULT_TABLE_OPTIONS, generateDatasetCode, generateTableCode, type TableEditorOptions } from './lib/codegen';
import { parseDataset } from './lib/dataset';
import { addEntry, loadHistory, safeStorage, saveHistory, type HistoryEntry } from './lib/history';
import { DEFAULT_OPTIONS, normalizeOptions } from './lib/options';
import { SAMPLES, sampleText, type JsonDataset } from './lib/samples';
import { buildSearch, MAX_SHARE_CHARS, readUrl, TAB_IDS, type TabId } from './lib/share';
import { DatasetTab, type DatasetState, type ExportReport } from './tabs/DatasetTab';
import { TableTab } from './tabs/TableTab';

const LegacyTab = lazy(() => import('./tabs/LegacyTab'));

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'dataset', label: 'Dataset' },
  { id: 'table', label: 'HTML table' },
  { id: 'legacy', label: 'Legacy (0.x)' },
];

const LINKS = {
  github: 'https://github.com/securedeveloper/react-data-export',
  npm: `https://www.npmjs.com/package/react-data-export/v/${version}`,
  docs: 'https://github.com/securedeveloper/react-data-export/blob/main/docs/api.md',
  source: 'https://github.com/securedeveloper/react-data-export-playground',
};

type Theme = 'light' | 'dark';
const THEME_KEY = 'rde-pg:theme';

interface Shared {
  /** Dataset tab: options, plus the sample id or the dataset itself. */
  o?: unknown;
  sm?: string;
  d?: unknown;
  /** Table tab options. */
  t?: unknown;
}

function initialDataset(shared: Shared | undefined): DatasetState {
  const options = shared?.o ? normalizeOptions(shared.o) : DEFAULT_OPTIONS;
  if (shared?.sm && SAMPLES.some((s) => s.id === shared.sm)) return { text: sampleText(shared.sm), sample: shared.sm, options };
  if (shared?.d && typeof shared.d === 'object') return { text: JSON.stringify(shared.d, null, 2), sample: '', options };
  return { text: sampleText('sales'), sample: 'sales', options };
}

function initialTable(shared: Shared | undefined): TableEditorOptions {
  const t = shared?.t;
  if (!t || typeof t !== 'object') return DEFAULT_TABLE_OPTIONS;
  const out = { ...DEFAULT_TABLE_OPTIONS };
  for (const k of Object.keys(out) as Array<keyof TableEditorOptions>) {
    const v = (t as Record<string, unknown>)[k];
    if (typeof v === typeof out[k]) (out as Record<string, unknown>)[k] = v;
  }
  if (out.format !== 'xlsx' && out.format !== 'csv') out.format = 'xlsx';
  if (!['component', 'hook', 'function'].includes(out.api)) out.api = 'component';
  return out;
}

/** The keys of `value` that differ from `defaults` (links only carry what was changed). */
function changed<T extends object>(value: T, defaults: T): Partial<T> | undefined {
  const out = Object.fromEntries(Object.entries(value).filter(([k, v]) => defaults[k as keyof T] !== v)) as Partial<T>;
  return Object.keys(out).length ? out : undefined;
}

/** What goes in the link for the current tab. Large uploaded datasets are left out. */
function sharedState(tab: TabId, ds: DatasetState, table: TableEditorOptions): { search: string; partial: boolean } {
  if (tab === 'legacy') return { search: buildSearch(tab, undefined), partial: false };
  if (tab === 'table') {
    const t = changed(table, DEFAULT_TABLE_OPTIONS);
    return { search: buildSearch(tab, t ? { t } : undefined), partial: false };
  }
  const o = changed(ds.options, DEFAULT_OPTIONS);
  if (ds.sample) return { search: buildSearch(tab, o || ds.sample !== 'sales' ? { o, sm: ds.sample === 'sales' ? undefined : ds.sample } : undefined), partial: false };
  const parsed = parseDataset(ds.text);
  if (parsed.ok) {
    const full = buildSearch(tab, { o, d: parsed.dataset });
    if (full.length <= MAX_SHARE_CHARS) return { search: full, partial: false };
  }
  return { search: buildSearch(tab, { o }), partial: true };
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return target.isContentEditable || tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && !['checkbox', 'radio', 'button'].includes((target as HTMLInputElement).type));
}

export function App(): ReactElement {
  const [initial] = useState(() => readUrl(typeof location === 'undefined' ? '' : location.search));
  const [tab, setTab] = useState<TabId>(initial.tab);
  const [ds, setDs] = useState<DatasetState>(() => initialDataset(initial.state as Shared | undefined));
  const [table, setTable] = useState<TableEditorOptions>(() => initialTable(initial.state as Shared | undefined));
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [theme, setTheme] = useState<Theme>(() => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const [help, setHelp] = useState(false);
  const [announce, setAnnounce] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);

  const share = sharedState(tab, ds, table);

  // Keep the address bar in sync, so the current settings can be shared.
  useEffect(() => {
    const id = setTimeout(() => {
      if (location.search !== share.search) replaceUrl(share.search);
    }, 250);
    return () => clearTimeout(id);
  }, [share.search]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    try {
      safeStorage()?.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const onExported = useCallback(
    (r: ExportReport) => {
      setHistory((h) => {
        const next = addEntry(h, { tab, api: r.api, filename: r.result.filename, bytes: r.result.blob.size, rows: r.rows, ms: r.ms, search: share.search });
        saveHistory(next);
        return next;
      });
    },
    [tab, share.search],
  );

  const restore = (e: HistoryEntry) => {
    const { tab: t, state } = readUrl(e.search);
    setTab(t);
    if (t === 'dataset') setDs(initialDataset(state as Shared | undefined));
    if (t === 'table') setTable(initialTable(state as Shared | undefined));
    setAnnounce(`Restored the settings of ${e.filename}.`);
  };

  const selectTab = (id: TabId, focus = false) => {
    setTab(id);
    if (focus) requestAnimationFrame(() => document.getElementById(`tab-${id}`)?.focus());
  };

  const copyCode = async () => {
    const parsed = parseDataset(ds.text);
    const code =
      tab === 'dataset' && parsed.ok ? generateDatasetCode(parsed.dataset as JsonDataset, ds.options, version).code : tab === 'table' ? generateTableCode(table, version).code : '';
    if (code) setAnnounce((await copyText(code)) ? 'Code copied to the clipboard.' : 'Copying failed.');
  };

  const shortcuts = useRef<(e: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    shortcuts.current = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        downloadRef.current?.click();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || help) return;
      const k = e.key.toLowerCase();
      if (e.key === '?') setHelp(true);
      else if (k === 't') setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
      else if (k === 'c') void copyCode();
      else if (k === 'u') {
        if (tab !== 'dataset') setTab('dataset');
        requestAnimationFrame(() => uploadRef.current?.click());
      } else if (['1', '2', '3'].includes(k)) selectTab(TAB_IDS[Number(k) - 1]!, true);
      else return;
      e.preventDefault();
    };
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => shortcuts.current(e);
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900">
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              react-data-export <span className="text-emerald-700 dark:text-emerald-400">playground</span>
            </h1>
            <p className="hint">
              Export datasets and HTML tables to .xlsx and .csv in your browser. Nothing is uploaded.{' '}
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[0.7rem] text-amber-900 dark:bg-amber-900 dark:text-amber-100">v{version}</span>
            </p>
          </div>
          <nav aria-label="Project links" className="flex flex-wrap items-center gap-2 text-sm">
            <a className="btn" href={LINKS.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="btn" href={LINKS.npm} target="_blank" rel="noreferrer">
              npm
            </a>
            <a className="btn" href={LINKS.docs} target="_blank" rel="noreferrer">
              Docs
            </a>
            <button type="button" className="btn" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
              ?
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title="Toggle theme (T)"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Playground sections" className="flex flex-wrap gap-1 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab === t.id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
                onClick={() => selectTab(t.id)}
                onKeyDown={(e) => {
                  const n = TABS.length;
                  const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
                  if (next >= 0) {
                    e.preventDefault();
                    selectTab(TABS[next]!.id, true);
                  }
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {share.partial ? <span className="hint">The dataset is too large for a link; it holds the options only.</span> : null}
            <button
              type="button"
              className="btn"
              onClick={async () => setAnnounce((await copyText(location.origin + location.pathname + share.search)) ? 'Link copied to the clipboard.' : 'Copying failed.')}
            >
              Copy link
            </button>
          </div>
        </div>

        <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'dataset' ? (
            <DatasetTab state={ds} onChange={setDs} onExported={onExported} uploadRef={uploadRef} downloadRef={downloadRef} />
          ) : tab === 'table' ? (
            <TableTab options={table} onChange={setTable} onExported={onExported} downloadRef={downloadRef} theme={theme} />
          ) : (
            <Suspense fallback={<p className="hint">Loading…</p>}>
              <LegacyTab onExported={onExported} />
            </Suspense>
          )}
        </section>

        <div className="mt-4">
          <HistoryPanel
            entries={history}
            onRestore={restore}
            onClear={() => {
              setHistory([]);
              saveHistory([]);
            }}
          />
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pt-2 pb-8 text-sm text-slate-600 dark:text-slate-400">
        <p>
          react-data-export {version} from npm, built on{' '}
          <a className="underline" href="https://github.com/securedeveloper/javascript-excel" target="_blank" rel="noreferrer">
            javascript-excel
          </a>
          . Everything runs in your browser: no uploads, analytics or cookies.{' '}
          <a className="underline" href={LINKS.source} target="_blank" rel="noreferrer">
            Playground source
          </a>{' '}
          · MIT licence. Press <kbd className="font-mono">?</kbd> for keyboard shortcuts.
        </p>
      </footer>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
    </div>
  );
}

function replaceUrl(search: string): void {
  window.history.replaceState(null, '', location.pathname + search + location.hash);
}
