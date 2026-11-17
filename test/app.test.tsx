import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { read } from 'javascript-excel/read';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';

let blobs: Blob[] = [];

beforeEach(() => {
  blobs = [];
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
    blobs.push(b as Blob);
    return 'blob:test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

const cellValues = (rows: Array<Array<{ value?: unknown } | undefined> | undefined>) => Array.from(rows, (r) => Array.from(r ?? [], (c) => c?.value ?? null));

describe('the Dataset tab', () => {
  it('downloads a valid xlsx with <ExcelExport> and records it in the history', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Download sales.xlsx' }));
    await waitFor(() => expect(blobs).toHaveLength(1));

    const { workbook } = await read(blobs[0]!);
    const sheet = workbook.sheets[0]!;
    expect(sheet.name).toBe('Sales');
    expect(sheet.view?.freeze?.rows).toBe(2);
    expect(sheet.autoFilter).toBe('A2:E6');
    const values = cellValues(sheet.rows);
    expect(values[0]).toEqual(['Name', 'City', 'Joined', 'Sales']);
    expect(values[1]).toEqual([null, null, null, 'Q1', 'Q2']);
    expect(sheet.merges).toContain('D1:E1');
    expect(values[2]![0]).toBe('Ada Lovelace');

    expect(await screen.findByText(/Saved sales\.xlsx/)).toBeTruthy();
    const history = screen.getByRole('region', { name: /recent exports/i });
    expect(within(history).getByText('sales.xlsx')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('rde-pg:history')!)).toHaveLength(1);
  });

  it('exports CSV through the hook when those options are picked, and puts them in the link', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Format'), 'csv');
    await user.click(screen.getByRole('radio', { name: 'useExcelExport' }));
    expect(screen.getByLabelText('Generated code').textContent).toContain('useExcelExport();');

    await user.click(screen.getByRole('button', { name: 'Download sales.csv' }));
    await waitFor(() => expect(blobs).toHaveLength(1));
    const text = (await blobs[0]!.text()).replace(/^\uFEFF/, '');
    expect(text.split('\r\n')[2]).toBe('Ada Lovelace,London,2024-01-15,1200.5,980');

    await waitFor(() => expect(location.search).toMatch(/^\?s=/));
    const restored = JSON.parse(atob(location.search.slice(3).replace(/-/g, '+').replace(/_/g, '/')));
    expect(restored).toEqual({ o: { format: 'csv', api: 'hook' } });
  });
});
