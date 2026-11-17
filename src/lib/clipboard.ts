import type { ApiStyle } from './options';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const API_LABELS: Record<'dataset' | 'table', ReadonlyArray<{ value: ApiStyle; label: string }>> = {
  dataset: [
    { value: 'component', label: '<ExcelExport>' },
    { value: 'hook', label: 'useExcelExport' },
    { value: 'function', label: 'exportDataset' },
  ],
  table: [
    { value: 'component', label: '<ExportTableButton>' },
    { value: 'hook', label: 'useTableExport' },
    { value: 'function', label: 'exportTable' },
  ],
};
